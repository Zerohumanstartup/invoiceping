const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const html = fs.readFileSync(path.join(__dirname, 'index.html'));
const SIGNUPS_FILE = path.join(__dirname, 'signups.json');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readSignups() {
  try {
    return JSON.parse(fs.readFileSync(SIGNUPS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function handleSignup(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let email;
    try {
      email = (JSON.parse(body).email || '').trim();
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Invalid request' }));
    }
    if (!EMAIL_RE.test(email)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Please enter a valid email' }));
    }
    const signups = readSignups();
    signups.push({ email, at: new Date().toISOString() });
    fs.writeFileSync(SIGNUPS_FILE, JSON.stringify(signups, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
}

function handleAdminSignups(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get('key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
  }
  const signups = readSignups();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, count: signups.length, signups }));
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/signup') {
    return handleSignup(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/admin/signups') {
    return handleAdminSignups(req, res);
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(PORT, () => {
  console.log(`InvoicePing listening on port ${PORT}`);
});
