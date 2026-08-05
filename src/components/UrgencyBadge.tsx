import type { Urgency } from "@prisma/client";

const MAP: Record<Urgency, { label: string; cls: string }> = {
  info: { label: "Info", cls: "bg-sage-soft text-sage-dark border-sage/20" },
  monitor: { label: "Monitor at home", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  see_vet: { label: "See a vet", cls: "bg-orange-50 text-orange-800 border-orange-200" },
  urgent: { label: "Urgent — seek care now", cls: "bg-red-50 text-red-800 border-red-200" },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const m = MAP[urgency] ?? MAP.info;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}
