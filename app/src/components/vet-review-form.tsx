"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VetReview } from "@prisma/client";

// Two panes: an AI-probe scratchpad (each Q/A is logged), and the final
// verdict + feedback form that emails the owner.
export function VetReviewForm({
  consultId,
  priorAnswer,
  existing,
}: {
  consultId: string;
  priorAnswer: string;
  existing: VetReview | null;
}) {
  const router = useRouter();

  const [probeQ, setProbeQ] = useState("");
  const [probeLog, setProbeLog] = useState<{ q: string; a: string; at: string }[]>(
    (existing?.aiProbeLog as { q: string; a: string; at: string }[] | null) ??
      []
  );
  const [probing, setProbing] = useState(false);

  const [feedback, setFeedback] = useState(existing?.feedback ?? "");
  const [verdict, setVerdict] = useState<"agree" | "clarify" | "disagree">(
    existing?.verdict ?? "agree"
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function probe() {
    if (!probeQ.trim() || probing) return;
    setProbing(true);
    setErr(null);
    try {
      const res = await fetch("/api/vet/probe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consultId,
          question: probeQ.trim(),
          priorAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Probe failed.");
        return;
      }
      setProbeLog((log) => [
        ...log,
        { q: probeQ.trim(), a: data.answer, at: new Date().toISOString() },
      ]);
      setProbeQ("");
    } catch {
      setErr("Network error.");
    } finally {
      setProbing(false);
    }
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/vet/verdict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consultId,
          verdict,
          feedback,
          aiProbeLog: probeLog,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Save failed.");
        return;
      }
      router.push("/vet");
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <h3 className="text-lg font-semibold text-ink">Probe the AI</h3>
        <p className="text-sm text-neutral-600">
          Ask any follow-up. Every probe is logged with this review.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            className="input min-h-24"
            placeholder="e.g. What differentials for acute forelimb lameness in a 3yo lab?"
            value={probeQ}
            onChange={(e) => setProbeQ(e.target.value)}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                probe();
              }
            }}
          />
          <div className="flex justify-end">
            <button
              className="btn-secondary shrink-0"
              onClick={probe}
              disabled={probing || !probeQ.trim()}
            >
              {probing ? "..." : "Ask"}
            </button>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {probeLog.map((row, i) => (
            <li key={i} className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs font-semibold text-neutral-500">Q</div>
              <div className="text-sm text-ink">{row.q}</div>
              <div className="mt-2 text-xs font-semibold text-neutral-500">A</div>
              <div className="whitespace-pre-wrap text-sm text-ink">{row.a}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3 className="text-lg font-semibold text-ink">Verdict + feedback</h3>
        <p className="text-sm text-neutral-600">
          Owner gets an email with your feedback and a link back to the consult.
        </p>

        <fieldset className="mt-4">
          <legend className="label">Verdict</legend>
          <div className="flex gap-4">
            {(["agree", "clarify", "disagree"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="verdict"
                  value={v}
                  checked={verdict === v}
                  onChange={() => setVerdict(v)}
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <label htmlFor="feedback" className="label">
            Notes for the owner
          </label>
          <textarea
            id="feedback"
            className="input min-h-40"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What did the AI get right? What would you add or change?"
          />
        </div>

        {err && <p className="mt-2 text-sm text-terracotta">{err}</p>}

        <div className="mt-4 flex justify-end">
          <button className="btn" onClick={submit} disabled={saving || !feedback.trim()}>
            {saving ? "Saving..." : existing ? "Update review" : "Post review"}
          </button>
        </div>
      </section>
    </div>
  );
}
