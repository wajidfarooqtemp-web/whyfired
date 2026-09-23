import { Link } from "react-router-dom";

const RED_FLAGS = [
  "You weren't given a specific, documented reason for the termination.",
  "You were dismissed for \"misconduct\" with no formal charge sheet.",
  "There was no enquiry meeting where you could actually respond.",
  "You were laid off with no notice and no severance pay.",
  "You were pressured to resign, though it wasn't really your choice.",
];

export default function RightsSection() {
  return (
    <section id="rights" className="border-t border-white/10 py-24 px-5 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl text-cream-50 mb-3 text-center">
          Know your rights (India)
        </h2>
        <p className="text-cream-100/60 text-sm leading-relaxed text-center mb-10">
          A plain-language starting point, not legal advice. Guides for other countries aren't
          available yet; this section is India-specific for now.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 mb-6">
          <h3 className="font-display text-lg text-cream-50 mb-3">The basic idea</h3>
          <p className="text-sm text-cream-100/75 leading-relaxed mb-3">
            Under the <span className="text-cream-50">Industrial Disputes Act, 1947</span> — still
            the operative law in most states — an employer generally can't dismiss someone for
            "misconduct" without following a fair process first: a documented reason, a formal
            charge sheet, an enquiry where the employee can respond, and a decision that's
            proportionate to what actually happened. A layoff or retrenchment carries its own
            separate requirement: notice (or pay instead of notice) plus compensation.
          </p>
          <p className="text-sm text-cream-100/75 leading-relaxed">
            The newer <span className="text-cream-50">Industrial Relations Code, 2020</span> carries
            these same core protections forward as it rolls out state by state. Many BPO
            terminations skip this process entirely and just call it "misconduct" — that skipped
            step is often exactly what makes a dismissal unlawful.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 mb-6">
          <h3 className="font-display text-lg text-cream-50 mb-4">
            Signs your termination may not have followed the law
          </h3>
          <ul className="space-y-2.5">
            {RED_FLAGS.map((flag) => (
              <li key={flag} className="flex gap-2.5 text-sm text-cream-100/75 leading-relaxed">
                <span className="text-cream-50/40 mt-0.5">&#9670;</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-cream-100/40 mt-5 leading-relaxed">
            Any one of these is worth a closer look — it doesn't automatically mean you'd win a
            dispute, and it isn't a verdict. It's a reason to find out more.
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-cream-100/60 mb-4">
            Answer a few questions about what happened and get an honest, instant read on your
            specific situation.
          </p>
          <Link
            to="/share"
            className="inline-flex items-center rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-6 py-2.5 hover:bg-white transition-colors"
          >
            Check your case
          </Link>
        </div>
      </div>
    </section>
  );
}
