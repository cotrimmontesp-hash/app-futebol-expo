import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 4173);
const api = (process.env.EXPO_PUBLIC_API_URL || 'https://app-futebol-1ric.onrender.com').replace(/\/$/, '');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function contentType(file) {
  return types[path.extname(file)] || 'application/octet-stream';
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const upstream = await fetch(api + url.pathname + url.search, {
        method: req.method,
        headers: {
          accept: req.headers.accept || 'application/json',
          ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
        },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req),
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(body);
      return;
    }

    const rel = decodeURIComponent(url.pathname);
    const file = path.normalize(path.join(root, rel === '/' ? 'index.html' : rel));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': contentType(file) });
      fs.createReadStream(file).pipe(res);
      return;
    }
    const index = path.join(root, 'index.html');
    if (!fs.existsSync(index)) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Build web não encontrado. Rode: npx expo export -p web');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    fs.createReadStream(index).pipe(res);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, () => {
  console.log(`Web em http://localhost:${port}`);
});
