import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { COUNTRIES, TERMINATION_REASONS } from "../lib/constants";

const EMPLOYER_SIZES = [
  { value: "not sure", label: "Not sure" },
  { value: "<50", label: "Under 50 people" },
  { value: "50-300", label: "50 to 300 people" },
  { value: "300+", label: "300+ people" },
];

const YES_NO = [
  { value: "", label: "Not sure" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

interface Category {
  id: string;
  name: string;
}

interface PendingCase {
  id: string;
  role_duties: string;
  country: string;
  employer_size: string;
  termination_reason: string;
  got_notice_or_severance: boolean | null;
  got_charge_sheet: boolean | null;
  had_enquiry_meeting: boolean | null;
  story_text: string;
  employer_name_flagged: boolean;
  created_at: string;
}

// Mirrors what the form can edit. The three yes/no/unsure fields are
// kept as strings ("" / "true" / "false") while editing, same trick
// ShareCase.tsx's own form uses, then converted back to boolean|null
// only when actually sending the approval request.
interface Draft {
  role_duties: string;
  country: string;
  employer_size: string;
  termination_reason: string;
  got_notice_or_severance: string;
  got_charge_sheet: string;
  had_enquiry_meeting: string;
  story_text: string;
  category_id: string;
}

function draftFromCase(c: PendingCase): Draft {
  const boolToStr = (v: boolean | null) => (v === null ? "" : v ? "true" : "false");
  return {
    role_duties: c.role_duties,
    country: c.country,
    employer_size: c.employer_size,
    termination_reason: c.termination_reason,
    got_notice_or_severance: boolToStr(c.got_notice_or_severance),
    got_charge_sheet: boolToStr(c.got_charge_sheet),
    had_enquiry_meeting: boolToStr(c.had_enquiry_meeting),
    story_text: c.story_text,
    category_id: "",
  };
}

interface FieldError {
  field: string;
  message: string;
}

export default function Admin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<PendingCase[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorsById, setErrorsById] = useState<Record<string, FieldError[]>>({});
  const [generalErrorById, setGeneralErrorById] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: cats }, { data: cases }] = await Promise.all([
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase
        .from("cases")
        .select(
          "id, role_duties, country, employer_size, termination_reason, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting, story_text, employer_name_flagged, created_at"
        )
        .eq("status", "pending")
        .order("created_at"),
    ]);
    setCategories(cats ?? []);
    const rows = (cases as PendingCase[]) ?? [];
    setPending(rows);
    setDrafts(Object.fromEntries(rows.map((c) => [c.id, draftFromCase(c)])));
    setLoading(false);
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function approve(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    setErrorsById((prev) => ({ ...prev, [id]: [] }));
    setGeneralErrorById((prev) => ({ ...prev, [id]: "" }));

    const toBool = (v: string) => (v === "" ? null : v === "true");

    const { error } = await supabase.functions.invoke("approve-case", {
      body: {
        case_id: id,
        role_duties: draft.role_duties,
        country: draft.country,
        employer_size: draft.employer_size,
        termination_reason: draft.termination_reason,
        got_notice_or_severance: toBool(draft.got_notice_or_severance),
        got_charge_sheet: toBool(draft.got_charge_sheet),
        had_enquiry_meeting: toBool(draft.had_enquiry_meeting),
        story_text: draft.story_text,
        category_id: draft.category_id,
      },
    });

    setBusyId(null);

    if (error) {
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = context?.json
        ? ((await context.json()) as { error?: string; fields?: FieldError[] })
        : null;
      setErrorsById((prev) => ({ ...prev, [id]: body?.fields ?? [] }));
      setGeneralErrorById((prev) => ({
        ...prev,
        [id]: body?.error ?? "Could not approve this case. Please try again.",
      }));
      return;
    }

    await clearPendingReviewNotification(id);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  async function reject(id: string) {
    setBusyId(id);
    await supabase.from("cases").update({ status: "rejected" }).eq("id", id);
    await clearPendingReviewNotification(id);
    setBusyId(null);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  // Approving/rejecting from here is itself "handling" the review
  // notification for this case, same as opening it from the bell
  // would be — without this, the badge stays on even after the case
  // has been dealt with. RLS only lets an admin update their own
  // notification rows, so this can never touch another admin's.
  async function clearPendingReviewNotification(caseId: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("case_id", caseId)
      .eq("type", "case_pending_review");
  }

  function fieldError(id: string, field: string): string | undefined {
    return errorsById[id]?.find((e) => e.field === field)?.message;
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl text-cream-50 mb-1">Review queue</h1>
        <p className="text-cream-100/60 text-sm mb-3">
          {loading ? "Loading..." : `${pending.length} case${pending.length === 1 ? "" : "s"} waiting`}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-8 text-sm">
          <Link to="/admin/post" className="text-cream-100/70 hover:text-cream-50 underline">
            Post as Why Fired
          </Link>
          <Link to="/admin/featured" className="text-cream-100/70 hover:text-cream-50 underline">
            Featured
          </Link>
          <Link to="/admin/users" className="text-cream-100/70 hover:text-cream-50 underline">
            Users
          </Link>
          <Link to="/admin/analytics" className="text-cream-100/70 hover:text-cream-50 underline">
            Analytics
          </Link>
        </div>

        <div className="space-y-5">
          {pending.map((c) => {
            const draft = drafts[c.id];
            if (!draft) return null;
            const generalError = generalErrorById[c.id];

            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-4">
                  <span>Submitted {new Date(c.created_at).toLocaleDateString()}</span>
                  {c.employer_name_flagged && (
                    <span className="text-amber-300">&middot; may name an employer, check closely</span>
                  )}
                </div>

                <div className="space-y-3">
                  <AdminField label="Role / duties" error={fieldError(c.id, "role_duties")}>
                    <input
                      type="text"
                      value={draft.role_duties}
                      onChange={(e) => updateDraft(c.id, { role_duties: e.target.value })}
                      className={inputClass()}
                    />
                  </AdminField>

                  <div className="grid grid-cols-2 gap-3">
                    <AdminField label="Country" error={fieldError(c.id, "country")}>
                      <select
                        value={draft.country}
                        onChange={(e) => updateDraft(c.id, { country: e.target.value })}
                        className={inputClass()}
                      >
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Company size" error={fieldError(c.id, "employer_size")}>
                      <select
                        value={draft.employer_size}
                        onChange={(e) => updateDraft(c.id, { employer_size: e.target.value })}
                        className={inputClass()}
                      >
                        {EMPLOYER_SIZES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                  </div>

                  <AdminField label="Termination reason" error={fieldError(c.id, "termination_reason")}>
                    <select
                      value={draft.termination_reason}
                      onChange={(e) => updateDraft(c.id, { termination_reason: e.target.value })}
                      className={inputClass()}
                    >
                      {TERMINATION_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </AdminField>

                  <div className="grid grid-cols-3 gap-3">
                    <AdminField label="Notice/severance?">
                      <select
                        value={draft.got_notice_or_severance}
                        onChange={(e) => updateDraft(c.id, { got_notice_or_severance: e.target.value })}
                        className={inputClass()}
                      >
                        {YES_NO.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Charge sheet?">
                      <select
                        value={draft.got_charge_sheet}
                        onChange={(e) => updateDraft(c.id, { got_charge_sheet: e.target.value })}
                        className={inputClass()}
                      >
                        {YES_NO.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Enquiry meeting?">
                      <select
                        value={draft.had_enquiry_meeting}
                        onChange={(e) => updateDraft(c.id, { had_enquiry_meeting: e.target.value })}
                        className={inputClass()}
                      >
                        {YES_NO.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                  </div>

                  <AdminField label="Story" error={fieldError(c.id, "story_text")}>
                    <textarea
                      value={draft.story_text}
                      onChange={(e) => updateDraft(c.id, { story_text: e.target.value })}
                      rows={8}
                      className={inputClass() + " resize-y"}
                    />
                  </AdminField>

                  <AdminField label="Category" error={fieldError(c.id, "category_id")}>
                    <select
                      value={draft.category_id}
                      onChange={(e) => updateDraft(c.id, { category_id: e.target.value })}
                      className={inputClass()}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                </div>

                {generalError && <p className="text-sm text-red-400 mt-3">{generalError}</p>}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    onClick={() => approve(c.id)}
                    disabled={busyId === c.id || !draft.category_id}
                    className="rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-4 py-1.5 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {busyId === c.id ? "Working..." : "Approve"}
                  </button>
                  <button
                    onClick={() => reject(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-full border border-white/20 text-cream-100/80 text-sm px-4 py-1.5 hover:border-white/40 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && pending.length === 0 && (
            <p className="text-cream-100/50 text-sm">Nothing waiting for review.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream-50 focus:border-cream-50/40 outline-none";
}

function AdminField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-cream-100/60 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}