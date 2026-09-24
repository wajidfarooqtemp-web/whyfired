import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";
import { ArrowUpIcon, ArrowDownIcon, CommentIcon, OpenIcon, UserIcon } from "./icons";

export interface FeedCase {
  id: string;
  country: string;
  termination_reason: string;
  story_text: string;
  created_at: string;
  category?: { name: string } | null;
}

export interface FeedMeta {
  score: number;
  my_vote: number; // -1, 0, or 1
  comment_count: number;
}

export interface PreviewComment {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

interface ThreadComment {
  id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
}

const COLLAPSED_LENGTH = 280;

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 30) return `${Math.floor(s / (86400 * 7))}w`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "";
  return (
    <div
      className="shrink-0 rounded-full bg-brand-700 text-cream-50 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial || <UserIcon size={size * 0.55} />}
    </div>
  );
}

function CommentBubble({ name, body, createdAt }: { name: string | null; body: string; createdAt: string }) {
  return (
    <div className="flex gap-2">
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-feed-bg/70 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink truncate">{name ?? "Anonymous"}</span>
          <span className="text-xs text-ink-soft shrink-0">{timeAgo(createdAt)}</span>
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">{body}</p>
      </div>
    </div>
  );
}

interface Props {
  c: FeedCase;
  meta: FeedMeta;
  preview: PreviewComment | null;
  onMeta: (id: string, patch: Partial<FeedMeta>) => void;
}

// One post in the feed, laid out like a professional-network post:
// header, text with "...more", a vote/comment action bar, and a
// comment area with a preview and a "See N more comments" link.
export default function FeedPost({ c, meta, preview, onMeta }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ThreadComment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const isLong = c.story_text.length > COLLAPSED_LENGTH;
  const collapsedText = c.story_text.slice(0, COLLAPSED_LENGTH).trimEnd();

  // ---- voting -------------------------------------------------
  // Idempotent by design: we send the state we want (1, -1, 0), the
  // database keeps one row per user and case, and the server's
  // answer replaces our optimistic guess. One request at a time.
  async function castVote(next: 1 | -1) {
    if (voting) return;
    const before = { my_vote: meta.my_vote, score: meta.score };
    const target = before.my_vote === next ? 0 : next;

    setVoting(true);
    setVoteError(null);
    onMeta(c.id, { my_vote: target, score: before.score + (target - before.my_vote) });

    const { data, error } = await supabase.rpc("set_case_vote", {
      p_case_id: c.id,
      p_value: target,
    });
    setVoting(false);

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      onMeta(c.id, before);
      setVoteError("Could not save your vote.");
      return;
    }
    onMeta(c.id, { my_vote: row.my_vote, score: row.score });
  }

  // ---- comments -----------------------------------------------
  async function loadThread() {
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, author:profiles(display_name)")
      .eq("case_id", c.id)
      .eq("status", "visible")
      .order("created_at");
    const rows = (data as unknown as ThreadComment[]) ?? [];
    setThread(rows);
    onMeta(c.id, { comment_count: rows.length });
  }

  function openThread() {
    setOpen(true);
    if (thread === null) loadThread();
  }

  function toggleComments() {
    if (open) setOpen(false);
    else openThread();
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setCommentError(null);
    const text = commentText.trim();
    if (text.length === 0 || posting) return;

    setPosting(true);
    const { error } = await supabase.functions.invoke("submit-comment", {
      body: { case_id: c.id, body: text },
    });
    setPosting(false);

    if (error) {
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setCommentError(body?.error ?? "Could not post your comment. Please try again.");
      return;
    }

    setCommentText("");
    await loadThread();
  }

  // Preview shown while the thread is closed: the newest comment.
  const lastLoaded = thread && thread.length > 0 ? thread[thread.length - 1] : null;
  const previewName = lastLoaded ? lastLoaded.author?.display_name ?? null : preview?.author_name ?? null;
  const previewBody = lastLoaded ? lastLoaded.body : preview?.body ?? null;
  const previewTime = lastLoaded ? lastLoaded.created_at : preview?.created_at ?? null;
  const moreCount = Math.max(0, meta.comment_count - 1);

  const upActive = meta.my_vote === 1;
  const downActive = meta.my_vote === -1;

  return (
    <article className="rounded-xl border border-feed-line bg-feed-card shadow-sm">
      {/* Header */}
      <div className="flex gap-3 px-4 pt-4">
        <Avatar size={48} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Shared anonymously</div>
          <div className="text-xs text-ink-soft leading-snug">
            {c.country} &middot; {terminationReasonLabel(c.termination_reason)}
          </div>
          <div className="text-xs text-ink-soft leading-snug">
            {timeAgo(c.created_at)}
            {c.category ? <> &middot; {c.category.name}</> : null}
          </div>
        </div>
      </div>

      {/* Story text */}
      <div className="px-4 pt-3 pb-3">
        <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">
          {expanded || !isLong ? c.story_text : collapsedText + "... "}
          {isLong && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-ink-soft hover:text-brand-600 hover:underline"
            >
              more
            </button>
          )}
        </p>
        {isLong && expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-1 text-sm text-ink-soft hover:text-brand-600 hover:underline"
          >
            show less
          </button>
        )}
      </div>

      {/* Counts */}
      {(meta.comment_count > 0 || meta.score !== 0) && (
        <div className="flex items-center justify-between px-4 pb-2 text-xs text-ink-soft">
          <span>
            {meta.score} {Math.abs(meta.score) === 1 ? "point" : "points"}
          </span>
          {meta.comment_count > 0 && (
            <button type="button" onClick={openThread} className="hover:text-brand-600 hover:underline">
              {meta.comment_count} {meta.comment_count === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="mx-4 border-t border-feed-line py-1.5 flex flex-wrap items-center gap-1">
        <div className="flex items-center rounded-full bg-black/5">
          <button
            type="button"
            onClick={() => castVote(1)}
            disabled={voting}
            aria-pressed={upActive}
            aria-label="Upvote"
            className={`rounded-full p-2 transition-colors hover:bg-black/5 ${
              upActive ? "text-brand-600" : "text-ink-soft"
            }`}
          >
            <ArrowUpIcon size={18} filled={upActive} />
          </button>
          <span className="min-w-[1.5rem] text-center text-sm font-medium text-ink tabular-nums">{meta.score}</span>
          <button
            type="button"
            onClick={() => castVote(-1)}
            disabled={voting}
            aria-pressed={downActive}
            aria-label="Downvote"
            className={`rounded-full p-2 transition-colors hover:bg-black/5 ${
              downActive ? "text-slate-600" : "text-ink-soft"
            }`}
          >
            <ArrowDownIcon size={18} filled={downActive} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={open}
          className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-black/5 transition-colors"
        >
          <CommentIcon size={18} />
          Comment
        </button>

        <Link
          to={`/stories/${c.id}`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-black/5 transition-colors"
        >
          <OpenIcon size={18} />
          Open
        </Link>
      </div>
      {voteError && <p className="px-4 pb-2 text-xs text-red-700">{voteError}</p>}

      {/* Comment area */}
      <div className="px-4 pb-4 pt-2">
        {open ? (
          <>
            <form onSubmit={handleComment} className="flex gap-2 items-start mb-3">
              <Avatar size={32} />
              <div className="flex-1 min-w-0">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-feed-line bg-white px-4 py-2 text-sm text-ink placeholder-ink-soft/70 focus:border-brand-600 outline-none resize-none"
                />
                {commentError && <p className="text-xs text-red-700 mt-1">{commentError}</p>}
                {commentText.trim().length > 0 && (
                  <button
                    type="submit"
                    disabled={posting}
                    className="mt-2 rounded-full bg-brand-700 text-cream-50 text-sm font-medium px-4 py-1.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                )}
              </div>
            </form>

            {thread === null ? (
              <p className="text-sm text-ink-soft">Loading comments...</p>
            ) : thread.length === 0 ? (
              <p className="text-sm text-ink-soft">No comments yet. Be the first.</p>
            ) : (
              <div className="space-y-3">
                {[...thread].reverse().map((cm) => (
                  <CommentBubble
                    key={cm.id}
                    name={cm.author?.display_name ?? null}
                    body={cm.body}
                    createdAt={cm.created_at}
                  />
                ))}
              </div>
            )}
          </>
        ) : previewBody && previewTime ? (
          <div className="space-y-2">
            <CommentBubble name={previewName} body={previewBody} createdAt={previewTime} />
            {moreCount > 0 && (
              <button
                type="button"
                onClick={openThread}
                className="ml-10 text-xs font-medium text-ink-soft hover:text-brand-600 hover:underline"
              >
                See {moreCount} more {moreCount === 1 ? "comment" : "comments"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
