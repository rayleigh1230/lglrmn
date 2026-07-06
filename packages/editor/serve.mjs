// H5 静态服务器 —— 托管 Taro 构建产物 (packages/editor/dist)
// 用法: node serve.mjs [rootDir] [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] || join(__dirname, 'dist');
const PORT = Number(process.argv[3] || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    let filePath = normalize(join(root, urlPath));
    // 防目录穿越
    if (!filePath.startsWith(normalize(root))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    let s = await stat(filePath).catch(() => null);
    // 目录 → 找 index.html
    if (s && s.isDirectory()) {
      filePath = join(filePath, 'index.html');
      s = await stat(filePath).catch(() => null);
    }
    if (!s) {
      // SPA fallback: 单页应用未知路径回退到 index.html
      const fallback = join(root, 'index.html');
      const fs = await stat(fallback).catch(() => null);
      if (fs) {
        const data = await readFile(fallback);
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(data);
        return;
      }
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end('Server Error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`H5 静态服务已启动:`);
  console.log(`  根目录: ${root}`);
  console.log(`  访问:   http://localhost:${PORT}/`);
});
