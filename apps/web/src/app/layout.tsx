import type { Metadata } from "next";
import { Geist, Inter, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-lexiflix-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "LexiFlix | Pre-Learn Vocabulary from Movies & TV",
  description:
    "LexiFlix analyzes subtitles to build CEFR-aligned vocabulary packs, AI study aids, and spaced-repetition reviews so you can watch with confidence.",
  keywords: [
    "LexiFlix",
    "English learning",
    "language learning",
    "movies",
    "TV shows",
    "vocabulary",
    "flashcards",
    "spaced repetition",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(inter.className, inter.variable, geist.variable, ubuntuMono.variable)}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
