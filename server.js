// server.js — 静态服务器，用于本地预览 Rizline Autoplay
// 用法：node server.js  或  npm start
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8766;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, decodeURIComponent(req.url));
  if (filePath.endsWith('/') || !path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + req.url);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

function start() {
  server.listen(PORT);
}
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { PORT++; start(); }
});
server.on('listening', () => {
  console.log(`Rizline Autoplay → http://localhost:${PORT}`);
});
start();
