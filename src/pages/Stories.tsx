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
  const [pinnedCase, setPinnedCase] = useState<FeedCase | null>(null);
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

  // The pinned story (at most one, see migration 016) is fetched on
  // its own, outside the category filter and pagination below, since
  // it always shows first regardless of which category is active.
  const loadPinned = useCallback(async () => {
    const { data } = await supabase
      .from("cases")
      .select(
        "id, country, termination_reason, story_text, created_at, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting, posted_as_official, is_featured, is_pinned, category:categories(name)"
      )
      .eq("status", "approved")
      .eq("is_pinned", true)
      .maybeSingle();
    setPinnedCase((data as unknown as FeedCase) ?? null);
  }, []);

  useEffect(() => {
    loadPinned();
  }, [loadPinned]);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      let query = supabase
        .from("cases")
        .select(
          "id, country, termination_reason, story_text, created_at, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting, posted_as_official, is_featured, is_pinned, category:categories(name)"
        )
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

  // Pinning/unpinning from any card (this page's list or the pinned
  // slot above it) needs both pieces of local state to agree on which
  // one story is pinned, without a full reload. Re-fetching just the
  // pinned slot is the simplest way to stay correct: it picks up
  // whichever story the database's own single-pin trigger settled on.
  function handlePinChanged(id: string, pinned: boolean) {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, is_pinned: pinned };
        return pinned ? { ...c, is_pinned: false } : c;
      })
    );
    loadPinned();
  }

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm border transition-colors ${
      active
        ? "bg-brand-700 text-cream-50 border-brand-700"
        : "bg-feed-card border-feed-line text-ink-soft hover:border-brand-600"
    }`;

  const visibleCases = cases.filter((c) => c.id !== pinnedCase?.id);

  return (
    <div className="min-h-screen bg-feed-bg px-3 sm:px-5 pt-24 pb-16">
      {/* True two-colour gradient (both stops opaque), not a fade to
          transparent: fading an opaque colour to "transparent" makes
          the browser wash the middle out toward white, which is what
          created the pale band here before. */}
      <div
        aria-hidden="true"
        className="pointer-events-none -mx-3 sm:-mx-5 -mt-24 h-40"
        style={{ background: "linear-gradient(to bottom, var(--color-brand-950), var(--color-feed-bg))" }}
      />
      <div className="max-w-[640px] mx-auto -mt-16">
        <div className="rounded-xl border border-feed-line bg-feed-card shadow-[0_1px_3px_rgba(61,9,6,0.08)] px-4 py-4 mb-2">
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

        {pinnedCase && (
          <div className="mb-3">
            <FeedList cases={[pinnedCase]} onPinChanged={handlePinChanged} />
          </div>
        )}

        {loading ? (
          <p className="text-ink-soft text-sm px-1">Loading...</p>
        ) : visibleCases.length === 0 ? (
          !pinnedCase && <p className="text-ink-soft text-sm px-1">No stories here yet.</p>
        ) : (
          <FeedList cases={visibleCases} onPinChanged={handlePinChanged} />
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