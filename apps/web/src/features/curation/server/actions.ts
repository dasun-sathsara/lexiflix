"use server";

import {
  deleteCuratedEntryById,
  setCuratedEntryFeaturedRank,
  setCuratedEntryPublishedState,
  upsertCuratedEntryFromTmdb,
} from "@/features/curation/server/catalog";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
