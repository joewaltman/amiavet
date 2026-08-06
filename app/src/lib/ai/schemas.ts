// Shared zod schemas for the two-stage triage → answer flow.
// Imported from both server (Route Handlers, AI helpers) and client
// (AskFlow component). Types are inferred via z.infer<>.
import { z } from "zod";

// ------ Followup question shape (asked in the middle stage) ------

export const FollowupSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  inputType: z.enum(["chips", "text"]),
  // Present when inputType === "chips".
  options: z.array(z.string()).optional(),
  // Only meaningful for chips; text is always single-value.
  multiSelect: z.boolean().optional().default(false),
});
export type Followup = z.infer<typeof FollowupSchema>;

// ------ Triage stage ------

// The "intake" is a structured extraction of the owner's free text plus
// pet context. It is embedded inside TriageResult so the answer stage can
// consume it without re-parsing prose.
export const IntakeSchema = z.object({
  chiefComplaint: z.string(),
  duration: z.string().nullable().optional(),
  redFlagsMatched: z.array(z.string()).default([]),
  decision: z.enum(["answer_now", "need_more_info", "emergency"]),
  notes: z.string().nullable().optional(),
});
export type Intake = z.infer<typeof IntakeSchema>;

export const TriageResultSchema = z.object({
  intake: IntakeSchema,
  // Alias at the top level for convenience.
  decision: z.enum(["answer_now", "need_more_info", "emergency"]),
  followups: z.array(FollowupSchema).max(3).default([]),
  emergencyReason: z.string().nullable().optional(),
});
export type TriageResult = z.infer<typeof TriageResultSchema>;

// ------ Answer stage ------

export const AnswerResultSchema = z.object({
  urgency: z.enum(["info", "monitor", "see_vet", "urgent"]),
  isEmergency: z.boolean().default(false),
  summary: z.string(),
  watchFor: z.array(z.string()).default([]),
  atHome: z.array(z.string()).default([]),
  whenToSeeVet: z.string(),
});
export type AnswerResult = z.infer<typeof AnswerResultSchema>;

// ------ Request bodies ------

export const TriageRequestSchema = z.object({
  petId: z.string().nullable().optional(),
  questionText: z.string().min(10).max(4000),
});
export type TriageRequest = z.infer<typeof TriageRequestSchema>;

// Answers to individual follow-ups keyed by Followup.id. A null value means
// the owner explicitly skipped the question ("not sure").
const FollowupAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.null()])
);
export type FollowupAnswers = z.infer<typeof FollowupAnswersSchema>;

export const AnswerRequestSchema = z.object({
  petId: z.string().nullable().optional(),
  questionText: z.string().min(10).max(4000),
  triage: TriageResultSchema,
  followupAnswers: FollowupAnswersSchema.default({}),
});
export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

export const SaveRequestSchema = z.object({
  petId: z.string().nullable().optional(),
  questionText: z.string().min(10).max(4000),
  triage: TriageResultSchema,
  followupAnswers: FollowupAnswersSchema.default({}),
  answer: AnswerResultSchema,
  thenTo: z.enum(["dashboard", "review", "video"]).default("dashboard"),
});
export type SaveRequest = z.infer<typeof SaveRequestSchema>;
