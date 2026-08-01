const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 日付フォーマット
function formatDate(dateStr) {
  if (!dateStr) return { day: '—', month: '—' };
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { day: String(d.getDate()).padStart(2,'0'), month: months[d.getMonth()] };
}

// Releasesデータ取得
async function getReleases() {
  const res = await notion.databases.query({
    database_id: process.env.RELEASES_DB_ID,
    sorts: [{ property: 'リリース日', direction: 'ascending' }],
    page_size: 6
  });
  return res.results.map(p => ({
    title:    p.properties['タイトル']?.title?.[0]?.plain_text || '未定',
    artist:   p.properties['アーティスト']?.rich_text?.[0]?.plain_text || '—',
    date:     p.properties['リリース日']?.date?.start || null,
    type:     p.properties['種別']?.select?.name || 'Single',
    status:   p.properties['ステータス']?.select?.name || '準備中',
  }));
}

// Artistsデータ取得
async function getArtists() {
  const res = await notion.databases.query({
    database_id: process.env.ARTISTS_DB_ID,
    page_size: 8
  });
  return res.results.map(p => ({
    name:   p.properties['アーティスト名']?.title?.[0]?.plain_text || '—',
    genre:  p.properties['ジャンル']?.rich_text?.[0]?.plain_text || '—',
    status: p.properties['ステータス']?.select?.name || 'Hold',
  }));
}

// イニシャル生成
function initials(name) {
  return name.split(/[\s　]/).map(w => w[0]).join('').toUpperCase().slice(0,2);
}

// ステータスクラス
function artistStatusClass(s) {
  if (s === 'Active') return 'st-active';
  if (s === 'Prep')   return 'st-prep';
  return 'st-hold';
}
function artistAvatarColor(s) {
  if (s === 'Active') return '#1b3a5c';
  if (s === 'Prep')   return '#c17a3a';
  return '#aaa';
}
function releaseTypeClass(t) {
  if (t === 'Single') return 'type-single';
  if (t === 'Album')  return 'type-album';
  if (t === 'MV')     return 'type-mv';
  return 'type-ep';
}

// HTML生成
async function buildHTML(releases, artists) {
  const releaseRows = releases.map(r => {
    const d = formatDate(r.date);
    const statusClass = r.status === '公開済' ? 'rs-done' : r.status === '配信申請済' ? 'rs-wip' : 'rs-plan';
    return `
    <div class="release-item">
      <div class="release-date"><div class="day">${d.day}</div><div class="month">${d.month}</div></div>
      <div class="release-info"><div class="title">${r.title}</div><div class="artist">${r.artist}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="release-type ${releaseTypeClass(r.type)}">${r.type}</span>
        <span class="radio-status ${statusClass}">${r.status}</span>
      </div>
    </div>`;
  }).join('');

  const artistCards = artists.map(a => `
    <div class="artist-card">
      <div class="artist-avatar" style="background:${artistAvatarColor(a.status)}">${initials(a.name)}</div>
      <div class="artist-info"><div class="name">${a.name}</div><div class="genre">${a.genre}</div></div>
      <span class="artist-status ${artistStatusClass(a.status)}">${a.status}</span>
    </div>`).join('');

  const owlB64 = fs.readFileSync('scripts/owl_b64.txt', 'utf8').trim();
  const faviconB64 = fs.readFileSync('scripts/favicon_b64.txt', 'utf8').trim();
  const notionUrl = 'https://app.notion.com/p/3a568f0cd30d816daac7fd07d13f96ca';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ho-for Children | Label Dashboard</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${faviconB64}">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--bg:#f5f3ef;--surface:#fff;--surface2:#f0ede8;--accent:#1b3a5c;--accent2:#e07b39;--accent3:#3a86c8;--text:#1a1a1a;--muted:#888;--border:#e0dcd5;--green-bg:#d8f3e3;--green-txt:#1b5e37;--orange-bg:#fdebd8;--orange-txt:#8c3e0e;--blue-bg:#d8eaf8;--blue-txt:#1a4e7a;--purple-bg:#ede8f8;--purple-txt:#4a2e8c;}
  body{background:var(--bg);color:var(--text);font-family:'Noto Sans JP',sans-serif;font-size:13px;min-height:100vh;}
  header{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:var(--accent);position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18);}
  .header-left{display:flex;align-items:center;gap:16px;}
  .owl-wrap{width:56px;height:56px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(255,255,255,.25);flex-shrink:0;overflow:hidden;}
  .owl-wrap img{width:46px;height:46px;object-fit:contain;}
  .logo-main{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.14em;color:#fff;line-height:1;}
  .logo-sub{font-size:10px;color:rgba(255,255,255,.55);letter-spacing:.12em;margin-top:3px;}
  .header-meta{font-size:11px;color:rgba(255,255,255,.6);text-align:right;line-height:1.8;}
  .header-meta span{color:#fff;}
  .main{display:grid;grid-template-columns:1fr 1fr 260px;gap:14px;padding:18px 28px;max-width:1100px;margin:0 auto;}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.05);}
  .panel-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border);}
  .panel-title{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.15em;color:var(--accent);}
  .badge{font-size:10px;background:var(--accent);color:#fff;padding:2px 8px;border-radius:20px;font-weight:700;}
  .panel-strategy{grid-column:1/4;}
  .strategy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .strategy-card{background:var(--surface2);border-radius:6px;padding:14px 16px;border-left:4px solid var(--accent);display:flex;flex-direction:column;gap:6px;}
  .strategy-card.orange{border-color:var(--accent2);}
  .strategy-card.blue{border-color:var(--accent3);}
  .strategy-label{font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;}
  .strategy-title{font-weight:700;font-size:13px;}
  .strategy-body{font-size:11px;color:var(--muted);line-height:1.65;}
  .strategy-link{margin-top:4px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--accent3);text-decoration:none;background:var(--blue-bg);padding:4px 10px;border-radius:20px;width:fit-content;}
  .strategy-link:hover{opacity:.8;}
  .panel-release{grid-column:1/3;}
  .release-item{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);}
  .release-item:last-child{border-bottom:none;}
  .release-date{text-align:center;}
  .release-date .day{font-family:'Bebas Neue',sans-serif;font-size:26px;line-height:1;color:var(--accent);}
  .release-date .month{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;}
  .release-info .title{font-weight:700;font-size:13px;margin-bottom:2px;}
  .release-info .artist{font-size:11px;color:var(--muted);}
  .release-type{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;}
  .type-single{background:var(--green-bg);color:var(--green-txt);}
  .type-album{background:var(--orange-bg);color:var(--orange-txt);}
  .type-mv{background:var(--blue-bg);color:var(--blue-txt);}
  .type-ep{background:var(--purple-bg);color:var(--purple-txt);}
  .panel-artists{grid-column:3/4;grid-row:2/4;}
  .artist-card{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
  .artist-card:last-child{border-bottom:none;}
  .artist-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:14px;flex-shrink:0;color:#fff;}
  .artist-info .name{font-weight:700;font-size:12px;margin-bottom:1px;}
  .artist-info .genre{font-size:10px;color:var(--muted);}
  .artist-status{margin-left:auto;font-size:10px;padding:2px 7px;border-radius:20px;font-weight:700;}
  .st-active{background:var(--green-bg);color:var(--green-txt);}
  .st-prep{background:var(--orange-bg);color:var(--orange-txt);}
  .st-hold{background:var(--surface2);color:var(--muted);border:1px solid var(--border);}
  .panel-radio{grid-column:1/3;}
  .radio-item{display:grid;grid-template-columns:1fr 100px auto;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);}
  .radio-item:last-child{border-bottom:none;}
  .radio-info .ep-title{font-weight:700;font-size:12px;margin-bottom:2px;}
  .radio-info .ep-date{font-size:11px;color:var(--muted);}
  .progress-label{font-size:10px;color:var(--muted);margin-bottom:3px;display:flex;justify-content:space-between;}
  .progress-bar{height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;}
  .progress-fill{height:100%;border-radius:3px;background:var(--accent);}
  .progress-fill.orange{background:var(--accent2);}
  .progress-fill.green{background:#2d6a4f;}
  .radio-status{font-size:10px;padding:3px 8px;border-radius:20px;font-weight:700;white-space:nowrap;}
  .rs-done{background:var(--green-bg);color:var(--green-txt);}
  .rs-wip{background:var(--orange-bg);color:var(--orange-txt);}
  .rs-plan{background:var(--surface2);color:var(--muted);border:1px solid var(--border);}
  .panel-tasks{grid-column:1/3;}
  .task-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
  .task-item:last-child{border-bottom:none;}
  .task-check{width:17px;height:17px;border:2px solid var(--border);border-radius:4px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color .15s,background .15s;}
  .task-check:hover{border-color:var(--accent);}
  .task-check.done{border-color:var(--accent);background:var(--accent);}
  .task-check.done::after{content:'';width:9px;height:5px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translateY(-1px);display:block;}
  .task-text{flex:1;font-size:12px;}
  .task-text.done-text{color:var(--muted);text-decoration:line-through;}
  .task-assignee{font-size:10px;color:var(--muted);background:var(--surface2);padding:2px 7px;border-radius:20px;white-space:nowrap;}
  .task-due{font-size:10px;padding:2px 7px;border-radius:20px;white-space:nowrap;}
  .due-urgent{background:#fdebd8;color:#8c3e0e;font-weight:700;}
  .due-normal{color:var(--muted);}
  .add-task-row{display:flex;gap:8px;margin-top:12px;}
  .add-task-input{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:8px 12px;font-size:12px;font-family:'Noto Sans JP',sans-serif;border-radius:6px;outline:none;}
  .add-task-input:focus{border-color:var(--accent);background:#fff;}
  .add-task-btn{background:var(--accent);color:#fff;border:none;padding:8px 16px;font-size:12px;font-weight:700;font-family:'Noto Sans JP',sans-serif;border-radius:6px;cursor:pointer;}
  .add-task-btn:hover{opacity:.85;}
  .updated-at{font-size:10px;color:var(--muted);text-align:right;padding:8px 28px;}
</style>
</head>
<body>
<header>
  <div class="header-left">
    <div class="owl-wrap"><img src="data:image/gif;base64,${owlB64}" alt="Ho-for Children Owl"></div>
    <div>
      <div class="logo-main">HO-FOR CHILDREN</div>
      <div class="logo-sub">LABEL OPERATIONS DASHBOARD</div>
    </div>
  </div>
  <div class="header-meta">
    <div><span id="now-date"></span></div>
    <div>Representative: <span>今野敏博</span></div>
  </div>
</header>

<div class="main">
  <div class="panel panel-strategy">
    <div class="panel-header">
      <div class="panel-title">MANAGEMENT STRATEGY 2025–2027</div>
      <a href="${notionUrl}" target="_blank" style="font-size:11px;color:var(--accent3);text-decoration:none;font-weight:700;">📄 Notionで全文を見る →</a>
    </div>
    <div class="strategy-grid">
      <div class="strategy-card">
        <div class="strategy-label">事業の柱①</div>
        <div class="strategy-title">音楽レーベル＆制作サポート</div>
        <div class="strategy-body">BtoB。配信・プロモーション支援を3段階パッケージで提供。月次契約モデルへの移行でストック収益を構築。</div>
        <a class="strategy-link" href="${notionUrl}" target="_blank">詳細を Notion で見る →</a>
      </div>
      <div class="strategy-card orange">
        <div class="strategy-label">事業の柱②</div>
        <div class="strategy-title">デジタル出版・電子書籍</div>
        <div class="strategy-body">BtoC。音楽・カルチャー領域のコンテンツをデジタル化。AIを活用した制作効率化で収益の多様化を図る。</div>
        <a class="strategy-link" href="${notionUrl}" target="_blank">詳細を Notion で見る →</a>
      </div>
      <div class="strategy-card blue">
        <div class="strategy-label">事業の柱③</div>
        <div class="strategy-title">ラジオ番組制作</div>
        <div class="strategy-body">FM小田原「ホーホーチルドレン」を自社メディアとして育て、レーベルとの相乗効果を最大化する。</div>
        <a class="strategy-link" href="${notionUrl}" target="_blank">詳細を Notion で見る →</a>
      </div>
    </div>
  </div>

  <div class="panel panel-release">
    <div class="panel-header">
      <div class="panel-title">RELEASE SCHEDULE</div>
      <span style="font-size:11px;color:var(--muted)">Notionと自動同期</span>
    </div>
    ${releaseRows}
  </div>

  <div class="panel panel-artists">
    <div class="panel-header">
      <div class="panel-title">ARTISTS</div>
      <span class="badge">${artists.length}</span>
    </div>
    ${artistCards}
  </div>

  <div class="panel panel-radio">
    <div class="panel-header">
      <div class="panel-title">RADIO — FM小田原「ホーホーチルドレン」</div>
      <span style="font-size:11px;color:var(--muted)">番組制作進捗</span>
    </div>
    <div class="radio-item">
      <div class="radio-info"><div class="ep-title">#142 Clive Davis トリビュート特集</div><div class="ep-date">放送予定: 7月13日</div></div>
      <div><div class="progress-label"><span>進捗</span><span>90%</span></div><div class="progress-bar"><div class="progress-fill green" style="width:90%"></div></div></div>
      <span class="radio-status rs-wip">最終確認中</span>
    </div>
    <div class="radio-item">
      <div class="radio-info"><div class="ep-title">#143 1970年代 ソウル特集（非Motown）</div><div class="ep-date">放送予定: 7月20日</div></div>
      <div><div class="progress-label"><span>進捗</span><span>60%</span></div><div class="progress-bar"><div class="progress-fill orange" style="width:60%"></div></div></div>
      <span class="radio-status rs-wip">制作中</span>
    </div>
    <div class="radio-item">
      <div class="radio-info"><div class="ep-title">#144 アーティスト特集（未定）</div><div class="ep-date">放送予定: 7月27日</div></div>
      <div><div class="progress-label"><span>進捗</span><span>10%</span></div><div class="progress-bar"><div class="progress-fill" style="width:10%"></div></div></div>
      <span class="radio-status rs-plan">企画中</span>
    </div>
    <div class="radio-item">
      <div class="radio-info"><div class="ep-title">#141 Michael Jackson 特集</div><div class="ep-date">放送済: 7月6日</div></div>
      <div><div class="progress-label"><span>進捗</span><span>100%</span></div><div class="progress-bar"><div class="progress-fill green" style="width:100%"></div></div></div>
      <span class="radio-status rs-done">放送済</span>
    </div>
  </div>

  <div class="panel panel-tasks">
    <div class="panel-header">
      <div class="panel-title">TASKS &amp; TODO</div>
      <span class="badge" id="task-count">0</span>
    </div>
    <div id="task-list"></div>
    <div class="add-task-row">
      <input class="add-task-input" id="task-input" placeholder="タスクを追加… (Enterで確定)">
      <button class="add-task-btn" onclick="addTask()">+ 追加</button>
    </div>
  </div>
</div>

<div class="updated-at">最終更新: ${new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'})}</div>

<script>
  document.getElementById('now-date').textContent =
    new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
  const initTasks=[
    {text:'「夏の記憶」Spotify/Apple Music 配信申請',assignee:'今野',due:'7/3',urgent:true,done:false},
    {text:'#142 Clive Davis 最終スクリプト確認',assignee:'今野',due:'7/5',urgent:true,done:false},
    {text:'Deep City Vol.3 プレスリリース送付',assignee:'担当A',due:'7/10',urgent:false,done:false},
    {text:'#143 ソウル特集 プレイリスト確定',assignee:'今野',due:'7/12',urgent:false,done:false},
    {text:'FM小田原 番組スクリプト確認',assignee:'今野',due:'7/8',urgent:false,done:true},
  ];
  let tasks=[...initTasks];
  function renderTasks(){
    const list=document.getElementById('task-list');
    list.innerHTML='';
    document.getElementById('task-count').textContent=tasks.filter(t=>!t.done).length;
    tasks.forEach((t,i)=>{
      const row=document.createElement('div');
      row.className='task-item';
      row.innerHTML='<div class="task-check '+(t.done?'done':'')+'" onclick="toggleTask('+i+')"></div>'+
        '<div class="task-text '+(t.done?'done-text':'')+'">'+t.text+'</div>'+
        '<div class="task-assignee">'+t.assignee+'</div>'+
        '<div class="task-due '+(t.urgent&&!t.done?'due-urgent':'due-normal')+'">'+t.due+'</div>';
      list.appendChild(row);
    });
  }
  function toggleTask(i){tasks[i].done=!tasks[i].done;renderTasks();}
  function addTask(){
    const input=document.getElementById('task-input');
    const val=input.value.trim();
    if(!val)return;
    tasks.unshift({text:val,assignee:'今野',due:'—',urgent:false,done:false});
    input.value='';renderTasks();
  }
  document.getElementById('task-input').addEventListener('keydown',e=>{if(e.key==='Enter')addTask();});
  renderTasks();
</script>
</body>
</html>`;
}

async function main() {
  console.log('Notionからデータを取得中...');
  const [releases, artists] = await Promise.all([getReleases(), getArtists()]);
  console.log(`リリース: ${releases.length}件, アーティスト: ${artists.length}件`);
  const html = await buildHTML(releases, artists);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('index.html を更新しました！');
}

main().catch(console.error);
