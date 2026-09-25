// supabase/functions/submit-case/index.ts
//
// Single write path for a new case. The client sends raw form
// values; nothing it sends is trusted until validated here.
// Runs as a Supabase Edge Function (Deno), which scales
// automatically with traffic, no server to manage.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
  "no_reason_given",
  "misconduct_no_enquiry",
  "misconduct_with_enquiry",
  "layoff_retrenchment",
  "forced_resignation",
];

const EMPLOYER_SIZES = ["<50", "50-300", "300+", "not sure"];

// Strips HTML/script-ish content and collapses runaway whitespace.
// Defense in depth: React already escapes text on render, but stored
// text shouldn't carry markup either.
function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ValidationError {
  field: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated." }, 401);
    }

    // Client created with the caller's own JWT, so every request
    // still goes through the database's row-level security as
    // that specific user; this function adds validation on top,
    // it does not bypass security.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Not authenticated." }, 401);
    }

    // IP rate limit: on top of the one-active-case-per-user limit,
    // this stops a script that spins up many different accounts to
    // get around that. Hashed, never stored raw.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await sha256Hex(ip);
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_action: "submit_case",
      p_max_count: 5,
      p_window_minutes: 60,
    });
    if (allowed === false) {
      return json({ error: "Too many submissions from this connection. Please try again in a while." }, 429);
    }

    const body = await req.json();
    const errors: ValidationError[] = [];

    // Idempotency key: one per attempt at submitting the form, sent
    // by the client, reused if it has to retry the same attempt.
    // Checked before validation, so a retry of an already-succeeded
    // submission returns that same case rather than re-validating
    // (and possibly re-rejecting) content the person can no longer
    // see or change on this request.
    const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      return json({ error: "Missing or invalid request key. Please reload and try again." }, 400);
    }

    const { data: existing } = await supabase
      .from("cases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return json({ id: existing.id, status: existing.status }, 200);
    }

    const roleDuties = typeof body.role_duties === "string" ? sanitizeText(body.role_duties) : "";
    if (roleDuties.length < 3 || roleDuties.length > 500) {
      errors.push({ field: "role_duties", message: "Describe your role in 3 to 500 characters." });
    }

    let monthlySalary: number | null = null;
    if (body.monthly_salary !== null && body.monthly_salary !== undefined && body.monthly_salary !== "") {
      monthlySalary = Number(body.monthly_salary);
      if (!Number.isFinite(monthlySalary) || monthlySalary < 0 || monthlySalary > 10_000_000) {
        errors.push({ field: "monthly_salary", message: "Enter a realistic monthly salary." });
      }
    }

    let tenureMonths: number | null = null;
    if (body.tenure_months !== null && body.tenure_months !== undefined && body.tenure_months !== "") {
      tenureMonths = Number(body.tenure_months);
      if (!Number.isInteger(tenureMonths) || tenureMonths < 0 || tenureMonths > 600) {
        errors.push({ field: "tenure_months", message: "Enter how many months you worked there, as a whole number." });
      }
    }

    const country = typeof body.country === "string" ? body.country : "";
    if (!COUNTRIES.includes(country)) {
      errors.push({ field: "country", message: "Select a valid country." });
    }

    const employerSize = typeof body.employer_size === "string" ? body.employer_size : "not sure";
    if (!EMPLOYER_SIZES.includes(employerSize)) {
      errors.push({ field: "employer_size", message: "Select a valid company size." });
    }

    const terminationReason = typeof body.termination_reason === "string" ? body.termination_reason : "";
    if (!TERMINATION_REASONS.includes(terminationReason)) {
      errors.push({ field: "termination_reason", message: "Select why you were told you were let go." });
    }

    const toBoolOrNull = (v: unknown) => (typeof v === "boolean" ? v : null);
    const gotNoticeOrSeverance = toBoolOrNull(body.got_notice_or_severance);
    const gotChargeSheet = toBoolOrNull(body.got_charge_sheet);
    const hadEnquiryMeeting = toBoolOrNull(body.had_enquiry_meeting);

    const storyText = typeof body.story_text === "string" ? sanitizeText(body.story_text) : "";
    const storyWords = wordCount(storyText);
    if (storyWords < 20) {
      errors.push({ field: "story_text", message: "Tell us a bit more; at least 20 words." });
    }
    if (storyWords > 600) {
      errors.push({ field: "story_text", message: "Please keep your story under 600 words." });
    }

    if (errors.length > 0) {
      return json({ error: "Some fields need attention.", fields: errors }, 422);
    }

    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: user.id,
        role_duties: roleDuties,
        monthly_salary: monthlySalary,
        tenure_months: tenureMonths,
        country,
        employer_size: employerSize,
        termination_reason: terminationReason,
        got_notice_or_severance: gotNoticeOrSeverance,
        got_charge_sheet: gotChargeSheet,
        had_enquiry_meeting: hadEnquiryMeeting,
        story_text: storyText,
        idempotency_key: idempotencyKey,
      })
      .select("id, status")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Two requests with the same key arrived at once (e.g. a
        // double-click); the loser here is really a success too.
        if (error.message.includes("cases_user_idempotency_key")) {
          const { data: raceRow } = await supabase
            .from("cases")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (raceRow) return json({ id: raceRow.id, status: raceRow.status }, 200);
        }
        // Otherwise it's the "one active case per user" unique index.
        return json({ error: "You already have a case submitted. Only one active submission is allowed at a time." }, 409);
      }
      return json({ error: "Could not save your case. Please try again." }, 500);
    }

    return json({ id: data.id, status: data.status }, 201);
  } catch {
    return json({ error: "Unexpected error. Please try again." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
