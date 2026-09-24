import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";
import { UserIcon } from "./icons";

interface FeaturedCase {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_excerpt: string;
  story_truncated: boolean;
  created_at: string;
}

// Logged-out visitors only. Logged-in visitors get the full feed
// (MoreCases) instead, which already contains these cases, so they
// never see the same story twice.
export default function FeaturedCases() {
  const [cases, setCases] = useState<FeaturedCase[] | null>(null);
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading || session) return;
    let cancelled = false;

    async function load() {
      // Public view, readable by anyone. Everything else on the
      // site still requires an account.
      const { data } = await supabase
        .from("featured_cases_public")
        .select("id, role_duties, country, termination_reason, story_excerpt, story_truncated, created_at");
      if (!cancelled) setCases(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  if (loading || session || !cases || cases.length === 0) return null;

  return (
    <section id="cases" className="bg-feed-bg px-3 sm:px-5 py-14 sm:py-20">
      <div className="max-w-[640px] mx-auto">
        <div className="mb-5 px-1">
          <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2">Some of what people have shared</h2>
          <p className="text-ink-soft text-sm leading-relaxed">
            These are real cases, reviewed before appearing here. No names, no employers, just what
            happened. Log in to read the full story, join the conversation, or share your own.
          </p>
        </div>

        <div className="space-y-2">
          {cases.map((c) => (
            <article key={c.id} className="rounded-xl border border-feed-line bg-feed-card shadow-sm p-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-12 h-12 rounded-full bg-brand-700 text-cream-50 flex items-center justify-center">
                  <UserIcon size={26} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">Shared anonymously</div>
                  <div className="text-xs text-ink-soft leading-snug">
                    {c.country} &middot; {terminationReasonLabel(c.termination_reason)}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">
                {c.story_excerpt}
                {c.story_truncated && <span className="text-ink-soft">...</span>}
              </p>

              <div className="mt-3 border-t border-feed-line pt-3">
                <Link
                  to="/login"
                  state={{ from: { pathname: `/stories/${c.id}` } }}
                  className="inline-flex rounded-full bg-brand-700 text-cream-50 text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
                >
                  Log in to read the full story
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
