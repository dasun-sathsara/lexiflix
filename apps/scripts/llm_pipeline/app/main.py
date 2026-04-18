import argparse
import html
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Third-party imports
try:
    import srt
    from google import genai
    from google.genai import types
except ImportError:
    print(
        "Please install required packages: pip install srt google-genai",
        file=sys.stderr,
    )
    sys.exit(1)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash-lite"
CHUNK_DURATION_MINUTES = 30
MAX_WORKERS = 2  # Number of parallel API calls
MAX_RETRIES = 3  # Number of retry attempts
RETRY_DELAY = 5  # Base delay between retries in seconds

# Define the structured output schema for vocabulary items
VOCAB_ITEM_SCHEMA = genai.types.Schema(
    type=genai.types.Type.OBJECT,
    required=["type", "text", "level"],
    properties={
        "type": genai.types.Schema(
            type=genai.types.Type.STRING,
            description="Category: 'idiom', 'phrasal verb', or 'slang'",
            enum=["idiom", "phrasal verb", "slang"],
        ),
        "text": genai.types.Schema(
            type=genai.types.Type.STRING,
            description="The canonical/lemma form of the expression",
        ),
        "level": genai.types.Schema(
            type=genai.types.Type.STRING,
            description="CEFR level",
            enum=["A1", "A2", "B1", "B2", "C1", "C2"],
        ),
    },
)

VOCAB_LIST_SCHEMA = genai.types.Schema(
    type=genai.types.Type.ARRAY,
    items=VOCAB_ITEM_SCHEMA,
)


def clean_subtitle_text(text: str) -> str:
    """
    Standard cleaning to remove HTML, brackets, and speaker labels.
    """
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\([^\)]*\)", " ", text)
    text = re.sub(r"\{[^\}]*\}", " ", text)
    text = re.sub(r"^[A-Z][A-Z0-9\s\-]{1,20}:\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_and_chunk_srt(file_path: str) -> List[str]:
    """
    Reads an SRT file and returns a list of text blocks,
    each representing roughly CHUNK_DURATION_MINUTES of content.
    """
    try:
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
            content = f.read()
    except IOError as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        subs = list(srt.parse(content))
    except Exception as e:
        print(f"Error parsing SRT: {e}", file=sys.stderr)
        sys.exit(1)

    chunks = []
    current_chunk_text = []
    chunk_start_time = timedelta(seconds=0)

    subs.sort(key=lambda s: s.start)

    if subs:
        chunk_start_time = subs[0].start

    print(f"Total subtitles found: {len(subs)}", file=sys.stderr)

    for sub in subs:
        if (sub.start - chunk_start_time) > timedelta(minutes=CHUNK_DURATION_MINUTES):
            if current_chunk_text:
                chunks.append(" ".join(current_chunk_text))
            current_chunk_text = []
            chunk_start_time = sub.start

        cleaned_line = clean_subtitle_text(sub.content.replace("\n", " "))
        if cleaned_line:
            current_chunk_text.append(cleaned_line)

    if current_chunk_text:
        chunks.append(" ".join(current_chunk_text))

    return chunks


def analyze_chunk_with_llm(
    client: genai.Client, text_chunk: str, chunk_index: int, total_chunks: int
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Sends a text chunk to Gemini API and requests structured vocabulary extraction.
    Returns a tuple of (chunk_index, results) to maintain ordering.
    """
    print(f"Processing chunk {chunk_index + 1}/{total_chunks}...", file=sys.stderr)

    prompt = f"""You are an expert linguist and English teacher. Analyze the following transcript from a movie/TV show.

Your task is to identify ADVANCED and INTERESTING vocabulary that an INTERNATIONAL English learner would benefit from:
1. **Idioms** - Non-literal expressions (e.g., "break a leg", "spill the beans", "kick the bucket")
2. **Phrasal Verbs** - Verb + particle combinations with non-obvious meanings (e.g., "put up with", "get away with", "figure out")
3. **Slang** - Informal expressions, colloquialisms (e.g., "ghosting", "salty", "lowkey")

IMPORTANT - DO NOT INCLUDE:
- Common discourse markers everyone knows: "come on", "hold on", "go ahead", "look", "well", "okay"
- Very basic phrasal verbs that are obvious: "go out", "come in", "sit down", "stand up", "wake up", "go back"
- Simple verb + preposition combinations that aren't true phrasal verbs
- Greetings and basic expressions: "what's up", "how are you", "good morning"
- Single common words that aren't slang
- CULTURE-SPECIFIC references that require local knowledge:
  * American sports references ("hit a home run", "touchdown", "out of left field")
  * British-only slang ("Bob's your uncle", "taking the mickey")
  * Regional expressions specific to one country
  * References to specific TV shows, celebrities, or local events
  * Historical/political references specific to one culture

For each item found:
- Convert it to its **canonical form** (lemma). For example, if the text says "he kicked the bucket", extract "kick the bucket".
- Assign a **CEFR Level** (A1, A2, B1, B2, C1, C2) - focus on B1 and above.
- Categorize it as "idiom", "phrasal verb", or "slang".
- ONLY include universally understood expressions that would be useful for any English learner regardless of their background.

Input Text:
"{text_chunk}"
"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_budget=0,
        ),
        response_mime_type="application/json",
        response_schema=VOCAB_LIST_SCHEMA,
    )

    # Retry logic with exponential backoff
    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=generate_content_config,
            )

            # Parse the structured JSON response
            if response.text:
                data = json.loads(response.text)
                if isinstance(data, list):
                    return (chunk_index, data)
            return (chunk_index, [])

        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAY * (2**attempt)
                print(
                    f"  Chunk {chunk_index + 1} failed, retrying in {wait_time}s (attempt {attempt + 2}/{MAX_RETRIES})...",
                    file=sys.stderr,
                )
                time.sleep(wait_time)
            else:
                print(
                    f"API Request failed for chunk {chunk_index + 1} after {MAX_RETRIES} attempts: {e}",
                    file=sys.stderr,
                )

    return (chunk_index, [])


def main():
    parser = argparse.ArgumentParser(
        description="Extract idioms/slang from SRT via LLM."
    )
    parser.add_argument("input_file", help="Path to .srt file")
    parser.add_argument(
        "-o", "--output", help="Output JSON file path (default: input_file.json)"
    )
    parser.add_argument(
        "-w",
        "--workers",
        type=int,
        default=MAX_WORKERS,
        help=f"Number of parallel workers (default: {MAX_WORKERS})",
    )
    args = parser.parse_args()

    # Check API key
    if not GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    # Initialize Gemini client
    client = genai.Client(api_key=GEMINI_API_KEY)

    # Determine output file path
    input_path = Path(args.input_file)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_suffix(".json")

    # 1. Chunk the file
    chunks = parse_and_chunk_srt(args.input_file)
    print(
        f"Split content into {len(chunks)} chunks (~{CHUNK_DURATION_MINUTES} mins each).",
        file=sys.stderr,
    )

    all_vocab = []
    seen_vocab = set()
    chunk_results: List[Tuple[int, List[Dict[str, Any]]]] = []

    # 2. Process chunks in parallel
    print(f"Processing with {args.workers} parallel workers...", file=sys.stderr)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(
                analyze_chunk_with_llm, client, chunk_text, i, len(chunks)
            ): i
            for i, chunk_text in enumerate(chunks)
            if chunk_text.strip()
        }

        for future in as_completed(futures):
            try:
                result = future.result()
                chunk_results.append(result)
            except Exception as e:
                chunk_index = futures[future]
                print(f"Error processing chunk {chunk_index + 1}: {e}", file=sys.stderr)

    # Sort results by chunk index to maintain order
    chunk_results.sort(key=lambda x: x[0])

    # 3. Deduplicate and Aggregate
    for _, items in chunk_results:
        for item in items:
            # Validate keys exist
            if not all(k in item for k in ("text", "type", "level")):
                continue

            # Create a unique key to prevent duplicates (canonical text + type)
            key = (item["text"].lower().strip(), item["type"].lower().strip())

            if key not in seen_vocab:
                seen_vocab.add(key)
                all_vocab.append(
                    {
                        "text": item["text"].lower().strip(),
                        "type": item["type"].lower().strip(),
                        "level": item["level"].upper().strip(),
                    }
                )

    # 4. Save to JSON file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_vocab, f, indent=2, ensure_ascii=False)

    print(f"\nExtracted {len(all_vocab)} unique items.", file=sys.stderr)
    print(f"Saved to: {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
