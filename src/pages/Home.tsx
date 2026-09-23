import Hero from "../components/Hero";
import ComingSoonSection from "../components/ComingSoonSection";
import FeaturedCases from "../components/FeaturedCases";
import RightsSection from "../components/RightsSection";
import HowItWorksSection from "../components/HowItWorksSection";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedCases />
      <RightsSection />
      <HowItWorksSection />
      <ComingSoonSection
        id="support"
        title="Support"
        note="Server costs will be covered through Razorpay and PayPal once this is wired up. This is not a registered nonprofit; donations go toward keeping the site running."
      />
    </>
  );
}