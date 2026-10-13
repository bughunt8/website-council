import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".txt": "text/plain", ".ttf": "font/ttf", ".woff2": "font/woff2", ".xml": "application/xml" };
http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const file = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end("Not found"); return; }
    const headers = { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" };
    if (file.endsWith(".html")) headers["content-security-policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
    res.writeHead(200, headers); fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end("Bad request"); }
}).listen(Number(process.env.PORT || 4173), "0.0.0.0", () => console.log(`Council preview on http://127.0.0.1:${process.env.PORT || 4173}`));
