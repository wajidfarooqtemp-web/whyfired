import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { HomeIcon, PlusSquareIcon, BookIcon, ChartIcon, ShieldIcon } from "./icons";

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy.html" },
  { label: "Terms of Use", href: "/terms.html" },
];

// Desktop nav items, LinkedIn-style: an icon stacked above a small
// label. "route" items highlight when the current path matches;
// "Rights" is a same-page anchor, so it never shows as active.
const NAV_ITEMS = [
  { label: "Home", to: "/", icon: HomeIcon, route: true },
  { label: "Share", to: "/share", icon: PlusSquareIcon, route: true },
  { label: "Stories", to: "/stories", icon: BookIcon, route: true },
  { label: "Patterns", to: "/patterns", icon: ChartIcon, route: true },
  { label: "Rights", to: "/#rights", icon: ShieldIcon, route: false },
] as const;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const { session, profile, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLinkClick = () => setMenuOpen(false);

  function isActive(to: string) {
    return to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-brand-950/60 border-b border-white/10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-16">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg sm:text-xl tracking-tight text-cream-50 shrink-0"
          >
            <img src="/logo-mark.png" alt="" className="h-7 w-7" />
            Why Fired
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.route && isActive(item.to);
              const Icon = item.icon;
              const cls = `flex flex-col items-center gap-0.5 px-3 h-16 justify-center border-b-2 transition-colors ${
                active
                  ? "border-cream-50 text-cream-50"
                  : "border-transparent text-cream-100/70 hover:text-cream-50"
              }`;
              return item.route ? (
                <Link key={item.label} to={item.to} className={cls}>
                  <Icon size={20} filled={active} />
                  <span className="text-[11px] leading-none">{item.label}</span>
                </Link>
              ) : (
                <a key={item.label} href={item.to} className={cls}>
                  <Icon size={20} />
                  <span className="text-[11px] leading-none">{item.label}</span>
                </a>
              );
            })}
            {profile?.is_admin && (
              <Link
                to="/admin"
                className="flex flex-col items-center gap-0.5 px-3 h-16 justify-center border-b-2 border-transparent text-cream-50 hover:text-white"
              >
                <span className="text-[11px] leading-none font-medium">Admin</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-cream-100/60">{profile?.display_name}</span>
                {profile?.is_admin && (
                  <span className="text-[10px] uppercase tracking-wide rounded-full border border-white/20 px-2 py-0.5 text-cream-100/70">
                    Admin
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="ml-1 text-sm text-cream-100/60 hover:text-cream-50 transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex text-sm text-cream-100/70 hover:text-cream-50 transition-colors"
              >
                Log in
              </Link>
            )}

            <a
              href="/#support"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-white/20 text-cream-100/80 text-sm px-3.5 py-2 hover:text-cream-50 hover:border-white/40 transition-colors"
            >
              <span aria-hidden="true">&#9829;</span> Support
            </a>

            <Link
              to="/share"
              className="hidden md:inline-flex items-center rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2.5 hover:bg-white transition-colors"
            >
              Share your case
            </Link>

            <div className="relative hidden md:block">
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
                  <Link
                    to="/how-it-works"
                    className="block px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50"
                    onClick={() => setLegalOpen(false)}
                  >
                    How it works
                  </Link>
                  <Link
                    to="/contact"
                    className="block px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50"
                    onClick={() => setLegalOpen(false)}
                  >
                    Contact
                  </Link>
                  <div className="my-1 border-t border-white/10" />
                  {LEGAL_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50"
                      onClick={() => setLegalOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

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

      <div
        className={`fixed inset-0 z-40 bg-brand-950 md:hidden transition-opacity duration-300 overflow-y-auto ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center min-h-full gap-6 py-16">
          <Link to="/" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Home
          </Link>
          <Link to="/share" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Share
          </Link>
          <Link to="/stories" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Stories
          </Link>
          <a href="/#rights" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Rights
          </a>
          <Link to="/patterns" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Patterns
          </Link>
          <Link to="/how-it-works" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            How it works
          </Link>
          <Link to="/contact" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
            Contact
          </Link>
          {profile?.is_admin && (
            <Link to="/admin" onClick={handleLinkClick} className="text-2xl font-display text-cream-50">
              Admin
            </Link>
          )}

          <Link
            to="/share"
            onClick={handleLinkClick}
            className="mt-3 inline-flex items-center rounded-full bg-cream-50 text-brand-900 font-medium px-7 py-3"
          >
            Share your case
          </Link>
          <a
            href="/#support"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 text-cream-100/80 text-sm px-3.5 py-2"
          >
            <span aria-hidden="true">&#9829;</span> Support
          </a>

          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-cream-100/60">{profile?.display_name}</span>
              {profile?.is_admin && (
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-white/20 px-2 py-0.5 text-cream-100/70">
                  Admin
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  signOut();
                  handleLinkClick();
                }}
                className="text-sm text-cream-100/60"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={handleLinkClick} className="text-sm text-cream-100/70">
              Log in
            </Link>
          )}

          <div className="mt-2 flex items-center gap-6 border-t border-white/10 pt-6">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="text-xs text-cream-100/50"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
