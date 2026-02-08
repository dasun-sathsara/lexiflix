import { spawn } from "child_process";
import { readdir } from "fs/promises";
import { Box, render, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { join } from "path";
import type React from "react";
import { useEffect, useState } from "react";

// Types
interface WordData {
  lemma: string;
  count: number;
  cefr_level: string;
  cefr_num: number | null;
}

interface SelectItem {
  label: string;
  value: string;
}

type AppState = "loading" | "selecting" | "processing" | "displaying" | "error";

// CEFR Level Color Mapping
const CEFR_COLORS: Record<string, string> = {
  A1: "green",
  A2: "greenBright",
  B1: "yellow",
  B2: "yellowBright",
  C1: "red",
  C2: "redBright",
  "N/A": "gray",
};

// Header Component
const Header: React.FC = () => (
  <Box
    flexDirection="column"
    marginBottom={1}
    borderStyle="round"
    borderColor="cyan"
    paddingX={2}
    paddingY={1}
  >
    <Text bold color="cyan">
      ╔═══════════════════════════════════════════════╗
    </Text>
    <Text bold color="cyan">
      ║ LexiFlix Subtitle Analyzer v1.0               ║
    </Text>
    <Text bold color="cyan">
      ╚═══════════════════════════════════════════════╝
    </Text>
    <Text dimColor>Analyze subtitle files for vocabulary CEFR levels</Text>
  </Box>
);

// File Selector Component
const FileSelector: React.FC<{
  files: string[];
  onSelect: (file: string) => void;
}> = ({ files, onSelect }) => {
  const items: SelectItem[] = files.map((file) => ({
    label: `📄 ${file}`,
    value: file,
  }));

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ↓ Select a subtitle file to analyze:
        </Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  );
};

// Processing Component
const Processing: React.FC<{ fileName: string }> = ({ fileName }) => (
  <Box
    flexDirection="column"
    borderStyle="round"
    borderColor="yellow"
    paddingX={2}
    paddingY={1}
  >
    <Box marginBottom={1}>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text color="yellow" bold>
        {" "}
        Processing: {fileName}
      </Text>
    </Box>
    <Text dimColor>Running spaCy NLP pipeline and CEFR analysis...</Text>
    <Text dimColor>This may take a minute depending on file size.</Text>
  </Box>
);

// Results Display Component
const ResultsDisplay: React.FC<{ results: WordData[]; fileName: string }> = ({
  results,
  fileName,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [sortBy, setSortBy] = useState<"count" | "cefr">("count");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { exit } = useApp();
  const visibleRows = 15;
  const maxScroll = Math.max(0, results.length - visibleRows);

  useInput((input, key) => {
    if (key.upArrow && scrollOffset > 0) {
      setScrollOffset(scrollOffset - 1);
    } else if (key.downArrow && scrollOffset < maxScroll) {
      setScrollOffset(scrollOffset + 1);
    } else if (input === "q" || key.escape) {
      exit();
    } else if (input === "c") {
      if (sortBy === "cefr") {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy("cefr");
        setSortDirection("asc");
      }
      setScrollOffset(0);
    } else if (input === "f") {
      if (sortBy === "count") {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy("count");
        setSortDirection("desc");
      }
      setScrollOffset(0);
    }
  });

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "count") {
      comparison = a.count - b.count;
    } else {
      const valA = a.cefr_num ?? -1;
      const valB = b.cefr_num ?? -1;
      comparison = valA - valB;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const visibleResults = sortedResults.slice(
    scrollOffset,
    scrollOffset + visibleRows,
  );
  const totalWords = results.length;
  const totalOccurrences = results.reduce((sum, word) => sum + word.count, 0);

  // Count words by CEFR level
  const levelCounts: Record<string, number> = {};
  results.forEach((word) => {
    levelCounts[word.cefr_level] = (levelCounts[word.cefr_level] || 0) + 1;
  });

  return (
    <Box flexDirection="column">
      {/* Summary Stats */}
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="round"
        borderColor="green"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="green">
          ✓ Analysis Complete: {fileName}
        </Text>
        <Box marginTop={1}>
          <Text>
            <Text bold>Total Unique Words:</Text> {totalWords} | <Text bold>Total Occurrences:</Text> {totalOccurrences}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text bold>CEFR Distribution:</Text>
          {Object.entries(levelCounts)
            .sort()
            .map(([level, count]) => (
              <Text key={level}>
                {" "}
                <Text color={CEFR_COLORS[level] as any}>{level}</Text>: {count}
              </Text>
            ))}
        </Box>
      </Box>

      {/* Table Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Box width="5%">
          <Text bold color="cyan">
            #
          </Text>
        </Box>
        <Box width="30%">
          <Text bold color="cyan">
            Word (Lemma)
          </Text>
        </Box>
        <Box width="15%">
          <Text bold color="cyan">
            Count {sortBy === "count" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </Text>
        </Box>
        <Box width="15%">
          <Text bold color="cyan">
            CEFR {sortBy === "cefr" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </Text>
        </Box>
        <Box width="35%">
          <Text bold color="cyan">
            Frequency Bar
          </Text>
        </Box>
      </Box>

      {/* Table Body */}
      {visibleResults.map((word, idx) => {
        const actualIndex = scrollOffset + idx + 1;
        // Calculate bar length based on the global maximum count so bars are comparable
        const globalMax = Math.max(...results.map(r => r.count));
        const barLength = Math.round((word.count / globalMax) * 20);
        const bar = "█".repeat(barLength);
        const levelColor = CEFR_COLORS[word.cefr_level] || "white";

        return (
          <Box key={`${word.lemma}-${actualIndex}`} paddingX={1}>
            <Box width="5%">
              <Text dimColor>{actualIndex}</Text>
            </Box>
            <Box width="30%">
              <Text>{word.lemma}</Text>
            </Box>
            <Box width="15%">
              <Text color="yellow">{word.count}</Text>
            </Box>
            <Box width="15%">
              <Text bold color={levelColor as any}>
                {word.cefr_level}
              </Text>
            </Box>
            <Box width="35%">
              <Text color="blue">{bar}</Text>
            </Box>
          </Box>
        );
      })}

      {/* Scroll Indicators */}
      <Box marginTop={1} borderStyle="round" paddingX={2}>
        <Text dimColor>
          Showing {scrollOffset + 1}-
          {Math.min(scrollOffset + visibleRows, totalWords)} of {totalWords}
        </Text>
        {scrollOffset > 0 && <Text color="cyan">↑ Scroll UP</Text>}
        {scrollOffset < maxScroll && <Text color="cyan">↓ Scroll DOWN</Text>}
        <Text color="magenta">│ Press Q/ESC to exit │ 'c' sort CEFR │ 'f' sort Count</Text>
      </Box>
    </Box>
  );
};

// Error Component
const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="red">
        ✗ Error occurred
      </Text>
      <Text color="red">{error}</Text>
      <Text dimColor>
        Press Q to exit
      </Text>
    </Box>
  );
};

// Main App Component
const App: React.FC = () => {
  const [state, setState] = useState<AppState>("loading");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [results, setResults] = useState<WordData[]>([]);
  const [error, setError] = useState<string>("");

  // Load SRT files from data directory
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const dataDir = join(process.cwd(), "..", "data");
        const allFiles = await readdir(dataDir);
        const srtFiles = allFiles.filter((file) => file.endsWith(".srt"));

        if (srtFiles.length === 0) {
          setError("No .srt files found in the data/ directory");
          setState("error");
          return;
        }

        setFiles(srtFiles);
        setState("selecting");
      } catch (err) {
        setError(`Failed to read data directory: ${err}`);
        setState("error");
      }
    };

    loadFiles();
  }, []);

  // Handle file selection and run Python script
  const handleFileSelect = async (fileName: string) => {
    setSelectedFile(fileName);
    setState("processing");

    const inputPath = join(process.cwd(), "..", "data", fileName);
    const outputPath = join(process.cwd(), "..", "output_temp.json");

    // Use the UV Python environment
    const isWin = process.platform === "win32";
    const pythonPath = join(
      process.cwd(),
      "..",
      "python-analyzer",
      ".venv",
      isWin ? "Scripts" : "bin",
      isWin ? "python.exe" : "python",
    );
    const scriptPath = join(process.cwd(), "..", "python-analyzer", "src", "main.py");

    try {
      await new Promise<void>((resolve, reject) => {
        const pythonProcess = spawn(
          pythonPath,
          [scriptPath, inputPath, "--out-json", outputPath],
          {
            cwd: process.cwd(),
            shell: true,
          },
        );

        let stderr = "";

        pythonProcess.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(`Python script failed with code ${code}\n${stderr}`),
            );
          } else {
            resolve();
          }
        });

        pythonProcess.on("error", (err) => {
          reject(err);
        });
      });

      // Read the output JSON
      const outputFile = await Bun.file(outputPath).text();
      const parsedResults: WordData[] = JSON.parse(outputFile);

      setResults(parsedResults);
      setState("displaying");
    } catch (err) {
      setError(`Processing failed: ${err}`);
      setState("error");
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      {state === "loading" && (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text>Loading subtitle files...</Text>
        </Box>
      )}

      {state === "selecting" && <FileSelector files={files} onSelect={handleFileSelect} />}

      {state === "processing" && <Processing fileName={selectedFile} />}

      {state === "displaying" && <ResultsDisplay results={results} fileName={selectedFile} />}

      {state === "error" && <ErrorDisplay error={error} />}
    </Box>
  );
};

// Render the app
render(<App />);
