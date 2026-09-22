import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/share";

  if (!session) {
    navigate("/login", { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 3 || trimmedName.length > 24) {
      setError("Display name should be 3 to 24 characters.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .insert({ id: session!.user.id, display_name: trimmedName });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setError("That name is taken. Try another.");
      } else {
        setError("Couldn't save that name. Please try again.");
      }
      return;
    }

    await refreshProfile();
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7">
        <h1 className="font-display text-2xl text-cream-50 mb-1">Choose a display name</h1>
        <p className="text-cream-100/60 text-sm mb-6">
          This is what others see; never your real name or email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none"
          />

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-cream-50 text-brand-900 text-sm font-medium py-2.5 hover:bg-white transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
