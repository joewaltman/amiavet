import { STANDING_DISCLAIMER } from "@/lib/ai/systemPrompt";

// The standing AI disclaimer, shown near every AI answer.
export function AiDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={
        "rounded-xl border border-terracotta/20 bg-terracotta-soft px-4 py-3 text-terracotta " +
        (compact ? "text-xs" : "text-sm")
      }
      role="note"
    >
      {STANDING_DISCLAIMER}
    </p>
  );
}
