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

export default function Admin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<PendingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosenCategory, setChosenCategory] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: cats }, { data: cases }] = await Promise.all([
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase
        .from("cases")
        .select("id, role_duties, country, termination_reason, story_text, employer_name_flagged, created_at")
        .eq("status", "pending")
        .order("created_at"),
    ]);
    setCategories(cats ?? []);
    setPending(cases ?? []);
    setLoading(false);
  }

  async function approve(id: string) {
    const categoryId = chosenCategory[id];
    if (!categoryId) return;

    setBusyId(id);
    await supabase
      .from("cases")
      .update({ status: "approved", category_id: categoryId, approved_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  async function reject(id: string) {
    setBusyId(id);
    await supabase.from("cases").update({ status: "rejected" }).eq("id", id);
    setBusyId(null);
    setPending((prev) => prev.filter((c) => c.id !== id));
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
      </div>
    </div>
  );
}
