import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { terminationReasonLabel } from "../lib/constants";

// Below this many total approved cases, we show nothing broken down —
// small numbers can make individual people identifiable even without
// a name attached. Same idea for the two narrower insight lines
// further down, gated separately since a subgroup (e.g. layoffs)
// can be small even when the total isn't.
const MIN_TOTAL_CASES = 5;
const MIN_SUBGROUP_CASES = 3;

interface CaseRow {
  termination_reason: string;
  got_notice_or_severance: boolean | null;
  got_charge_sheet: boolean | null;
  had_enquiry_meeting: boolean | null;
}

interface ReasonBreakdown {
  reason: string;
  label: string;
  count: number;
  pct: number;
}

export default function Patterns() {
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("cases")
        .select("termination_reason, got_notice_or_severance, got_charge_sheet, had_enquiry_meeting")
        .eq("status", "approved");

      if (cancelled) return;

      if (error) {
        setLoadError("Couldn't load pattern data right now. Please try again shortly.");
        return;
      }
      setCases(data ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 pt-16 text-center">
        <p className="text-cream-100/60 text-sm">{loadError}</p>
      </div>
    );
  }

  if (cases === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 pt-16">
        <p className="text-cream-100/60 text-sm">Loading...</p>
      </div>
    );
  }

  const total = cases.length;

  if (total < MIN_TOTAL_CASES) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 pt-16 text-center">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7">
          <h1 className="font-display text-2xl text-cream-50 mb-2">Not enough cases yet</h1>
          <p className="text-cream-100/60 text-sm">
            Patterns across cases only get shown once there are enough of them that no individual
            person's situation could be picked out. Check back as more cases are reviewed.
          </p>
        </div>
      </div>
    );
  }

  // Breakdown by termination reason
  const counts = new Map<string, number>();
  for (const c of cases) {
    counts.set(c.termination_reason, (counts.get(c.termination_reason) ?? 0) + 1);
  }
  const byReason: ReasonBreakdown[] = Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      label: terminationReasonLabel(reason),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Of cases citing misconduct, how many report no enquiry ever happened —
  // either because none was held, or one was claimed but the meeting itself
  // didn't happen.
  const misconductCases = cases.filter(
    (c) => c.termination_reason === "misconduct_no_enquiry" || c.termination_reason === "misconduct_with_enquiry"
  );
  const noEnquiryCount = cases.filter(
    (c) =>
      c.termination_reason === "misconduct_no_enquiry" ||
      (c.termination_reason === "misconduct_with_enquiry" && c.had_enquiry_meeting === false)
  ).length;
  const showNoEnquiryStat = misconductCases.length >= MIN_SUBGROUP_CASES;
  const pctNoEnquiry = showNoEnquiryStat ? Math.round((noEnquiryCount / misconductCases.length) * 100) : 0;

  // Of layoff/retrenchment cases, how many report no notice or severance.
  const layoffCases = cases.filter((c) => c.termination_reason === "layoff_retrenchment");
  const noNoticeCount = layoffCases.filter((c) => c.got_notice_or_severance === false).length;
  const showNoNoticeStat = layoffCases.length >= MIN_SUBGROUP_CASES;
  const pctNoNotice = showNoNoticeStat ? Math.round((noNoticeCount / layoffCases.length) * 100) : 0;

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl text-cream-50 mb-2">Patterns across cases</h1>
          <p className="text-cream-100/60 text-sm">
            Built from {total} reviewed {total === 1 ? "case" : "cases"}. No names, no employers —
            just what people reported about how their termination was handled.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7">
          <h2 className="font-display text-lg text-cream-50 mb-4">Why people were told they were let go</h2>
          <div className="space-y-3">
            {byReason.map((r) => (
              <div key={r.reason}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-cream-100/80">{r.label}</span>
                  <span className="text-cream-100/50">
                    {r.count} ({r.pct}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-cream-50/70 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {(showNoEnquiryStat || showNoNoticeStat) && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 space-y-4">
            <h2 className="font-display text-lg text-cream-50">What the process looked like</h2>
            {showNoEnquiryStat && (
              <p className="text-sm text-cream-100/75 leading-relaxed">
                Of cases citing misconduct, <span className="text-cream-50 font-medium">{pctNoEnquiry}%</span>{" "}
                report that no formal enquiry meeting actually took place.
              </p>
            )}
            {showNoNoticeStat && (
              <p className="text-sm text-cream-100/75 leading-relaxed">
                Of layoff and retrenchment cases,{" "}
                <span className="text-cream-50 font-medium">{pctNoNotice}%</span> report receiving no
                notice or severance.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-cream-100/40 leading-relaxed">
          These figures reflect only what people chose to share and that were approved after review;
          they're not a scientific survey of BPO terminations in India. They exist to show real,
          recurring patterns — not to judge any single employer.
        </p>
      </div>
    </div>
  );
}
