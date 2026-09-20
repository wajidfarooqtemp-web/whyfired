import { useEffect, useState } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

const PILLS = [
  { label: "Share your case", href: "#share" },
  { label: "Know your rights", href: "#rights" },
  { label: "Read stories", href: "#stories" },
  { label: "How it works", href: "#how-it-works" },
];

const TYPED_LINE = "Whatever happened, you don't have to figure it out alone.";

export default function Hero() {
  const { displayed, done } = useTypewriter(TYPED_LINE, 35, 500);
  const [pillsVisible, setPillsVisible] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setPillsVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, [done]);

  return (
    <section
      id="top"
      className="relative min-h-screen w-full overflow-hidden flex items-center"
      style={{
        background:
          "radial-gradient(120% 120% at 15% 10%, #a8241a 0%, #7a140f 32%, #3d0906 68%, #2a0605 100%)",
      }}
    >
      {/* Video: right side, behind a soft gradient so text stays readable */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[58%] lg:w-[52%]">
        <video
          className="h-full w-full object-cover opacity-30 md:opacity-90"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Fade the video into the background on its left edge, and darken
            the bottom slightly so any overlapping text stays legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #2a0605 0%, rgba(42,6,5,0) 30%, rgba(42,6,5,0) 70%, rgba(42,6,5,0.25) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent" />
      </div>

      {/* Text content */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8">
        <div className="max-w-xl pt-24 md:pt-0">
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
              return (
                <a
                  key={pill.href}
                  href={pill.href}
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                    isPrimary
                      ? "bg-cream-50 text-brand-900 hover:bg-white"
                      : "bg-white/5 text-cream-50 border border-white/15 hover:bg-white/10"
                  }`}
                >
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
