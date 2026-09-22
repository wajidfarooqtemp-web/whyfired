import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTypewriter } from "../hooks/useTypewriter";

const PILLS = [
  { label: "Share your case", href: "/share", isRoute: true },
  { label: "Know your rights", href: "#rights", isRoute: false },
  { label: "Read stories", href: "#stories", isRoute: false },
  { label: "How it works", href: "#how-it-works", isRoute: false },
];

const TYPED_LINE = "Whatever happened, you don't have to figure it out alone.";

export default function Hero() {
  const { displayed, done } = useTypewriter(TYPED_LINE, 35, 500);
  const [pillsVisible, setPillsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setPillsVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, [done]);

  // Some mobile browsers ignore the JSX `muted` attribute on first paint,
  // which silently blocks autoplay. Setting it imperatively fixes that.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-screen w-full overflow-hidden flex items-center pt-20 pb-10"
    >
      {/* Single full-bleed video behind everything, no boxed edge */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "75% center" }}
        autoPlay
        muted
        loop
        playsInline
        poster="/hero-poster.jpg"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* One continuous gradient: opaque over the text, fading toward the
          character on the right. Same gradient at every screen size, so
          there is never a hard seam. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #2a0605 0%, #2a0605 42%, rgba(42,6,5,0.8) 58%, rgba(42,6,5,0.3) 78%, rgba(42,6,5,0.1) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-brand-950/30" />

      {/* Text content */}
      <div className="relative z-10 w-full mx-auto px-5 sm:px-8 max-w-7xl md:max-w-5xl lg:max-w-4xl">
        <div className="max-w-xl">
          {/* Blurred intro label */}
          <div className="inline-block rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 mb-8">
            <p className="text-[13px] leading-relaxed text-cream-100/60 max-w-[15em]">
              A private, judgment-free way to understand what happened;
              and where you stand.
            </p>
          </div>

          {/* Typewriter headline */}
          <h1 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.2] text-cream-50 min-h-[3.6em] sm:min-h-[2.7em]">
            {displayed}
            <span
              className="inline-block w-[2px] h-[0.9em] bg-cream-50 ml-1 align-middle animate-pulse"
              aria-hidden="true"
            />
          </h1>

          {/* Supporting line, appears once typing finishes */}
          <p
            className={`mt-5 text-cream-100/70 text-base sm:text-lg max-w-md transition-opacity duration-700 ${
              done ? "opacity-100" : "opacity-0"
            }`}
          >
            Answer a few honest questions about how it happened. We'll tell
            you plainly where things stand.
          </p>

          {/* Pill buttons */}
          <div
            className={`mt-9 flex flex-wrap gap-3 transition-all duration-700 ${
              pillsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          >
            {PILLS.map((pill, i) => {
              const isPrimary = i === 0;
              const className = `rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                isPrimary
                  ? "bg-cream-50 text-brand-900 hover:bg-white"
                  : "bg-white/5 text-cream-50 border border-white/15 hover:bg-white/10"
              }`;
              const style = { transitionDelay: `${i * 90}ms` };
              return pill.isRoute ? (
                <Link key={pill.href} to={pill.href} style={style} className={className}>
                  {pill.label}
                </Link>
              ) : (
                <a key={pill.href} href={pill.href} style={style} className={className}>
                  {pill.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
