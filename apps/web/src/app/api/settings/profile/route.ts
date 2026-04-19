import { APIError } from "better-auth/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { deleteObjectByKey, getKeyFromUrl, uploadUserAvatar } from "@/lib/storage/r2";

type UpdateUserBody = Parameters<typeof auth.api.updateUser>[0]["body"];

const profileSchema = z.object({
  name: z
    .string({ message: "Display name is required." })
    .trim()
    .min(2, "Use at least 2 characters for your display name.")
    .max(80, "Display name must be 80 characters or fewer."),
  removeAvatar: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawName = formData.get("name");
  const removeAvatarRaw = formData.get("removeAvatar");
  const avatarEntry = formData.get("avatar");

  const parsed = profileSchema.safeParse({
    name: typeof rawName === "string" ? rawName : "",
    removeAvatar: typeof removeAvatarRaw === "string" ? removeAvatarRaw === "true" : undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, removeAvatar } = parsed.data;
  const currentUser = session.user;
  const updates: { name?: string; image?: string | null } = {};

  if (name !== currentUser.name) {
    updates.name = name;
  }

  const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;
  let uploadedKey: string | null = null;
  let oldKey: string | null = null;

  if (avatarFile) {
    try {
      const result = await uploadUserAvatar({
        userId: currentUser.id,
        file: avatarFile,
      });
      uploadedKey = result.key;
      updates.image = result.url;
      oldKey = getKeyFromUrl(currentUser.image ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload profile photo.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else if (removeAvatar && currentUser.image) {
    updates.image = null;
    oldKey = getKeyFromUrl(currentUser.image);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      {
        success: true,
        user: {
          name: currentUser.name,
          image: currentUser.image,
        },
        message: "Nothing to update.",
      },
      { status: 200 },
    );
  }

  try {
    await auth.api.updateUser({
      body: updates as UpdateUserBody,
      headers: request.headers,
    });

    if (oldKey) {
      await deleteObjectByKey(oldKey).catch((error) => {
        console.error("Failed to delete previous avatar", { error, oldKey });
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          name: updates.name ?? currentUser.name,
          image: updates.image === undefined ? currentUser.image : updates.image,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (uploadedKey) {
      await deleteObjectByKey(uploadedKey).catch((cleanupError) => {
        console.error("Failed to clean up uploaded avatar after error", {
          error: cleanupError,
          uploadedKey,
        });
      });
    }

    if (error instanceof APIError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Unexpected error updating profile", { error });
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
