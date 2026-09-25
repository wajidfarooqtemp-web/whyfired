import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7">
        <h1 className="font-display text-2xl text-cream-50 mb-1">Log in</h1>
        <p className="text-cream-100/60 text-sm mb-6">
          Your case stays private until you choose to share it.
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-lg border border-white/20 text-cream-50 text-sm py-2.5 hover:border-white/40 transition-colors"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={handleLinkedIn}
            className="w-full rounded-lg border border-white/20 text-cream-50 text-sm py-2.5 hover:border-white/40 transition-colors"
          >
            Continue with LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}