import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import FeedList from "../components/FeedList";
import type { FeedCase } from "../components/FeedPost";

const PAGE_SIZE = 5;

interface Category {
  id: string;
  name: string;
}

export default function Stories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cases, setCases] = useState<FeedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      let query = supabase
        .from("cases")
        .select("id, country, termination_reason, story_text, created_at, category:categories(name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (activeCategory) {
        query = query.eq("category_id", activeCategory);
      }

      const { data } = await query;
      const rows = (data as unknown as FeedCase[]) ?? [];

      setCases((prev) => (replace ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
    },
    [activeCategory]
  );

  useEffect(() => {
    setLoading(true);
    loadPage(0, true).finally(() => setLoading(false));
  }, [loadPage]);

  async function handleSeeMore() {
    setLoadingMore(true);
    await loadPage(cases.length, false);
    setLoadingMore(false);
  }

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm border transition-colors ${
      active
        ? "bg-brand-700 text-cream-50 border-brand-700"
        : "bg-feed-card border-feed-line text-ink-soft hover:border-brand-600"
    }`;

  return (
    <div className="min-h-screen bg-feed-bg px-3 sm:px-5 pt-24 pb-16">
      <div className="max-w-[640px] mx-auto">
        <div className="rounded-xl border border-feed-line bg-feed-card shadow-sm px-4 py-4 mb-2">
          <h1 className="font-display text-2xl text-ink mb-1">Stories</h1>
          <p className="text-ink-soft text-sm mb-4">
            Anonymous, approved cases from people who chose to share what happened to them.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveCategory(null)} className={pill(activeCategory === null)}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={pill(activeCategory === c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-ink-soft text-sm px-1">Loading...</p>
        ) : cases.length === 0 ? (
          <p className="text-ink-soft text-sm px-1">No stories here yet.</p>
        ) : (
          <FeedList cases={cases} />
        )}

        {!loading && hasMore && (
          <button
            onClick={handleSeeMore}
            disabled={loadingMore}
            className="mt-3 w-full rounded-xl border border-feed-line bg-feed-card text-ink-soft text-sm font-medium py-3 hover:border-brand-600 transition-colors disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "See more stories"}
          </button>
        )}
      </div>
    </div>
  );
}
