import { Link } from "react-router-dom";

const YEAR = new Date().getFullYear();

const COLUMNS: { heading: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Share your case", to: "/share" },
      { label: "Read stories", to: "/stories" },
      { label: "Know your rights", to: "/#rights" },
      { label: "Patterns", to: "/patterns" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Contact", to: "/contact" },
      { label: "Support us", to: "/#support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy.html", external: true },
      { label: "Terms of Use", to: "/terms.html", external: true },
    ],
  },
];

// A conventional enterprise footer: brand + one-line mission on the
// left, link columns on the right, a rule, then a copyright line.
// Sits on the dark theme so it reads as part of the site's base
// colour, not a bolted-on light bar.
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg text-cream-50">
              <img src="/logo-mark.png" alt="" className="h-6 w-6" />
              Why Fired
            </Link>
            <p className="mt-3 text-sm text-cream-100/50 leading-relaxed max-w-xs">
              Anonymous, verified accounts of wrongful and unclear terminations, shared so others
              can see the pattern and know their rights.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cream-100/40 mb-3">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.label}>
                      <a
                        href={link.to}
                        className="text-sm text-cream-100/70 hover:text-cream-50 transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-cream-100/70 hover:text-cream-50 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cream-100/40">&copy; {YEAR} Why Fired. All rights reserved.</p>
          <p className="text-xs text-cream-100/40">Your identity stays yours.</p>
        </div>
      </div>
    </footer>
  );
}
