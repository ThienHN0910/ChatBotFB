import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import connectDB from '../src/lib/db';
import AuthorizedUser from '../src/models/authorized_user.model';
import Knowledge from '../src/models/knowledge.model';

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod';

type SessionUser = {
  email: string;
  role?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSessionUser(req: any): SessionUser | null {
  const cookies = cookie.parse(req.headers?.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    if (!decoded || typeof decoded === 'string') return null;
    const payload = decoded as SessionUser;
    if (!payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

async function ensureDb() {
  await connectDB();
}

function getLoginHtml() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DNE Dashboard</title>
  <style>
    :root{color-scheme:light}
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,Helvetica,sans-serif;background:linear-gradient(135deg,#111827 0%,#1f2937 45%,#0f172a 100%);color:#e5e7eb}
    .card{width:min(92vw,520px);background:rgba(17,24,39,.92);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    h1{margin:0 0 12px;font-size:32px}
    p{margin:0 0 20px;line-height:1.6;color:#cbd5e1}
    a{display:inline-block;padding:12px 18px;border-radius:12px;background:#22c55e;color:#081018;text-decoration:none;font-weight:700}
    .hint{margin-top:16px;font-size:14px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="card">
    <h1>DNE Dashboard</h1>
    <p>Bạn cần đăng nhập bằng Google để mở trang quản trị.</p>
    <a href="/api/auth">Login with Google</a>
    <div class="hint">Nếu đang ở Vercel, route /dashboard sẽ được rewrite về API này.</div>
  </div>
</body>
</html>`;
}

function getDashboardHtml(email: string) {
  const safeEmail = escapeHtml(email);

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DNE Dashboard</title>
  <style>
    :root{
      --bg:#f8fafc;
      --panel:#ffffff;
      --text:#0f172a;
      --muted:#475569;
      --line:#dbe3ef;
      --accent:#0f766e;
      --accent-2:#14b8a6;
      --danger:#b91c1c;
      --shadow:0 20px 60px rgba(15,23,42,.10);
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:Arial,Helvetica,sans-serif;background:radial-gradient(circle at top right,rgba(20,184,166,.14),transparent 32%),linear-gradient(180deg,#eef6fb 0%,#f8fafc 40%,#eef2f7 100%);color:var(--text)}
    .wrap{max-width:1200px;margin:0 auto;padding:24px}
    .hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:rgba(255,255,255,.8);backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,.20);border-radius:24px;padding:24px;box-shadow:var(--shadow)}
    .hero h1{margin:0 0 8px;font-size:34px;letter-spacing:-.03em}
    .hero p{margin:0;color:var(--muted);line-height:1.6}
    .auth{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:700}
    .btn{appearance:none;border:0;border-radius:12px;padding:11px 16px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    .btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white}
    .btn.ghost{background:#fff;border:1px solid var(--line);color:var(--text)}
    .tabs{display:flex;gap:10px;margin:22px 0 16px;flex-wrap:wrap}
    .tab{padding:10px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer;font-weight:700;color:var(--muted)}
    .tab.active{background:var(--text);color:white;border-color:var(--text)}
    .panel{display:none;background:rgba(255,255,255,.88);border:1px solid rgba(148,163,184,.22);border-radius:20px;padding:20px;box-shadow:var(--shadow)}
    .panel.active{display:block}
    .grid{display:grid;grid-template-columns:1.1fr 1fr;gap:16px}
    .card{border:1px solid var(--line);border-radius:16px;padding:16px;background:#fff}
    h2,h3{margin:0 0 12px}
    .field{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font:inherit;margin:8px 0;background:#fff}
    textarea.field{min-height:150px;resize:vertical}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid var(--line);padding:12px 10px;text-align:left;vertical-align:top}
    th{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
    .actions{display:flex;gap:8px;flex-wrap:wrap}
    .small{padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:#fff;cursor:pointer;font-weight:700}
    .small.danger{color:var(--danger)}
    .muted{color:var(--muted)}
    .pagination{margin-top:12px;display:flex;align-items:center;gap:10px;justify-content:flex-end;color:var(--muted)}
    .modal{position:fixed;inset:0;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;padding:20px}
    .modal .box{width:min(760px,100%);background:#fff;border-radius:20px;padding:20px;box-shadow:0 30px 100px rgba(0,0,0,.25)}
    .modal .row{display:grid;grid-template-columns:1fr;gap:12px}
    @media (max-width: 860px){
      .hero{flex-direction:column}
      .grid{grid-template-columns:1fr}
      .auth{justify-content:flex-start}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div>
        <h1>DNE Dashboard</h1>
        <p>Signed in as <strong>${safeEmail}</strong>. Quản lý knowledge base và danh sách người được phép truy cập.</p>
      </div>
      <div class="auth">
        <span class="pill">Authenticated</span>
        <a class="btn ghost" href="/api/logout">Logout</a>
      </div>
    </section>

    <div class="tabs">
      <button class="tab active" data-tab="knowledge" type="button">Knowledge</button>
      <button class="tab" data-tab="users" type="button">Users</button>
    </div>

    <section id="panel-knowledge" class="panel active">
      <div class="grid">
        <div class="card">
          <h3>Create Knowledge</h3>
          <form id="form-knowledge">
            <input class="field" name="topic" placeholder="Topic" required>
            <textarea class="field" name="content" id="content-input" placeholder="Content" required></textarea>
            <input class="field" name="keywords" placeholder="keywords (comma separated)">
            <button class="btn primary" type="submit">Create</button>
          </form>
        </div>
        <div class="card">
          <h3>Hints</h3>
          <p class="muted">Keywords are matched by the bot during retrieval. Keep them short and specific.</p>
          <p class="muted">The modal editor lets you update topic, content and keywords without leaving the page.</p>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Knowledge List</h3>
        <div id="table-knowledge"></div>
        <div id="pagination-knowledge" class="pagination"></div>
      </div>
    </section>

    <section id="panel-users" class="panel">
      <div class="grid">
        <div class="card">
          <h3>Create Authorized User</h3>
          <form id="form-user">
            <input class="field" name="email" placeholder="Email" required>
            <select class="field" name="role">
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
            <button class="btn primary" type="submit">Create User</button>
          </form>
        </div>
        <div class="card">
          <h3>Access Control</h3>
          <p class="muted">User login is allowed only if the email exists in <code>authorized_users</code>.</p>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Users</h3>
        <div id="table-users"></div>
        <div id="pagination-users" class="pagination"></div>
      </div>
    </section>
  </div>

  <div id="editor-modal" class="modal">
    <div class="box">
      <h3>Edit Knowledge</h3>
      <div class="row">
        <input id="editor-topic" class="field" placeholder="Topic">
        <div id="editor-content" class="field" contenteditable="true" style="min-height:180px"></div>
        <input id="editor-keywords" class="field" placeholder="keywords (comma separated)">
      </div>
      <div class="actions" style="justify-content:flex-end;margin-top:12px">
        <button id="editor-cancel" class="small" type="button">Cancel</button>
        <button id="editor-save" class="small" type="button">Save</button>
      </div>
    </div>
  </div>

  <script>
    const perPage = 10;
    const lists = { knowledge: [], users: [] };
    const currentPage = { knowledge: 1, users: 1 };
    let currentEditId = null;

    function escapeHtml(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function showTab(name){
      document.querySelectorAll('.tab').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === name); });
      document.getElementById('panel-knowledge').classList.toggle('active', name === 'knowledge');
      document.getElementById('panel-users').classList.toggle('active', name === 'users');
    }
    document.querySelectorAll('.tab').forEach(function(btn){ btn.addEventListener('click', function(){ showTab(btn.dataset.tab); }); });

    async function load(resource){
      const res = await fetch('/api/dashboard?type=' + resource);
      if (!res.ok) throw new Error('Failed to load ' + resource);
      const list = await res.json();
      lists[resource] = Array.isArray(list) ? list : [];
      currentPage[resource] = 1;
      render(resource);
    }

    function render(resource){
      const list = lists[resource] || [];
      const page = currentPage[resource] || 1;
      const start = (page - 1) * perPage;
      const slice = list.slice(start, start + perPage);
      const table = document.getElementById('table-' + resource);
      const pagination = document.getElementById('pagination-' + resource);

      if (resource === 'knowledge') {
        let html = '<table><thead><tr><th>Topic</th><th>Content</th><th>Keywords</th><th>Actions</th></tr></thead><tbody>';
        slice.forEach(function(item){
          html += '<tr>' +
            '<td>' + escapeHtml(item.topic || '') + '</td>' +
            '<td>' + escapeHtml(String(item.content || '')).slice(0, 220) + '</td>' +
            '<td>' + escapeHtml((item.keywords || []).join(', ')) + '</td>' +
            '<td><div class="actions"><button class="small" type="button" onclick="openEditor(\'' + item._id + '\')">Edit</button><button class="small danger" type="button" onclick="deleteKnowledge(\'' + item._id + '\')">Delete</button></div></td>' +
            '</tr>';
        });
        html += '</tbody></table>';
        table.innerHTML = html;
      } else {
        let html = '<table><thead><tr><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>';
        slice.forEach(function(item){
          html += '<tr>' +
            '<td>' + escapeHtml(item.email || '') + '</td>' +
            '<td>' + escapeHtml(item.role || '') + '</td>' +
            '<td><div class="actions"><button class="small" type="button" onclick="editUser(\'' + item._id + '\')">Edit</button><button class="small danger" type="button" onclick="deleteUser(\'' + item._id + '\')">Delete</button></div></td>' +
            '</tr>';
        });
        html += '</tbody></table>';
        table.innerHTML = html;
      }

      const total = Math.max(1, Math.ceil(list.length / perPage));
      pagination.innerHTML = '<button class="small" type="button" ' + (page <= 1 ? 'disabled' : '') + ' onclick="changePage(\'' + resource + '\',' + (page - 1) + ')">Prev</button> <span>Page ' + page + ' of ' + total + '</span> <button class="small" type="button" ' + (page >= total ? 'disabled' : '') + ' onclick="changePage(\'' + resource + '\',' + (page + 1) + ')">Next</button>';
    }

    function changePage(resource, nextPage){
      currentPage[resource] = nextPage;
      render(resource);
    }

    async function createKnowledge(e){
      e.preventDefault();
      const form = e.currentTarget;
      const payload = {
        type: 'knowledge',
        topic: form.topic.value,
        content: document.getElementById('content-input').value,
        keywords: form.keywords.value.split(',').map(function(value){ return value.trim(); }).filter(Boolean)
      };
      await fetch('/api/dashboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      form.reset();
      await load('knowledge');
    }

    async function deleteKnowledge(id){
      if (!confirm('Delete?')) return;
      await fetch('/api/dashboard', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'knowledge', _id: id }) });
      await load('knowledge');
    }

    function openEditor(id){
      currentEditId = id;
      const item = lists.knowledge.find(function(entry){ return entry._id === id; }) || {};
      document.getElementById('editor-topic').value = item.topic || '';
      document.getElementById('editor-content').innerHTML = item.content || '';
      document.getElementById('editor-keywords').value = (item.keywords || []).join(', ');
      document.getElementById('editor-modal').style.display = 'flex';
    }

    document.getElementById('editor-cancel').addEventListener('click', function(){
      document.getElementById('editor-modal').style.display = 'none';
    });

    document.getElementById('editor-save').addEventListener('click', async function(){
      const payload = {
        type: 'knowledge',
        _id: currentEditId,
        topic: document.getElementById('editor-topic').value,
        content: document.getElementById('editor-content').innerHTML,
        keywords: document.getElementById('editor-keywords').value.split(',').map(function(value){ return value.trim(); }).filter(Boolean)
      };
      await fetch('/api/dashboard', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      document.getElementById('editor-modal').style.display = 'none';
      await load('knowledge');
    });

    async function createUser(e){
      e.preventDefault();
      const form = e.currentTarget;
      await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'users', email: form.email.value, role: form.role.value })
      });
      form.reset();
      await load('users');
    }

    async function editUser(id){
      const newRole = prompt('New role (admin/user)');
      if (!newRole) return;
      await fetch('/api/dashboard', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'users', _id: id, role: newRole })
      });
      await load('users');
    }

    async function deleteUser(id){
      if (!confirm('Delete user?')) return;
      await fetch('/api/dashboard', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'users', _id: id }) });
      await load('users');
    }

    document.getElementById('form-knowledge').addEventListener('submit', createKnowledge);
    document.getElementById('form-user').addEventListener('submit', createUser);

    load('knowledge');
    load('users');
  </script>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  try {
    const accept = String(req.headers?.accept || '');
    const requestedType = Array.isArray(req.query?.type) ? req.query.type[0] : req.query?.type;
    const user = getSessionUser(req);

    if (req.method === 'GET') {
      if (!requestedType && accept.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(user ? getDashboardHtml(user.email) : getLoginHtml());
      }

      if (!user) return res.status(401).send('Unauthorized');

      await ensureDb();

      if (requestedType === 'users') {
        const users = await AuthorizedUser.find({}).sort({ createdAt: -1 }).lean();
        return res.status(200).json(users);
      }

      const documents = await Knowledge.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json(documents);
    }

    if (!user) return res.status(401).send('Unauthorized');

    await ensureDb();

    if (req.method === 'POST') {
      const { type } = req.body || {};

      if (type === 'users') {
        const { email, role } = req.body || {};
        if (!email) return res.status(400).send('Missing email');

        const created = await AuthorizedUser.create({ email, role: role || 'user' });
        return res.status(201).json(created);
      }

      const { topic, content, keywords } = req.body || {};
      if (!topic || !content) return res.status(400).send('Missing fields');

      const normalizedKeywords = Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string'
          ? keywords.split(',').map((value: string) => value.trim()).filter(Boolean)
          : [];

      const created = await Knowledge.create({ topic, content, keywords: normalizedKeywords });
      return res.status(201).json(created);
    }

    if (req.method === 'PUT') {
      const { type } = req.body || {};

      if (type === 'users') {
        const { _id, role } = req.body || {};
        if (!_id) return res.status(400).send('Missing id');

        const updated = await AuthorizedUser.findByIdAndUpdate(_id, { role }, { new: true }).lean();
        return res.status(200).json(updated);
      }

      const { _id, topic, content, keywords } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');

      const updated = await Knowledge.findByIdAndUpdate(_id, { topic, content, keywords }, { new: true }).lean();
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { type, _id } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');

      if (type === 'users') {
        await AuthorizedUser.findByIdAndDelete(_id);
        return res.status(200).send('deleted');
      }

      await Knowledge.findByIdAndDelete(_id);
      return res.status(200).send('deleted');
    }

    return res.status(405).send('Method Not Allowed');
  } catch (err: any) {
    console.error('Dashboard error:', err?.message || err);
    return res.status(500).send('Server error');
  }
}