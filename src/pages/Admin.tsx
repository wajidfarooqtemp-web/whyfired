import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";

interface Category {
  id: string;
  name: string;
}

interface PendingCase {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  story_text: string;
  employer_name_flagged: boolean;
  created_at: string;
}
interface ApprovedCase {
  id: string;
  role_duties: string;
  country: string;
  termination_reason: string;
  is_featured: boolean;
  created_at: string;
}

export default function Admin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<PendingCase[]>([]);
  const [approved, setApproved] = useState<ApprovedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [chosenCategory, setChosenCategory] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: cats }, { data: cases }, { data: approvedCases }] = await Promise.all([
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase
        .from("cases")
        .select("id, role_duties, country, termination_reason, story_text, employer_name_flagged, created_at")
        .eq("status", "pending")
        .order("created_at"),
      supabase
        .from("cases")
        .select("id, role_duties, country, termination_reason, is_featured, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
    ]);
    setCategories(cats ?? []);
    setPending(cases ?? []);
    setApproved(approvedCases ?? []);
    setLoading(false);
  }

  async function approve(id: string) {
    const categoryId = chosenCategory[id];
    if (!categoryId) return;

    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("cases")
      .update({ status: "approved", category_id: categoryId, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (userData.user) {
      await supabase
        .from("admin_actions")
        .insert({ case_id: id, admin_id: userData.user.id, action: "approved" });
    }
    setBusyId(null);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  async function reject(id: string) {
    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("cases").update({ status: "rejected" }).eq("id", id);
    if (userData.user) {
      await supabase
        .from("admin_actions")
        .insert({ case_id: id, admin_id: userData.user.id, action: "rejected" });
    }
    setBusyId(null);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }


  async function toggleFeatured(id: string, next: boolean) {
    setFeatureError(null);
    setBusyId(id);
    const { error } = await supabase.from("cases").update({ is_featured: next }).eq("id", id);
    setBusyId(null);
    if (error) {
      setFeatureError(
        next
          ? "Couldn't feature that case — you may already have 3 featured. Un-feature one first."
          : "Couldn't update that case. Please try again."
      );
      return;
    }
    setApproved((prev) => prev.map((c) => (c.id === id ? { ...c, is_featured: next } : c)));
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl text-cream-50 mb-1">Review queue</h1>
        <p className="text-cream-100/60 text-sm mb-8">
          {loading ? "Loading..." : `${pending.length} case${pending.length === 1 ? "" : "s"} waiting`}
        </p>

        <div className="space-y-5">
          {pending.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-2">
                <span>{c.country}</span>
                <span>&middot;</span>
                <span>{terminationReasonLabel(c.termination_reason)}</span>
                {c.employer_name_flagged && (
                  <span className="text-amber-300">&middot; may name an employer, check closely</span>
                )}
              </div>

              <p className="text-cream-100/70 text-xs mb-2">Role: {c.role_duties}</p>
              <p className="text-cream-50 text-sm leading-relaxed whitespace-pre-wrap mb-4">{c.story_text}</p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={chosenCategory[c.id] ?? ""}
                  onChange={(e) => setChosenCategory((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-cream-50"
                >
                  <option value="" disabled>Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => approve(c.id)}
                  disabled={busyId === c.id || !chosenCategory[c.id]}
                  className="rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-4 py-1.5 hover:bg-white transition-colors disabled:opacity-50"
                >
                  Approve
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
          ))}

          {!loading && pending.length === 0 && (
            <p className="text-cream-100/50 text-sm">Nothing waiting for review.</p>
          )}
        </div>

        <div className="mt-12">
          <h2 className="font-display text-xl text-cream-50 mb-1">Featured on homepage</h2>
          <p className="text-cream-100/60 text-sm mb-1">
            Up to 3 approved cases shown to everyone, logged in or not, as a short excerpt.
            Everything else on the site stays behind the login wall.
          </p>
          <p className="text-cream-100/40 text-xs mb-4">
            {approved.filter((c) => c.is_featured).length} of 3 featured
          </p>
          {featureError && <p className="text-sm text-red-300 mb-4">{featureError}</p>}

          <div className="space-y-3">
            {approved.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-cream-100/50 mb-1">
                    <span>{c.country}</span>
                    <span>&middot;</span>
                    <span>{terminationReasonLabel(c.termination_reason)}</span>
                  </div>
                  <p className="text-cream-100/70 text-xs truncate">{c.role_duties}</p>
                </div>
                <button
                  onClick={() => toggleFeatured(c.id, !c.is_featured)}
                  disabled={busyId === c.id}
                  className={`shrink-0 rounded-full text-sm font-medium px-4 py-1.5 transition-colors disabled:opacity-50 ${
                    c.is_featured
                      ? "bg-cream-50 text-brand-900 hover:bg-white"
                      : "border border-white/20 text-cream-100/80 hover:border-white/40"
                  }`}
                >
                  {c.is_featured ? "Featured" : "Feature"}
                </button>
              </div>
            ))}

            {!loading && approved.length === 0 && (
              <p className="text-cream-100/50 text-sm">No approved cases yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
