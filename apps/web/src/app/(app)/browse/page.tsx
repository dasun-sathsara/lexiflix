import type { Metadata } from "next";
import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { PendingSection } from "@/components/common/pending-section";
import { BrowseControls } from "@/features/browse/components/browse-controls";
import { MediaGrid } from "@/features/browse/components/media-grid";
import { PaginationControls } from "@/features/browse/components/pagination-controls";
import { getBrowseView } from "@/features/browse/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { getSessionOrNull } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Browse - LexiFlix",
  description: "Browse movies and TV shows",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params] = await Promise.all([searchParams, getSessionOrNull()]);
  const { results, genreMap, currentGenres, currentPage, totalPages } = await getBrowseView({
    searchParams: params,
  });
  return (
    <>
      <AppTopbar title="Browse" />
      <AppPageShell className="gap-6">
        <section className="space-y-2">
          <AppPageHeader
            heading="Browse"
            description="Explore movies and TV shows, then narrow the catalog by title, genre, and release window."
          />
          <BrowseControls genres={currentGenres} />
        </section>
        <section>
          <PendingSection>
            <MediaGrid results={results} genreMap={genreMap} />
          </PendingSection>
        </section>
        <section className="flex justify-center">
          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        </section>
      </AppPageShell>
    </>
  );
}
