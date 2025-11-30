import { Hero } from "@/components/hero";
import { Logos } from "@/components/logos";
import { Problem } from "@/components/problem";
import { Features } from "@/components/features";
import { Comparison } from "@/components/comparison";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-void text-brand-text selection:bg-brand-lime selection:text-brand-void">
      <Hero />
      <Logos />
      <Problem />
      <Features />
      <Comparison />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
