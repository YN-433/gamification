/* ---------- 状態と共通UI ---------- */
const KEY = 'gamification-proto-v5';
const OLDKEYS = ['gamification-proto-v4', 'gamification-proto-v3', 'life-gamification-proto-v2'];
const fmt = n => Number(n).toLocaleString('ja-JP');
const lc = id => 'var(--' + String(id).toLowerCase() + ')';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md2 = s => { const d = parseISO(s); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; };
function migrate23(s) {
  const n = clone(s); const log = n.log || [];
  n.v = 3;
  n.events = log.filter(e => e.kind === 'box').map(e => ({ id: e.id, date: e.date, gk: null, area: e.id === 'seed-1024' ? 'シートの記録' : '', alloc: { [e.cat]: e.boxes }, boxes: e.boxes, star: e.star, done: true, xpBy: { [e.cat]: e.xp }, xp: e.xp, g: e.g, spent: e.spent || 0 }));
  n.log = log.filter(e => e.kind === 'quest');
  delete n.pending;
  ['week', 'month'].forEach(k => { if (n.goals && n.goals[k]) delete n.goals[k].done; });
  return n;
}
function migrate34(s) {
  const n = clone(s); n.v = 4;
  n.events = n.events || [];
  n.events.forEach(e => { if (e.start == null) e.start = autoSlot({ events: n.events.filter(x => x.start != null) }, e.date, e.boxes); });
  ['week', 'month'].forEach(k => {
    const g = n.goals[k]; delete g.reflection; delete g.score;
    g.areas.forEach(a => {
      if (!Array.isArray(a.stats)) { const top = a.alloc ? Object.keys(a.alloc).sort((x, y) => a.alloc[y] - a.alloc[x])[0] : 'INT'; a.stats = Array(Math.max(0, Math.round(Number(a.box) || 0))).fill(top || 'INT'); }
      delete a.alloc; a.locked = false;
    });
    g.outcomes.forEach(o => { o.locked = false; });
  });
  n.refl = n.refl || {}; n.custom = n.custom || []; n.inv = n.inv || {}; n.notices = n.notices || [];
  const total = sumPts(n.pts); n.spRank = 0; SP_RANKS.forEach((r, i) => { if (total >= r[0]) n.spRank = i + 1; });
  n.spStats = STATS.filter(x => n.pts[x.id] >= SP_STAT_PT).map(x => x.id);
  n.sp = Math.max(n.sp || 0, n.spRank + n.spStats.length);
  return n;
}
// v4 → v5: 獲得予定(今日を終了で確定)、ジャーナル、今年の目標、レコードのウィジェット
function migrate45(s) {
  const n = clone(s); n.v = 5;
  n.pend = { pts: {}, gold: 0 }; n.closed = {}; n.journal = {}; n.gcalDel = [];
  n.widgets = ['qstat', 'gain', 'health', 'box'];
  n.events.forEach(e => { if (e.done) e.fin = true; });
  (n.log || []).forEach(x => { x.fin = true; });
  n.goals.year = { year: Number(n.day.slice(0, 4)), items: [] };
  return n;
}
// ステータスの入れ替え: 免疫(IMM)+体力(STR) → 健康(VIT)、新しく技術(TEC)。古い保存データ・バックアップを自動で変換する
function migrateStats(s) {
  const fix = v => (v === 'IMM' || v === 'STR' || v === 'HLT') ? 'VIT' : v;
  (function walk(o) {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (typeof o[i] === 'string') o[i] = fix(o[i]); else if (o[i] && typeof o[i] === 'object') walk(o[i]); } return; }
    if (!o || typeof o !== 'object') return;
    if ('IMM' in o || 'STR' in o || 'HLT' in o) { o.VIT = (Number(o.VIT) || 0) + (Number(o.IMM) || 0) + (Number(o.STR) || 0) + (Number(o.HLT) || 0); delete o.IMM; delete o.STR; delete o.HLT; }
    if ('CHA' in o && 'REG' in o && !('TEC' in o)) o.TEC = 0;
    Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string') o[k] = fix(v); else if (v && typeof v === 'object') walk(v); });
  })(s);
  (s.events || []).forEach(e => { if (!Array.isArray(e.tags)) e.tags = e.tag ? tagParse(e.tag) : []; delete e.tag; });
  ['week', 'month'].forEach(k => { const g = s.goals && s.goals[k]; if (!g) return; (g.areas || []).forEach(a => { if (!Array.isArray(a.tags)) a.tags = a.tag ? tagParse(a.tag) : []; delete a.tag; delete a.memo; }); (g.outcomes || []).forEach(o => { if (!Array.isArray(o.tags)) o.tags = []; }); });
  if (!s.lib) s.lib = { a: {}, o: {}, h: {} }; if (!s.habTags) s.habTags = {};
  if (s.goals && s.goals.year && Array.isArray(s.goals.year.items)) s.goals.year.items.forEach(o => { if (!Array.isArray(o.tags)) o.tags = o.tag ? [o.tag] : []; delete o.tag; if (o.d == null) o.d = ''; });
  return s;
}
function migrate(s) {
  if (!s) return null;
  if (s.v === 2) s = migrate23(s);
  if (s && s.v === 3) s = migrate34(s);
  if (s && s.v === 4) s = migrate45(s);
  return s && s.v === 5 ? migrateStats(s) : null;
}
function load() {
  try {
    let raw = localStorage.getItem(KEY);
    for (let i = 0; !raw && i < OLDKEYS.length; i++) raw = localStorage.getItem(OLDKEYS[i]);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {}
  return null;
}
function save() { try { libSync(); localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
// 過去につくったクエスト・成果目標・習慣を覚えておく(あとから、もう一度足せる)
function libSync() {
  const L = state.lib = state.lib || {}; L.a = L.a || {}; L.o = L.o || {}; L.h = L.h || {};
  ['week', 'month'].forEach(k => { const g = state.goals[k]; if (!g) return;
    (g.areas || []).forEach(a => { const nm = String(a.name || '').trim(); if (!nm || a.ed || a.res || distSum(a.dist) !== DIST_TOTAL.a) return;
      L.a[nm] = { name: nm, dist: clone(a.dist), want: a.want === 'm' ? 'm' : 'w', work: !!a.work, value: a.value || 5, tags: (a.tags || []).slice() }; });
    (g.outcomes || []).forEach(o => { const t = String(o.t || '').trim(); if (!t || o.ed) return;
      L.o[t] = { t: t, dist: clone(o.dist), n: o.n, u: o.u || '回', tags: (o.tags || []).slice() }; }); });
  Object.keys(state.hist || {}).forEach(k => { const h = state.hist[k]; (h.areas || []).forEach(a => { if (a.name && !L.a[a.name]) L.a[a.name] = { name: a.name, dist: null, want: 'w', work: false, value: a.value || 5, tags: [] }; });
    ((h.final && h.final.outcomes) || []).forEach(o => { if (o.t && !L.o[o.t]) L.o[o.t] = { t: o.t, dist: null, n: o.n || 1, u: o.u || '回', tags: [] }; }); });
  Object.keys(state.qlib || {}).forEach(n => { if ((!L.a[n] || !L.a[n].dist) && distSum(state.qlib[n]) === DIST_TOTAL.a) L.a[n] = Object.assign(L.a[n] || {},  { name: n, dist: clone(state.qlib[n]), want: 'w', work: false, value: 5, tags: [] }); });
  (state.hab || []).forEach(h => { const nm = String(h.name || '').trim(); if (!nm || (typeof ui !== 'undefined' && ui.edH === h.id) || distSum(h.dist) !== DIST_TOTAL.h) return;
    const g = state.goals.week; L.h[nm] = { name: nm, dist: clone(h.dist), u: (g.hunits && g.hunits[h.id]) || '回', tags: ((state.habTags || {})[h.id] || []).slice() }; });
}
function setPath(obj, path, val) { const k = path.split('.'); let o = obj; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; }

let state = rollover(load() || seedState(iso(new Date())), iso(new Date()));
if (state.wkStart != null) WKS = state.wkStart;
const THEMES_UI = [['default', 'デフォルト'], ['white', 'ホワイト'], ['dark', 'ダーク']];
function applyTheme() {
  document.documentElement.setAttribute('data-theme', { default: 'light', white: 'white', dark: 'dark' }[state.theme || 'default'] || 'light');
  // ステータスバー・ナビゲーションの色を、アプリの背景色に合わせる
  try {
    const bg = (getComputedStyle(document.documentElement).getPropertyValue('--bg') || '').trim() || '#E9EFED';
    document.documentElement.style.backgroundColor = bg;
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
    m.setAttribute('content', bg);
  } catch (e) {}
}
applyTheme();
// 今年の目標: 古い保存データの tag(1つ)を tags(複数)へ
(function () { state.goals.year.items.forEach(o => { if (!Array.isArray(o.tags)) { o.tags = o.tag ? [o.tag] : []; } delete o.tag; if (o.d == null) o.d = ''; }); })();
['events', 'log', 'notices', 'gcalDel'].forEach(k => { if (!state[k]) state[k] = []; });
['journal', 'closed', 'inv'].forEach(k => { if (!state[k]) state[k] = {}; });
if (!state.pend) state.pend = { pts: {}, gold: 0 };
if (!state.goals.year || state.goals.year.year !== Number(state.day.slice(0, 4))) state.goals.year = { year: Number(state.day.slice(0, 4)), items: (state.goals.year && state.goals.year.year === Number(state.day.slice(0, 4))) ? state.goals.year.items : [] };
normGoals(state.goals.week); normGoals(state.goals.month); migrateStats(state);
if (!state.habHide) state.habHide = []; if (!state.hab) state.hab = []; if (!state.habDist) state.habDist = {}; if (!state.qlib) state.qlib = {}; if (!state.shopHide) state.shopHide = []; if (!state.shopOrder) state.shopOrder = [];
['week', 'month'].forEach(k => state.goals[k].areas.forEach(a => { if (a.name && !a.ed && distSum(a.dist) > 0 && !state.qlib[a.name]) state.qlib[a.name] = clone(a.dist); }));
if (state.wkStart == null) {
  // はじめて土曜はじまりになる保存データは、今週の目標を土〜金に合わせ直す
  state.wkStart = 6; WKS = 6;
  const ws0 = sundayOf(state.day); state.goals.week.start = ws0; state.goals.week.end = addDays(ws0, 6);
} else WKS = state.wkStart;
state = syncSP(state);
(function () { try { libSync(); } catch (e) {} })();
const ui = {
  tab: 'home', sub: null, qv: 'board', wk: sundayOf(iso(new Date())), menu: false, resetArm: false,
  pop2: null, petMsg: '', petJump: 0, wedit: false, gc: null, sh: 'shop', addItem: false,
  ni: { name: '', cat: '', g: 500, mp: 20, stat: 'INT', pt: 0 }, ge: { o: false, h: false }, wcv: 'week', qopen: { sub: true, ur: true, ev: true, ao: true, over: true }, qo: {}, edH: null, delMode: false, trayAdd: false, zoom: 1, calPos: {}, calJump: false, cv: 'week', mon: iso(new Date()).slice(0, 7), draft: {}, talk: '', talkOpen: false, rec: false, jbusy: false, jerr: '',
  gk: 'week', voice: '', patch: null, questions: null, busy: '', err: '', sample: null, ctl: null, pdf: null,
  h: { energy: 78, steps: 6800, sleep: 7.2 }, newYear: '', newYearTag: '', newYearD: '', newYearTags: [], zrh: 30, libTag: [], yTags: [], yfo: false, yo: {}, rdo: {}
};
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function commit(next, msg) {
  const before = rankOf(sumPts(state.pts));
  state = syncSP(next);
  const after = rankOf(sumPts(state.pts));
  if (after.idx > before.idx) msg = 'ランクアップ  ' + before.label + ' → ' + after.label;
  save(); render();
  if (msg) toast(msg);
}
const barHTML = (pct, color) => '<div class="bar" style="--w:' + clampN(pct, 0, 100) + '%;--c:' + color + '"><i></i></div>';
const fallbackMP = () => state.morning.src !== 'health';
// エナジースコア(朝の値)から、その日の調子を5段階で
function condition() {
  const v = state.mpBase;
  if (v >= 80) return { t: '絶好調', c: 'c5' }; if (v >= 60) return { t: '好調', c: 'c4' }; if (v >= 40) return { t: 'ふつう', c: 'c3' }; if (v >= 20) return { t: '不調', c: 'c2' };
  return { t: '絶不調', c: 'c1' };
}

/* ---- ドットのキャラ(クジラ・ペンギン・ネコ・イヌ・インコ) ---- */
const PET = [
  '...www......www.............',
  '..wwwww.ww.wwwww..K....K....',
  '...www..ww..www..KbK..KbK...',
  '........ww......KbbK.KbbK...',
  '......KKKKKKKK..KbbbKKbbbK..',
  '....KKbbbbbbbbKKKbbbbbbbbK..',
  '...KbbbbbbbbbbbbKbbbbbbbK...',
  '..KbbbbbbbbbbbbbbKbbbbbK....',
  '..KbWEbbbbbbbbbbbbKbbbK.....',
  '.KbbEEbbbbbbbbbbbbbKbK......',
  '.KbpbbbbbbbbbbbbbbbbbK......',
  '.KccccbbbbbbbbbbbbbbK.......',
  '.KKcccccbbbbbbbbbbbK........',
  '..KKKKKKKKKKKKKKKKK.........'
];
const PETC = { K: '#17324a', b: '#5aa7e6', c: '#dff1ff', E: '#17324a', W: '#ffffff', p: '#9db3c6', m: '#17324a', w: '#9fdcff' };
// 左右対称のキャラは、左半分(8マス)だけ書いて、右を鏡うつしにする
const mirrorRows = h => h.map(r => r + r.split('').reverse().join(''));
const PETS = {
  whale: { name: 'クジラ', rows: PET, c: PETC, scale: 1 },
  penguin: { name: 'ペンギン', scale: 0.62, c: { K: '#17324a', b: '#3b4a68', v: '#ffffff', o: '#f6a21e', E: '#17324a', W: '#ffffff' }, rows: mirrorRows([
    '.....KKK', '...KKbbb', '..Kbbbbb', '..KbbWEb', '.Kbbbbbo', '.Kbbbvvv', 'Kbbbbvvv', 'Kbbbbvvv', 'Kbbbbvvv', '.Kbbbvvv', '.Kbbbvvv', '..Kbbvvv', '..KKbbvv', '...KKKbb', '...ooo..', '..oooo..']) },
  cat: { name: 'ネコ', scale: 0.62, c: { K: '#5a3418', b: '#f0a95a', c: '#ffe8c7', p: '#f08fa0', n: '#e0607a', E: '#3a2410', W: '#ffffff' }, rows: mirrorRows([
    '.KK.....', '.KbpK...', '.KbbbKKK', 'Kbbbbbbb', 'Kbbbbbbb', 'KbbWEbbb', 'Kbbbbbbb', 'Kbbbbccn', '.Kbbbccc', '..KKbbbb', '..Kbbbbc', '..Kbbbcc', '..Kbbbcc', '..Kbbbbb', '..KcccK.', '..KKKKK.']) },
  dog: { name: 'イヌ', scale: 0.62, c: { K: '#4a2d17', b: '#c48a52', c: '#f6e3cb', d: '#7a4a26', n: '#2b2b2b', t: '#f06c7c', E: '#2b1a0c', W: '#ffffff' }, rows: mirrorRows([
    '..KKKKKK', '.Kbbbbbb', 'Kdbbbbbb', 'KddbWEbb', 'Kddbbbbb', 'Kddbbccc', '.Kdbcccn', '.Kdbcccc', '..KKccct', '...KKKKK', '..Kbbbcc', '..Kbbbcc', '..Kbbccc', '..KcccKK', '..KKKKK.', '........']) },
  parakeet: { name: 'インコ', scale: 0.62, c: { K: '#1f4d2a', y: '#ffe066', g: '#6fcf5a', l: '#3da34a', u: '#5aa7e6', o: '#f08a24', E: '#1f2a1f', W: '#ffffff' }, rows: mirrorRows([
    '....KKKK', '..KKyyyy', '.Kyyyyyy', '.KyyWEyy', 'Kyyyyyyo', 'Kyyuuyyo', '.Kyyyyyg', '.Kgggggg', 'Kgllgggg', 'Kgllgggg', 'Kgllgggg', '.Kglllgg', '..KKlggg', '...KKggg', '...Kooo.', '........']) }
};
function petSVG(px, cls, id) {
  const P = PETS[id || state.pet] || PETS.whale; const rows = P.rows; const C = P.c; const W = rows[0].length, H = rows.length; const w = Math.round(px * (id ? 1 : P.scale)); let r = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = row[x]; if (c === '.') continue; r += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + C[c] + '"' + (c === 'E' || c === 'W' ? ' class="eye"' : (c === 'w' && P === PETS.whale) ? ' class="spout"' : '') + '/>'; } });
  return '<svg class="' + (cls || '') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + w + '" height="' + Math.round(w * H / W) + '" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
}
const PET_LINES = ['今日もいっしょにがんばろ！', 'ふわぁ…ねむい…', 'BOX、何個いけそう？', 'なでなで、うれしい！', 'ちょっと休憩しよっか', '水のんだ？', 'その調子！', 'おなかすいた〜', '今日の予定、見てみる？',
  'イベントクエスト、やってみよ！', 'えへへ', 'がんばりすぎてない？', 'よく寝た？', '外の空気すいたいな', 'ゴールドで何買う？', 'ちいさな一歩でOK！', 'きみならできる！', 'のびーっ', 'ストレッチしよ！',
  '今週の目標、覚えてる？', 'ジャーナル書いた？', 'いい顔してる！', 'ぴょん！', 'つんつんしないで〜', 'きょうは何の日？', 'ぷしゅー！', '海っていいね〜', 'ぷかぷか…'];
function petLine() {
  const h = new Date().getHours(); const ctx = [];
  if (state.mp <= CFG.LOW_MP) ctx.push('MPが少ないよ…休もう？');
  if (h < 10) ctx.push('おはよう！'); if (h >= 22) ctx.push('そろそろ寝る時間だよ');
  if (urgentFor(state.day).some(q => !qDone(q.key))) ctx.push('緊急クエストが出てるよ！');
  const ew = eventWeek(state.day); if (ew.theme.seasonal) ctx.push(ew.theme.name + 'のイベント中だよ' + ew.theme.mark);
  if (!pendEmpty(state.pend)) ctx.push('今日の獲得、あとで確定してね');
  const pool = ctx.length && Math.random() < 0.5 ? ctx : PET_LINES;
  let t; do { t = pool[Math.floor(Math.random() * pool.length)]; } while (t === ui.petMsg && pool.length > 1);
  return t;
}

/* ---- ホーム ---- */
function viewHome() {
  if (ui.sub === 'skills') return '<div class="stack"><div><button class="btn sm" data-action="sub" data-v="">← ホームへ</button></div>' + viewSkills() + '</div>';
  const h = new Date().getHours(); const sky = h < 6 || h >= 19 ? 'night' : h < 10 ? 'morning' : h < 16 ? 'day' : 'evening';
  const cards = STATS.map(s => {
    const v = state.pts[s.id]; const sr = statRank(v);
    return '<div class="sc" style="--c:' + lc(s.id) + '"><span class="tag">' + s.id + '</span><span class="rkl' + (sr.label.length > 2 ? ' long' : '') + '">' + sr.label + '</span>' +
      '<span class="pt">' + fmt(v) + '</span>' + barHTML(sr.pct, lc(s.id)) + '<span class="nm">' + s.name + '</span></div>';
  }).join('');
  const free = state.sp - spentSP(state);
  const sk = SKILLS.filter(s => state.skills[s.id] > 0).map(s => '<button class="skchip' + (state.skills[s.id] >= 6 ? ' gold' : '') + '" data-action="pop" data-k="skill" data-id="' + s.id + '">' + s.name + ' <span class="num">Lv.' + state.skills[s.id] + '</span></button>').join('');
  const inv = Object.keys(state.inv).filter(id => state.inv[id] > 0).map(id => {
    const it = shopItems(state).find(x => x.id === id); if (!it) return '';
    return '<button class="tkt" data-action="pop" data-k="ticket" data-id="' + id + '"><span>' + esc(it.name) + '</span><b class="num">×' + state.inv[id] + '</b></button>';
  }).join('');
  const prog = (label, d, t, unit, src) => '<div class="prow"><div class="ph"><b>' + label + '</b><span class="num">' + d + ' / ' + t + (unit ? ' <small>' + unit + '</small>' : '') + '</span></div>' + barHTML(t ? d / t * 100 : 0, 'var(--accent)') + '<small>' + src + '</small></div>';
  const tE = dayEvents(state.day); const tP = tE.reduce((a, e) => a + e.boxes, 0); const tD = tE.reduce((a, e) => a + (e.done ? e.boxes : 0), 0);
  const wk = state.goals.week, mo = state.goals.month, yr = state.goals.year;
  return '<div class="stack">' +
    '<section class="stage sky-' + sky + '" aria-label="キャラ">' +
      (ui.petMsg ? '<div class="bubble" role="status">' + esc(ui.petMsg) + '</div>' : '') +
      '<button class="petbtn" data-action="pet" aria-label="キャラをタップ"><span class="petw"><span class="peti' + (ui.petJump ? ' jump' + (ui.petJump % 2) : '') + '">' + petSVG(112) + '</span></span></button>' +
      '<div class="sea" aria-hidden="true"></div><div class="ground" aria-hidden="true"></div></section>' +
    '<section class="sec"><h2 class="sh"><span class="shl">ステータス' + infoBtn('stats') + '</span></h2><div class="sgrid">' + cards + '</div></section>' +
    '<section class="sec"><h2 class="sh"><span class="shl">スキル' + infoBtn('hskill') + '</span><button class="plus" data-action="sub" data-v="skills" aria-label="スキル獲得画面へ">＋</button></h2>' +
      '<div class="spline">SP <b class="num">' + free + '</b> pt</div>' +
      '<div class="skchips">' + (sk || '<span class="note">まだ習得したスキルはありません。</span>') + '</div></section>' +
    '<section class="sec"><h2 class="sh"><span class="shl">チケット' + infoBtn('htkt') + '</span><button class="plus" data-action="tab" data-tab="shop" aria-label="券買所へ">＋</button></h2>' +
      '<div class="spline">所持ゴールド <b class="num" style="color:var(--gold)">' + fmt(state.gold) + '</b> G' + (state.pend.gold ? '<small>　(獲得予定 +' + fmt(state.pend.gold) + ' G)</small>' : '') + '</div>' +
      '<div class="tkts">' + (inv || '<span class="note">持っている券はありません。＋から券買所へ。</span>') + '</div></section>' +
    '<section class="sec"><h2 class="sh">達成度</h2>' +
      prog('今日', tD, tP, 'BOX', 'カレンダーの今日の予定から') +
      prog('今週', periodBoxes(state, wk).d, sumBoxes(wk), 'BOX', '今週の目標から') +
      prog('今月', periodBoxes(state, mo).d, sumBoxes(mo), 'BOX', '今月の目標から') +
      prog('今年', yr.items.filter(x => x.done).length, yr.items.length, '', yr.items.length ? '今年の目標の数から' : '今年の目標はゴールで作れます') +
    '</section>' +
    '<div class="fine"><small>試作用のデータで、ブラウザに保存されます。</small><button class="btn" data-action="reset">' + (ui.resetArm ? 'もう一度押すと最初の値に戻す' : '最初の値に戻す') + '</button></div>' +
  '</div>';
}
