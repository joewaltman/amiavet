# Amia Vet — web application

Full-stack v1 of the Amia Vet product (separate from the static marketing site at amiavet.com).
A pet owner asks a health question and gets a structured, clearly-labeled **AI** answer. They can
optionally pay a **California-licensed veterinarian** $20 to review that answer, or $40 for a
15-minute video visit (video handled by an external scheduling tool). **California only.**

> The free AI answer is informational only, is **not veterinary advice**, and does **not** create a
> veterinarian-client-patient relationship. This is stated in the app near every answer and in the footer.

## Stack

- **Next.js** (App Router, TypeScript) running as a **Node server** (not static export)
- **PostgreSQL** via the Railway Postgres plugin, using **Prisma** ORM
- **Auth.js (NextAuth v5)** with the Prisma adapter — Google OAuth + passwordless email magic links (Resend). `role` on the user: `owner | vet | admin`
- **Anthropic API**, called only from server routes; key never exposed to the client; every prompt/response logged to `AiLog`
- **Stripe Checkout** (wired in phase 4)
- **Tailwind CSS**, Amia brand palette
- Photo uploads: **deferred** in v1 (stubbed)

## What's built so far (phases 1–3, the consult-loop milestone)

- ✅ Scaffold: Next.js + Tailwind + Prisma + Auth.js (Google + Resend magic link), role-gated routing, app shell
- ✅ Seed: test owner, vet, admin + a sample pet
- ✅ Owner onboarding: sign in, add/edit pets, dashboard, pet profiles + history
- ✅ Consult flow: public ask box → **auth-gate-on-submit that preserves the drafted question/pet** → server-side AI answer → conditional follow-ups (capped) → emergency-aware answers → compact history injection → disclaimers → answer UI
- 🔶 Stubbed / deferred: Stripe payments + webhook (phase 4), vet review queue/probe/verdict (phase 5), video handoff (phase 6), notification emails + admin (phase 7), photo upload

---

## Local setup

Prereqs: Node 18+ and a Postgres database (local or a Railway Postgres URL).

```bash
cp .env.example .env         # then fill in the values below
npm install                  # also runs `prisma generate`
npm run db:migrate:dev       # creates tables in your dev DB (prisma migrate dev)
npm run db:seed              # seeds test owner / vet / admin + sample pet
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. On Railway use `${{Postgres.DATABASE_URL}}`. |
| `AUTH_SECRET` | yes | Session/JWT signing secret. Generate: `openssl rand -base64 32`. |
| `AUTH_URL` | yes | Canonical app URL. Local `http://localhost:3000`; Railway = your service URL. |
| `AUTH_TRUST_HOST` | yes on Railway | Set `true` so Auth.js trusts the proxy host. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | for Google login | Google OAuth client. Redirect URI: `{AUTH_URL}/api/auth/callback/google`. |
| `AUTH_RESEND_KEY` | for magic links + email | Resend API key. |
| `EMAIL_FROM` | for email | Verified Resend sender, e.g. `Amia Vet <hello@amiavet.com>`. |
| `ANTHROPIC_API_KEY` | yes (for answers) | Anthropic key. Server-only. |
| `ANTHROPIC_MODEL` | optional | Model id (default `claude-sonnet-4-5-20250929`). |
| `STRIPE_SECRET_KEY` | phase 4 | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | phase 4 | Stripe webhook signing secret. |
| `STRIPE_PRICE_VET_REVIEW` / `STRIPE_PRICE_VIDEO_VISIT` | phase 4 | Price IDs for $20 / $40. |
| `VIDEO_BOOKING_URL` | phase 6 | External scheduling link for video visits. |
| `R2_*` | deferred | Cloudflare R2 creds for photo upload (unused in v1). |

> **Logging in locally:** magic links require `AUTH_RESEND_KEY`. Sign in with `owner@example.com`,
> `vet@example.com`, or `admin@example.com` (seeded) to land in each role. Or configure Google OAuth.
> If you have neither yet, set up a free Resend key — it's the quickest path.

---

## Deploy to Railway

1. **Create the project & database**
   - New Project → **Deploy from GitHub repo** (this repo), or `railway init` from the CLI.
   - Add the **Postgres** plugin: in the project, **New → Database → Add PostgreSQL**.

2. **Set variables** (service → **Variables**). Set everything from the table above. For the database,
   reference the plugin: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`. Set `AUTH_URL` to your Railway URL
   and `AUTH_TRUST_HOST=true`.

3. **Build & start** are already defined in [`railway.json`](./railway.json):
   - Build: `npm run build`
   - Start: `npx prisma migrate deploy && npx next start -p $PORT`
   The start command **runs migrations automatically on every deploy**, then boots the server on `$PORT`.

4. **First migration**
   - If you committed the `prisma/migrations` folder (recommended — create it locally with
     `npm run db:migrate:dev`), Railway's `prisma migrate deploy` applies it on first deploy.
   - Alternatively run once against the Railway DB from your machine:
     `DATABASE_URL="<railway-postgres-url>" npx prisma migrate deploy`.

5. **Seed (optional, once)**: `DATABASE_URL="<railway-postgres-url>" npm run db:seed`.

6. **OAuth / email callback URLs**: add `{AUTH_URL}/api/auth/callback/google` to Google, and verify your
   sender domain in Resend.

---

## Project layout

```
prisma/schema.prisma      Full data model (all v1 tables)
prisma/seed.ts            Test users + sample pet
src/auth.config.ts        Edge-safe Auth.js config (providers, route gating)
src/auth.ts               Auth.js instance w/ Prisma adapter + role in JWT
src/middleware.ts         Role-gated routing
src/lib/ai/systemPrompt.ts  ← the AI system prompt (safety guardrails). Iterate here.
src/lib/ai/*              Anthropic client, history injection, summary regen
src/lib/consult.ts        Consult orchestration (create, run turn, follow-ups, logging)
src/lib/actions.ts        Server actions (ask, reply, pets)
src/lib/draft.ts          Signed-cookie draft preservation across auth
src/app/*                 Pages: ask box, login, dashboard, pets, consult, vet, admin
```

## Safety / compliance notes

- Free AI answers are labeled AI-generated, informational only, not advice, no VCPR — near the answer and in the footer.
- Vet reviews and video visits are performed only by California-licensed vets; the pet must be in California.
- Video visits follow CA AB 1399 (VCPR by video; no controlled substances/antimicrobials prescribed remotely) — noted in the vet UI.
- Full audit trail: `AiLog` (every prompt/response) + vet actions (from phase 5).
