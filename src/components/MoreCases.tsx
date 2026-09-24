import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import FeedList from "./FeedList";
import type { FeedCase } from "./FeedPost";

// Logged-in visitors only: the latest approved stories as a vertical
// feed right on the homepage, with voting and comments in place.
// Logged-out visitors see FeaturedCases instead.
export default function MoreCases() {
  const { session } = useAuth();
  const [cases, setCases] = useState<FeedCase[] | null>(null);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const { data } = await supabase
        .from("cases")
        .select("id, country, termination_reason, story_text, created_at, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting, category:categories(name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      setCases((data as unknown as FeedCase[]) ?? []);
    }

    load();
  }, [session]);

  if (!session || !cases || cases.length === 0) return null;

  return (
    <section id="stories" className="relative bg-feed-bg px-3 sm:px-5 pt-24 pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-950 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-950 to-transparent" />
      <div className="relative max-w-[640px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4 px-1">
          <h2 className="font-display text-2xl text-ink">Latest stories</h2>
          <Link to="/stories" className="text-sm text-brand-700 font-medium hover:underline">
            Browse all stories
          </Link>
        </div>
        <FeedList cases={cases} />
      </div>
    </section>
  );
}
