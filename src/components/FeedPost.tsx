import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";
import { ArrowUpIcon, ArrowDownIcon, CommentIcon, TrashIcon, UserIcon } from "./icons";

export interface FeedCase {
  id: string;
  country: string;
  termination_reason: string;
  story_text: string;
  created_at: string;
  category?: { name: string } | null;
  got_notice_or_severance?: boolean | null;
  got_charge_sheet?: boolean | null;
  had_enquiry_meeting?: boolean | null;
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
  edited_at: string | null;
  user_id: string;
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

// 999 -> "999", 1200 -> "1.2k", 15300 -> "15.3k"
function formatCount(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  const k = Math.round(abs / 100) / 10;
  return `${n < 0 ? "-" : ""}${k}k`;
}

function yesNo(v: boolean | null | undefined) {
  if (v === null || v === undefined) return "Not sure";
  return v ? "Yes" : "No";
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

function CommentBubble({
  name,
  createdAt,
  edited,
  children,
  footer,
}: {
  name: string | null;
  createdAt: string;
  edited?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg rounded-tl-none bg-feed-bg px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink truncate">{name ?? "Anonymous"}</span>
            <span className="text-xs text-ink-soft shrink-0">
              {timeAgo(createdAt)}
              {edited ? " \u00b7 edited" : ""}
            </span>
          </div>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

// One comment inside an opened thread, with Edit (own comments only)
// and Delete (own comments, or any comment for admins).
function ThreadItem({
  cm,
  canEdit,
  canDelete,
  onSaved,
  onDeleted,
}: {
  cm: ThreadComment;
  canEdit: boolean;
  canDelete: boolean;
  onSaved: (id: string, body: string, editedAt: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cm.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const text = draft.trim();
    if (text.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("edit_comment", {
      p_comment_id: cm.id,
      p_body: text,
    });
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (rpcError || !row) {
      setError("Could not save your edit.");
      return;
    }
    onSaved(cm.id, row.new_body, row.new_edited_at);
    setEditing(false);
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("delete_comment", { p_comment_id: cm.id });
    setBusy(false);
    if (rpcError) {
      setError("Could not delete this comment.");
      return;
    }
    onDeleted();
  }

  const footer =
    !editing && (canEdit || canDelete) ? (
      <div className="mt-1 ml-1 flex gap-3 text-xs text-ink-soft">
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setDraft(cm.body);
              setEditing(true);
            }}
            className="hover:text-brand-600 hover:underline"
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button type="button" onClick={remove} disabled={busy} className="hover:text-brand-600 hover:underline">
            Delete
          </button>
        )}
        {error && <span className="text-red-700">{error}</span>}
      </div>
    ) : null;

  return (
    <CommentBubble name={cm.author?.display_name ?? null} createdAt={cm.created_at} edited={!!cm.edited_at} footer={footer}>
      {editing ? (
        <div className="mt-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={2000}
            className="w-full rounded-lg border border-feed-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 outline-none resize-none"
          />
          {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || draft.trim().length === 0}
              className="rounded-full bg-brand-700 text-cream-50 text-xs font-medium px-3 py-1 hover:bg-brand-600 transition-colors disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-full border border-feed-line text-ink-soft text-xs px-3 py-1 hover:border-brand-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">{cm.body}</p>
      )}
    </CommentBubble>
  );
}

interface Props {
  c: FeedCase;
  meta: FeedMeta;
  preview: PreviewComment | null;
  onMeta: (id: string, patch: Partial<FeedMeta>) => void;
  onRemoved: (id: string) => void;
}

// One post in the feed: header, text with "...more", a vote/comment
// action bar, and a comment area with a preview and a
// "See N more comments" link.
export default function FeedPost({ c, meta, preview, onMeta, onRemoved }: Props) {
  const { session, profile } = useAuth();
  const myId = session?.user.id ?? null;
  const isAdmin = !!profile?.is_admin;

  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ThreadComment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const isLong = c.story_text.length > COLLAPSED_LENGTH;
  const collapsedText = c.story_text.slice(0, COLLAPSED_LENGTH).trimEnd();
  const showFacts =
    (expanded || !isLong) &&
    (c.got_notice_or_severance !== undefined ||
      c.got_charge_sheet !== undefined ||
      c.had_enquiry_meeting !== undefined);

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
      .select("id, body, created_at, edited_at, user_id, author:profiles(display_name)")
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

  function handleEdited(id: string, body: string, editedAt: string) {
    setThread((prev) =>
      prev ? prev.map((cm) => (cm.id === id ? { ...cm, body, edited_at: editedAt } : cm)) : prev
    );
  }

  // ---- admin: remove the whole story ---------------------------
  // Same status the Review queue's Reject uses, so it disappears from
  // every feed and the record is kept. Admin-only in the UI, and the
  // database only lets admins change a case's status anyway.
  async function removeStory() {
    if (removing) return;
    if (!window.confirm("Remove this story from the site?")) return;
    setRemoving(true);
    setAdminError(null);
    const { data, error } = await supabase
      .from("cases")
      .update({ status: "rejected" })
      .eq("id", c.id)
      .select("id");
    setRemoving(false);
    if (error || !data || data.length === 0) {
      setAdminError("Could not remove this story.");
      return;
    }
    onRemoved(c.id);
  }

  // Preview shown while the thread is closed: the newest comment.
  const lastLoaded = thread && thread.length > 0 ? thread[thread.length - 1] : null;
  const previewName = lastLoaded ? lastLoaded.author?.display_name ?? null : preview?.author_name ?? null;
  const previewBody = lastLoaded ? lastLoaded.body : preview?.body ?? null;
  const previewTime = lastLoaded ? lastLoaded.created_at : preview?.created_at ?? null;
  const previewEdited = lastLoaded ? !!lastLoaded.edited_at : false;
  const moreCount = Math.max(0, meta.comment_count - 1);

  const upActive = meta.my_vote === 1;
  const downActive = meta.my_vote === -1;
  const scoreColor = upActive ? "text-brand-600" : downActive ? "text-slate-600" : "text-ink";

  return (
    <article className="rounded-xl border border-feed-line bg-feed-card shadow-[0_1px_3px_rgba(61,9,6,0.08)]">
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
        {showFacts && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["Notice or severance", c.got_notice_or_severance],
              ["Charge sheet", c.got_charge_sheet],
              ["Formal enquiry", c.had_enquiry_meeting],
            ].map(([label, value]) => (
              <span
                key={label as string}
                className="rounded-full border border-feed-line bg-feed-bg px-2.5 py-0.5 text-xs text-ink-soft"
              >
                {label as string}: {yesNo(value as boolean | null | undefined)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="mx-4 border-t border-feed-line py-1.5 flex flex-wrap items-center gap-1">
        <div className="flex items-center rounded-full bg-feed-bg">
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
          <span
            className={`min-w-[1.5rem] text-center text-sm font-semibold tabular-nums ${scoreColor}`}
            aria-label={`Score ${meta.score}`}
          >
            {formatCount(meta.score)}
          </span>
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
          aria-label="Comments"
          className="ml-1 flex items-center gap-1.5 rounded-full bg-feed-bg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-black/5 transition-colors"
        >
          <CommentIcon size={18} />
          {meta.comment_count > 0 ? formatCount(meta.comment_count) : "Comment"}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={removeStory}
            disabled={removing}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-900/10 transition-colors disabled:opacity-60"
          >
            <TrashIcon size={16} />
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>
      {voteError && <p className="px-4 pb-2 text-xs text-red-700">{voteError}</p>}
      {adminError && <p className="px-4 pb-2 text-xs text-red-700">{adminError}</p>}

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
                {[...thread].reverse().map((cm) => {
                  const own = myId !== null && cm.user_id === myId;
                  return (
                    <ThreadItem
                      key={cm.id}
                      cm={cm}
                      canEdit={own}
                      canDelete={own || isAdmin}
                      onSaved={handleEdited}
                      onDeleted={loadThread}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : previewBody && previewTime ? (
          <div className="space-y-2">
            <CommentBubble name={previewName} createdAt={previewTime} edited={previewEdited}>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">{previewBody}</p>
            </CommentBubble>
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
