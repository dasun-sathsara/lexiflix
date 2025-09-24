import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-lexiflix-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-lexiflix-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LexiFlix | Learn English Naturally from Movies & TV",
  description:
    "LexiFlix turns your favorite movies and TV series into immersive English lessons with contextual vocabulary, AI flashcards, and streak-based motivation.",
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
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
