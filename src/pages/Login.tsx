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
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-7 pt-9 pb-7 text-center">
        <h1 className="font-display text-2xl text-cream-50 mb-2 leading-snug">
          Say what happened.
          <br />
          Not who you are.
        </h1>
        <p className="text-cream-100/60 text-sm mb-8">
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