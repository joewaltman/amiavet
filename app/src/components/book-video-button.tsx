"use client";

// Kicks off a Stripe Checkout session for the $40 video visit.
import { useState } from "react";

export function BookVideoButton({ consultId }: { consultId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consultId, kind: "video" }),
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
      <button className="btn-terracotta" onClick={go} disabled={busy}>
        {busy ? "Loading..." : "Book video visit · $40"}
      </button>
      {err && <p className="mt-1 text-xs text-terracotta">{err}</p>}
    </div>
  );
}
