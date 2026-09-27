import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { terminationReasonLabel } from "../lib/constants";
import { timeAgo, fullTimestamp } from "../lib/time";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CommentIcon,
  TrashIcon,
  UserIcon,
  VerifiedBadge,
  PinIcon,
  StarIcon,
} from "./icons";

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
  // True only for a case an admin posted directly, already approved,
  // bypassing the normal share-a-case flow. Changes the header below
  // to a "Why Fired" byline instead of "Shared anonymously"; nothing
  // else about how the card works changes.
  posted_as_official?: boolean;
  // Both optional and both undefined unless the caller's query select
  // list actually asks for them. is_featured is only ever selected by
  // the logged-in feed queries (Home, Stories) — the "Featured" badge
  // is meant for exactly those, per how the homepage already treats
  // logged-out visitors differently (see FeaturedCases.tsx). is_pinned
  // is only ever selected by the Stories page, so the admin pin
  // control below only renders there — see the `typeof ... ===
  // "boolean"` checks, not `isAdmin` alone.
  is_featured?: boolean;
  is_pinned?: boolean;
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
  // Same concept as FeedCase.posted_as_official, one level down: an
  // admin replying under the "Why Fired" byline instead of their own
  // name. See migration 015.
  posted_as_official?: boolean;
}

interface ThreadComment {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  author: { display_name: string } | null;
  posted_as_official: boolean;
  // null for a top-level comment; otherwise the comment this one is
  // replying to. Threads nest without a hard limit (migration 016) —
  // MAX_VISUAL_DEPTH below only caps how far the indentation grows,
  // not how deep a conversation can actually go.
  parent_comment_id: string | null;
}

const COLLAPSED_LENGTH = 280;
const MAX_VISUAL_DEPTH = 6;
const REPLY_INDENT_PX = 18;

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

// Groups a flat comment list by parent_comment_id so each node only
// needs to look up its own children. Replies within a thread read
// oldest-first (a conversation reads top to bottom); top-level
// comments are sorted separately by the caller, newest-first, as
// before.
function buildChildrenMap(comments: ThreadComment[]): Map<string, ThreadComment[]> {
  const map = new Map<string, ThreadComment[]>();
  for (const cm of comments) {
    if (!cm.parent_comment_id) continue;
    const list = map.get(cm.parent_comment_id) ?? [];
    list.push(cm);
    map.set(cm.parent_comment_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return map;
}

function Avatar({
  name,
  size = 40,
  official,
}: {
  name?: string | null;
  size?: number;
  official?: boolean;
}) {
  if (official) {
    return (
      <img
        src="/logo-mark.png"
        alt=""
        className="shrink-0 rounded-full bg-brand-700 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
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
  official,
  children,
  footer,
}: {
  name: string | null;
  createdAt: string;
  edited?: boolean;
  official?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <Avatar name={name} size={32} official={official} />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg rounded-tl-none bg-feed-bg px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            {official ? (
              <span className="flex items-center gap-1 text-[13px] font-semibold text-ink truncate">
                Why Fired
                <VerifiedBadge size={13} />
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-ink truncate">{name ?? "Anonymous"}</span>
            )}
            <span className="text-xs text-ink-soft shrink-0" title={fullTimestamp(createdAt)}>
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

interface ReplyState {
  targetId: string | null;
  text: string;
  asOfficial: boolean;
  posting: boolean;
  error: string | null;
}

// One comment inside an opened thread, and everything nested under
// it. Edit/Delete work the same as before (own comments only for
// Edit; own or, for admins, any comment for Delete). Reply is new:
// every logged-in reader can reply to any visible comment, at any
// depth, with the same "post as Why Fired" option admins get on a
// top-level comment.
function CommentNode({
  cm,
  depth,
  childrenMap,
  myId,
  isAdmin,
  reply,
  onReplyClick,
  onReplyTextChange,
  onReplyOfficialChange,
  onReplySubmit,
  onReplyCancel,
  onSaved,
  onDeleted,
}: {
  cm: ThreadComment;
  depth: number;
  childrenMap: Map<string, ThreadComment[]>;
  myId: string | null;
  isAdmin: boolean;
  reply: ReplyState;
  onReplyClick: (id: string) => void;
  onReplyTextChange: (text: string) => void;
  onReplyOfficialChange: (v: boolean) => void;
  onReplySubmit: (parentId: string) => void;
  onReplyCancel: () => void;
  onSaved: (id: string, body: string, editedAt: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cm.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const own = myId !== null && cm.user_id === myId;
  const canEdit = own;
  const canDelete = own || isAdmin;
  const children = childrenMap.get(cm.id) ?? [];
  const isReplying = reply.targetId === cm.id;
  const indent = Math.min(depth, MAX_VISUAL_DEPTH) * REPLY_INDENT_PX;

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

  const footer = !editing ? (
    <div className="mt-1 ml-1 flex flex-wrap gap-3 text-xs text-ink-soft">
      <button
        type="button"
        onClick={() => onReplyClick(cm.id)}
        className="hover:text-brand-600 hover:underline"
      >
        Reply
      </button>
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
    <div style={indent > 0 ? { marginLeft: indent } : undefined}>
      <CommentBubble
        name={cm.author?.display_name ?? null}
        createdAt={cm.created_at}
        edited={!!cm.edited_at}
        official={cm.posted_as_official}
        footer={footer}
      >
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

      {isReplying && (
        <div className="mt-2 ml-9">
          <textarea
            value={reply.text}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            maxLength={2000}
            autoFocus
            className="w-full rounded-lg border border-feed-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 outline-none resize-none"
          />
          {reply.error && <p className="text-xs text-red-700 mt-1">{reply.error}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onReplySubmit(cm.id)}
              disabled={reply.posting || reply.text.trim().length === 0}
              className="rounded-full bg-brand-700 text-cream-50 text-xs font-medium px-3 py-1.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
            >
              {reply.posting ? "Posting..." : "Reply"}
            </button>
            <button
              type="button"
              onClick={onReplyCancel}
              className="rounded-full border border-feed-line text-ink-soft text-xs px-3 py-1.5 hover:border-brand-600 transition-colors"
            >
              Cancel
            </button>
            {isAdmin && (
              <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reply.asOfficial}
                  onChange={(e) => onReplyOfficialChange(e.target.checked)}
                  className="accent-brand-700"
                />
                Reply as Why Fired
              </label>
            )}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <CommentNode
              key={child.id}
              cm={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              myId={myId}
              isAdmin={isAdmin}
              reply={reply}
              onReplyClick={onReplyClick}
              onReplyTextChange={onReplyTextChange}
              onReplyOfficialChange={onReplyOfficialChange}
              onReplySubmit={onReplySubmit}
              onReplyCancel={onReplyCancel}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  c: FeedCase;
  meta: FeedMeta;
  preview: PreviewComment | null;
  onMeta: (id: string, patch: Partial<FeedMeta>) => void;
  onRemoved: (id: string) => void;
  // Only ever passed by pages that also select is_pinned (Stories).
  // See the FeedCase.is_pinned comment above for why the button below
  // gates on the field being present at all, not just on isAdmin.
  onPinChanged?: (id: string, pinned: boolean) => void;
}

// One post in the feed: header, text with "...more", a vote/comment
// action bar, and a comment area with a preview and a
// "See N more comments" link.
export default function FeedPost({ c, meta, preview, onMeta, onRemoved, onPinChanged }: Props) {
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
  const [pinning, setPinning] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [commentAsOfficial, setCommentAsOfficial] = useState(false);

  const [reply, setReply] = useState<ReplyState>({
    targetId: null,
    text: "",
    asOfficial: false,
    posting: false,
    error: null,
  });

  const isLong = c.story_text.length > COLLAPSED_LENGTH;
  const collapsedText = c.story_text.slice(0, COLLAPSED_LENGTH).trimEnd();
  const showFacts =
    !c.posted_as_official &&
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
      .select("id, body, created_at, edited_at, user_id, posted_as_official, parent_comment_id, author:profiles(display_name)")
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
      body: { case_id: c.id, body: text, post_as_official: isAdmin && commentAsOfficial },
    });
    setPosting(false);

    if (error) {
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setCommentError(body?.error ?? "Could not post your comment. Please try again.");
      return;
    }

    setCommentText("");
    setCommentAsOfficial(false);
    await loadThread();
  }

  // ---- replies --------------------------------------------------
  function startReply(id: string) {
    setReply({ targetId: id, text: "", asOfficial: false, posting: false, error: null });
  }

  function cancelReply() {
    setReply({ targetId: null, text: "", asOfficial: false, posting: false, error: null });
  }

  async function submitReply(parentId: string) {
    const text = reply.text.trim();
    if (text.length === 0 || reply.posting) return;

    setReply((prev) => ({ ...prev, posting: true, error: null }));
    const { error } = await supabase.functions.invoke("submit-comment", {
      body: {
        case_id: c.id,
        body: text,
        parent_comment_id: parentId,
        post_as_official: isAdmin && reply.asOfficial,
      },
    });

    if (error) {
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setReply((prev) => ({
        ...prev,
        posting: false,
        error: body?.error ?? "Could not post your reply. Please try again.",
      }));
      return;
    }

    cancelReply();
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

  // ---- admin: pin / unpin this story ----------------------------
  // Same direct-update pattern as removeStory and AdminFeatured's
  // Feature toggle: the database's own rules (migration 016's
  // trigger) do the actual "only one pinned at a time" enforcement,
  // so this can't do anything the backend wouldn't allow anyway.
  async function togglePin() {
    if (pinning || c.is_pinned === undefined) return;
    setPinning(true);
    setAdminError(null);
    const next = !c.is_pinned;
    const { error } = await supabase.from("cases").update({ is_pinned: next }).eq("id", c.id);
    setPinning(false);
    if (error) {
      setAdminError("Could not update the pin.");
      return;
    }
    onPinChanged?.(c.id, next);
  }

  // Preview shown while the thread is closed: the newest comment,
  // whatever depth it's actually at.
  const lastLoaded = thread && thread.length > 0 ? thread[thread.length - 1] : null;
  const previewName = lastLoaded ? lastLoaded.author?.display_name ?? null : preview?.author_name ?? null;
  const previewBody = lastLoaded ? lastLoaded.body : preview?.body ?? null;
  const previewTime = lastLoaded ? lastLoaded.created_at : preview?.created_at ?? null;
  const previewEdited = lastLoaded ? !!lastLoaded.edited_at : false;
  const previewOfficial = lastLoaded ? lastLoaded.posted_as_official : !!preview?.posted_as_official;
  const moreCount = Math.max(0, meta.comment_count - 1);

  const upActive = meta.my_vote === 1;
  const downActive = meta.my_vote === -1;
  const scoreColor = upActive ? "text-brand-600" : downActive ? "text-slate-600" : "text-ink";

  const childrenMap = thread ? buildChildrenMap(thread) : new Map<string, ThreadComment[]>();
  const rootComments = thread
    ? [...thread].filter((cm) => !cm.parent_comment_id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    : [];

  return (
    <article className="rounded-xl border border-feed-line bg-feed-card shadow-[0_1px_3px_rgba(61,9,6,0.08)]">
      {/* Header */}
      <div className="flex gap-3 px-4 pt-4">
        <Avatar size={48} official={c.posted_as_official} />
        <div className="min-w-0 flex-1">
          {c.posted_as_official ? (
            <div className="flex items-center gap-1 text-sm font-semibold text-ink">
              Why Fired
              <VerifiedBadge size={15} />
            </div>
          ) : (
            <div className="text-sm font-semibold text-ink">Shared anonymously</div>
          )}
          <div className="text-xs text-ink-soft leading-snug">
            {c.posted_as_official ? (
              "whyfired.com"
            ) : (
              <>{c.country} &middot; {terminationReasonLabel(c.termination_reason)}</>
            )}
          </div>
          <div className="text-xs text-ink-soft leading-snug">
            <time dateTime={c.created_at} title={fullTimestamp(c.created_at)}>
              {timeAgo(c.created_at)}
            </time>
            {!c.posted_as_official && c.category ? <> &middot; {c.category.name}</> : null}
          </div>
        </div>
        {c.is_featured && (
          <span className="shrink-0 h-fit inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-1">
            <StarIcon size={11} />
            Featured
          </span>
        )}
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
          <div className="ml-auto flex items-center gap-1">
            {c.is_pinned !== undefined && (
              <button
                type="button"
                onClick={togglePin}
                disabled={pinning}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  c.is_pinned ? "text-brand-700 hover:bg-brand-700/10" : "text-ink-soft hover:bg-black/5"
                }`}
              >
                <PinIcon size={16} filled={c.is_pinned} />
                {pinning ? "..." : c.is_pinned ? "Pinned" : "Pin"}
              </button>
            )}
            <button
              type="button"
              onClick={removeStory}
              disabled={removing}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-900/10 transition-colors disabled:opacity-60"
            >
              <TrashIcon size={16} />
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
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
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={posting}
                      className="rounded-full bg-brand-700 text-cream-50 text-sm font-medium px-4 py-1.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
                    >
                      {posting ? "Posting..." : "Post"}
                    </button>
                    {isAdmin && (
                      <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={commentAsOfficial}
                          onChange={(e) => setCommentAsOfficial(e.target.checked)}
                          className="accent-brand-700"
                        />
                        Comment as Why Fired
                      </label>
                    )}
                  </div>
                )}
              </div>
            </form>

            {thread === null ? (
              <p className="text-sm text-ink-soft">Loading comments...</p>
            ) : thread.length === 0 ? (
              <p className="text-sm text-ink-soft">No comments yet. Be the first.</p>
            ) : (
              <div className="space-y-3">
                {rootComments.map((cm) => (
                  <CommentNode
                    key={cm.id}
                    cm={cm}
                    depth={0}
                    childrenMap={childrenMap}
                    myId={myId}
                    isAdmin={isAdmin}
                    reply={reply}
                    onReplyClick={startReply}
                    onReplyTextChange={(text) => setReply((prev) => ({ ...prev, text }))}
                    onReplyOfficialChange={(v) => setReply((prev) => ({ ...prev, asOfficial: v }))}
                    onReplySubmit={submitReply}
                    onReplyCancel={cancelReply}
                    onSaved={handleEdited}
                    onDeleted={loadThread}
                  />
                ))}
              </div>
            )}
          </>
        ) : previewBody && previewTime ? (
          <div className="space-y-2">
            <CommentBubble name={previewName} createdAt={previewTime} edited={previewEdited} official={previewOfficial}>
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