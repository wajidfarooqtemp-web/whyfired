import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { timeAgo, fullTimestamp } from "../lib/time";
import { VerifiedBadge } from "../components/icons";

interface CaseDetailRow {
  id: string;
  role_duties: string;
  country: string;
  employer_size: string | null;
  termination_reason: string;
  got_notice_or_severance: boolean | null;
  got_charge_sheet: boolean | null;
  had_enquiry_meeting: boolean | null;
  story_text: string;
  created_at: string;
  category: { name: string } | null;
  author: { display_name: string } | null;
  // See FeedPost.tsx: true only for a case an admin posted directly
  // under the Why Fired byline. Suppresses the questionnaire fields
  // below, since none of them mean anything for that kind of post.
  posted_as_official: boolean;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
  // See FeedPost.tsx / migration 015: an admin replying under the
  // "Why Fired" byline instead of their own name.
  posted_as_official: boolean;
  // See FeedPost.tsx / migration 016: null for a top-level comment,
  // otherwise the comment this one replies to. Nesting is unlimited.
  parent_comment_id: string | null;
}

function buildChildrenMap(comments: CommentRow[]): Map<string, CommentRow[]> {
  const map = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (!c.parent_comment_id) continue;
    const list = map.get(c.parent_comment_id) ?? [];
    list.push(c);
    map.set(c.parent_comment_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return map;
}

const MAX_VISUAL_DEPTH = 6;
const REPLY_INDENT_PX = 18;

interface ReplyState {
  targetId: string | null;
  text: string;
  asOfficial: boolean;
  posting: boolean;
  error: string | null;
}

// One comment and everything nested under it. This page's comment
// list has no Edit/Delete (it never has), but Reply works the same
// way as the feed's version: any logged-in reader can reply at any
// depth, and admins get the same "post as Why Fired" checkbox.
function CommentNode({
  c,
  depth,
  childrenMap,
  isAdmin,
  reply,
  onReplyClick,
  onReplyTextChange,
  onReplyOfficialChange,
  onReplySubmit,
  onReplyCancel,
}: {
  c: CommentRow;
  depth: number;
  childrenMap: Map<string, CommentRow[]>;
  isAdmin: boolean;
  reply: ReplyState;
  onReplyClick: (id: string) => void;
  onReplyTextChange: (text: string) => void;
  onReplyOfficialChange: (v: boolean) => void;
  onReplySubmit: (parentId: string) => void;
  onReplyCancel: () => void;
}) {
  const children = childrenMap.get(c.id) ?? [];
  const isReplying = reply.targetId === c.id;
  const indent = Math.min(depth, MAX_VISUAL_DEPTH) * REPLY_INDENT_PX;

  return (
    <div style={indent > 0 ? { marginLeft: indent } : undefined} className={depth > 0 ? "mt-4" : "border-t border-white/10 pt-4"}>
      <div className="text-xs text-cream-100/50 mb-1 flex items-center gap-1.5">
        {c.posted_as_official ? (
          <span className="inline-flex items-center gap-1 text-cream-100/80 font-medium">
            Why Fired
            <VerifiedBadge size={12} />
          </span>
        ) : (
          <span>{c.author?.display_name ?? "Anonymous"}</span>
        )}
        <span>&middot;</span>
        <time dateTime={c.created_at} title={fullTimestamp(c.created_at)}>
          {timeAgo(c.created_at)}
        </time>
      </div>
      <p className="text-cream-50 text-sm leading-relaxed">{c.body}</p>
      <button
        type="button"
        onClick={() => onReplyClick(c.id)}
        className="mt-1 text-xs text-cream-100/50 hover:text-cream-50 hover:underline"
      >
        Reply
      </button>

      {isReplying && (
        <div className="mt-2">
          <textarea
            value={reply.text}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply"
            rows={2}
            autoFocus
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none"
          />
          {reply.error && <p className="text-xs text-red-300 mt-1">{reply.error}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onReplySubmit(c.id)}
              disabled={reply.posting || reply.text.trim().length === 0}
              className="rounded-full bg-cream-50 text-brand-900 text-xs font-medium px-3 py-1.5 hover:bg-white transition-colors disabled:opacity-60"
            >
              {reply.posting ? "Posting..." : "Reply"}
            </button>
            <button
              type="button"
              onClick={onReplyCancel}
              className="rounded-full border border-white/20 text-cream-100/70 text-xs px-3 py-1.5 hover:border-white/40 transition-colors"
            >
              Cancel
            </button>
            {isAdmin && (
              <label className="flex items-center gap-1.5 text-xs text-cream-100/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reply.asOfficial}
                  onChange={(e) => onReplyOfficialChange(e.target.checked)}
                  className="accent-cream-50"
                />
                Reply as Why Fired
              </label>
            )}
          </div>
        </div>
      )}

      {children.map((child) => (
        <CommentNode
          key={child.id}
          c={child}
          depth={depth + 1}
          childrenMap={childrenMap}
          isAdmin={isAdmin}
          reply={reply}
          onReplyClick={onReplyClick}
          onReplyTextChange={onReplyTextChange}
          onReplyOfficialChange={onReplyOfficialChange}
          onReplySubmit={onReplySubmit}
          onReplyCancel={onReplyCancel}
        />
      ))}
    </div>
  );
}

function yesNo(v: boolean | null) {
  if (v === null) return "Not sure";
  return v ? "Yes" : "No";
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const [caseData, setCaseData] = useState<CaseDetailRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentAsOfficial, setCommentAsOfficial] = useState(false);
  const [reply, setReply] = useState<ReplyState>({
    targetId: null,
    text: "",
    asOfficial: false,
    posting: false,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const [{ data: caseRow }, { data: commentRows }] = await Promise.all([
      supabase
        .from("cases")
        .select(
          "id, role_duties, country, employer_size, termination_reason, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting, story_text, created_at, posted_as_official, category:categories(name), author:profiles(display_name)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("comments")
        .select("id, body, created_at, posted_as_official, parent_comment_id, author:profiles(display_name)")
        .eq("case_id", id)
        .eq("status", "visible")
        .order("created_at"),
    ]);

    setCaseData((caseRow as unknown as CaseDetailRow) ?? null);
    setComments((commentRows as unknown as CommentRow[]) ?? []);
    setLoading(false);
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (commentText.trim().length === 0) return;

    setPosting(true);
    const { error: invokeError } = await supabase.functions.invoke("submit-comment", {
      body: { case_id: id, body: commentText.trim(), post_as_official: isAdmin && commentAsOfficial },
    });
    setPosting(false);

    if (invokeError) {
      const context = (invokeError as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setError(body?.error ?? "Could not post your comment. Please try again.");
      return;
    }

    setCommentText("");
    setCommentAsOfficial(false);
    load();
  }

  function startReply(commentId: string) {
    setReply({ targetId: commentId, text: "", asOfficial: false, posting: false, error: null });
  }

  function cancelReply() {
    setReply({ targetId: null, text: "", asOfficial: false, posting: false, error: null });
  }

  async function submitReply(parentId: string) {
    const text = reply.text.trim();
    if (text.length === 0 || reply.posting) return;

    setReply((prev) => ({ ...prev, posting: true, error: null }));
    const { error: invokeError } = await supabase.functions.invoke("submit-comment", {
      body: {
        case_id: id,
        body: text,
        parent_comment_id: parentId,
        post_as_official: isAdmin && reply.asOfficial,
      },
    });

    if (invokeError) {
      const context = (invokeError as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setReply((prev) => ({
        ...prev,
        posting: false,
        error: body?.error ?? "Could not post your reply. Please try again.",
      }));
      return;
    }

    cancelReply();
    load();
  }

  if (loading) {
    return <div className="min-h-screen px-5 pt-24 text-cream-100/50 text-sm text-center">Loading...</div>;
  }

  if (!caseData) {
    return (
      <div className="min-h-screen px-5 pt-24 text-center">
        <p className="text-cream-100/60 text-sm">This case isn't available.</p>
        <Link to="/stories" className="text-cream-100 underline text-sm">Back to Stories</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/stories" className="text-cream-100/60 text-sm hover:text-cream-50">&larr; Back to Stories</Link>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-4">
            {caseData.posted_as_official ? (
              <span className="inline-flex items-center gap-1 text-cream-100/80 font-medium">
                Why Fired
                <VerifiedBadge size={13} />
              </span>
            ) : (
              // Matches FeedPost.tsx: a case's own author is always
              // "Shared anonymously" here, regardless of the real
              // display_name on the row — unlike comments below,
              // which do show real names (see CommentBubble in
              // FeedPost.tsx; that's intentional, not an oversight).
              <span>Shared anonymously</span>
            )}
            <span>&middot;</span>
            <time dateTime={caseData.created_at} title={fullTimestamp(caseData.created_at)}>
              {timeAgo(caseData.created_at)}
            </time>
            {!caseData.posted_as_official && (
              <>
                <span>&middot;</span>
                <span>{caseData.country}</span>
              </>
            )}
            {!caseData.posted_as_official && caseData.category && (
              <>
                <span>&middot;</span>
                <span className="text-cream-100/70">{caseData.category.name}</span>
              </>
            )}
          </div>

          <p className="text-cream-50 text-[15px] leading-relaxed whitespace-pre-wrap">{caseData.story_text}</p>

          {!caseData.posted_as_official && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Fact label="Got notice / severance" value={yesNo(caseData.got_notice_or_severance)} />
              <Fact label="Charge sheet given" value={yesNo(caseData.got_charge_sheet)} />
              <Fact label="Formal enquiry held" value={yesNo(caseData.had_enquiry_meeting)} />
            </div>
          )}
        </div>

        <h2 className="font-display text-xl text-cream-50 mt-10 mb-4">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>

        <form onSubmit={handleComment} className="mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment"
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none"
          />
          {error && <p className="text-sm text-red-300 mt-1">{error}</p>}
          <div className="mt-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={posting}
              className="rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2 hover:bg-white transition-colors disabled:opacity-60"
            >
              {posting ? "Posting..." : "Post comment"}
            </button>
            {isAdmin && (
              <label className="flex items-center gap-1.5 text-xs text-cream-100/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={commentAsOfficial}
                  onChange={(e) => setCommentAsOfficial(e.target.checked)}
                  className="accent-cream-50"
                />
                Comment as Why Fired
              </label>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {comments
            .filter((c) => !c.parent_comment_id)
            .map((c) => (
              <CommentNode
                key={c.id}
                c={c}
                depth={0}
                childrenMap={buildChildrenMap(comments)}
                isAdmin={isAdmin}
                reply={reply}
                onReplyClick={startReply}
                onReplyTextChange={(text) => setReply((prev) => ({ ...prev, text }))}
                onReplyOfficialChange={(v) => setReply((prev) => ({ ...prev, asOfficial: v }))}
                onReplySubmit={submitReply}
                onReplyCancel={cancelReply}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <div className="text-cream-100/50">{label}</div>
      <div className="text-cream-50">{value}</div>
    </div>
  );
}