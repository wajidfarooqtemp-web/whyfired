import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";

export interface StoryCardCase {
  id: string;
  country: string;
  termination_reason: string;
  story_text: string;
  category?: { name: string } | null;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
}

const EXCERPT_LENGTH = 220;

// One story, fully usable in place: "Read more" expands the story
// text, and the Comments button opens the thread and the comment
// box without leaving the page. Used on /stories and on the
// logged-in homepage. Only rendered for logged-in visitors, since
// comments are login-only.
export default function StoryCard({ c }: { c: StoryCardCase }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLong = c.story_text.length > EXCERPT_LENGTH;
  const shownText = expanded || !isLong ? c.story_text : c.story_text.slice(0, EXCERPT_LENGTH) + "...";

  // Comment count up front, so the button says something useful
  // before it is opened.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("case_id", c.id)
      .eq("status", "visible")
      .then(({ count: n }) => {
        if (!cancelled) setCount(n ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [c.id]);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, author:profiles(display_name)")
      .eq("case_id", c.id)
      .eq("status", "visible")
      .order("created_at");
    const rows = (data as unknown as CommentRow[]) ?? [];
    setComments(rows);
    setCount(rows.length);
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) loadComments();
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (commentText.trim().length === 0) return;

    setPosting(true);
    const { error: invokeError } = await supabase.functions.invoke("submit-comment", {
      body: { case_id: c.id, body: commentText.trim() },
    });
    setPosting(false);

    if (invokeError) {
      const context = (invokeError as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setError(body?.error ?? "Could not post your comment. Please try again.");
      return;
    }

    setCommentText("");
    loadComments();
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-2">
        <span>{c.country}</span>
        <span>&middot;</span>
        <span>{terminationReasonLabel(c.termination_reason)}</span>
        {c.category && (
          <>
            <span>&middot;</span>
            <span className="text-cream-100/70">{c.category.name}</span>
          </>
        )}
      </div>

      <p className="text-cream-50 text-sm leading-relaxed whitespace-pre-wrap">{shownText}</p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm text-cream-100/70 underline underline-offset-2 self-start hover:text-cream-50"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={showComments}
          className="rounded-full border border-white/20 text-cream-100/80 px-4 py-1.5 hover:border-white/40 transition-colors"
        >
          {showComments ? "Hide comments" : count === null ? "Comments" : `Comments (${count})`}
        </button>
        <Link to={`/stories/${c.id}`} className="text-cream-100/60 underline underline-offset-2 hover:text-cream-50">
          Open full case
        </Link>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <form onSubmit={handleComment} className="mb-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment"
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none"
            />
            {error && <p className="text-sm text-red-300 mt-1">{error}</p>}
            <button
              type="submit"
              disabled={posting}
              className="mt-2 rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2 hover:bg-white transition-colors disabled:opacity-60"
            >
              {posting ? "Posting..." : "Post comment"}
            </button>
          </form>

          {comments === null ? (
            <p className="text-cream-100/50 text-sm">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-cream-100/50 text-sm">No comments yet. Be the first.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((cm) => (
                <div key={cm.id} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                  <div className="text-xs text-cream-100/50 mb-1">{cm.author?.display_name ?? "Anonymous"}</div>
                  <p className="text-cream-50 text-sm leading-relaxed whitespace-pre-wrap">{cm.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
