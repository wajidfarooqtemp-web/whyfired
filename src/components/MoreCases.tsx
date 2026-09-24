import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import StoryCard from "../components/StoryCard";

interface CaseRow {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_text: string;
  created_at: string;
  category: { name: string } | null;
}

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
        .select("id, role_duties, country, termination_reason, story_text, created_at, category:categories(name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!cancelled) setCases((data as unknown as CaseRow[]) ?? []);
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

        <div className="grid gap-5 sm:grid-cols-2 items-start">
          {cases.map((c) => (
            <StoryCard key={c.id} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
