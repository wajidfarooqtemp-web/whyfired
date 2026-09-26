import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";

// Admin-only. The homepage's FeaturedCases section (logged-out
// visitors only) reads from the featured_cases_public view, which
// only ever returns up to 3 rows: those with status = 'approved' and
// is_featured = true (migration_007_featured_cases.sql). That flag
// was never toggleable from the UI before this page — whoever set
// the original three did it by hand in the SQL editor. This just
// gives admins a normal Feature / Unfeature button instead.
//
// The 3-at-a-time cap and the "must be approved" rule are both
// enforced again by a database trigger (enforce_featured_rules), so
// this page can only make it convenient, not bypass either rule —
// if a feature attempt races past the disabled state below, the
// database rejects it and its message is what's shown as the error.
//
// Official ("Why Fired") posts can be featured too: the trigger only
// checks status = 'approved', which every official post already is
// the moment it's published.

interface CaseRow {
  id: string;
  story_text: string;
  country: string;
  termination_reason: string;
  posted_as_official: boolean;
  is_featured: boolean;
  created_at: string;
}

const MAX_FEATURED = 3;

function excerpt(text: string, len = 160): string {
  const trimmed = text.trim();
  return trimmed.length > len ? trimmed.slice(0, len).trimEnd() + "\u2026" : trimmed;
}

export default function AdminFeatured() {
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("cases")
      .select(
        "id, story_text, country, termination_reason, posted_as_official, is_featured, created_at"
      )
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    setCases((data as CaseRow[]) ?? []);
  }

  const featured = (cases ?? []).filter((c) => c.is_featured);
  const rest = (cases ?? []).filter((c) => !c.is_featured);

  async function toggle(c: CaseRow) {
    setError(null);
    setBusyId(c.id);
    const nextFeatured = !c.is_featured;
    const { error: updateError } = await supabase
      .from("cases")
      .update({ is_featured: nextFeatured })
      .eq("id", c.id);
    setBusyId(null);

    if (updateError) {
      // Most likely the trigger's own message ("At most 3 cases can
      // be featured at once...") if two admins raced each other past
      // the disabled button at the same moment; anything else is
      // shown generically.
      setError(updateError.message || "Could not update this case.");
      return;
    }

    setCases((prev) =>
      (prev ?? []).map((row) => (row.id === c.id ? { ...row, is_featured: nextFeatured } : row))
    );
  }

  if (cases === null) {
    return (
      <div className="min-h-screen px-5 pt-24 text-cream-100/50 text-sm text-center">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin" className="text-sm text-cream-100/50 hover:text-cream-50">
          &larr; Review queue
        </Link>

        <h1 className="font-display text-2xl text-cream-50 mt-4 mb-1">Featured on homepage</h1>
        <p className="text-cream-100/60 text-sm mb-8">
          Shown to logged-out visitors on the homepage. Up to {MAX_FEATURED} at a time — feature
          one below to add it here, unfeature to send it back to the ordinary list.
        </p>

        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-cream-100/80 mb-3">
            Featured ({featured.length}/{MAX_FEATURED})
          </h2>
          {featured.length === 0 ? (
            <p className="text-cream-100/50 text-sm">Nothing featured right now.</p>
          ) : (
            <div className="space-y-3">
              {featured.map((c) => (
                <CaseRowCard key={c.id} c={c} busy={busyId === c.id} onToggle={() => toggle(c)} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-cream-100/80 mb-3">All approved posts</h2>
          <div className="space-y-3">
            {rest.map((c) => (
              <CaseRowCard
                key={c.id}
                c={c}
                busy={busyId === c.id}
                disabled={featured.length >= MAX_FEATURED}
                onToggle={() => toggle(c)}
              />
            ))}
            {rest.length === 0 && (
              <p className="text-cream-100/50 text-sm">Nothing else approved yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CaseRowCard({
  c,
  busy,
  disabled,
  onToggle,
}: {
  c: CaseRow;
  busy: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-2">
        {c.posted_as_official ? (
          <span className="text-cream-100/80 font-medium">Why Fired</span>
        ) : (
          <>
            <span>{c.country}</span>
            <span>&middot;</span>
            <span>{terminationReasonLabel(c.termination_reason)}</span>
          </>
        )}
      </div>
      <p className="text-cream-50 text-sm leading-relaxed mb-4">{excerpt(c.story_text)}</p>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy || (!c.is_featured && disabled)}
        className={
          c.is_featured
            ? "rounded-full border border-white/20 text-cream-100/80 text-sm font-medium px-4 py-1.5 hover:border-white/40 transition-colors disabled:opacity-50"
            : "rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-4 py-1.5 hover:bg-white transition-colors disabled:opacity-50"
        }
      >
        {busy ? "Saving..." : c.is_featured ? "Unfeature" : "Feature"}
      </button>
    </div>
  );
}
