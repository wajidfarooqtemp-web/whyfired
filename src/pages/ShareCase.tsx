import { useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { assessTermination, type TerminationReason } from "../lib/assessment";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium",
  "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cambodia",
  "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia", "Fiji",
  "Finland", "France", "Georgia", "Germany", "Ghana", "Greece",
  "Guatemala", "Honduras", "Hong Kong", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg", "Malaysia",
  "Maldives", "Malta", "Mauritius", "Mexico", "Moldova", "Mongolia",
  "Montenegro", "Morocco", "Myanmar", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
  "Other",
];

const TERMINATION_REASONS = [
  { value: "no_reason_given", label: "No reason was given" },
  { value: "misconduct_no_enquiry", label: '"Misconduct", with no formal enquiry' },
  { value: "misconduct_with_enquiry", label: '"Misconduct", with a formal enquiry' },
  { value: "layoff_retrenchment", label: "Layoff / retrenchment" },
  { value: "forced_resignation", label: "Forced to resign, though I didn't want to" },
];

const YES_NO = [
  { value: "", label: "Not sure" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function inputClass() {
  return "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream-50 placeholder-cream-100/40 focus:border-white/40 outline-none";
}

export default function ShareCase() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [roleDuties, setRoleDuties] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [country, setCountry] = useState("");
  const [employerSize, setEmployerSize] = useState("not sure");
  const [terminationReason, setTerminationReason] = useState("");
  const [gotNotice, setGotNotice] = useState("");
  const [gotChargeSheet, setGotChargeSheet] = useState("");
  const [hadEnquiry, setHadEnquiry] = useState("");
  const [storyText, setStoryText] = useState("");
  // One key per attempt at filling out this form, generated once
// when the page loads and reused on every submit attempt,
// including an automatic retry after a dropped connection. Lets
// the server tell "the same submission again" apart from "a
// second, different submission."
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const wordCount = useMemo(
    () => storyText.trim().split(/\s+/).filter(Boolean).length,
    [storyText]
  );

  const toTriBool = (v: string) => (v === "" ? null : v === "true");

  const assessment = useMemo(() => {
    if (!terminationReason) return null;
    return assessTermination({
      terminationReason: terminationReason as TerminationReason,
      gotNoticeOrSeverance: toTriBool(gotNotice),
      gotChargeSheet: toTriBool(gotChargeSheet),
      hadEnquiryMeeting: toTriBool(hadEnquiry),
    });
  }, [terminationReason, gotNotice, gotChargeSheet, hadEnquiry]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const toBool = (v: string) => (v === "" ? null : v === "true");

    const { data, error: invokeError } = await supabase.functions.invoke("submit-case", {
      body: {
        role_duties: roleDuties,
        monthly_salary: monthlySalary === "" ? null : Number(monthlySalary),
        tenure_months: tenureMonths === "" ? null : Number(tenureMonths),
        country,
        employer_size: employerSize,
        termination_reason: terminationReason,
        got_notice_or_severance: toBool(gotNotice),
        got_charge_sheet: toBool(gotChargeSheet),
        had_enquiry_meeting: toBool(hadEnquiry),
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
      <div className="min-h-screen flex items-center justify-center px-5 pt-16 pb-16">
        <div className="w-full max-w-md space-y-4">
          {assessment && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7">
              <p className="text-xs uppercase tracking-wide text-cream-100/40 mb-2">
                Your rights, in plain language
              </p>

              <h2 className="font-display text-xl text-cream-50 mb-3">
                {assessment.headline}
              </h2>

              <ul className="space-y-2 mb-5">
                {assessment.reasons.map((reason: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-cream-100/75 leading-relaxed"
                  >
                    {reason}
                  </li>
                ))}
              </ul>

              <p className="text-xs uppercase tracking-wide text-cream-100/40 mb-2">
                What you can do next
              </p>

              <div className="space-y-3 mb-5">
                {assessment.nextSteps.map(
                  (
                    step: {
                      title: string;
                      body: string;
                      href?: string;
                    },
                    i: number
                  ) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/10 p-3"
                    >
                      {step.href ? (
                        <a
                          href={step.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-cream-50 underline"
                        >
                          {step.title}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-cream-50">
                          {step.title}
                        </p>
                      )}

                      <p className="text-xs text-cream-100/60 mt-1">
                        {step.body}
                      </p>
                    </div>
                  )
                )}
              </div>

              <p className="text-xs text-cream-100/40 leading-relaxed">
                {assessment.disclaimer}
              </p>
            </div>
          )}

          <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 text-center">
            <h1 className="font-display text-2xl text-cream-50 mb-2">
              Your case is in
            </h1>

            <p className="text-cream-100/60 text-sm mb-6">
              It's pending review before it appears publicly. That review only
              decides whether it counts toward pattern data and shows up in
              Stories; it never blocks you from anything else on the site.
            </p>

            <button
              onClick={() => navigate("/")}
              className="rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2.5 hover:bg-white transition-colors"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 space-y-5"
      >
        <div>
          <h1 className="font-display text-2xl text-cream-50 mb-1">Share your case</h1>
          <p className="text-cream-100/60 text-sm">
            Posting as <span className="text-cream-50">{profile?.display_name}</span>.
            Never mention your employer's name; stories that do get flagged for review.
          </p>
        </div>

        <Field label="What was your role? (not just your title; what you actually did)" error={fieldErrors.role_duties}>
          <input
            type="text"
            required
            value={roleDuties}
            onChange={(e) => setRoleDuties(e.target.value)}
            placeholder="e.g. Handled inbound billing complaints for a US telecom client"
            className={inputClass()}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly salary (optional)" error={fieldErrors.monthly_salary}>
            <input
              type="number"
              min={0}
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              placeholder="Amount"
              className={inputClass()}
            />
          </Field>
          <Field label="How long did you work there? (months)" error={fieldErrors.tenure_months}>
            <input
              type="number"
              min={0}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              placeholder="e.g. 18"
              className={inputClass()}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" error={fieldErrors.country}>
            <select value={country} onChange={(e) => setCountry(e.target.value)} required className={inputClass()}>
              <option value="" disabled>Select</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Company size" error={fieldErrors.employer_size}>
            <select value={employerSize} onChange={(e) => setEmployerSize(e.target.value)} className={inputClass()}>
              <option value="not sure">Not sure</option>
              <option value="<50">Under 50 people</option>
              <option value="50-300">50 to 300 people</option>
              <option value="300+">300+ people</option>
            </select>
          </Field>
        </div>

        <Field label="Why were you told you were let go?" error={fieldErrors.termination_reason}>
          <select value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} required className={inputClass()}>
            <option value="" disabled>Select</option>
            {TERMINATION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Got notice or severance?">
            <select value={gotNotice} onChange={(e) => setGotNotice(e.target.value)} className={inputClass()}>
              {YES_NO.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Given a charge sheet?">
            <select value={gotChargeSheet} onChange={(e) => setGotChargeSheet(e.target.value)} className={inputClass()}>
              {YES_NO.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Formal enquiry meeting?">
            <select value={hadEnquiry} onChange={(e) => setHadEnquiry(e.target.value)} className={inputClass()}>
              {YES_NO.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <Field
          label="Tell your story"
          error={fieldErrors.story_text}
          hint={`${wordCount} / 600 words. Leave out your employer's name.`}
        >
          <textarea
            required
            rows={7}
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="What happened, in your own words."
            className={inputClass()}
          />
        </Field>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-cream-50 text-brand-900 text-sm font-medium py-3 hover:bg-white transition-colors disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit case"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-cream-100/70 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-cream-100/40 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-300 mt-1">{error}</span>}
    </label>
  );
}
