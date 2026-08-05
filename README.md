# Amia Vet

Next.js + Prisma + Auth.js + Stripe + Anthropic. The whole product lives in
`app/` and deploys as a single Railway service.

## Layout

| Folder | What it is |
|--------|------------|
| `app/` | The Next.js application. Everything ships from here. |

Railway's **Root Directory** for the service is set to `app`, so `app/railway.json`
drives the build and start commands.

## Getting started

See [`app/README.md`](app/README.md) for local dev, environment variables,
migrations, and deploy notes.
