import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB ceiling for profile photos

function ensureServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("R2 storage helpers must only be imported on the server.");
  }
}

ensureServerOnly();

const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const endpointBase = env.R2_ENDPOINT.replace(/\/$/, "");
const defaultPublicBase = `${endpointBase}/${env.R2_BUCKET_NAME}`.replace(/\/$/, "");
const configuredPublicBase = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
const publicBase = configuredPublicBase ?? defaultPublicBase;

function buildPublicUrl(key: string) {
  return `${publicBase}/${key}`;
}

function getKeyFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const bases = new Set([publicBase, defaultPublicBase]);

  for (const base of bases) {
    const prefix = `${base}/`;
    if (url.startsWith(prefix)) {
      return url.slice(prefix.length);
    }
  }

  return null;
}

export async function uploadUserAvatar({ userId, file }: { userId: string; file: File }) {
  if (file.size === 0) {
    throw new Error("Empty file uploads are not permitted.");
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error("Profile photos must be 5 MB or smaller.");
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension) {
    throw new Error("Unsupported image format. Use JPG, PNG, or WebP.");
  }

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const key = `avatars/${userId}/${fileName}`;
  const body = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: buildPublicUrl(key),
  };
}

export async function deleteObjectByKey(key: string) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function deleteObjectByUrl(url: string | null | undefined) {
  const key = getKeyFromUrl(url);
  if (!key) {
    return;
  }

  try {
    await deleteObjectByKey(key);
  } catch (error) {
    console.error("Failed to delete R2 object", { url, error });
  }
}

export { buildPublicUrl, getKeyFromUrl };
