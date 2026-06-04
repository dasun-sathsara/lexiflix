import "server-only";

import { createHash } from "node:crypto";
import { logger } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { deleteObjectByKey, putObject } from "@/lib/integrations/storage/r2";
import type {
  GeneratedBinaryArtifact,
  GeneratedSpeechArtifact,
} from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import { artifactObject } from "@/lib/server/db/schema";

type ArtifactKind = "audio" | "image";

/**
 * Artifact ids resolved per pack item, plus the storage handles needed to roll the
 * upload back if the pack write fails afterwards.
 */
export type GeneratedArtifactIndex = {
  termAudioArtifactIdByItemId: Map<string, string>;
  exampleAudioArtifactIdsByItemId: Map<string, Array<string | null>>;
  imageArtifactIdByItemId: Map<string, string>;
  uploadedObjectKeys: string[];
  uploadedArtifactIds: string[];
  warnings: string[];
};

async function persistArtifact(input: {
  userId: string;
  contentId: string;
  jobId: string;
  kind: ArtifactKind;
  artifact: GeneratedBinaryArtifact;
}) {
  const checksumSha256 = createHash("sha256").update(input.artifact.bytes).digest("hex");
  const objectKey = `generated/${input.userId}/${input.contentId}/${input.jobId}/${input.kind}/${input.artifact.itemKey}.${input.artifact.extension}`;

  logger.info("[content-generation:artifact] uploading artifact", {
    jobId: input.jobId,
    kind: input.kind,
    itemKey: input.artifact.itemKey,
    objectKey,
    mimeType: input.artifact.mimeType,
    byteLength: input.artifact.bytes.byteLength,
  });

  const uploaded = await putObject({
    key: objectKey,
    body: input.artifact.bytes,
    contentType: input.artifact.mimeType,
  });

  const [row] = await db
    .insert(artifactObject)
    .values({
      id: crypto.randomUUID(),
      kind: input.kind,
      access: "private",
      provider: "r2",
      bucketName: uploaded.bucketName,
      objectKey: uploaded.key,
      publicUrl: uploaded.url,
      mimeType: input.artifact.mimeType,
      byteSize: input.artifact.bytes.byteLength,
      checksumSha256,
      metadata: input.artifact.metadata,
    })
    .returning();

  if (!row) {
    throw new Error(`Failed to persist ${input.kind} artifact metadata.`);
  }

  logger.info("[content-generation:artifact] artifact persisted", {
    jobId: input.jobId,
    artifactId: row.id,
    kind: input.kind,
    itemKey: input.artifact.itemKey,
    objectKey: row.objectKey,
  });

  return row;
}

/**
 * Uploads every generated artifact and indexes the resulting ids by pack item.
 * Individual failures degrade to warnings so a pack can still be saved without assets.
 */
export async function persistGeneratedArtifacts(input: {
  userId: string;
  contentId: string;
  jobId: string;
  speechArtifacts: GeneratedSpeechArtifact[];
  imageArtifacts: GeneratedBinaryArtifact[];
}): Promise<GeneratedArtifactIndex> {
  const index: GeneratedArtifactIndex = {
    termAudioArtifactIdByItemId: new Map(),
    exampleAudioArtifactIdsByItemId: new Map(),
    imageArtifactIdByItemId: new Map(),
    uploadedObjectKeys: [],
    uploadedArtifactIds: [],
    warnings: [],
  };

  const persist = async (kind: ArtifactKind, artifact: GeneratedBinaryArtifact) => {
    try {
      const row = await persistArtifact({
        userId: input.userId,
        contentId: input.contentId,
        jobId: input.jobId,
        kind,
        artifact,
      });
      index.uploadedObjectKeys.push(row.objectKey);
      index.uploadedArtifactIds.push(row.id);
      return row.id;
    } catch (error) {
      logger.error(`[content-generation:artifact] failed to persist ${kind} artifact`, {
        jobId: input.jobId,
        itemKey: artifact.itemKey,
        message: error instanceof Error ? error.message : String(error),
      });
      index.warnings.push(
        error instanceof Error ? error.message : `Failed to persist ${kind} artifact.`,
      );
      return null;
    }
  };

  for (const artifact of input.speechArtifacts) {
    const artifactId = await persist("audio", artifact);
    if (!artifactId) {
      continue;
    }

    const { target } = artifact;
    if (target.kind === "example_sentence") {
      const examples = index.exampleAudioArtifactIdsByItemId.get(target.analysisItemId) ?? [];
      examples[target.exampleIndex] = artifactId;
      index.exampleAudioArtifactIdsByItemId.set(target.analysisItemId, examples);
      continue;
    }

    index.termAudioArtifactIdByItemId.set(target.analysisItemId, artifactId);
  }

  for (const artifact of input.imageArtifacts) {
    const artifactId = await persist("image", artifact);
    if (artifactId) {
      index.imageArtifactIdByItemId.set(artifact.itemKey, artifactId);
    }
  }

  return index;
}

/** Best-effort cleanup used when pack persistence fails after artifacts were uploaded. */
export async function discardPersistedArtifacts(index: GeneratedArtifactIndex) {
  await Promise.allSettled(index.uploadedObjectKeys.map((key) => deleteObjectByKey(key)));
  await Promise.allSettled(
    index.uploadedArtifactIds.map((id) =>
      db.delete(artifactObject).where(eq(artifactObject.id, id)),
    ),
  );
}
