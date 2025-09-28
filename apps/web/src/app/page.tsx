import { CallToActionSection } from "@/features/marketing/components/call-to-action";
import { FAQSection } from "@/features/marketing/components/faq";
import { FeaturesSection } from "@/features/marketing/components/features";
import { Footer } from "@/features/marketing/components/footer";
import { HomeHero } from "@/features/marketing/components/home-hero";
import { MarketingNavbar } from "@/features/marketing/components/marketing-navbar";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar />
      <HomeHero />

      <FeaturesSection />

      <div className="relative flex h-[50rem] w-full items-center justify-center bg-white dark:bg-black">
        <div
          className={cn(
            "absolute inset-0",
            "[background-size:18px_18px]",
            "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          )}
        />
        {/* Radial gradient for the container to give a faded look */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"></div>
        <p className="relative z-20 bg-gradient-to-b from-neutral-200 to-neutral-500 bg-clip-text py-8 text-4xl font-bold text-transparent sm:text-7xl">
          <CallToActionSection />
        </p>
      </div>

      <FAQSection />
      <Footer />
    </main>
  );
}
