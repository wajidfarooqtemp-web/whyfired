import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ComingSoonSection from "./components/ComingSoonSection";

function App() {
  return (
    <div className="bg-brand-950 min-h-screen">
      <Navbar />
      <Hero />

      {/* Placeholder sections — real content comes in the next stage */}
      <ComingSoonSection
        id="share"
        title="Share your case"
        note="The private questionnaire lives here once we build it. Nothing you enter will ever be linked to your name or your employer's name in public data."
      />
      <ComingSoonSection
        id="rights"
        title="Know your rights"
        note="A plain-language explainer on Indian labour law for BPO workers — what a fair dismissal process looks like, and what to do if yours skipped steps."
      />
      <ComingSoonSection
        id="stories"
        title="Stories"
        note="Anonymous, verified patterns from other cases — shown once there are enough of them to protect anyone's identity."
      />
      <ComingSoonSection
        id="how-it-works"
        title="How it works"
        note="Answer a short set of questions, get an instant, honest read on your situation, and see clear next steps — SAMADHAN, your state labour commissioner, and more."
      />
      <ComingSoonSection
        id="contact"
        title="Contact"
        note="A way to reach the team will go here."
      />
    </div>
  );
}

export default App;
