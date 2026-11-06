/* ---- 省察の完了: 手書きの用紙(今週にすること)と同じ様式のPDFを作り、Google Driveの「週の目標・省察」に保存する ---- */
const DRIVE = 'Google Drive';
const WEEK_FOLDER = '1IgUsROcxOMUWwJ-MQ3O02PHoEdcMl2Md'; // 今週の目標・省察のPDFを入れているフォルダ
const MONTH_FOLDER = '16J7F8fe4D31teeB4nadnjadb-Irt3-aF'; // 今月の目標・省察のPDFを入れているフォルダ
const YEAR_FOLDER = '1dsft-KFvcgP2n8lBxyqnTdRlepOhX-kH'; // 今年の目標・省察のPDFを入れているフォルダ
function pdfName(gk, startISO) {
  if (gk === 'year') return '今年の目標・省察_' + startISO + '.pdf';
  const s = startISO.replace(/-/g, '');
  return gk === 'week' ? '今週の目標・省察_' + s + '.pdf' : '今月の目標・省察_' + s.slice(0, 6) + '.pdf';
}

/* 用紙の絵。もとの用紙(535×792pt)と同じ縦横比で、595×880の座標に描く */
const SW = 595, SH = 880, SS = 2.5;
const INK = '#1b1b1b', RED = '#d23a2e';
const FONT = '"Klee One","Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';
const EN_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const enDate = s => { const d = parseISO(s); return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '(' + EN_WD[d.getDay()] + ')'; };
function put(x, str, X, Y, size, color, o) {
  o = o || {}; let sz = size; x.textAlign = o.align || 'left'; x.fillStyle = color || INK;
  x.font = (o.weight || 400) + ' ' + sz + 'px ' + FONT;
  if (o.maxW) while (x.measureText(str).width > o.maxW && sz > 8) { sz -= 0.5; x.font = (o.weight || 400) + ' ' + sz + 'px ' + FONT; }
  x.fillText(str, X, Y);
}
function wrap(x, str, W, size) {
  x.font = '400 ' + size + 'px ' + FONT; const out = [];
  String(str).split('\n').forEach(p => { let cur = ''; for (const ch of p) { if (cur && x.measureText(cur + ch).width > W) { out.push(cur); cur = ch; } else cur += ch; } out.push(cur); });
  return out;
}
// 今週(今月)の目標と予定・実績。省察は ひとつ前の期間のもの
function sheetData(gk, key) {
  const g = state.goals[gk]; const rf = state.refl[key] || {};
  const evs = state.events.filter(e => inRange(e.date, g));
  const areas = g.areas.filter(a => a.name).map(a => ({ name: a.name, value: a.value, hours: areaBox(g, a) * 2 }));
  areas.forEach(a => { a.done = evs.filter(e => e.done && e.area === a.name).reduce((t, e) => t + e.boxes * 2, 0); });
  const idx = {}; areas.forEach((a, i) => { idx[a.name] = i + 1; });
  const cols = [];
  if (gk === 'week') for (let i = 0; i < 7; i++) { const d = addDays(g.start, i); const dt = parseISO(d); cols.push({ label: (dt.getMonth() + 1) + '/' + dt.getDate() + '(' + EN_WD[dt.getDay()].slice(0, 2) + ')', from: d, to: d }); }
  else for (let i = 0; i < 4; i++) { const dt = parseISO(addDays(g.start, i * 7)); cols.push({ label: '第' + (i + 1) + '週 ' + (dt.getMonth() + 1) + '/' + dt.getDate() + '〜', from: addDays(g.start, i * 7), to: addDays(g.start, i * 7 + 6) }); }
  cols.forEach(c => {
    const m = {}; evs.filter(e => e.date >= c.from && e.date <= c.to).forEach(e => { const k = e.area || '目標なし'; m[k] = m[k] || { name: k, n: idx[k] || 0, h: 0, all: true }; m[k].h += e.boxes * 2; if (!e.done) m[k].all = false; });
    c.rows = Object.keys(m).map(k => m[k]).sort((a, b) => a.n - b.n);
  });
  return { r: { start: g.start, end: g.end }, rf: rf, areas: areas, cols: cols, outcomes: g.outcomes || [], habits: g.habits || null, hunits: g.hunits || {}, perDay: g.perDay,
    totalBox: areas.reduce((t, a) => t + a.hours / 2, 0), doneBox: areas.reduce((t, a) => t + a.done / 2, 0) };
}
function drawSheet(gk, key) {
  const wk = gk === 'week'; const D = sheetData(gk, key);
  const c = document.createElement('canvas'); c.width = Math.round(SW * SS); c.height = Math.round(SH * SS);
  const x = c.getContext('2d'); x.scale(SS, SS); x.fillStyle = '#fff'; x.fillRect(0, 0, SW, SH); x.textBaseline = 'alphabetic';
  x.strokeStyle = INK; x.lineWidth = 1.4; x.lineCap = 'round';
  const L = (x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
  const B = (x1, y1, w, h) => { x.strokeRect(x1, y1, w, h); };
  // 枠
  L(0, 52, SW, 52); L(462, 52, 462, 445); L(462, 205, SW, 205); L(0, 268, SW, 268); L(212, 268, 212, 445); L(0, 445, SW, 445); L(0, 565, SW, 565); L(262, 565, 262, SH);
  put(x, wk ? '今週の目標' : '今月の目標', 18, 36, 24, INK);
  put(x, enDate(D.r.start) + ' ~ ' + enDate(D.r.end), SW - 12, 34, 12.5, INK, { align: 'right', maxW: 330 });
  // 予定Box
  put(x, '予定Box', 18, 80, 18, INK);
  const n = D.areas.length; const gap = Math.min(25, 150 / Math.max(1, n));
  D.areas.slice(0, 8).forEach((a, i) => {
    const y = 112 + i * gap; const sz = Math.min(15, gap * 0.62);
    put(x, String(i + 1), 24, y, sz + 1, INK);
    put(x, a.name + (a.value != null ? ' (' + a.value + ')' : ''), 42, y, sz, INK, { maxW: 130 });
    B(176, y - sz - 1, 40, sz + 8); put(x, a.hours + 'h', 196, y, sz, INK, { align: 'center' });
    put(x, a.done + 'h/' + a.hours + 'h', 232, y, sz + 1, RED, { weight: 600 });
  });
  put(x, '計 ' + D.totalBox + ' BOX', 250, 256, 16, INK);
  put(x, '(達成 ' + D.doneBox + ')', 352, 256, 13, RED, { weight: 600 });
  wrap(x, '()内は自身の価値観をどれだけ満たしているかを1〜10で評価', 118, 11).forEach((l, i) => put(x, l, 470, 80 + i * 19, 11, INK));
  put(x, D.perDay != null ? '1日 ' + D.perDay + 'BOX程度' : '1日 BOX程度', 472, 240, 12.5, INK);
  // 成果目標
  put(x, '成果目標', 18, 296, 18, INK);
  D.outcomes.slice(0, 6).forEach((o, i) => {
    const y = 330 + i * 28; put(x, '○ ' + o.t, 22, y, 13, INK, { maxW: 150 });
    if (o.done) put(x, '達成', 186, y, 13, RED, { weight: 600, align: 'center' });
  });
  if (!D.outcomes.length) put(x, '(控えなし)', 22, 330, 12, '#8a8a8a');
  // 日ごとの予定
  const cw = SW / D.cols.length;
  D.cols.forEach((col, i) => {
    if (i) L(cw * i, 445, cw * i, 565);
    put(x, col.label, cw * i + cw / 2, 466, wk ? 12 : 11, INK, { align: 'center', maxW: cw - 6 });
    const rows = col.rows.slice(0, 5); const g2 = Math.min(22, 84 / Math.max(1, rows.length));
    rows.forEach((r, j) => {
      const y = 492 + j * g2; const sz = Math.min(13, g2 * 0.62);
      put(x, r.n ? String(r.n) : '・', cw * i + 12, y, sz + 1, INK);
      B(cw * i + 28, y - sz - 1, Math.min(44, cw - 52), sz + 7); put(x, r.h + 'h', cw * i + 28 + Math.min(44, cw - 52) / 2, y, sz, INK, { align: 'center' });
      if (r.all) put(x, '✓', cw * i + 28 + Math.min(44, cw - 52) + 6, y, sz + 2, RED, { weight: 700 });
    });
  });
  L(0, 475, SW, 475);
  // やるべき習慣
  put(x, 'サブクエスト(習慣目標)', 18, 596, 16, INK);
  habList().slice(0, 6).forEach((h, i) => {
    const y = 632 + i * 34; const tg = D.habits ? D.habits[h[0]] : null; const act = D.rf.habits ? D.rf.habits[h[0]] : null;
    put(x, h[1], 18, y, 14, INK, { maxW: 112 });
    put(x, tg != null ? tg + ((D.hunits && D.hunits[h[0]]) || '回') + '/' + (wk ? 'w' : 'm') : '', 138, y, 13.5, INK);
    put(x, act != null && act !== '' ? act + '回/' + (wk ? 'w' : 'm') : '', 198, y, 14.5, RED, { weight: 600 });
  });
  // 省察
  put(x, '省察', 278, 596, 18, RED, { weight: 600 });
  let sz = 14; let lines = wrap(x, D.rf.text || '', 296, sz);
  while (lines.length * (sz * 1.55) > 190 && sz > 10) { sz -= 0.5; lines = wrap(x, D.rf.text || '', 296, sz); }
  const maxL = Math.floor(190 / (sz * 1.55));
  lines.slice(0, maxL).forEach((l, i) => put(x, i === maxL - 1 && lines.length > maxL ? l.slice(0, -1) + '…' : l, 278, 634 + i * sz * 1.55, sz, RED));
  put(x, '総合で', 360, 838, 15, RED); put(x, D.rf.score == null ? '—' : String(D.rf.score), 440, 842, 24, RED, { weight: 600 }); put(x, '点', 480, 838, 15, RED);
  return c;
}
const canvasJPEG = c => new Promise((ok, ng) => c.toBlob(b => b ? b.arrayBuffer().then(a => ok(new Uint8Array(a))) : ng(new Error('image')), 'image/jpeg', 0.92));
// JPEGの画像だけを並べた、最小のPDF(もとの用紙と同じ 535.4×792pt)
function jpegPDF(imgs) {
  const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0; const PWt = 535.4, PHt = 792;
  const wr = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const n = imgs.length; wr('%PDF-1.4\n');
  const obj = (id, fn) => { offs[id] = len; wr(id + ' 0 obj\n'); fn(); wr('\nendobj\n'); };
  obj(1, () => wr('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => wr('<< /Type /Pages /Kids [' + imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] /Count ' + n + ' >>'));
  imgs.forEach((im, i) => {
    const p = 3 + i * 3; const cs = 'q ' + PWt + ' 0 0 ' + PHt + ' 0 0 cm /Im0 Do Q';
    obj(p, () => wr('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PWt + ' ' + PHt + '] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>'));
    obj(p + 1, () => wr('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'));
    obj(p + 2, () => { wr('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.data.length + ' >>\nstream\n'); wr(im.data); wr('\nendstream'); });
  });
  const xr = len; const total = 3 + n * 3;
  wr('xref\n0 ' + total + '\n0000000000 65535 f \n');
  for (let i = 1; i < total; i++) wr(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  wr('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
  return new Blob(parts, { type: 'application/pdf' });
}
async function buildPDF(gk, key) {
  if (document.fonts && document.fonts.load) { try { await Promise.all([document.fonts.load('400 14px "Klee One"'), document.fonts.load('600 14px "Klee One"')]); } catch (e) {} }
  const c = gk === 'year' ? drawYearSheet(key) : drawSheet(gk, key);
  return jpegPDF([{ data: await canvasJPEG(c), w: c.width, h: c.height }]);
}
function blobToB64(b) {
  return new Promise((ok, ng) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => ng(r.error); r.readAsDataURL(b); });
}
async function driveSave(gk, blob, name) {
  const mcp = await window.claude.use('mcp');
  if (!mcp) throw { code: 'no_mcp', message: 'Google Driveにつなげませんでした。Claudeのアプリで開いているか確認してください。' };
  const folder = gk === 'week' ? WEEK_FOLDER : gk === 'month' ? MONTH_FOLDER : YEAR_FOLDER;
  let title = name;
  try {
    const r = await mcp.callTool(DRIVE, 'search_files', { query: "title = '" + name + "' and parentId = '" + folder + "'", pageSize: 1, excludeContentSnippets: true });
    if (r.payload && r.payload.files && r.payload.files.length) { const d = new Date(); title = name.replace(/\.pdf$/, '') + '_' + pad(d.getHours()) + pad(d.getMinutes()) + '.pdf'; }
  } catch (e) { if (e && (e.code === 'approval_required' || e.code === 'not_in_manifest' || e.code === 'server_not_connected' || e.code === 'needs_reauth')) throw e; }
  const lt = await mcp.listTools();
  let content;
  if (lt.fileArgs) content = { $file: { data: blob, name: title, type: 'application/pdf' } };
  else if (blob.size < 700000) content = await blobToB64(blob);
  else throw { code: 'too_large', message: 'PDFが大きすぎるため、Driveに直接は送れませんでした。「PDFを端末に保存」を使ってください。' };
  const r = await mcp.callTool(DRIVE, 'create_file', { title: title, parentId: folder, contentMimeType: 'application/pdf', disableConversionToGoogleType: true, base64Content: content }, { cache: false });
  const p = r.payload || {};
  return { name: title, url: p.viewUrl || (p.id ? 'https://drive.google.com/file/d/' + p.id + '/view' : '') };
}
const DRIVE_ERR = {
  approval_required: 'Google Driveへの保存が許可されていません。許可してから、もう一度押してください。',
  not_in_manifest: 'Google Driveへの保存が許可されていません。このページの権限で許可してください。',
  server_not_connected: 'Google Driveがつながっていません。claude.aiの設定でGoogle Driveを追加してください。',
  needs_reauth: 'Google Driveの接続の期限が切れています。claude.aiの設定でつなぎ直してください。',
  tool_error: 'Google Driveがエラーを返しました。もう一度お試しください。',
  server_unavailable: 'Google Driveに届きませんでした。少し待ってからもう一度押してください。'
};
async function runReflPDF(gk, key) {
  const rf = state.refl[key]; if (!rf) return;
  ui.pdf = { key: key, busy: true, err: '' }; render();
  try {
    const blob = await buildPDF(gk, key);
    const saved = await driveSave(gk, blob, pdfName(gk, gk === 'year' ? String(state.goals.year.year) : state.goals[gk].start));
    const n = clone(state); n.refl[key].saved = { name: saved.name, url: saved.url, at: Date.now() };
    ui.pdf = null; commit(n, 'Google Driveに保存しました');
  } catch (e) {
    ui.pdf = { key: key, busy: false, err: DRIVE_ERR[e && e.code] || (e && e.message) || 'PDFの保存に失敗しました。もう一度お試しください。' };
    render();
  }
}
async function downloadReflPDF(gk, key) {
  if (!state.refl[key]) return;
  try {
    const blob = await buildPDF(gk, key);
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (!dl) { ui.pdf = { key: key, busy: false, err: 'この表示では、端末への保存を使えません。' }; render(); return; }
    await dl.save({ filename: pdfName(gk, gk === 'year' ? String(state.goals.year.year) : state.goals[gk].start), data: blob });
  } catch (e) {
    if (e && e.code === 'declined') return;
    ui.pdf = { key: key, busy: false, err: (e && e.message) || 'PDFを作れませんでした。' }; render();
  }
}

/* 年の様式(週・月と同じ作りの用紙) */
function drawYearSheet(key) {
  const y = state.goals.year; const F = yearFacts(y); const rf = state.refl[key] || {};
  const c = document.createElement('canvas'); c.width = Math.round(SW * SS); c.height = Math.round(SH * SS);
  const x = c.getContext('2d'); x.scale(SS, SS); x.fillStyle = '#fff'; x.fillRect(0, 0, SW, SH); x.textBaseline = 'alphabetic';
  x.strokeStyle = INK; x.lineWidth = 1.4; x.lineCap = 'round';
  const L = (x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
  L(0, 52, SW, 52); L(0, 330, SW, 330); L(0, 565, SW, 565); L(300, 52, 300, 330); L(262, 565, 262, SH);
  put(x, '今年の目標', 18, 36, 24, INK); put(x, F.year + '年', SW - 12, 34, 14, INK, { align: 'right' });
  put(x, '成果目標', 18, 80, 18, INK);
  y.items.slice(0, 9).forEach((o, i) => { const yy = 112 + i * 24; put(x, '○ ' + o.t, 22, yy, 13, INK, { maxW: 220 }); if (o.done) put(x, '達成', 270, yy, 13, RED, { weight: 600, align: 'center' }); });
  if (!y.items.length) put(x, '(目標なし)', 22, 112, 12, '#8a8a8a');
  put(x, '月ごとのBOX', 318, 80, 18, INK);
  F.months.forEach((m, i) => { const yy = 106 + i * 18.5; put(x, (i + 1) + '月', 322, yy, 12.5, INK); put(x, m.d + ' / ' + m.p, 440, yy, 12.5, m.p && m.d >= m.p ? RED : INK, { align: 'right', weight: 600 }); });
  put(x, '計 ' + F.tp + ' BOX', 318, 322, 14, INK); put(x, '(達成 ' + F.td + ')', 420, 322, 13, RED, { weight: 600 });
  put(x, '1年の記録', 18, 358, 18, INK);
  [['サブクエスト(習慣)', F.sub + ' 回'], ['イベントクエスト', F.ev + ' 件'], ['緊急クエスト', F.ur + ' 件'], ['質(星)の平均', F.star ? F.star.toFixed(1) : '—']].forEach((r, i) => { put(x, r[0], 24, 396 + i * 34, 15, INK); put(x, r[1], 260, 396 + i * 34, 15, RED, { weight: 600, align: 'right' }); });
  put(x, '省察', 18, 596, 20, INK);
  let sz = 14; let lines = wrap(x, rf.text || '', 296, sz);
  while (lines.length * (sz * 1.55) > 190 && sz > 10) { sz -= 0.5; lines = wrap(x, rf.text || '', 296, sz); }
  const maxL = Math.floor(190 / (sz * 1.55));
  lines.slice(0, maxL).forEach((l, i) => put(x, l, 278, 594 + i * sz * 1.55, sz, RED));
  put(x, '総合で', 360, 838, 15, RED); put(x, rf.score == null ? '—' : String(rf.score), 440, 842, 24, RED, { weight: 600 }); put(x, '点', 480, 838, 15, RED);
  return c;
}
