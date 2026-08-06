// Stage 2 of the two-stage flow. Generates the structured answer that
// the owner sees. See answerPrompt.ts for the prompt text (vet-editable).
import "server-only";
import { callAnthropicJson, OWNER_MODEL } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/petContext";
import {
  SYSTEM_PROMPT,
  buildAnswerUserPrompt,
} from "@/lib/ai/answerPrompt";
import {
  AnswerResultSchema,
  type AnswerResult,
  type FollowupAnswers,
  type TriageResult,
} from "@/lib/ai/schemas";

const SAFE_FALLBACK: AnswerResult = {
  urgency: "monitor",
  isEmergency: false,
  summary:
    "I can't fully assess this from what you shared; here's what to watch for.",
  watchFor: [
    "Not eating or drinking for more than 24 hours",
    "Vomiting or diarrhea that keeps recurring",
    "Lethargy that gets worse instead of better",
    "Any new or worsening pain",
  ],
  atHome: [],
  whenToSeeVet:
    "Consider a licensed vet visit if the signs above appear, if things get worse, or if you're worried — a $20 vet review from within Amia is a fast next step.",
};

const EMERGENCY_FALLBACK: AnswerResult = {
  urgency: "urgent",
  isEmergency: true,
  summary:
    "This is not appropriate for Amia. Please get to a clinic or ER now.",
  watchFor: [
    "Trouble breathing",
    "Collapse or unresponsiveness",
    "Seizures",
    "Uncontrolled bleeding",
  ],
  atHome: [],
  whenToSeeVet: "Now — an emergency clinic, not us.",
};

export async function runAnswer(opts: {
  questionText: string;
  petId: string | null;
  triage: TriageResult;
  followupAnswers: FollowupAnswers;
}): Promise<AnswerResult> {
  const petContext = await buildPetContext(opts.petId);
  const userPrompt = buildAnswerUserPrompt({
    questionText: opts.questionText,
    petContext,
    intake: opts.triage.intake,
    triage: opts.triage,
    followupAnswers: opts.followupAnswers,
  });

  let answer: AnswerResult;
  try {
    const { data } = await callAnthropicJson({
      model: OWNER_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1500,
      schema: AnswerResultSchema,
      kind: "owner_ask",
      consultId: null,
    });
    answer = data;
  } catch (err) {
    console.warn("answer first attempt failed:", err);
    try {
      const { data } = await callAnthropicJson({
        model: OWNER_MODEL,
        systemPrompt:
          SYSTEM_PROMPT +
          "\n\nREMINDER: Your last response could not be parsed. Return a single JSON object EXACTLY matching the schema above. No prose, no code fences.",
        userPrompt,
        maxTokens: 1500,
        schema: AnswerResultSchema,
        kind: "owner_ask",
        consultId: null,
      });
      answer = data;
    } catch (err2) {
      console.error("answer retry failed, using safe fallback:", err2);
      answer =
        opts.triage.decision === "emergency"
          ? EMERGENCY_FALLBACK
          : SAFE_FALLBACK;
    }
  }

  // If triage flagged emergency, force emergency framing regardless of
  // what the model returned. Preserve the model's watchFor list if it
  // provided one; otherwise use the fallback watchFor items.
  if (opts.triage.decision === "emergency") {
    return {
      ...answer,
      urgency: "urgent",
      isEmergency: true,
      summary:
        answer.summary?.startsWith("This is not appropriate for Amia")
          ? answer.summary
          : "This is not appropriate for Amia. Please get to a clinic or ER now." +
            (opts.triage.emergencyReason
              ? ` Reason: ${opts.triage.emergencyReason}`
              : ""),
      atHome: [],
      watchFor:
        answer.watchFor.length > 0 ? answer.watchFor : EMERGENCY_FALLBACK.watchFor,
      whenToSeeVet: "Now — an emergency clinic, not us.",
    };
  }

  return answer;
}
