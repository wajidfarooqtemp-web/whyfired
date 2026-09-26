import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";
import { UserIcon, VerifiedBadge } from "./icons";

interface FeaturedCase {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_excerpt: string;
  story_truncated: boolean;
  posted_as_official: boolean;
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
        .select("id, role_duties, country, termination_reason, story_excerpt, story_truncated, posted_as_official, created_at");
      if (!cancelled) setCases(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  if (loading || session || !cases || cases.length === 0) return null;

  return (
    <section
      id="cases"
      className="bg-feed-bg shadow-[inset_0_16px_24px_-20px_rgba(0,0,0,0.55)]"
    >
      <div className="max-w-[640px] mx-auto px-3 sm:px-5 py-10">
        <div className="mb-5 px-1">
          <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2">Some of what people have shared</h2>
          <p className="text-ink-soft text-sm leading-relaxed">
            These are real cases, reviewed before appearing here. No names, no employers, just what
            happened. Log in to read the full story, join the conversation, or share your own.
          </p>
        </div>

        <div className="space-y-2">
          {cases.map((c) => (
            <article key={c.id} className="rounded-xl border border-feed-line bg-feed-card shadow-[0_1px_3px_rgba(61,9,6,0.08)] p-4">
              <div className="flex gap-3">
                {c.posted_as_official ? (
                  <img src="/logo-mark.png" alt="" className="shrink-0 w-12 h-12 rounded-full bg-brand-700 object-cover" />
                ) : (
                  <div className="shrink-0 w-12 h-12 rounded-full bg-brand-700 text-cream-50 flex items-center justify-center">
                    <UserIcon size={26} />
                  </div>
                )}
                <div>
                  {c.posted_as_official ? (
                    <div className="flex items-center gap-1 text-sm font-semibold text-ink">
                      Why Fired
                      <VerifiedBadge size={15} />
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-ink">Shared anonymously</div>
                  )}
                  <div className="text-xs text-ink-soft leading-snug">
                    {c.posted_as_official ? (
                      "whyfired.com"
                    ) : (
                      <>{c.country} &middot; {terminationReasonLabel(c.termination_reason)}</>
                    )}
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