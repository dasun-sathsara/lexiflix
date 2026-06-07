import type { Metadata } from "next";
import { headers } from "next/headers";
import { About } from "@/features/marketing/components/about";
import { Footer } from "@/features/marketing/components/footer";
import { MarketingNavbar } from "@/features/marketing/components/marketing-navbar";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "About LexiFlix | A self-funded startup for learning English from movies & TV",
  description:
    "LexiFlix is a live, early-stage, two-person startup that turns subtitles from movies and TV into level-aware vocabulary study packs with AI-assisted explanations and spaced repetition.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About LexiFlix",
    description:
      "A small, self-funded ed-tech startup helping English learners study real language from movies and TV shows.",
    url: "/about",
    siteName: "LexiFlix",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About LexiFlix",
    description:
      "A small, self-funded ed-tech startup helping English learners study real language from movies and TV shows.",
  },
};

export default async function AboutPage() {
  // Public marketing surface: optional session read only controls signed-in navigation.
  const session = await auth.api.getSession({ headers: await headers() });
  const isLoggedIn = !!session?.user;

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar isLoggedIn={isLoggedIn} />
      <About />
      <Footer />
    </main>
  );
}
