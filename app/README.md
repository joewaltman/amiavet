# Amia Vet — v1 (app/)

Next.js 16 (App Router, TS, Tailwind) · Prisma · Auth.js v5 · Anthropic · Stripe · Resend.

Deployed as a Railway service whose "Root Directory" is `app/`. The old
coming-soon landing at `../landing/` runs on its own Railway service until
we cut `amiavet.com` over to this app.

---

## Local dev

Prerequisites: Node 20+, npm, Postgres 16 (Docker is easiest), a Stripe test
account, an Anthropic API key, a Resend API key, and Google OAuth credentials.

```bash
# Postgres in Docker
docker run -d --name amia-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16

# From app/
cp .env.example .env.local
# Fill: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/amia
#       AUTH_SECRET=$(openssl rand -base64 32)
#       AUTH_URL=http://localhost:3000
#       + Google, Resend, Anthropic, Stripe keys

npm install
npx prisma migrate dev --name init   # creates tables, generates client
npm run db:seed                       # owner@example.com + vet@example.com + Biscuit
npm run dev                           # http://localhost:3000
```

To test Stripe webhooks against local dev:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the whsec_... into STRIPE_WEBHOOK_SECRET in .env.local, restart dev
```

---

## Env vars

See `.env.example` — every var is listed there. The v1 Railway service needs
all of them.

- `DATABASE_URL` — Railway Postgres injects this.
- `AUTH_SECRET` — 32+ bytes random.
- `AUTH_URL` — v1 Railway URL now, `https://amiavet.com` after cutover.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e.g. `"Amia Vet <hello@amiavet.com>"`).
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (`claude-haiku-4-5` while iterating).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_REVIEW`, `STRIPE_PRICE_VIDEO`.
- `VIDEO_BOOKING_URL` — Cal.com / Calendly link.

---

## Deploy (Railway)

1. Railway project → **New Service → GitHub repo → this repo**.
2. Service **Settings → Root Directory** → `app/`.
3. Add a **Postgres** plugin to the project; attach it to this service. `DATABASE_URL` is injected automatically.
4. Paste the rest of the env vars from above.
5. Railway builds via `railway.json`:
   - Build: `npm ci && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && npx next start -p $PORT`
6. First deploy: run `npm run db:seed` once from the Railway shell (or via a one-off `railway run`) if you want the test users.

---

## Cutover to amiavet.com

1. Railway landing service → **Settings → Networking** → remove `amiavet.com`.
2. Railway v1 service → **Settings → Networking → Custom Domain** → add `amiavet.com`. Wait for Railway to issue the cert.
3. Update `AUTH_URL` on the v1 service → `https://amiavet.com`. Redeploy.
4. Google Cloud console → OAuth client → add authorized redirect URI `https://amiavet.com/api/auth/callback/google`.
5. Stripe dashboard → Webhooks → set endpoint URL to `https://amiavet.com/api/stripe/webhook`. Copy the new signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Optional archive: pull `landing/data/waitlist.csv` from the landing Railway volume (`railway run --service landing cat /data/waitlist.csv > waitlist-archive.csv`).
7. Stop or delete the landing service.
8. Delete `../landing/` from the repo in a follow-up commit. Remove `landing/data/` from `.gitignore`.

---

## Verification checklist

- [ ] `/` shows the ask box.
- [ ] Submit a question while signed out → the draft is saved in a signed cookie and the client is redirected to `/login`.
- [ ] Sign in with Google → `/dashboard` completes the pending draft consult automatically.
- [ ] Consult page shows the AI answer + urgency.
- [ ] Red-flag test: submit "my dog is having a seizure right now" → emergency banner at the top.
- [ ] Benign test: submit "mild lethargy after a long walk, still eating" → structured answer with disclaimer.
- [ ] $20 checkout → webhook flips `Consult.status` to `review_requested` and writes a `Payment`.
- [ ] Sign in as `vet@example.com` (promote to `vet` in the DB), see the paid consult in `/vet`.
- [ ] Run an AI probe, submit feedback + verdict → owner receives an email; feedback appears in the owner's consult page.

---

## Files worth knowing

- `prisma/schema.prisma` — full data model.
- `prisma/seed.ts` — sample owner, vet, pet.
- `src/lib/db.ts` — Prisma singleton.
- `src/lib/auth.ts` — Auth.js v5 config (Google + Resend + Prisma adapter).
- `src/lib/draft.ts` — signed-cookie helpers for pre-auth question drafts.
- `src/lib/consults.ts` — creates a consult and drafts the AI answer.
- `src/lib/ai/systemPrompt.ts` — the vet-reviewable prompt.
- `src/lib/ai/anthropic.ts` — Anthropic client + probe helper, writes `AiLog`.
- `src/lib/ai/history.ts` — compact pet-context builder.
- `src/lib/stripe.ts` — Stripe client + Checkout helpers.
- `src/lib/email/resend.ts` — transactional email.
- `src/app/api/ask/route.ts` — creates the consult from the public ask box.
- `src/app/api/stripe/checkout/route.ts` — creates a Checkout session, seeds a pending Payment.
- `src/app/api/stripe/webhook/route.ts` — flips Payment + Consult on success.
- `src/app/api/vet/probe/route.ts` — vet AI probes.
- `src/app/api/vet/verdict/route.ts` — persists verdict + notifies owner.
- `src/app/page.tsx` — public landing.
- `src/app/(app)/dashboard/page.tsx` — owner dashboard (completes pending drafts).
- `src/app/(app)/consults/[id]/page.tsx` — consult thread.
- `src/app/(app)/pets/*` — pet CRUD.
- `src/app/(app)/vet/page.tsx` — vet queue.
- `src/app/(app)/vet/[id]/page.tsx` — full-context review view.
- `src/app/(app)/admin/page.tsx` — tiny admin view.
