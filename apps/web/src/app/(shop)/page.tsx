import { HeroSection } from "@/components/home/hero-section";
import { UspStrip } from "@/components/home/usp-strip";
import { PopularItemsSection } from "@/components/home/popular-items-section";
import { ComboHighlightSection } from "@/components/home/combo-highlight-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { LocalAreaCallout } from "@/components/home/local-area-callout";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <UspStrip />
      <PopularItemsSection />
      <ComboHighlightSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <LocalAreaCallout />
    </main>
  );
}
