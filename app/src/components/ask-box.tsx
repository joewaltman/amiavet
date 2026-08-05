"use client";

// Public "ask" box shown on the landing page. Two paths:
//   1) Not signed in: POST the draft to /api/ask/draft which sets a signed
//      cookie, then redirect to /login. After login, /dashboard picks it up.
//   2) Signed in: POST straight to /api/ask and go to the consult page.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AskBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const question = q.trim();
    if (question.length < 10) {
      setErr("Give us a little more detail — 10+ characters.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (res.status === 401 && data?.redirect) {
        // Not signed in — draft saved, go log in.
        router.push(data.redirect);
        return;
      }
      if (!res.ok) {
        setErr(data?.error ?? "Something went wrong.");
        return;
      }
      router.push(`/consults/${data.consultId}`);
    } catch (e) {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="ask" onSubmit={submit} className="card">
      <label className="label" htmlFor="q">
        What's going on with your pet?
      </label>
      <textarea
        id="q"
        className="input min-h-40"
        placeholder="Example: My 3yo lab has been limping on his right front paw since our morning walk. No swelling, still eating."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {err && <p className="mt-2 text-sm text-terracotta">{err}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-neutral-500">
          Free AI answer. Add a vet review for $20, or a video visit for $40.
        </span>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Sending..." : "Get an answer"}
        </button>
      </div>
    </form>
  );
}
