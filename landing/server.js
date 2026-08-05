// ============================================================
// Amia Vet — tiny static server + waitlist capture
//
// - Serves index.html (and any other static files in this folder).
// - Accepts POST /api/waitlist and APPENDS each signup as one line
//   to a plain-text CSV file. No database, no dependencies.
//
// The data file lives in DATA_DIR (default ./data locally). On Railway,
// mount a persistent Volume and set DATA_DIR to its path (e.g. /data),
// otherwise the file is wiped on every redeploy. See README.md.
// ============================================================

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT      = process.env.PORT || 3000;
const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "waitlist.csv");

// Make sure the data folder + file (with a header row) exist.
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "timestamp,email,zip\n");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quote a value for CSV if it contains a comma, quote, or newline.
function csvEscape(v) {
  v = String(v == null ? "" : v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // ---- Waitlist capture endpoint ----
  if (req.method === "POST" && req.url === "/api/waitlist") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) req.destroy(); // guard against oversized posts
    });
    req.on("end", () => {
      let data = {};
      try {
        const ctype = req.headers["content-type"] || "";
        if (ctype.indexOf("application/json") !== -1) {
          data = JSON.parse(body || "{}");
        } else {
          new URLSearchParams(body).forEach((val, key) => { data[key] = val; });
        }
      } catch (e) { /* fall through to validation below */ }

      const email    = (data.email || "").trim();
      const zip      = (data.zip || "").trim();
      const honeypot = (data._gotcha || "").trim();

      // Bots that fill the honeypot get a fake success and are not stored.
      if (honeypot) return json(res, 200, { ok: true });

      if (!EMAIL_RE.test(email)) {
        return json(res, 400, { ok: false, error: "Invalid email address." });
      }

      const line = [new Date().toISOString(), email, zip].map(csvEscape).join(",") + "\n";
      fs.appendFile(DATA_FILE, line, (err) => {
        if (err) {
          console.error("Failed to write signup:", err);
          return json(res, 500, { ok: false, error: "Could not save. Try again." });
        }
        console.log("New waitlist signup:", email, zip ? "(" + zip + ")" : "");
        json(res, 200, { ok: true });
      });
    });
    return;
  }

  // ---- Static file serving (index.html, og-image.png, etc.) ----
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(__dirname, path.normalize(urlPath));
  const resolved = path.resolve(filePath);

  // Never serve files outside this folder, and never expose the data dir.
  if (!resolved.startsWith(path.resolve(__dirname)) ||
      resolved.startsWith(path.resolve(DATA_DIR))) {
    res.writeHead(403); return res.end("Forbidden");
  }

  fs.readFile(resolved, (err, content) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(resolved)] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log("Amia Vet listening on port " + PORT);
  console.log("Storing signups in " + DATA_FILE);
});
