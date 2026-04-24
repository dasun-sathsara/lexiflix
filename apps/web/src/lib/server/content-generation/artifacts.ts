import "server-only";

import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import type { GeneratedBinaryArtifact } from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import { artifactObject } from "@/lib/server/db/schema";
import { buildPublicUrl } from "@/lib/storage/r2";

const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function persistGeneratedArtifact(input: {
  userId: string;
  contentId: string;
  jobId: string;
  kind: "audio" | "image";
  artifact: GeneratedBinaryArtifact;
}) {
  const checksumSha256 = createHash("sha256").update(input.artifact.bytes).digest("hex");
  const objectKey = `generated/${input.userId}/${input.contentId}/${input.jobId}/${input.kind}/${input.artifact.itemKey}.${input.artifact.extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: input.artifact.bytes,
      ContentType: input.artifact.mimeType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );

  const [row] = await db
    .insert(artifactObject)
    .values({
      id: crypto.randomUUID(),
      kind: input.kind,
      access: "private",
      provider: "r2",
      bucketName: env.R2_BUCKET_NAME,
      objectKey,
      publicUrl: buildPublicUrl(objectKey),
      mimeType: input.artifact.mimeType,
      byteSize: input.artifact.bytes.byteLength,
      checksumSha256,
      metadata: input.artifact.metadata,
    })
    .returning();

  if (!row) {
    throw new Error(`Failed to persist ${input.kind} artifact metadata.`);
  }

  return row;
}
