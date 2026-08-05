"use client";

// Kicks off a Stripe Checkout session for the $20 vet review.
import { useState } from "react";

export function RequestReviewButton({ consultId }: { consultId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consultId, kind: "review" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setErr(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end">
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? "Loading..." : "Request review · $20"}
      </button>
      {err && <p className="mt-1 text-xs text-terracotta">{err}</p>}
    </div>
  );
}
