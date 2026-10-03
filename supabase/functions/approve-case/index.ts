// supabase/functions/approve-case/index.ts
//
// The only way a pending case becomes approved. An admin can edit
// any field here (e.g. replacing an employer's name with
// "[Company name removed]") before approving — whatever is sent
// here, once validated, becomes the published version. The original
// submission is never altered; it's preserved separately
// (cases.original_submission) so the edit history stays visible.
//
// Every field goes through exactly the same validation as a person's
// own submission does (see _shared/caseValidation.ts) — an admin
// edit that would have been rejected from a normal user is rejected
// here too. Runs as the admin's own JWT, not a service role, so the
// database's own "admins can update any case" RLS policy is still
// the thing actually enforcing who can do this — this function adds
// validation on top, it does not bypass security.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  COUNTRIES,
  TERMINATION_REASONS,
  EMPLOYER_SIZES,
  sanitizeText,
  wordCount,
  type ValidationError,
} from "../_shared/caseValidation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated." }, 401);
    }

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

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!callerProfile?.is_admin) {
      return json({ error: "Not authorized." }, 403);
    }

    const body = await req.json();

    const caseId = typeof body.case_id === "string" ? body.case_id : "";
    if (!caseId) {
      return json({ error: "Missing case_id." }, 400);
    }

    // Must actually be pending — this is what stops the same case
    // being "approved" twice (e.g. two admin tabs open at once), and
    // stops this endpoint being used to silently rewrite a case
    // that's already live.
    const { data: existing } = await supabase
      .from("cases")
      .select("id, status, posted_as_official")
      .eq("id", caseId)
      .maybeSingle();
    if (!existing) {
      return json({ error: "Case not found." }, 404);
    }
    if (existing.status !== "pending") {
      return json({ error: "This case is no longer pending review." }, 409);
    }
    if (existing.posted_as_official) {
      return json({ error: "Official posts don't go through the review queue." }, 400);
    }

    const errors: ValidationError[] = [];

    const roleDuties = typeof body.role_duties === "string" ? sanitizeText(body.role_duties) : "";
    if (roleDuties.length < 3 || roleDuties.length > 500) {
      errors.push({ field: "role_duties", message: "Describe the role in 3 to 500 characters." });
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
      errors.push({ field: "termination_reason", message: "Select a valid termination reason." });
    }

    const toBoolOrNull = (v: unknown) => (typeof v === "boolean" ? v : null);
    const gotNoticeOrSeverance = toBoolOrNull(body.got_notice_or_severance);
    const gotChargeSheet = toBoolOrNull(body.got_charge_sheet);
    const hadEnquiryMeeting = toBoolOrNull(body.had_enquiry_meeting);

    const storyText = typeof body.story_text === "string" ? sanitizeText(body.story_text) : "";
    const storyWords = wordCount(storyText);
    if (storyWords < 20) {
      errors.push({ field: "story_text", message: "Story must be at least 20 words." });
    }
    if (storyWords > 600) {
      errors.push({ field: "story_text", message: "Story must be under 600 words." });
    }

    const categoryId = typeof body.category_id === "string" ? body.category_id : "";
    if (!categoryId) {
      errors.push({ field: "category_id", message: "Choose a category." });
    } else {
      const { data: categoryRow } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .maybeSingle();
      if (!categoryRow) {
        errors.push({ field: "category_id", message: "That category doesn't exist." });
      }
    }

    if (errors.length > 0) {
      return json({ error: "Some fields need attention.", fields: errors }, 422);
    }

    // Recomputed fresh from the final, edited text — not carried
    // over from the original submission. An admin removing a flagged
    // employer name should be able to clear this flag; an admin
    // adding a name that wasn't there before should be able to set
    // it. This mirrors exactly what the insert trigger does for a
    // brand-new submission (see before_case_insert), just run here
    // explicitly since that trigger only fires on INSERT, not UPDATE.
    const { data: flagFromStory } = await supabase.rpc("text_flags_employer", { body: storyText });
    const { data: flagFromRole } = await supabase.rpc("text_flags_employer", { body: roleDuties });
    const employerNameFlagged = Boolean(flagFromStory) || Boolean(flagFromRole);

    const { data: updated, error: updateError } = await supabase
      .from("cases")
      .update({
        role_duties: roleDuties,
        country,
        employer_size: employerSize,
        termination_reason: terminationReason,
        got_notice_or_severance: gotNoticeOrSeverance,
        got_charge_sheet: gotChargeSheet,
        had_enquiry_meeting: hadEnquiryMeeting,
        story_text: storyText,
        category_id: categoryId,
        employer_name_flagged: employerNameFlagged,
        status: "approved",
        approved_at: new Date().toISOString(),
        edited_by: user.id,
        edited_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("status", "pending") // re-checked here too, not just above — closes the race window between the read and this write
      .select("id, status")
      .maybeSingle();

    if (updateError || !updated) {
      return json({ error: "Could not approve this case. It may have already been handled." }, 409);
    }

    return json({ id: updated.id, status: updated.status }, 200);
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