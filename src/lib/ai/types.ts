// Shared types for the AI consult layer.
import type { Urgency } from "@prisma/client";

export type AiTurnRole = "owner" | "ai" | "system";

export interface ConversationTurn {
  role: AiTurnRole;
  content: string;
}

// Structured answer body the model must produce (see systemPrompt.ts).
export interface AiAnswer {
  // Leading notice shown prominently when this is (or may be) an emergency.
  emergencyNotice: string | null;
  whatThisMightMean: string;
  whatToWatchFor: string;
  // For clear emergencies this is minimized/omitted to avoid delaying care.
  atHome: string;
  urgencyRead: string;
}

// The single JSON object the model returns each turn.
export interface AiResult {
  type: "followup" | "answer";
  emergency: boolean;
  urgency: Urgency;
  // Present when type === "followup" (1..MAX_FOLLOWUP_QUESTIONS).
  followupQuestions?: string[];
  // Present when type === "answer".
  answer?: AiAnswer;
  // 1-3 sentence note to fold into the pet's running history summary.
  summaryUpdate?: string;
}

export const MAX_FOLLOWUP_ROUNDS = 2;
export const MAX_FOLLOWUP_QUESTIONS = 3;
