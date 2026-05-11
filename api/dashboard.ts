import connectDB from '../src/lib/db';
import mongoose from 'mongoose';
import Knowledge from '../src/models/knowledge.model';
import AuthorizedUser from '../src/models/authorized_user.model';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod';

function unauthorized(res: any) {
  res.status(401).send('Unauthorized');
}

async function verify(req: any) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token, SESSION_SECRET);
    // optionally verify user still exists
    if (mongoose.connection.readyState !== 1) await connectDB();
    const allowed = await AuthorizedUser.findOne({ email: payload.email }).lean();
    if (!allowed) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Serve both HTML dashboard and JSON API depending on accept header
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  let user: any = null;

  // If no token, show a login button UI for HTML requests, otherwise return 401 JSON
  if (!token) {
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      const loginHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>DNE Dashboard - Login</title></head>
<body>
  <h1>DNE Dashboard</h1>
  <p>Bạn cần đăng nhập bằng Google để truy cập dashboard quản lý.</p>
  <a href="/api/auth"><button style="padding:10px 16px;font-size:16px;">Login with Google</button></a>
  <p>If your Google email is not in <code>authorized_users</code>, you will see an access denied message.</p>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(loginHtml);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If a token exists, verify and ensure the user is authorized
  user = await verify(req);
  if (!user) return res.status(403).send('Truy cập bị từ chối - Email không có trong danh sách Admin');

  if (mongoose.connection.readyState !== 1) await connectDB();

  try {
    if (req.method === 'GET') {
      // If accept header prefers HTML, return a simple dashboard UI
      const accept = req.headers.accept || '';
      if (accept.includes('text/html')) {
        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>DNE Dashboard</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:20px}
    .tabs{margin-bottom:12px}
    .tab{display:inline-block;padding:8px 12px;border:1px solid #ccc;margin-right:6px;cursor:pointer}
    .active{background:#eee}
    .panel{margin-top:12px}
    .item{border:1px solid #ddd;padding:8px;margin:6px}
    input,textarea,select{width:100%;padding:6px;margin:6px 0}
    .two{display:flex;gap:12px}
    .col{flex:1}
  </style>
</head>
<body>
  <h1>DNE Dashboard</h1>
  <div class="tabs">
    <div id="tab-knowledge" class="tab active" onclick="show('knowledge')">Knowledge</div>
    <div id="tab-users" class="tab" onclick="show('users')">Users</div>
  </div>

  <div id="panel-knowledge" class="panel">
    <h3>Create Knowledge</h3>
    <form id="form-knowledge">
      <input name="topic" placeholder="Topic" required />
      <textarea name="content" placeholder="Content" required></textarea>
      <input name="keywords" placeholder="keywords (comma separated)" />
      <button type="submit">Create</button>
    </form>
    <h3>Knowledge List</h3>
    <div id="list-knowledge"></div>
  </div>

  <div id="panel-users" class="panel" style="display:none">
    <h3>Create User</h3>
    <form id="form-user">
      <input name="email" placeholder="Email" required />
      <select name="role"><option value="admin">admin</option><option value="user">user</option></select>
      <button type="submit">Create User</button>
    </form>
    <h3>Users</h3>
    <div id="list-users"></div>
  </div>

  <script>
    function show(name){
      document.getElementById('panel-knowledge').style.display = name==='knowledge'? 'block':'none';
      document.getElementById('panel-users').style.display = name==='users'? 'block':'none';
      document.getElementById('tab-knowledge').classList.toggle('active', name==='knowledge');
      document.getElementById('tab-users').classList.toggle('active', name==='users');
    }

    async function load(resource){
      const res = await fetch('/api/dashboard?type='+resource);
      const list = await res.json();
      const container = document.getElementById('list-'+resource);
      if(!container) return;
      if(resource==='knowledge'){
        container.innerHTML = list.map(function(item){
          return '<div class="item">'
            + '<strong>' + (item.topic || '') + '</strong>'
            + '<div>' + (item.content || '') + '</div>'
            + '<div>keywords: ' + ((item.keywords || []).join(',')) + '</div>'
            + '<button onclick="editKnowledge(\'' + item._id + '\')">Edit</button>'
            + '<button onclick="deleteKnowledge(\'' + item._id + '\')">Delete</button>'
            + '</div>';
        }).join('');
      } else {
        container.innerHTML = list.map(function(u){
          return '<div class="item">'+(u.email||'')+' ('+(u.role||'')+') '
            + '<button onclick="editUser(\''+u._id+'\')">Edit</button>'
            + '<button onclick="deleteUser(\''+u._id+'\')">Delete</button>'
            + '</div>';
        }).join('');
      }
    }

    async function createKnowledge(e){
      e.preventDefault();
      const f = e.target;
      const data = { type: 'knowledge', topic: f.topic.value, content: f.content.value, keywords: f.keywords.value.split(',').map(function(s){return s.trim();}).filter(Boolean) };
      await fetch('/api/dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      f.reset(); load('knowledge');
    }

    async function editKnowledge(id){
      const newTopic = prompt('New topic');
      const newContent = prompt('New content');
      if(!newTopic||!newContent) return;
      await fetch('/api/dashboard',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({type:'knowledge',_id:id,topic:newTopic,content:newContent})});
      load('knowledge');
    }

    async function deleteKnowledge(id){
      if(!confirm('Delete?')) return;
      await fetch('/api/dashboard',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type:'knowledge',_id:id})});
      load('knowledge');
    }

    async function createUser(e){
      e.preventDefault();
      const f = e.target;
      const data = { type: 'users', email: f.email.value, role: f.role.value };
      await fetch('/api/dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      f.reset(); load('users');
    }

    async function editUser(id){
      const newRole = prompt('New role (admin/user)');
      if(!newRole) return;
      await fetch('/api/dashboard',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({type:'users',_id:id,role:newRole})});
      load('users');
    }

    async function deleteUser(id){
      if(!confirm('Delete user?')) return;
      await fetch('/api/dashboard',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type:'users',_id:id})});
      load('users');
    }

    document.getElementById('form-knowledge').addEventListener('submit',createKnowledge);
    document.getElementById('form-user').addEventListener('submit',createUser);
    load('knowledge'); load('users');
  </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }

      // JSON list - support ?type=users
      const qType = (req.query.type as string) || 'knowledge';
      if (qType === 'users') {
        const users = await AuthorizedUser.find({}).sort({ createdAt: -1 }).lean();
        return res.status(200).json(users);
      }
      const docs = await Knowledge.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json(docs);
    }

    if (req.method === 'POST') {
      const { type } = req.body || {};
      if (type === 'users') {
        const { email, role } = req.body || {};
        if (!email) return res.status(400).send('Missing email');
        const u = await AuthorizedUser.create({ email, role: role || 'user' });
        console.log('Created user', u._id, 'by', user.email);
        return res.status(201).json(u);
      }
      const { topic, content, keywords } = req.body || {};
      if (!topic || !content) return res.status(400).send('Missing fields');
      const kw = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      const doc = await Knowledge.create({ topic, content, keywords: kw });
      console.log('Created knowledge', doc._id, 'by', user.email);
      return res.status(201).json(doc);
    }

    if (req.method === 'PUT') {
      const { type } = req.body || {};
      if (type === 'users') {
        const { _id, role } = req.body || {};
        if (!_id) return res.status(400).send('Missing id');
        const u = await AuthorizedUser.findByIdAndUpdate(_id, { role }, { new: true }).lean();
        console.log('Updated user', _id, 'by', user.email);
        return res.status(200).json(u);
      }
      const { _id, topic, content, keywords } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');
      const doc = await Knowledge.findByIdAndUpdate(_id, { topic, content, keywords }, { new: true }).lean();
      console.log('Updated', _id, 'by', user.email);
      return res.status(200).json(doc);
    }

    if (req.method === 'DELETE') {
      const { type, _id } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');
      if (type === 'users') {
        await AuthorizedUser.findByIdAndDelete(_id);
        console.log('Deleted user', _id, 'by', user.email);
        return res.status(200).send('deleted');
      }
      await Knowledge.findByIdAndDelete(_id);
      console.log('Deleted', _id, 'by', user.email);
      return res.status(200).send('deleted');
    }

    return res.status(405).send('Method Not Allowed');
  } catch (err: any) {
    console.error('Dashboard error:', err?.message || err);
    return res.status(500).send('Server error');
  }
}
