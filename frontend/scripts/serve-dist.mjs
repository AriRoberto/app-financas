import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(dist, safePath);

  if (!filePath.startsWith(dist) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  res.setHeader('Content-Type', mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`frontend static server running on http://0.0.0.0:${port}`);
});
