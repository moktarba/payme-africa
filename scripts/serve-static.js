const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.expo-web-demo');
const port = Number(process.argv[3] || 8081);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function resolveRequest(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const target = path.resolve(root, relativePath);

  if (!target.startsWith(root)) return null;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;

  const fallback = path.join(root, 'index.html');
  return fs.existsSync(fallback) ? fallback : null;
}

const server = http.createServer((req, res) => {
  const file = resolveRequest(req.url || '/');
  if (!file) {
    send(res, 404, 'Not found');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, 500, err.message);
      return;
    }
    send(res, 200, data, types[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`PayMe Africa demo: http://localhost:${port}`);
});
