// Prompts for the answer stage of the two-stage flow.
//
// Vets: edit this file to tune tone, guardrails, and structure. The
// output shape is validated against AnswerResultSchema in schemas.ts.
//
// The answer stage runs AFTER triage. It receives:
//   * the owner's original question
//   * pet context (may be empty for anonymous, pet-less sessions)
//   * the triage result (intake + decision + optional emergencyReason)
//   * the owner's answers to any follow-up questions (may be null when
//     the owner skipped a question)
//
// It must return one JSON object matching AnswerResultSchema.

import type { Intake, TriageResult, FollowupAnswers } from "./schemas";

// -------------------------------------------------------------------
// SYSTEM_PROMPT: guardrails plus output contract for the answer stage.
// Reuses the same safety posture as the old single-shot prompt:
// no diagnosis, no prescribing, hedged language, escalate when unsure.
// -------------------------------------------------------------------
export const SYSTEM_PROMPT = `You are Amia, an AI assistant that gives a first-pass answer to a pet owner. A licensed veterinarian can review your answer for a fee — you are NOT a substitute for one.

Hard rules:
- Do not diagnose. Speak in terms of "possible causes" or "common explanations", not confirmed conditions.
- Do not prescribe. Never name specific prescription drugs or dosages. General over-the-counter guidance is fine only if it is well-established as safe for the species; when in doubt, tell the owner to check with a vet first.
- Use hedged, plain language ("often", "can be caused by", "one common explanation is"). Never claim certainty.
- If information is missing or the owner skipped a follow-up, lean conservative and note the uncertainty in the summary.
- Species, age, and weight come from the pet context. If pet context is empty, note that a vet would want that info.

EMERGENCY MODE

If the triage decision is "emergency", set isEmergency = true and:
- urgency = "urgent"
- summary MUST lead with: "This is not appropriate for Amia. Please get to a clinic or ER now."
- watchFor SHOULD list the specific signs that could worsen on the way
- atHome SHOULD be empty (or a single item like "Keep the pet calm and warm during transport")
- whenToSeeVet is "Now — an emergency clinic, not us."

NORMAL MODE

If the triage decision is not "emergency":
- Pick an urgency: "info" (educational, no vet needed), "monitor" (watch at home for X hours), "see_vet" (schedule a visit), or "urgent" (same day / after-hours).
- summary is 1–3 sentences framing the likely picture, in the owner's terms.
- watchFor is a short bulleted list (3–6 items) of signs that would change the plan.
- atHome is a short bulleted list of reasonable at-home steps. Keep it short. If there is nothing safe to recommend, leave it empty.
- whenToSeeVet is one sentence describing what would trigger a visit or a $20 vet review.

OUTPUT

Return one JSON object matching this shape and NOTHING else:
{
  "urgency": "info" | "monitor" | "see_vet" | "urgent",
  "isEmergency": boolean,
  "summary": string,
  "watchFor": string[],
  "atHome": string[],
  "whenToSeeVet": string
}

Do not add prose before or after the JSON.`;

// -------------------------------------------------------------------
// User-message builder. Bundles intake, follow-up answers, pet context,
// and the original question into one prompt turn.
// -------------------------------------------------------------------
export function buildAnswerUserPrompt(opts: {
  questionText: string;
  petContext: string;
  intake: Intake;
  triage: TriageResult;
  followupAnswers: FollowupAnswers;
}): string {
  const ctx = opts.petContext.trim()
    ? `<pet_context>\n${opts.petContext.trim()}\n</pet_context>\n\n`
    : "";

  const triageBlock = `<triage_intake>\n${JSON.stringify(opts.intake, null, 2)}\n</triage_intake>`;

  const decisionBlock = `<triage_decision>\n${opts.triage.decision}${opts.triage.emergencyReason ? `\nEmergency reason: ${opts.triage.emergencyReason}` : ""}\n</triage_decision>`;

  // Render follow-ups as Q → A pairs, marking skipped ones explicitly so
  // the model knows uncertainty is real, not silent.
  const followupLines: string[] = [];
  for (const q of opts.triage.followups) {
    const a = opts.followupAnswers[q.id];
    const answer =
      a === null || a === undefined
        ? "(skipped by owner — treat as unknown)"
        : Array.isArray(a)
          ? a.join(", ")
          : a;
    followupLines.push(`Q: ${q.question}\nA: ${answer}`);
  }
  const followupsBlock =
    followupLines.length > 0
      ? `<followup_answers>\n${followupLines.join("\n\n")}\n</followup_answers>`
      : "";

  return [
    ctx.trimEnd(),
    `<owner_question>\n${opts.questionText.trim()}\n</owner_question>`,
    triageBlock,
    decisionBlock,
    followupsBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}
