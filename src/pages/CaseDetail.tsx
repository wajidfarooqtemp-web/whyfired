import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";
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
}

function yesNo(v: boolean | null) {
  if (v === null) return "Not sure";
  return v ? "Yes" : "No";
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetailRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .select("id, body, created_at, author:profiles(display_name)")
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
      body: { case_id: id, body: commentText.trim() },
    });
    setPosting(false);

    if (invokeError) {
      const context = (invokeError as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json ? ((await context.json()) as { error?: string }) : null;
      setError(body?.error ?? "Could not post your comment. Please try again.");
      return;
    }

    setCommentText("");
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
              <span>{caseData.author?.display_name ?? "Anonymous"}</span>
            )}
            <span>&middot;</span>
            <time dateTime={caseData.created_at} title={fullTimestamp(caseData.created_at)}>
              {timeAgo(caseData.created_at)}
            </time>
            {!caseData.posted_as_official && (
              <>
                <span>&middot;</span>
                <span>{caseData.country}</span>
                <span>&middot;</span>
                <span>{terminationReasonLabel(caseData.termination_reason)}</span>
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
          <button
            type="submit"
            disabled={posting}
            className="mt-2 rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2 hover:bg-white transition-colors disabled:opacity-60"
          >
            {posting ? "Posting..." : "Post comment"}
          </button>
        </form>

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="border-t border-white/10 pt-4">
              <div className="text-xs text-cream-100/50 mb-1 flex items-center gap-1.5">
                <span>{c.author?.display_name ?? "Anonymous"}</span>
                <span>&middot;</span>
                <time dateTime={c.created_at} title={fullTimestamp(c.created_at)}>
                  {timeAgo(c.created_at)}
                </time>
              </div>
              <p className="text-cream-50 text-sm leading-relaxed">{c.body}</p>
            </div>
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