"use client";

// Two-stage triage → answer flow. One inline component that walks the
// owner through Ask → Thinking → (optional Follow-up) → Answer, then
// offers save + upsell CTAs.
//
// Guest-friendly:
//   * The server materializes a guest User row on the first request
//     (see lib/actor.ts); this component never redirects on 401.
//   * On entering the answered stage we fire-and-forget /save so the
//     consult exists before the user hits any CTA.
//   * Paid CTAs (review/video) require auth: for guests we set a
//     signed after-auth cookie via /api/after-auth/set and bounce to
//     /login?callbackUrl=/api/after-auth. After sign-in the server
//     redirects straight to Stripe Checkout.
//   * The free-limit gate arrives as a 429; we swap to a "sign up to
//     continue" screen instead of the ask form.
//
// PostHog events fire at each transition. sessionId is minted per
// question and threaded through triage + answer so the server-side
// events can be joined with the client ones.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnswerResult,
  Followup,
  TriageResult,
} from "@/lib/ai/schemas";
import { AnswerCard } from "@/components/answer-card";
import { trackClient, identifyGuestFromCookie } from "@/lib/analytics";

export type AskFlowPet = {
  id: string;
  name: string;
  species: string;
};

type Props = {
  initialPets: AskFlowPet[];
  isAuthed: boolean;
};

type Stage =
  | { name: "ask" }
  | { name: "thinking"; label: string }
  | {
      name: "followup";
      sessionId: string;
      triage: TriageResult;
      answers: Record<string, string | string[] | null>;
    }
  | {
      name: "answered";
      sessionId: string;
      triage: TriageResult;
      followupAnswers: Record<string, string | string[] | null>;
      answer: AnswerResult;
    }
  | { name: "limited"; limit: number };

// Small library of scaffolded openers. Each chip prepends its scaffold
// to the textarea (does not submit). Owners edit from there.
const TOPIC_CHIPS: { label: string; scaffold: string }[] = [
  { label: "Vomiting", scaffold: "My pet has been vomiting " },
  { label: "Diarrhea", scaffold: "My pet has had diarrhea for " },
  { label: "Skin or itch", scaffold: "My pet has been itching / has a rash on " },
  { label: "Limping", scaffold: "My pet is limping on their " },
  { label: "Appetite", scaffold: "My pet's appetite has " },
  { label: "Behavior", scaffold: "My pet has been acting differently: " },
  { label: "Is it safe to give…", scaffold: "Is it safe to give my pet " },
];

export function AskFlow({ initialPets, isAuthed }: Props) {
  const [q, setQ] = useState("");
  const [petId, setPetId] = useState<string>(
    initialPets.length === 1 ? initialPets[0].id : ""
  );
  const [stage, setStage] = useState<Stage>({ name: "ask" });
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const showPetPicker = isAuthed && initialPets.length > 0;

  async function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const questionText = q.trim();
    if (questionText.length < 10) {
      setErr("Give us a little more detail — 10+ characters.");
      return;
    }
    const sessionId = crypto.randomUUID();
    trackClient("question_started", { sessionId });
    setStage({ name: "thinking", label: "Amia is thinking…" });
    try {
      const res = await fetch("/api/consults/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionText,
          petId: petId || null,
          sessionId,
        }),
      });
      // Triage always calls getActor() server-side, which sets the
      // amia_guest_pub cookie on this response for fresh guests.
      // Identify posthog-js to the guestToken now so client events use
      // the same distinct_id the server has been emitting under.
      identifyGuestFromCookie();
      const data = await res.json();
      if (res.status === 429 && data?.code === "free_limit_hit") {
        // Triage doesn't gate on the free cap today, but keep the
        // handler symmetric with /answer in case that changes.
        handleFreeLimit(data.limit ?? 0);
        return;
      }
      if (!res.ok) {
        setStage({ name: "ask" });
        setErr(data?.error ?? "Something went wrong.");
        return;
      }
      const triage = data as TriageResult;
      if (triage.decision === "need_more_info" && triage.followups.length > 0) {
        // Seed empty answers so we can distinguish "unanswered" vs "skipped".
        const seed: Record<string, string | string[] | null> = {};
        for (const f of triage.followups) {
          seed[f.id] = f.multiSelect ? [] : "";
        }
        setStage({ name: "followup", sessionId, triage, answers: seed });
      } else {
        await goAnswer(questionText, sessionId, triage, {});
      }
    } catch {
      setStage({ name: "ask" });
      setErr("Network error. Try again.");
    }
  }

  async function goAnswer(
    questionText: string,
    sessionId: string,
    triage: TriageResult,
    answers: Record<string, string | string[] | null>
  ) {
    setStage({ name: "thinking", label: "Drafting your answer…" });
    try {
      const res = await fetch("/api/consults/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionText,
          petId: petId || null,
          triage,
          followupAnswers: answers,
          sessionId,
        }),
      });
      const data = await res.json();
      if (res.status === 429 && data?.code === "free_limit_hit") {
        handleFreeLimit(data.limit ?? 0);
        return;
      }
      if (!res.ok) {
        setStage({ name: "ask" });
        setErr(data?.error ?? "Something went wrong.");
        return;
      }
      setStage({
        name: "answered",
        sessionId,
        triage,
        followupAnswers: answers,
        answer: data.answer as AnswerResult,
      });
    } catch {
      setStage({ name: "ask" });
      setErr("Network error. Try again.");
    }
  }

  function handleFreeLimit(limit: number) {
    trackClient("free_limit_hit", { limit });
    trackClient("auth_gate_shown", { trigger: "free_limit" });
    setStage({ name: "limited", limit });
  }

  function onTopicChip(scaffold: string) {
    setQ((prev) => (prev.trim() ? `${prev}\n${scaffold}` : scaffold));
  }

  const selectedPet = petId
    ? initialPets.find((p) => p.id === petId) ?? null
    : null;

  return (
    <div id="ask">
      {stage.name === "ask" && (
        <form onSubmit={submitAsk} className="card">
          {showPetPicker ? (
            <div className="mb-3 flex items-center gap-2">
              <label className="text-sm text-neutral-600" htmlFor="pet">
                About which pet?
              </label>
              <select
                id="pet"
                className="input max-w-xs"
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
              >
                <option value="">No specific pet</option>
                {initialPets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="label" htmlFor="q">
            What&apos;s going on with your pet?
          </label>
          <textarea
            id="q"
            className="input min-h-40"
            placeholder="Describe what's going on. What are you noticing, and how long has it been happening?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {TOPIC_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className="chip"
                onClick={() => onTopicChip(c.scaffold)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {err && <p className="mt-2 text-sm text-terracotta">{err}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">
              Free AI answer. Add a vet review for $20, or a video visit for $40.
            </span>
            <button className="btn" type="submit">
              Ask Amia
            </button>
          </div>
        </form>
      )}

      {stage.name === "thinking" && (
        <div className="card flex flex-col items-center justify-center py-16">
          <ThinkingSpinner />
          <p className="mt-4 text-sm text-neutral-600">{stage.label}</p>
        </div>
      )}

      {stage.name === "followup" && (
        <FollowupStage
          questionText={q}
          sessionId={stage.sessionId}
          triage={stage.triage}
          answers={stage.answers}
          onAnswersChange={(next) =>
            setStage({
              name: "followup",
              sessionId: stage.sessionId,
              triage: stage.triage,
              answers: next,
            })
          }
          onContinue={() =>
            goAnswer(q, stage.sessionId, stage.triage, stage.answers)
          }
        />
      )}

      {stage.name === "answered" && (
        <AnsweredStage
          questionText={q}
          petId={petId || null}
          petName={selectedPet?.name ?? null}
          sessionId={stage.sessionId}
          triage={stage.triage}
          followupAnswers={stage.followupAnswers}
          answer={stage.answer}
          isAuthed={isAuthed}
          onReset={() => {
            setStage({ name: "ask" });
            setQ("");
            setErr(null);
          }}
          router={router}
        />
      )}

      {stage.name === "limited" && (
        <LimitedStage
          limit={stage.limit}
          onReset={() => {
            setStage({ name: "ask" });
            setQ("");
            setErr(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- Follow-up stage ----------

function FollowupStage(props: {
  questionText: string;
  sessionId: string;
  triage: TriageResult;
  answers: Record<string, string | string[] | null>;
  onAnswersChange: (next: Record<string, string | string[] | null>) => void;
  onContinue: () => void;
}) {
  const num = props.triage.followups.length;
  useEffect(() => {
    trackClient("followup_shown", {
      sessionId: props.sessionId,
      numQuestions: num,
    });
  }, [props.sessionId, num]);
  return (
    <div className="card space-y-6">
      <blockquote className="border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-600">
        {props.questionText}
      </blockquote>
      <p className="text-sm text-neutral-700">
        A couple of quick questions will help me give you a better answer.
      </p>
      <div className="space-y-5">
        {props.triage.followups.map((f) => (
          <FollowupField
            key={f.id}
            followup={f}
            value={props.answers[f.id]}
            onChange={(v) =>
              props.onAnswersChange({ ...props.answers, [f.id]: v })
            }
          />
        ))}
      </div>
      <div className="flex justify-end">
        <button
          className="btn"
          onClick={() => {
            trackClient("followup_submitted", {
              sessionId: props.sessionId,
              numQuestions: num,
            });
            props.onContinue();
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function FollowupField(props: {
  followup: Followup;
  value: string | string[] | null | undefined;
  onChange: (v: string | string[] | null) => void;
}) {
  const { followup: f, value, onChange } = props;
  const skipped = value === null;

  if (f.inputType === "chips") {
    const options = f.options ?? [];
    const selected = Array.isArray(value) ? value : value ? [value as string] : [];
    return (
      <div>
        <div className="text-sm font-medium text-ink">{f.question}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((opt) => {
            const isOn = selected.includes(opt) && !skipped;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={isOn}
                className={`chip ${isOn ? "chip-selected" : ""}`}
                onClick={() => {
                  if (f.multiSelect) {
                    const next = isOn
                      ? selected.filter((s) => s !== opt)
                      : [...selected, opt];
                    onChange(next);
                  } else {
                    onChange(isOn ? "" : opt);
                  }
                }}
              >
                {opt}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={skipped}
            className={`chip chip-skip ${skipped ? "chip-selected" : ""}`}
            onClick={() => onChange(skipped ? "" : null)}
          >
            Skip / not sure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-medium text-ink">{f.question}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-md"
          type="text"
          value={skipped ? "" : ((value as string) ?? "")}
          disabled={skipped}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-pressed={skipped}
          className={`chip chip-skip ${skipped ? "chip-selected" : ""}`}
          onClick={() => onChange(skipped ? "" : null)}
        >
          Skip / not sure
        </button>
      </div>
    </div>
  );
}

// ---------- Answered stage ----------

function AnsweredStage(props: {
  questionText: string;
  petId: string | null;
  petName: string | null;
  sessionId: string;
  triage: TriageResult;
  followupAnswers: Record<string, string | string[] | null>;
  answer: AnswerResult;
  isAuthed: boolean;
  onReset: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [busy, setBusy] = useState<"review" | "video" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [consultId, setConsultId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(!props.isAuthed);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Auto-save on entering the answered stage. Fire-and-forget: the CTAs
  // fall back to a per-click save if this hasn't landed yet.
  const savedOnce = useRef(false);
  useEffect(() => {
    if (savedOnce.current) return;
    savedOnce.current = true;
    (async () => {
      try {
        const r = await fetch("/api/consults/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            petId: props.petId,
            questionText: props.questionText,
            triage: props.triage,
            followupAnswers: props.followupAnswers,
            answer: props.answer,
            thenTo: "dashboard",
          }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data?.consultId) setConsultId(data.consultId);
        if (typeof data?.isGuest === "boolean") setIsGuest(data.isGuest);
      } catch {
        // Silent — save is best-effort. CTAs will retry if needed.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackClient("answer_viewed", {
      sessionId: props.sessionId,
      consultId,
    });
  }, [props.sessionId, consultId]);

  // If the initial auto-save hasn't landed by CTA click time, do a
  // synchronous save to make sure we have a consultId before the
  // after-auth or Stripe redirect.
  async function ensureConsultId(): Promise<{
    consultId: string;
    isGuest: boolean;
  } | null> {
    if (consultId) return { consultId, isGuest };
    try {
      const r = await fetch("/api/consults/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          petId: props.petId,
          questionText: props.questionText,
          triage: props.triage,
          followupAnswers: props.followupAnswers,
          answer: props.answer,
          thenTo: "dashboard",
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (!data?.consultId) return null;
      setConsultId(data.consultId);
      setIsGuest(!!data.isGuest);
      return { consultId: data.consultId, isGuest: !!data.isGuest };
    } catch {
      return null;
    }
  }

  async function goPaid(kind: "review" | "video") {
    setBusy(kind);
    setErr(null);
    try {
      const saved = await ensureConsultId();
      if (!saved) {
        setErr("Could not save your consult. Try again.");
        return;
      }
      trackClient("cta_clicked", {
        consultId: saved.consultId,
        tier: kind === "review" ? "vet_review" : "video",
      });
      if (saved.isGuest) {
        // Guest -> bounce through login. Stash the intent server-side
        // so the after-auth handler can build the Stripe session
        // without a client round-trip.
        trackClient("auth_gate_shown", { trigger: kind });
        const stash = await fetch("/api/after-auth/set", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            intent: kind,
            consultId: saved.consultId,
          }),
        });
        if (!stash.ok) {
          setErr("Could not start sign-in flow. Try again.");
          return;
        }
        props.router.push(
          `/login?callbackUrl=${encodeURIComponent("/api/after-auth")}`
        );
        return;
      }
      // Authed: hit Stripe directly.
      const checkout = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consultId: saved.consultId, kind }),
      });
      const cData = await checkout.json();
      if (!checkout.ok || !cData.url) {
        setErr(cData.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = cData.url;
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(null);
    }
  }

  const showNudge = isGuest && !nudgeDismissed;

  return (
    <div className="space-y-4">
      <AnswerCard answer={props.answer} />

      <div className="card space-y-3">
        <div className="text-sm font-medium text-ink">Next steps</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="btn"
            onClick={() => goPaid("review")}
            disabled={busy !== null}
          >
            {busy === "review"
              ? "Loading…"
              : "Have a licensed vet review this · $20"}
          </button>
          <button
            className="btn-terracotta"
            onClick={() => goPaid("video")}
            disabled={busy !== null}
          >
            {busy === "video"
              ? "Loading…"
              : "Book a 15-minute video visit · $40"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={props.onReset}
            disabled={busy !== null}
          >
            Ask another question
          </button>
        </div>
        {err && <p className="text-sm text-terracotta">{err}</p>}
      </div>

      {showNudge ? (
        <div className="card flex items-start justify-between gap-3 bg-emerald-50 text-sm text-emerald-900">
          <p>
            Create a free account to save
            {props.petName ? ` ${props.petName}'s` : " your pet's"} history.{" "}
            <a
              className="underline"
              href="/login?callbackUrl=/dashboard"
              onClick={() =>
                trackClient("auth_gate_shown", { trigger: "save" })
              }
            >
              Sign up →
            </a>
          </p>
          <button
            type="button"
            className="text-xs text-emerald-900/70 underline"
            onClick={() => setNudgeDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Free-limit stage ----------

function LimitedStage(props: { limit: number; onReset: () => void }) {
  return (
    <div className="card space-y-3">
      <div className="text-lg font-semibold text-ink">
        You&apos;ve used your free questions for today
      </div>
      <p className="text-sm text-neutral-700">
        You get {props.limit} free AI answers per day as a guest. Create a
        free account to keep going and save your pet&apos;s history.
      </p>
      <div className="flex flex-wrap gap-2">
        <a className="btn" href="/login?callbackUrl=/">
          Sign up to continue
        </a>
        <button
          type="button"
          className="btn-secondary"
          onClick={props.onReset}
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ---------- Spinner ----------

function ThinkingSpinner() {
  // Local so we don't pull in an icon lib. Reduced-motion respected in
  // globals.css (all transitions disabled).
  return (
    <div
      aria-label="Loading"
      className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200"
      style={{ borderTopColor: "var(--sage)" }}
    />
  );
}
