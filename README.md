# Amia Vet — Coming Soon Landing Page

A "coming soon" marketing site for **Amia Vet** (amiavet.com) with an email waitlist.
The page only describes the service and collects emails. There is intentionally no place
for a user to ask a medical question or receive advice.

Emails are captured the simplest way possible: a tiny, zero-dependency Node server
(`server.js`) serves the page and **appends each signup as one line to a plain-text file**
(`data/waitlist.csv`). No database, no third-party service, no build step.

## Files

| File          | Purpose                                                        |
|---------------|----------------------------------------------------------------|
| `index.html`  | The whole page: inline CSS, inline JS, inline SVG logo/favicon. |
| `server.js`   | Serves the page and handles `POST /api/waitlist` → appends to the text file. |
| `package.json`| Defines `npm start` (runs `server.js`).                         |
| `data/waitlist.csv` | **Auto-created** on first run. Holds the collected emails. Git-ignored. |
| `og-image.png`| **You add this** — social share image (see below).             |

## Where the emails go

Each signup is one line of plain text:

```
timestamp,email,zip
2026-07-31T16:05:18.672Z,jane@example.com,92101
```

- The file is created automatically at `DATA_DIR/waitlist.csv` (default `./data`).
- It's in `.gitignore`, so collected emails are **never committed** to GitHub.
- The server refuses to serve the data folder over HTTP, so the list stays private.
- It's a `.csv`, so you can open it directly in Excel / Google Sheets / Numbers.
- Invalid emails are rejected; bot signups (honeypot) are silently ignored.

---

## Run it locally

Requires Node 18+.

```bash
npm start
```

Then visit <http://localhost:3000>. Submit the form and you'll see the entry appear in
`data/waitlist.csv`. To download the list later, just open or copy that file.

---

## (a) Add the Open Graph / social share image

The page references `/og-image.png` for link previews (iMessage, Slack, X, Facebook…).

1. Create a **1200 × 630 px** PNG (the wordmark on the cream `#FBF9F4` background with the
   sage `#1F6F5C` mark reads well).
2. Save it as `og-image.png` in the project root (next to `index.html`).
3. That's it — the `og:image` and `twitter:image` tags already point to `/og-image.png`.

Verify previews after deploy with <https://www.opengraph.xyz>.

---

## (b) Deploy to Railway

Railway runs the Node server, so it can write to the text file. This is the recommended host.

1. Push to GitHub (already done: <https://github.com/joewaltman/amiavet>).
2. Railway → **New Project → Deploy from GitHub repo** → pick `amiavet`.
3. Railway auto-detects Node and runs `npm start`. Your site is live on the generated URL.

### Important: keep the email file from being wiped

Railway's default filesystem is **ephemeral** — it resets on every redeploy, which would
erase `waitlist.csv`. To make signups persist, attach a Volume (2 minutes, one time):

1. In your Railway service → **Settings → Volumes → New Volume**.
2. Set the **Mount path** to `/data`.
3. Add a service **Variable**: `DATA_DIR = /data`.
4. Redeploy. Now `waitlist.csv` lives on the persistent volume and survives redeploys.

To retrieve the emails: open the file from the Railway service shell, or run
`railway run cat /data/waitlist.csv` with the [Railway CLI](https://docs.railway.app/develop/cli).

### Custom domain

Railway service → **Settings → Networking → Custom Domain** → add `amiavet.com`
and follow the DNS instructions.

---

## Deploying somewhere other than Railway

Any host that runs a Node process with a **persistent, writable disk** works the same way
(Render, Fly.io, a small VPS, etc.): the start command is `npm start`, and set `DATA_DIR`
to a writable, persistent path.

> Note: pure static hosts (Cloudflare Pages, Netlify, Vercel, GitHub Pages) **cannot** run
> `server.js` or write to a file. If you ever want to host on one of those, you'd swap the
> file-based capture for a hosted form service (e.g. Formspree) instead. The current setup
> is built for the file-based approach on Railway.

---

## Editing notes

- **Colors / fonts** live in the `:root` CSS variables at the top of `index.html`.
- **Logo + favicon** are the same inline SVG (an "a" monogram + terracotta heart),
  defined once in the header and once as a data-URI favicon in `<head>`.
- **Copy** for the three care levels is in the "How it works" section.
- The waitlist fields are `email` (required), `zip` (optional), and a hidden `_gotcha`
  honeypot for spam. To capture more fields, add the input to both forms and add the
  column in `server.js`.
- No analytics or trackers are included.
- Accessibility: semantic landmarks, labeled inputs, visible focus rings, skip link,
  reduced-motion support, and AA-contrast colors are already in place.
