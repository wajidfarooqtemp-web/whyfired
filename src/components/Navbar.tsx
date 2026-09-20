import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Share", href: "#share" },
  { label: "Rights", href: "#rights" },
  { label: "Stories", href: "#stories" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  // Prevent background scroll when the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLinkClick = () => setMenuOpen(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-brand-950/60 border-b border-white/10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-16">
          {/* Logo */}
          <a
            href="#top"
            className="flex items-center gap-2 font-display text-lg sm:text-xl tracking-tight text-cream-50"
          >
            <img src="/logo-mark.png" alt="" className="h-7 w-7" />
            Why Fired
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-9">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-cream-100/80 hover:text-cream-50 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right-side cluster: donate, primary CTA, secondary menu, mobile hamburger */}
          <div className="flex items-center gap-3">
            {/* Donate: intentionally quiet, never competing with the main CTA */}
            <a
              href="#donate"
              className="hidden md:inline-flex items-center rounded-full border border-white/20 text-cream-100/80 text-sm px-4 py-2 hover:text-cream-50 hover:border-white/40 transition-colors"
            >
              Donate
            </a>

            {/* CTA (desktop) */}
            <a
              href="#share"
              className="hidden md:inline-flex items-center rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2.5 hover:bg-white transition-colors"
            >
              Share your case
            </a>

            {/* Secondary pages menu (Privacy, Terms); kept separate so the
                main nav above stays focused on the product itself */}
            <div className="relative">
              <button
                type="button"
                aria-label={legalOpen ? "Close menu" : "More"}
                aria-expanded={legalOpen}
                onClick={() => setLegalOpen((v) => !v)}
                className="flex flex-col items-center justify-center gap-[4px] w-9 h-9"
              >
                <span className="block h-[1.5px] w-5 bg-cream-100/70 rounded-full" />
                <span className="block h-[1.5px] w-5 bg-cream-100/70 rounded-full" />
                <span className="block h-[1.5px] w-5 bg-cream-100/70 rounded-full" />
              </button>

              {legalOpen && (
                <div className="absolute right-0 top-11 min-w-[10rem] rounded-xl border border-white/10 bg-brand-950 shadow-lg py-2">
                  <a
                    href="/privacy.html"
                    className="block px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50"
                    onClick={() => setLegalOpen(false)}
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/terms.html"
                    className="block px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50"
                    onClick={() => setLegalOpen(false)}
                  >
                    Terms of Use
                  </a>
                </div>
              )}
            </div>

            {/* Hamburger (mobile) */}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-[6px]"
            >
              <span
                className={`block h-[2px] w-6 bg-cream-50 rounded-full transition-all duration-300 ${
                  menuOpen ? "rotate-45 translate-y-[8px]" : ""
                }`}
              />
              <span
                className={`block h-[2px] w-6 bg-cream-50 rounded-full transition-all duration-300 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-[2px] w-6 bg-cream-50 rounded-full transition-all duration-300 ${
                  menuOpen ? "-rotate-45 -translate-y-[8px]" : ""
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile overlay menu */}
      <div
        className={`fixed inset-0 z-40 bg-brand-950 md:hidden transition-opacity duration-300 ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className="text-2xl font-display text-cream-50"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#share"
            onClick={handleLinkClick}
            className="mt-4 inline-flex items-center rounded-full bg-cream-50 text-brand-900 font-medium px-7 py-3"
          >
            Share your case
          </a>
          <a
            href="#donate"
            onClick={handleLinkClick}
            className="text-sm text-cream-100/60"
          >
            Donate
          </a>
        </div>
      </div>
    </>
  );
}
