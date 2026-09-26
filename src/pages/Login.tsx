import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Official Google "G" mark, exactly as Google's own branding
// guidelines specify for third-party "Sign in with Google" buttons.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

// LinkedIn's mark: white "in" on their brand blue, the standard
// treatment for a "Sign in with LinkedIn" button on a dark surface.
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#ffffff" />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13" fill="#0A66C2">
        in
      </text>
    </svg>
  );
}

// The WhyFired mark, redrawn: just the figure and the podium (no
// ring, no torch half, no wordmark), as loose brush strokes instead
// of a solid silhouette — the same "not perfect lines" hand-drawn
// quality as Claude's own illustration, done here with an SVG
// filter that roughens the paths, plus real motion: the raised arm
// gently lifts and settles, and the filter's own noise drifts
// slowly, so the linework itself never sits perfectly still.
function RaisedHandMark() {
  return (
    <svg width="120" height="130" viewBox="0 0 160 200" fill="none" aria-hidden="true">
      <defs>
        <filter id="wfSketch" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={4} result="noise">
            <animate attributeName="baseFrequency" values="0.014;0.026;0.014" dur="6s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#wfSketch)" stroke="#fbf7f2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {/* head */}
        <circle cx="70" cy="42" r="15" />
        {/* torso, left and right contour, two loose strokes rather than a closed shape */}
        <path d="M56 58 C51 72 49 88 51 104 C53 120 58 134 60 150 L61 172" />
        <path d="M82 56 C89 66 92 80 90 96 C88 112 84 126 81 144 L80 170" />
        {/* podium, two open tiers */}
        <path d="M50 172 L50 183 L92 183 L94 170" />
        <path d="M40 183 L40 196 L100 196 L104 178" />
        {/* raised arm, animated: lifts and settles around the shoulder */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-4 83 58; 9 83 58; -4 83 58"
            dur="2.6s"
            repeatCount="indefinite"
          />
          <path d="M83 58 C95 50 106 38 114 24 C116 21 119 19 122 22" />
        </g>
      </g>
    </svg>
  );
}

export default function Login() {
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/share";

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${from}` },
    });
  }

  // Requires the "LinkedIn (OIDC)" provider turned on in Supabase:
  // Authentication -> Providers -> LinkedIn (OIDC), with a Client ID
  // and Client Secret from a LinkedIn app that has the "Sign In with
  // LinkedIn using OpenID Connect" product added. The provider id
  // Supabase expects is exactly "linkedin_oidc" (the older plain
  // "linkedin" provider is deprecated and will not work).
  async function handleLinkedIn() {
    await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}${from}` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 text-center">
        <div className="flex justify-center mb-4">
          <RaisedHandMark />
        </div>

        <h1 className="font-display text-2xl text-cream-50 mb-2 leading-snug">
          Say what happened.
          <br />
          Not who you are.
        </h1>
        <p className="text-cream-100/60 text-sm mb-7">
          Your case stays private until you choose to share it.
        </p>

        <div className="space-y-3 text-left">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-full bg-cream-50 text-brand-900 text-sm font-medium py-3 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs text-cream-100/40 tracking-wide">OR</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <button
            type="button"
            onClick={handleLinkedIn}
            className="w-full flex items-center justify-center gap-3 rounded-full text-sm font-medium py-3 transition-colors"
            style={{ backgroundColor: "#0A66C2", color: "#ffffff" }}
          >
            <LinkedInIcon />
            Continue with LinkedIn
          </button>
        </div>

        <p className="text-cream-100/40 text-xs mt-6 leading-relaxed">
          By continuing, you agree to Why Fired's{" "}
          <a href="/terms.html" className="underline hover:text-cream-100/70">Terms</a> and{" "}
          <a href="/privacy.html" className="underline hover:text-cream-100/70">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}