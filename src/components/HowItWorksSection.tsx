const STEPS = [
  {
    n: "01",
    title: "Answer a short set of questions",
    body: "About your role, how you were let go, and whether you got the paperwork and process you were entitled to. Takes a few minutes, no employer name required; that's never collected, on purpose.",
  },
  {
    n: "02",
    title: "Get an instant, honest read",
    body: "A plain-language explanation of whether the process your employer followed looks lawful, and specifically which step (if any) appears to have been skipped. No sugar-coating, and no false promises either.",
  },
  {
    n: "03",
    title: "See clear next steps",
    body: "Where to actually go from here: SAMADHAN (the government's labour dispute portal), your state Labour Commissioner, and what paperwork is worth gathering now, before anything else.",
  },
  {
    n: "04",
    title: "Your case stays private, by default",
    body: "It's reviewed before it can appear publicly, and only decides whether it counts toward anonymous pattern data or shows up in Stories. Review never blocks or delays your own read, which stays instant either way.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-white/10 py-24 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl text-cream-50 mb-10 text-center">
          How it works
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6"
            >
              <span className="text-cream-100/30 text-xs font-medium tracking-wide">{step.n}</span>
              <h3 className="font-display text-lg text-cream-50 mt-2 mb-2">{step.title}</h3>
              <p className="text-sm text-cream-100/70 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-cream-100/40 text-center mt-8 leading-relaxed">
          Handled in line with India's DPDP Act, 2023. Nothing here is legal advice from a law
          firm. It's a starting point, and SAMADHAN or a labour advocate is the next step for
          anything formal.
        </p>
      </div>
    </section>
  );
}
