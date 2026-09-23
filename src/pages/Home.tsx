import Hero from "../components/Hero";
import ComingSoonSection from "../components/ComingSoonSection";
import FeaturedCases from "../components/FeaturedCases";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedCases />

      {/* Placeholder sections; real content comes in as each stage is built */}
      <ComingSoonSection
        id="rights"
        title="Know your rights (India)"
        note="A plain-language explainer on Indian labour law; what a fair dismissal process looks like, and what to do if yours skipped steps. Guides for other countries aren't available yet; this section is India-specific for now."
      />
      <ComingSoonSection
        id="how-it-works"
        title="How it works"
        note="Answer a short set of questions, get an instant, honest read on your situation, and see clear next steps; SAMADHAN, your state labour commissioner, and more."
      />
      <ComingSoonSection
        id="support"
        title="Support"
        note="Server costs will be covered through Razorpay and PayPal once this is wired up. This is not a registered nonprofit; donations go toward keeping the site running."
      />
    </>
  );
}
