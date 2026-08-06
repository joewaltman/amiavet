// Stage 1 of the two-stage flow. Runs an invisible triage call to
// extract a structured intake and decide answer_now / need_more_info /
// emergency. See triagePrompt.ts for the prompt text (vet-editable).
import "server-only";
import { callAnthropicJson, OWNER_MODEL } from "@/lib/ai/anthropic";
import { buildPetContext } from "@/lib/ai/petContext";
import {
  SYSTEM_PROMPT,
  buildTriageUserPrompt,
} from "@/lib/ai/triagePrompt";
import { TriageResultSchema, type TriageResult } from "@/lib/ai/schemas";

// If both the primary call and the retry blow up, return this so the
// owner still gets a useful screen (one generic follow-up).
const SAFE_FALLBACK: TriageResult = {
  intake: {
    chiefComplaint: "unclear",
    duration: null,
    redFlagsMatched: [],
    decision: "need_more_info",
    notes: "AI triage failed; asking a generic clarifying question.",
  },
  decision: "need_more_info",
  followups: [
    {
      id: "duration_and_intake",
      question:
        "How long has this been going on, and is your pet still eating and drinking?",
      inputType: "text",
      multiSelect: false,
    },
  ],
  emergencyReason: null,
};

export async function runTriage(opts: {
  questionText: string;
  petId: string | null;
}): Promise<TriageResult> {
  const petContext = await buildPetContext(opts.petId);
  const userPrompt = buildTriageUserPrompt({
    questionText: opts.questionText,
    petContext,
  });

  // First attempt.
  try {
    const { data } = await callAnthropicJson({
      model: OWNER_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 800,
      schema: TriageResultSchema,
      kind: "triage",
      consultId: null,
    });
    return normalize(data);
  } catch (err) {
    console.warn("triage first attempt failed:", err);
  }

  // Retry with a stricter reminder appended.
  try {
    const { data } = await callAnthropicJson({
      model: OWNER_MODEL,
      systemPrompt:
        SYSTEM_PROMPT +
        "\n\nREMINDER: Your last response could not be parsed. Return a single JSON object EXACTLY matching the schema above. No prose, no code fences.",
      userPrompt,
      maxTokens: 800,
      schema: TriageResultSchema,
      kind: "triage",
      consultId: null,
    });
    return normalize(data);
  } catch (err) {
    console.error("triage retry failed, returning safe fallback:", err);
    return SAFE_FALLBACK;
  }
}

// Enforce cross-field invariants that the schema alone can't (a schema
// allows any followups length up to 3, but "emergency" must have zero).
function normalize(t: TriageResult): TriageResult {
  const decision = t.intake.decision;
  if (decision === "emergency") {
    return { ...t, decision, followups: [] };
  }
  return { ...t, decision };
}
