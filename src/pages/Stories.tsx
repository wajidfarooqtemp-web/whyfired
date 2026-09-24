import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import StoryCard from "../components/StoryCard";

const PAGE_SIZE = 3;

interface Category {
  id: string;
  name: string;
}

interface CaseRow {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_text: string;
  created_at: string;
  category: { name: string } | null;
}

export default function Stories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
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

  const loadPage = useCallback(async (offset: number, replace: boolean) => {
    let query = supabase
      .from("cases")
      .select("id, role_duties, country, termination_reason, story_text, created_at, category:categories(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (activeCategory) {
      query = query.eq("category_id", activeCategory);
    }

    const { data } = await query;
    const rows = (data as unknown as CaseRow[]) ?? [];

    setCases((prev) => (replace ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    loadPage(0, true).finally(() => setLoading(false));
  }, [loadPage]);

  async function handleSeeMore() {
    setLoadingMore(true);
    await loadPage(cases.length, false);
    setLoadingMore(false);
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-cream-50 mb-2">Stories</h1>
        <p className="text-cream-100/60 text-sm mb-6">
          Anonymous, approved cases from people who chose to share what happened to them.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              activeCategory === null
                ? "bg-cream-50 text-brand-900 border-cream-50"
                : "border-white/20 text-cream-100/80 hover:border-white/40"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                activeCategory === c.id
                  ? "bg-cream-50 text-brand-900 border-cream-50"
                  : "border-white/20 text-cream-100/80 hover:border-white/40"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-cream-100/50 text-sm">Loading...</p>
        ) : cases.length === 0 ? (
          <p className="text-cream-100/50 text-sm">No stories here yet.</p>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <StoryCard key={c.id} c={c} />
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <button
            onClick={handleSeeMore}
            disabled={loadingMore}
            className="mt-6 rounded-full border border-white/20 text-cream-100/80 text-sm px-5 py-2.5 hover:border-white/40 transition-colors disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "See more"}
          </button>
        )}
      </div>
    </div>
  );
}
