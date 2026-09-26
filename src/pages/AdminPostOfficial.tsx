import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Admin-only. Publishes a case straight to Stories, already
// approved, under the "Why Fired" byline (see FeedPost.tsx's
// posted_as_official handling) — no questionnaire, no review queue.
// The database enforces the admin check independently of this page
// (see submit-case and migration_013), so this form is a convenience,
// not the actual security boundary.
//
// No category/reason tag here on purpose: those (categories table:
// "No reason given", "Misconduct...", etc.) exist to describe *why
// someone was let go*, which an admin announcement isn't about. It
// used to reuse that same picker and forced you to select one of
// those tags before publishing — that's what was showing up as
// "· No reason given" under official posts in the feed. Fixed at
// both ends: this form no longer asks, and FeedPost/CaseDetail no
// longer render a category tag on a posted_as_official case.
export default function AdminPostOfficial() {
  const [storyText, setStoryText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // One key per attempt at filling out this form, same pattern as
  // ShareCase: reused on every submit click for this page load,
  // including an automatic retry after a dropped connection.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const wordCount = useMemo(
    () => storyText.trim().split(/\s+/).filter(Boolean).length,
    [storyText]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const { data, error: invokeError } = await supabase.functions.invoke("submit-case", {
      body: {
        post_as_official: true,
        story_text: storyText,
        idempotency_key: idempotencyKeyRef.current,
      },
    });

    setSubmitting(false);

    if (invokeError) {
      const context = (invokeError as { context?: { json?: () => Promise<unknown> } }).context;
      if (context?.json) {
        const body = (await context.json()) as {
          error?: string;
          fields?: { field: string; message: string }[];
        };
        setError(body.error ?? "Something went wrong. Please try again.");
        if (body.fields) {
          const map: Record<string, string> = {};
          body.fields.forEach((f) => (map[f.field] = f.message));
          setFieldErrors(map);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    void data;
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 pt-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 text-center">
          <h1 className="font-display text-2xl text-cream-50 mb-2">Published</h1>
          <p className="text-cream-100/60 text-sm mb-6">
            It's live in Stories now, under the Why Fired byline. No review queue for this one.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setStoryText("");
                idempotencyKeyRef.current = crypto.randomUUID();
                setDone(false);
              }}
              className="rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2.5 hover:bg-white transition-colors"
            >
              Post another
            </button>
            <Link
              to="/admin"
              className="rounded-full border border-white/20 text-cream-100/80 text-sm px-5 py-2.5 hover:border-white/40 transition-colors"
            >
              Back to review queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="w-full max-w-xl mx-auto">
        <Link to="/admin" className="text-sm text-cream-100/50 hover:text-cream-50">
          &larr; Review queue
        </Link>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 space-y-5"
        >
          <div>
            <h1 className="font-display text-2xl text-cream-50 mb-1">Post as Why Fired</h1>
            <p className="text-cream-100/60 text-sm">
              Publishes immediately, shown with the Why Fired badge instead of "Shared
              anonymously." Skips the pending queue entirely — check it over before hitting Publish.
            </p>
          </div>

          <label className="block">
            <span className="block text-xs text-cream-100/70 mb-1.5">Post text</span>
            <textarea
              required
              rows={7}
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="What do you want to say, as Why Fired."
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none"
            />
            <span className="block text-xs text-cream-100/40 mt-1">{wordCount} / 600 words.</span>
            {fieldErrors.story_text && (
              <span className="block text-xs text-red-300 mt-1">{fieldErrors.story_text}</span>
            )}
          </label>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-cream-50 text-brand-900 text-sm font-medium py-3 hover:bg-white transition-colors disabled:opacity-60"
          >
            {submitting ? "Publishing..." : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
}