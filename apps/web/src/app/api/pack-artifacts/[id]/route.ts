import { NextResponse } from "next/server";

import { getOwnedArtifactObject } from "@/features/packs/server/queries";
import { getSessionOrNull } from "@/lib/auth-guards";
import { getObjectBytesByKey } from "@/lib/storage/r2";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionOrNull()]);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const artifact = await getOwnedArtifactObject({ artifactId: id, userId: session.user.id });
  if (!artifact) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (artifact.access === "public" && artifact.publicUrl) {
    return NextResponse.redirect(artifact.publicUrl);
  }

  const object = await getObjectBytesByKey(artifact.objectKey);
  const body = new Blob([object.bytes as BlobPart], {
    type: artifact.mimeType ?? object.contentType,
  });

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(object.contentLength ?? object.bytes.byteLength),
      "Content-Type": artifact.mimeType ?? object.contentType,
    },
  });
}
