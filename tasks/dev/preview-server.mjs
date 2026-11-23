// LOCAL PREVIEW ONLY. Runs the task app with an in-memory database and sample data.
// The "sign in as" switch here is a development shortcut and does not exist in the real worker,
// where the portal's verified login decides who you are.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localD1 } from '../tests/local-d1.mjs';
import { seedRoster } from '../src/seed.mjs';
import { loadSamples } from './sample-data.mjs';
import { handleTasksApi } from '../src/api.mjs';

const PORT = Number(process.env.PORT || 8790);
const root = fileURLToPath(new URL('../public/', import.meta.url));
const db = localD1();
await seedRoster(db);
await loadSamples(db);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const person = /(?:^|;\s*)dev_person=([a-z]+)/.exec(req.headers.cookie || '')?.[1] || null;
  if (url.pathname === '/dev/sign-in-as') {
    const id = url.searchParams.get('person') || '';
    res.writeHead(302, { 'Set-Cookie': `dev_person=${encodeURIComponent(id)}; Path=/; SameSite=Lax`, Location: '/tasks.html' });
    return res.end();
  }
  if (url.pathname.startsWith('/api/tasks/')) {
    const body = req.method === 'POST' ? await new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); }) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body });
    const response = await handleTasksApi(request, { TASKS_DB: db, APP_ORIGIN: `http://localhost:${PORT}` }, person);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(await response.text());
  }
  if (url.pathname === '/sign-in.html' || url.pathname === '/') {
    res.writeHead(302, { Location: '/tasks.html?dev=1' });
    return res.end();
  }
  const rel = url.pathname === '/tasks.html' ? 'index.html' : url.pathname.replace(/^\/__tasks\//, '');
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(PORT, () => console.log(`Task preview on http://localhost:${PORT}/tasks.html (sign in: /dev/sign-in-as?person=brian)`));
