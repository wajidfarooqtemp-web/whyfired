// Turns a person's answers into a plain-language read on whether the
// *process* their employer followed looks lawful — never a verdict on
// whether they'd "win," and never a promise. This is deliberately a
// pure function (no network calls, no database) so it can run
// instantly in the browser right after someone fills out the form,
// with zero risk of it disagreeing with what's actually stored.
//
// Legal basis: the Industrial Disputes Act, 1947 (still the operative
// law in most states) requires a documented reason, a charge sheet,
// and a fair enquiry before a "misconduct" dismissal; and requires
// notice or pay-in-lieu plus retrenchment compensation for a layoff.
// The newer Industrial Relations Code, 2020 carries the same core
// protections forward as it rolls out state by state. None of this
// is a substitute for advice from SAMADHAN or a labour advocate —
// this function's own output says so, every time.

export type TerminationReason =
  | "no_reason_given"
  | "misconduct_no_enquiry"
  | "misconduct_with_enquiry"
  | "layoff_retrenchment"
  | "forced_resignation";

// Matches how the form actually collects these: a yes/no question
// that can also be left as "not sure" — which is real, useful
// information (it often means no paperwork was ever given), not
// missing data to be ignored.
export type TriBool = boolean | null;

export interface AssessmentInput {
  terminationReason: TerminationReason;
  gotNoticeOrSeverance: TriBool;
  gotChargeSheet: TriBool;
  hadEnquiryMeeting: TriBool;
}

export type Verdict =
  | "likely_unfair"
  | "questionable"
  | "process_followed"
  | "needs_more_info";

export interface AssessmentResult {
  verdict: Verdict;
  headline: string;
  reasons: string[];
  nextSteps: NextStep[];
  disclaimer: string;
}

export interface NextStep {
  title: string;
  body: string;
  href?: string;
}

const DISCLAIMER =
  "This is a plain-language read on the process your employer followed, based only on what you entered here; not a legal verdict, and not a guarantee of any outcome. For anything formal, use the next steps below or speak with a labour advocate.";

const SAMADHAN_STEP: NextStep = {
  title: "File with SAMADHAN",
  body: "India's official government portal for labour disputes. Filing is free and doesn't require a lawyer to get started.",
  href: "https://samadhan.labour.gov.in",
};

const COMMISSIONER_STEP: NextStep = {
  title: "Contact your state Labour Commissioner",
  body: "Every state has a Labour Commissioner's office that handles disputes like this directly. SAMADHAN can point you to the right one for your state, or search \"[your state] labour commissioner office\" to find their contact details.",
};

const DOCUMENTS_STEP: NextStep = {
  title: "Gather your paperwork now",
  body: "Termination letter, any charge sheet, salary slips, appointment letter, and anything in writing about why you were let go. Whatever step you take next, having these ready matters more than almost anything else.",
};

const NOTICE_TEMPLATE_STEP: NextStep = {
  title: "What a legal notice typically covers",
  body: "A formal notice to your employer usually states the facts of your termination, names the specific step(s) that were skipped, and requests a remedy (reinstatement, notice pay, or compensation) within a set number of days. It's worth having a labour advocate review or draft the actual wording before you send one; the specifics matter.",
};

export function assessTermination(input: AssessmentInput): AssessmentResult {
  const { terminationReason, gotNoticeOrSeverance, gotChargeSheet, hadEnquiryMeeting } = input;

  switch (terminationReason) {
    case "no_reason_given": {
      return {
        verdict: "likely_unfair",
        headline: "This doesn't look like a lawful dismissal process.",
        reasons: [
          "Indian labour law requires your employer to give a specific, documented reason before ending your job. \"No reason given\" does not meet that standard on its own.",
          "Without a stated reason, there's usually no charge sheet or formal enquiry either... both of which are also required for a dismissal to hold up.",
        ],
        nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP, COMMISSIONER_STEP, NOTICE_TEMPLATE_STEP],
        disclaimer: DISCLAIMER,
      };
    }

    case "misconduct_no_enquiry": {
      const reasons = [
        "Dismissing someone for \"misconduct\" legally requires a formal enquiry: a charge sheet, a real chance to respond, and a documented decision. Skipping that step is one of the most common ways terminations go wrong.",
      ];
      if (gotChargeSheet === false) {
        reasons.push("You also didn't receive a charge sheet, which is normally the required first step before any misconduct enquiry can even begin.");
      } else if (gotChargeSheet === null) {
        reasons.push("It's also worth pinning down whether you were ever given a charge sheet in writing; that detail matters if you take this further.");
      }
      return {
        verdict: "likely_unfair",
        headline: "The process appears to have skipped a legally required step.",
        reasons,
        nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP, COMMISSIONER_STEP, NOTICE_TEMPLATE_STEP],
        disclaimer: DISCLAIMER,
      };
    }

    case "misconduct_with_enquiry": {
      if (hadEnquiryMeeting === true && gotChargeSheet === true) {
        return {
          verdict: "process_followed",
          headline: "On the surface, the required process steps look like they were followed.",
          reasons: [
            "You received a charge sheet and had a formal enquiry meeting, which are the two central procedural requirements for a misconduct-based dismissal.",
            "That doesn't automatically mean the decision itself was fair or proportionate to whatever you were accused of; just that the paperwork steps were present. Whether the enquiry was conducted fairly (a neutral decision-maker, a genuine chance to respond, evidence actually considered) matters just as much as whether it happened at all.",
          ],
          nextSteps: [
            DOCUMENTS_STEP,
            {
              title: "Still worth a second opinion",
              body: "A labour advocate or SAMADHAN can look at whether the enquiry itself was conducted fairly, not just whether it technically took place.",
            },
            SAMADHAN_STEP,
          ],
          disclaimer: DISCLAIMER,
        };
      }

      if (hadEnquiryMeeting === false || gotChargeSheet === false) {
        return {
          verdict: "questionable",
          headline: "Something about this doesn't add up, and that's worth looking into.",
          reasons: [
            "You indicated there was a formal enquiry, but also that " +
              (gotChargeSheet === false && hadEnquiryMeeting === false
                ? "you didn't receive a charge sheet and there was no real enquiry meeting."
                : gotChargeSheet === false
                ? "you didn't receive a charge sheet; normally a required part of that same process."
                : "there wasn't an actual enquiry meeting; normally a required part of that same process."),
            "An enquiry that's missing one of its required parts is often treated the same as no enquiry at all.",
          ],
          nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP, COMMISSIONER_STEP, NOTICE_TEMPLATE_STEP],
          disclaimer: DISCLAIMER,
        };
      }

      return {
        verdict: "needs_more_info",
        headline: "There isn't quite enough here to give you a clear read yet.",
        reasons: [
          "Whether a misconduct dismissal was lawful usually comes down to two specific things: did you receive a written charge sheet, and did an actual enquiry meeting happen where you could respond. Try to pin those two details down, even roughly, they change the picture a lot.",
        ],
        nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP],
        disclaimer: DISCLAIMER,
      };
    }

    case "layoff_retrenchment": {
      if (gotNoticeOrSeverance === true) {
        return {
          verdict: "process_followed",
          headline: "The basic requirements for a layoff appear to have been met.",
          reasons: [
            "You received notice or severance, which is the central legal requirement for a retrenchment/layoff under Indian labour law.",
            "Whether the *amount* you received matches what you were legally owed is a separate question this can't check; that depends on your exact tenure and last-drawn salary, which is worth having someone verify.",
          ],
          nextSteps: [
            DOCUMENTS_STEP,
            {
              title: "Double-check the amount",
              body: "Retrenchment compensation is typically calculated from your length of service and average pay. A labour advocate or SAMADHAN can help confirm whether what you received matches what's legally due.",
            },
            SAMADHAN_STEP,
          ],
          disclaimer: DISCLAIMER,
        };
      }
      if (gotNoticeOrSeverance === false) {
        return {
          verdict: "likely_unfair",
          headline: "A layoff without notice or severance is usually not lawful.",
          reasons: [
            "Indian labour law requires notice (or pay in place of notice) plus retrenchment compensation when an employer lays off staff. Going without either is one of the clearest process gaps this can flag.",
          ],
          nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP, COMMISSIONER_STEP, NOTICE_TEMPLATE_STEP],
          disclaimer: DISCLAIMER,
        };
      }
      return {
        verdict: "needs_more_info",
        headline: "Whether you received notice or severance changes the picture a lot here.",
        reasons: [
          "That single detail is usually the deciding factor for whether a layoff followed the law. Worth pinning down before deciding what to do next.",
        ],
        nextSteps: [DOCUMENTS_STEP, SAMADHAN_STEP],
        disclaimer: DISCLAIMER,
      };
    }

    case "forced_resignation": {
      return {
        verdict: "questionable",
        headline: "A resignation that wasn't really your choice can still count as a dismissal.",
        reasons: [
          "If you were pressured or maneuvered into resigning, that can, in practice, be treated the same as a firing, meaning the same fair-process requirements should have applied.",
          "This is genuinely harder to act on than a direct termination, since there's usually no formal dismissal letter on paper. What you say in your own words, and anything in writing (emails, messages) about the pressure, matters a lot here.",
        ],
        nextSteps: [
          DOCUMENTS_STEP,
          {
            title: "Save any written pressure",
            body: "Emails, chat messages, or anything in writing that shows you were pushed to resign are the most useful evidence in a case like this.",
          },
          SAMADHAN_STEP,
          COMMISSIONER_STEP,
        ],
        disclaimer: DISCLAIMER,
      };
    }
  }
}
