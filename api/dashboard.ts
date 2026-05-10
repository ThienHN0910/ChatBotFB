import connectDB from '../src/config/db';
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
    await connectDB();
    const allowed = await AuthorizedUser.findOne({ email: payload.email }).lean();
    if (!allowed) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Serve both HTML dashboard and JSON API depending on accept header
  const user = await verify(req);
  if (!user) return unauthorized(res);

  await connectDB();

  try {
    if (req.method === 'GET') {
      // If accept header prefers HTML, return a simple dashboard UI
      const accept = req.headers.accept || '';
      if (accept.includes('text/html')) {
        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>DNE Dashboard</title></head>
<body>
  <h1>DNE Knowledge Dashboard</h1>
  <div id="app">
    <form id="createForm">
      <input name="topic" placeholder="Topic" required /> <br/>
      <textarea name="content" placeholder="Content" required></textarea> <br/>
      <input name="keywords" placeholder="keywords (comma separated)" /> <br/>
      <button type="submit">Create</button>
    </form>
    <hr/>
    <div id="list"></div>
  </div>

  <script>
    async function load(){
      const res = await fetch('/api/dashboard');
      const list = await res.json();
      const container = document.getElementById('list');
      container.innerHTML = list.map(item=>`<div style="border:1px solid #ddd;padding:8px;margin:6px;">`+
        `<strong>${item.topic}</strong><div>${item.content}</div><div>keywords: ${item.keywords.join(',')}</div>`+
        `<button onclick="edit('${item._id}')">Edit</button>`+
        `<button onclick="del('${item._id}')">Delete</button></div>`).join('');
    }
    async function post(e){
      e.preventDefault();
      const f = e.target;
      const data = { topic: f.topic.value, content: f.content.value, keywords: f.keywords.value.split(',').map(s=>s.trim()).filter(Boolean) };
      await fetch('/api/dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      f.reset(); load();
    }
    async function edit(id){
      const newTopic = prompt('New topic');
      const newContent = prompt('New content');
      if(!newTopic||!newContent) return;
      await fetch('/api/dashboard',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({_id:id,topic:newTopic,content:newContent})});
      load();
    }
    async function del(id){
      if(!confirm('Delete?')) return;
      await fetch('/api/dashboard',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({_id:id})});
      load();
    }
    document.getElementById('createForm').addEventListener('submit',post);
    load();
  </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }

      // JSON list
      const docs = await Knowledge.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json(docs);
    }

    if (req.method === 'POST') {
      const { topic, content, keywords } = req.body || {};
      if (!topic || !content) return res.status(400).send('Missing fields');
      const kw = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      const doc = await Knowledge.create({ topic, content, keywords: kw });
      console.log('Created knowledge', doc._id, 'by', user.email);
      return res.status(201).json(doc);
    }

    if (req.method === 'PUT') {
      const { _id, topic, content, keywords } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');
      const doc = await Knowledge.findByIdAndUpdate(_id, { topic, content, keywords }, { new: true }).lean();
      console.log('Updated', _id, 'by', user.email);
      return res.status(200).json(doc);
    }

    if (req.method === 'DELETE') {
      const { _id } = req.body || {};
      if (!_id) return res.status(400).send('Missing id');
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
