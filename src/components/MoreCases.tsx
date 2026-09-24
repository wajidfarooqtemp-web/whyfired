import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";

interface CaseRow {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_text: string;
  created_at: string;
}

const EXCERPT_LENGTH = 220;

// Logged-in visitors only: shows a handful of additional approved
// cases right on the homepage, past the 3 public featured ones, so
// there's more to actually browse without a separate trip to
// /stories first. Renders nothing for logged-out visitors or before
// there's anything approved yet.
export default function MoreCases() {
  const { session } = useAuth();
  const [cases, setCases] = useState<CaseRow[] | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("cases")
        .select("id, role_duties, country, termination_reason, story_text, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!cancelled) setCases(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || !cases || cases.length === 0) return null;

  return (
    <section className="px-5 py-16 border-t border-white/10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <h2 className="font-display text-2xl text-cream-50">More cases</h2>
          <Link to="/stories" className="text-sm text-cream-50 underline underline-offset-2">
            Browse all stories
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => {
            const truncated = c.story_text.length > EXCERPT_LENGTH;
            const excerpt = truncated ? c.story_text.slice(0, EXCERPT_LENGTH) : c.story_text;
            return (
              <Link
                key={c.id}
                to={`/stories/${c.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col hover:border-white/20 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-3">
                  <span>{c.country}</span>
                  <span>&middot;</span>
                  <span>{terminationReasonLabel(c.termination_reason)}</span>
                </div>
                <p className="text-cream-100/80 text-sm leading-relaxed flex-1">
                  {excerpt}
                  {truncated && <span className="text-cream-100/40">...</span>}
                </p>
                <span className="mt-4 text-sm text-cream-50 underline underline-offset-2 self-start">
                  Read the full story
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
