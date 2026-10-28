import { HomeStrip } from "@/features/content/components/banners";
import { getBanners } from "@/features/content/server";
import { FinalCta } from "@/features/home/components/final-cta";
import { Hero } from "@/features/home/components/hero";
import { PortfolioSection } from "@/features/home/components/portfolio-section";
import { ProcessSection } from "@/features/home/components/process-section";
import { ProofSection } from "@/features/home/components/proof-section";
import { ServicesSection } from "@/features/home/components/services-section";
import { TestimonialsSection } from "@/features/home/components/testimonials-section";

export default async function HomePage() {
  return (
    <>
      <Hero />
      <HomeStrip banners={await getBanners("home_strip")} />
      <ServicesSection />
      <PortfolioSection />
      <ProcessSection />
      <ProofSection />
      <TestimonialsSection />
      <FinalCta />
    </>
  );
}
