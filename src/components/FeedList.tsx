import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import FeedPost, { type FeedCase, type FeedMeta, type PreviewComment } from "./FeedPost";

const EMPTY_META: FeedMeta = { score: 0, my_vote: 0, comment_count: 0 };

interface MetaRow {
  case_id: string;
  score: number;
  my_vote: number;
  comment_count: number;
}

interface PreviewRow {
  case_id: string;
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

// Renders a vertical feed and owns the per-post extras (scores, your
// vote, comment counts, latest-comment previews). Those are fetched in
// two batched calls for the whole page, not one call per post, and
// only for posts not fetched before, so "See more" stays cheap.
export default function FeedList({ cases }: { cases: FeedCase[] }) {
  const [meta, setMeta] = useState<Record<string, FeedMeta>>({});
  const [previews, setPreviews] = useState<Record<string, PreviewComment>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missing = cases.map((c) => c.id).filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));

    async function load() {
      const [metaRes, previewRes] = await Promise.all([
        supabase.rpc("get_feed_meta", { p_case_ids: missing }),
        supabase.rpc("get_feed_previews", { p_case_ids: missing }),
      ]);

      if (metaRes.error) missing.forEach((id) => requested.current.delete(id));

      const metaRows = (metaRes.data as MetaRow[] | null) ?? [];
      const previewRows = (previewRes.data as PreviewRow[] | null) ?? [];

      setMeta((prev) => {
        const next = { ...prev };
        for (const r of metaRows) {
          next[r.case_id] = { score: r.score, my_vote: r.my_vote, comment_count: r.comment_count };
        }
        return next;
      });
      setPreviews((prev) => {
        const next = { ...prev };
        for (const r of previewRows) {
          next[r.case_id] = { id: r.id, body: r.body, created_at: r.created_at, author_name: r.author_name };
        }
        return next;
      });
    }

    load();
  }, [cases]);

  function handleMeta(id: string, patch: Partial<FeedMeta>) {
    setMeta((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_META), ...patch } }));
  }

  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <FeedPost
          key={c.id}
          c={c}
          meta={meta[c.id] ?? EMPTY_META}
          preview={previews[c.id] ?? null}
          onMeta={handleMeta}
        />
      ))}
    </div>
  );
}
