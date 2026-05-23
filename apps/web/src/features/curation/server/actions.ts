"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deleteCuratedEntryById,
  reorderCuratedEntries,
  setCuratedEntryFeaturedRank,
  setCuratedEntryLevel,
  setCuratedEntryPublishedState,
  upsertCuratedEntryFromTmdb,
} from "@/features/curation/server/catalog";
import type { ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth-guards";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";

const tmdbMutationSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.coerce.number().int().positive(),
});

const publicationSchema = z.object({
  id: z.string().min(1),
  isPublished: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const featuredRankSchema = z.object({
  id: z.string().min(1),
  featuredRank: z.preprocess((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    return Number.parseInt(trimmed, 10);
  }, z.number().int().min(1).max(999).nullable()),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

const levelSchema = z.object({
  id: z.string().min(1),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", ""]),
});

function revalidateCuratedRoutes() {
  revalidatePath("/admin/curated");
  revalidatePath("/curated");
}

export async function curateTmdbItemAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = tmdbMutationSchema.parse({
    mediaType: formData.get("mediaType"),
    tmdbId: formData.get("tmdbId"),
  });

  await upsertCuratedEntryFromTmdb(parsed.mediaType, parsed.tmdbId, session.user.id);
  revalidateCuratedRoutes();
}

export async function refreshCuratedEntryAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = tmdbMutationSchema.parse({
    mediaType: formData.get("mediaType"),
    tmdbId: formData.get("tmdbId"),
  });

  await upsertCuratedEntryFromTmdb(parsed.mediaType, parsed.tmdbId, session.user.id);
  revalidateCuratedRoutes();
}

export async function setCuratedEntryPublishedAction(formData: FormData) {
  await requireAdmin();
  const parsed = publicationSchema.parse({
    id: formData.get("id"),
    isPublished: formData.get("isPublished"),
  });

  await setCuratedEntryPublishedState(parsed.id, parsed.isPublished);
  revalidateCuratedRoutes();
}

export async function saveCuratedEntryFeaturedRankAction(formData: FormData) {
  await requireAdmin();
  const parsed = featuredRankSchema.parse({
    id: formData.get("id"),
    featuredRank: formData.get("featuredRank"),
  });

  await setCuratedEntryFeaturedRank(parsed.id, parsed.featuredRank);
  revalidateCuratedRoutes();
}

export async function deleteCuratedEntryAction(formData: FormData) {
  await requireAdmin();
  const parsed = deleteSchema.parse({
    id: formData.get("id"),
  });

  await deleteCuratedEntryById(parsed.id);
  revalidateCuratedRoutes();
}

export async function setCuratedEntryLevelAction(formData: FormData) {
  await requireAdmin();
  const parsed = levelSchema.parse({
    id: formData.get("id"),
    level: formData.get("level"),
  });

  const levelVal = parsed.level === "" ? null : (parsed.level as StoredCefrLevel);
  await setCuratedEntryLevel(parsed.id, levelVal);
  revalidateCuratedRoutes();
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function reorderCuratedEntriesAction(
  input: z.input<typeof reorderSchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reorder payload." };
  }

  await reorderCuratedEntries(parsed.data.ids);
  revalidateCuratedRoutes();
  return { ok: true, data: undefined };
}
