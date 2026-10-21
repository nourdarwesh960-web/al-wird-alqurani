// Production-Grade Static, Auth, Sync & APK Server for Wirdak (وردك)
// Supports Byte-Range Streaming for APK downloads & Full SPA Routing
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const APK_PATH = path.join(__dirname, "wirdak-app.apk");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PORT = process.env.PORT || 5174;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading users.json:", e);
  }
  return {};
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing users.json:", e);
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".apk": "application/vnd.android.package-archive",
  ".mp3": "audio/mpeg",
  ".webm": "audio/webm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API: Quick Phone & Password Auth / Register
  if (pathname === "/api/wird/auth" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { phone, password, wirdState } = JSON.parse(body || "{}");
        if (!phone || !password) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "رقم الهاتف وكلمة المرور مطلوبان" }));
          return;
        }

        const users = loadUsers();
        if (users[phone]) {
          // Existing user: check password
          if (users[phone].password !== password) {
            res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ success: false, message: "كلمة المرور غير صحيحة" }));
            return;
          }
          // Return existing wirdState if present, otherwise merge
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            wirdState: users[phone].wirdState || wirdState,
          }));
        } else {
          // New user: register automatically
          users[phone] = {
            phone,
            password,
            wirdState: wirdState || null,
            createdAt: new Date().toISOString(),
          };
          saveUsers(users);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: true,
            message: "تم إنشاء الحساب وحفظ الورد بنجاح",
            wirdState: wirdState || null,
          }));
        }
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "خطأ داخلي في الخادم" }));
      }
    });
    return;
  }

  // 2. API: Sync Wird State to Server
  if (pathname === "/api/wird/sync" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { phone, wirdState } = JSON.parse(body || "{}");
        if (phone && wirdState) {
          const users = loadUsers();
          if (users[phone]) {
            users[phone].wirdState = wirdState;
            users[phone].lastSyncedAt = new Date().toISOString();
            saveUsers(users);
          }
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  // 3. Direct APK Download with Byte-Range Streaming
  if (pathname === "/wirdak-app.apk" || pathname.endsWith(".apk")) {
    const targetApk = fs.existsSync(APK_PATH) ? APK_PATH : path.join(DIST_DIR, "wirdak-app.apk");
    if (!fs.existsSync(targetApk)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ملف التطبيق غير موجود");
      return;
    }

    const stat = fs.statSync(targetApk);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="wirdak-app.apk"');
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunksize,
      });

      const fileStream = fs.createReadStream(targetApk, { start, end, highWaterMark: 1024 * 1024 });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
      });

      const fileStream = fs.createReadStream(targetApk, { highWaterMark: 1024 * 1024 });
      fileStream.pipe(res);
    }
    return;
  }

  // 4. Static Assets from dist
  if (pathname === "/") pathname = "/index.html";
  let filePath = path.join(DIST_DIR, pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=86400",
    });

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 5. SPA Fallback (index.html)
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    const stat = fs.statSync(indexPath);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Wirdak Server] Running on http://0.0.0.0:${PORT}`);
});
