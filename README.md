# Amia Vet — Coming Soon Landing Page

A single-page, self-contained "coming soon" marketing site for **Amia Vet** (amiavet.com)
with an email waitlist. No build step, no dependencies, no bundler — just `index.html`.

The page **only describes** the service and **collects emails**. There is intentionally
no place for a user to ask a medical question or receive advice.

## Files

| File         | Purpose                                             |
|--------------|-----------------------------------------------------|
| `index.html` | The entire site — inline CSS, inline JS, inline SVG logo/favicon. |
| `README.md`  | This file.                                          |
| `og-image.png` | **You add this** — social share image (see below). |

## Local preview

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

Before you set a form endpoint, the waitlist runs in **demo mode**: it validates the
email and shows the success message locally without sending anything. Once you set a
real endpoint (below), it submits for real.

---

## (a) Set your waitlist form endpoint

The form ships configured for **Formspree** by default. There are two `<form>` tags
(hero + final CTA) — update **both**.

### Option 1 — Formspree (default, works on any host)

1. Create a free form at <https://formspree.io> and copy your form ID
   (looks like `xxyyzzww`).
2. In `index.html`, find both occurrences of:
   ```
   action="https://formspree.io/f/REPLACE_WITH_FORM_ID"
   ```
   and replace `REPLACE_WITH_FORM_ID` with your ID, e.g.
   `action="https://formspree.io/f/xxyyzzww"`.
3. Done. Submissions arrive in your Formspree inbox. The captured fields are
   `email`, optional `zip`, and a `_gotcha` honeypot (ignored spam trap).

### Option 2 — Netlify Forms (only if you deploy on Netlify)

Netlify has a built-in form handler — no third-party service needed. See the
commented block at the bottom of `index.html`. In short:

1. On each `<form>` tag, add: `data-netlify="true" netlify-honeypot="_gotcha" name="waitlist"`.
2. Add `<input type="hidden" name="form-name" value="waitlist" />` as the first child of each form.
3. Deploy. Submissions show up in **Netlify → your site → Forms**.

> Tip: if you use Netlify Forms with two identically-named forms, give them distinct
> `name` values (e.g. `waitlist-hero`, `waitlist-final`) so submissions are labeled.

---

## (b) Add the Open Graph / social share image

The page references `/og-image.png` for link previews (iMessage, Slack, X, Facebook…).

1. Create a **1200 × 630 px** PNG (wordmark on the cream `#FBF9F4` background with the
   sage `#1F6F5C` mark reads well).
2. Save it as `og-image.png` in the project root (next to `index.html`).
3. That's it — the `<meta property="og:image">` and `twitter:image` tags already point
   to `/og-image.png`. If you host under a path, change those two tags to the full URL.

To verify previews after deploy: <https://www.opengraph.xyz> or the
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).

---

## (c) Deploy

It's a static folder, so any static host works. Pick one:

### Cloudflare Pages
1. Push this folder to a GitHub repo (see below).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo. **Build command:** *(leave blank)*. **Build output directory:** `/`
   (or `.`). Deploy.
4. Add your custom domain `amiavet.com` under **Custom domains**.

### Netlify
1. Push to GitHub (below), then Netlify → **Add new site → Import from Git**.
   **Build command:** *(blank)*. **Publish directory:** `.`.
2. Or drag-and-drop the folder onto <https://app.netlify.com/drop> for an instant deploy.
3. Add `amiavet.com` under **Domain settings**.

### Railway
Railway is oriented toward apps/servers, but serves this static folder fine with a
one-line static server. If deploying here:
1. Add a `package.json` with `{ "scripts": { "start": "npx serve -s . -l $PORT" } }`.
2. Railway auto-detects Node, runs `npm start`, and serves the folder on `$PORT`.
(For a pure static page, Cloudflare Pages or Netlify is simpler and free.)

### Push to GitHub first
```bash
git add -A
git commit -m "Amia Vet coming-soon landing page"
git branch -M main
git remote add origin git@github.com:<you>/amiavet-landing.git
git push -u origin main
```

---

## Editing notes

- **Colors / fonts** live in the `:root` CSS variables at the top of `index.html`.
- **Logo + favicon** are the same inline SVG (an "a" monogram + terracotta heart),
  defined once in the header and once as a data-URI favicon in `<head>`.
- **Copy** for each of the four care levels is in the "How it works" section.
- No analytics or trackers are included. Add your own snippet before `</body>` if wanted.
- Accessibility: semantic landmarks, labeled inputs, visible focus rings, skip link,
  reduced-motion support, and AA-contrast colors are already in place.
