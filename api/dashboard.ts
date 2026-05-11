import connectDB from '../src/lib/db';
import mongoose from 'mongoose';
import Knowledge from '../src/models/knowledge.model';
      if (accept.includes('text/html')) {
        const displayEmail = (user && user.email) ? String(user.email).replace(/</g,'&lt;') : '';
        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>DNE Dashboard</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:20px}
    .top{display:flex;justify-content:space-between;align-items:center}
    .tabs{margin-bottom:12px}
    .tab{display:inline-block;padding:8px 12px;border:1px solid #ccc;margin-right:6px;cursor:pointer}
    .active{background:#eee}
    .panel{margin-top:12px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    .item{border:1px solid #ddd;padding:8px;margin:6px}
    input,textarea,select{width:100%;padding:6px;margin:6px 0}
    .two{display:flex;gap:12px}
    .col{flex:1}
    .pagination{margin-top:8px}
    .modal{position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center}
    .modal .box{background:#fff;padding:16px;border-radius:6px;width:90%;max-width:800px}
    .small-btn{padding:6px 10px;margin-left:6px}
  </style>
</head>
<body>
  <div class="top">
    <h1>DNE Dashboard</h1>
    <div>Signed in as: <strong>${displayEmail}</strong> <a href="/api/logout"><button class="small-btn">Logout</button></a></div>
  </div>
  <div class="tabs">
    <div id="tab-knowledge" class="tab active" onclick="show('knowledge')">Knowledge</div>
    <div id="tab-users" class="tab" onclick="show('users')">Users</div>
  </div>

  <div id="panel-knowledge" class="panel">
    <h3>Create Knowledge</h3>
    <form id="form-knowledge">
      <input name="topic" placeholder="Topic" required />
      <textarea name="content" id="content-input" placeholder="Content" required></textarea>
      <input name="keywords" placeholder="keywords (comma separated)" />
      <button type="submit">Create</button>
    </form>
    <h3>Knowledge List</h3>
    <div id="table-knowledge"></div>
    <div id="pagination-knowledge" class="pagination"></div>
  </div>

  <div id="panel-users" class="panel" style="display:none">
    <h3>Create User</h3>
    <form id="form-user">
      <input name="email" placeholder="Email" required />
      <select name="role"><option value="admin">admin</option><option value="user">user</option></select>
      <button type="submit">Create User</button>
    </form>
    <h3>Users</h3>
    <div id="table-users"></div>
    <div id="pagination-users" class="pagination"></div>
  </div>

  <div id="editor-modal" style="display:none" class="modal">
    <div class="box">
      <h3 id="editor-title">Edit Knowledge</h3>
      <input id="editor-topic" placeholder="Topic" />
      <div id="editor-content" contenteditable="true" style="min-height:150px;border:1px solid #ccc;padding:8px;margin:8px 0"></div>
      <input id="editor-keywords" placeholder="keywords (comma separated)" />
      <div style="text-align:right"><button id="editor-save">Save</button> <button id="editor-cancel">Cancel</button></div>
    </div>
  </div>

  <script>
    var perPage = 10;
    var lists = { knowledge: [], users: [] };
    var currentPage = { knowledge: 1, users: 1 };
    function show(name){
      document.getElementById('panel-knowledge').style.display = name==='knowledge'? 'block':'none';
      document.getElementById('panel-users').style.display = name==='users'? 'block':'none';
      document.getElementById('tab-knowledge').classList.toggle('active', name==='knowledge');
      document.getElementById('tab-users').classList.toggle('active', name==='users');
    }

    async function load(resource){
      const res = await fetch('/api/dashboard?type='+resource);
      const list = await res.json();
      lists[resource] = list || [];
      currentPage[resource] = 1;
      render(resource);
    }

    function render(resource){
      var list = lists[resource] || [];
      var page = currentPage[resource] || 1;
      var start = (page-1)*perPage; var end = start+perPage;
      var slice = list.slice(start,end);
      var container = document.getElementById('table-'+resource);
      var pagination = document.getElementById('pagination-'+resource);
      if(resource==='knowledge'){
        var html = '<table><thead><tr><th>Topic</th><th>Content</th><th>Keywords</th><th>Actions</th></tr></thead><tbody>';
        for(var i=0;i<slice.length;i++){var it=slice[i]; html += '<tr>'+
          '<td>'+escapeHtml(it.topic||'')+'</td>'+
          '<td>'+escapeHtml(String(it.content||'')).slice(0,200)+'</td>'+
          '<td>'+((it.keywords||[]).join(','))+'</td>'+
          '<td><button onclick="openEditor(\''+it._id+'\')">Edit</button> <button onclick="deleteKnowledge(\''+it._id+'\')">Delete</button></td>'+
          '</tr>';} 
        html += '</tbody></table>';
        container.innerHTML = html;
      } else {
        var html = '<table><thead><tr><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>';
        for(var i=0;i<slice.length;i++){var u=slice[i]; html += '<tr>'+
          '<td>'+escapeHtml(u.email||'')+'</td>'+
          '<td>'+escapeHtml(u.role||'')+'</td>'+
          '<td><button onclick="editUser(\''+u._id+'\')">Edit</button> <button onclick="deleteUser(\''+u._id+'\')">Delete</button></td>'+
          '</tr>';} 
        html += '</tbody></table>';
        container.innerHTML = html;
      }
      // pagination
      var total = Math.ceil(list.length / perPage) || 1;
      pagination.innerHTML = '<button '+(page<=1?'disabled':'')+' onclick="changePage(\''+resource+'\','+(page-1)+')">Prev</button> Page '+page+' of '+total+' <button '+(page>=total?'disabled':'')+' onclick="changePage(\''+resource+'\','+(page+1)+')">Next</button>';
    }

    function changePage(resource,p){ currentPage[resource]=p; render(resource); }

    function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    async function createKnowledge(e){ e.preventDefault(); var f=e.target; var data={type:'knowledge', topic:f.topic.value, content: document.getElementById('content-input').value, keywords:f.keywords.value.split(',').map(function(s){return s.trim();}).filter(Boolean)}; await fetch('/api/dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); f.reset(); load('knowledge'); }

    async function deleteKnowledge(id){ if(!confirm('Delete?')) return; await fetch('/api/dashboard',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type:'knowledge',_id:id})}); load('knowledge'); }

    // Editor modal
    var currentEditId = null;
    function openEditor(id){
      currentEditId = id;
      var item = lists.knowledge.find(function(x){return x._id===id});
      document.getElementById('editor-topic').value = item.topic||'';
      document.getElementById('editor-content').innerHTML = item.content||'';
      document.getElementById('editor-keywords').value = (item.keywords||[]).join(',');
      document.getElementById('editor-modal').style.display = 'flex';
    }
    document.getElementById('editor-cancel').addEventListener('click', function(){ document.getElementById('editor-modal').style.display='none'; });
    document.getElementById('editor-save').addEventListener('click', async function(){
      var topic = document.getElementById('editor-topic').value;
      var content = document.getElementById('editor-content').innerHTML;
      var keywords = document.getElementById('editor-keywords').value.split(',').map(function(s){return s.trim()}).filter(Boolean);
      await fetch('/api/dashboard',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({type:'knowledge',_id:currentEditId,topic:topic,content:content,keywords:keywords})});
      document.getElementById('editor-modal').style.display='none';
      load('knowledge');
    });

    document.getElementById('form-knowledge').addEventListener('submit',createKnowledge);
    document.getElementById('form-user').addEventListener('submit',async function(e){ e.preventDefault(); var f=e.target; var data={type:'users', email:f.email.value, role:f.role.value}; await fetch('/api/dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); f.reset(); load('users'); });
    async function editUser(id){ const newRole = prompt('New role (admin/user)'); if(!newRole) return; await fetch('/api/dashboard',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({type:'users',_id:id,role:newRole})}); load('users'); }
    async function deleteUser(id){ if(!confirm('Delete user?')) return; await fetch('/api/dashboard',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({type:'users',_id:id})}); load('users'); }

    load('knowledge'); load('users');
  </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }
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
