import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";

interface FeaturedCase {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_excerpt: string;
  story_truncated: boolean;
  created_at: string;
}

export default function FeaturedCases() {
  const [cases, setCases] = useState<FeaturedCase[] | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Public view, readable by anyone whether logged in or not.
      // Everything else on the site still requires an account.
      const { data } = await supabase
        .from("featured_cases_public")
        .select("id, role_duties, country, termination_reason, story_excerpt, story_truncated, created_at");
      if (!cancelled) setCases(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing featured yet: render nothing rather than an empty section.
  if (!cases || cases.length === 0) return null;

  return (
    <section id="cases" className="px-5 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl text-cream-50 mb-3">
            Some of what people have shared
          </h2>
          <p className="text-cream-100/60 text-sm leading-relaxed">
            These are real cases, reviewed before appearing here. No names, no employers, just
            what happened. Log in to read the full story, join the conversation, or share your own.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-3">
                <span>{c.country}</span>
                <span>&middot;</span>
                <span>{terminationReasonLabel(c.termination_reason)}</span>
              </div>

              <p className="text-cream-100/80 text-sm leading-relaxed flex-1">
                {c.story_excerpt}
                {c.story_truncated && <span className="text-cream-100/40">&hellip;</span>}
              </p>

              {session ? (
                <Link
                  to={`/stories/${c.id}`}
                  className="mt-4 inline-flex text-sm text-cream-50 underline underline-offset-2 self-start"
                >
                  Read the full story
                </Link>
              ) : (
                <Link
                  to="/login"
                  state={{ from: { pathname: `/stories/${c.id}` } }}
                  className="mt-4 inline-flex text-sm text-cream-50 underline underline-offset-2 self-start"
                >
                  Log in to read the full story
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
