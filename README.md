# Amia Vet

Monorepo with two independently deployable services:

| Folder      | What it is                                                              | Runs on                          |
|-------------|-------------------------------------------------------------------------|----------------------------------|
| `landing/`  | Current coming-soon marketing page + waitlist capture (zero-dep Node).  | Railway service, `amiavet.com`   |
| `app/`      | Amia Vet v1 (Next.js + Prisma + Auth.js + Stripe + Anthropic).          | Separate Railway service         |

Each folder is deployed as its own Railway service using the "Root Directory"
setting, so builds and env vars stay isolated.

## Cutover plan

While v1 is being built, `amiavet.com` continues to serve `landing/`. When v1
is ready, we swap the `amiavet.com` custom domain from the landing service to
the v1 service, then delete `landing/` in a follow-up commit.

See `app/README.md` for local dev, env vars, migrations, and the full cutover
checklist.
