/* ---- ドラッグ&ドロップ: 予定BOXのアイコン・予定のブロックを、長押ししてカレンダーへ ---- */
// マウスは少し動かすと、タッチは長押しすると、ドラッグが始まる(ふつうの縦スクロールを邪魔しない)
let DR = null; let lastDrag = 0;
const HOLD_MS = 260;
function dragSrc(el) {
  if (el.dataset.drag === 'icon') return { kind: 'icon', gk: el.dataset.gk, area: el.dataset.area };
  if (el.dataset.drag === 'sord') return { kind: 'sord', id: el.dataset.id };
  if (el.dataset.drag === 'oord') return { kind: 'oord', i: +el.dataset.i };
  if (el.dataset.drag === 'hord') return { kind: 'hord', id: el.dataset.id };
  if (el.dataset.drag === 'qord') return { kind: 'qord', gk: el.dataset.gk, i: +el.dataset.i };
  const e = state.events.find(x => x.id === el.dataset.id);
  if (!e || e.done) return null;
  return { kind: 'ev', id: e.id };
}
function dragBegin(el, x, y, touch) {
  const src = dragSrc(el); if (!src) return;
  const r = el.getBoundingClientRect();
  DR = { el: el, src: src, sx: x, sy: y, x: x, y: y, touch: touch, on: false, w: r.width, h: r.height, grab: src.kind === 'ev' ? (x - r.left) / Math.max(1, r.width) * ((state.events.find(q => q.id === src.id) || { boxes: 1 }).boxes * 120) : 0, hover: null, timer: null, scroll: null, tgt: null };
  if (touch) DR.timer = setTimeout(dragStart, HOLD_MS);
}
function dragStart() {
  if (!DR || DR.on) return;
  DR.on = true; clearTimeout(DR.timer);
  const g = DR.el.cloneNode(true); g.removeAttribute('data-drag'); g.removeAttribute('data-action'); g.classList.add('ghost');
  g.style.width = Math.max(DR.w, 40) + 'px'; g.style.height = Math.max(DR.h, 34) + 'px';
  document.body.appendChild(g); DR.ghost = g; DR.el.classList.add('dragging');
  document.body.classList.add('is-dragging');
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  document.body.classList.add('nosnap');
  DR.scroll = setInterval(() => {
    if (!DR || !DR.on) return;
    document.querySelectorAll('.calscroll').forEach(c => { const r = c.getBoundingClientRect(); if (DR.y < r.top || DR.y > r.bottom || DR.x < r.left || DR.x > r.right) return;
      if (DR.x < r.left + 70) c.scrollLeft -= 10; else if (DR.x > r.right - 30) c.scrollLeft += 10;
      if (DR.y < r.top + 40) c.scrollTop -= 8; else if (DR.y > r.bottom - 24) c.scrollTop += 8; });
    if (DR.y < 70) window.scrollBy(0, -14); else if (DR.y > window.innerHeight - 150) window.scrollBy(0, 14);
    dragTarget();
  }, 30);
  dragMove(DR.x, DR.y);
}
function dragFind() {
  if (!DR || !DR.on) return null;
  DR.ghost.style.visibility = 'hidden';
  const t = document.elementFromPoint(DR.x, DR.y);
  DR.ghost.style.visibility = '';
  if (!t) return null;
  const OK = { qord: ['qi', '[data-qi]'], oord: ['oi', '[data-oi]'], hord: ['hi', '[data-hi]'], sord: ['si', '[data-si]'] }[DR.src.kind];
  if (OK) {
    if (DR.src.kind === 'qord' && t.closest('[data-trash]')) return { trash: true, el: t.closest('[data-trash]') };
    const c = t.closest(OK[1]); if (!c) return null; const r = c.getBoundingClientRect();
    return { qi: c.dataset[OK[0]], after: DR.y > r.top + r.height / 2, el: c };
  }
  const row = t.closest('[data-row]');
  if (row) {
    const rect = row.getBoundingClientRect(); const mins = TL0 + (DR.x - rect.left) / rect.width * TLS;
    const boxes = DR.src.kind === 'icon' ? 1 : (state.events.find(x => x.id === DR.src.id) || { boxes: 1 }).boxes;
    const start = clampStart(DR.src.kind === 'icon' ? mins - 60 : mins - DR.grab, boxes);
    return { date: row.dataset.row, start: start, boxes: boxes, row: row };
  }
  const cell = t.closest('[data-dropdate]');
  if (cell) return { date: cell.dataset.dropdate, start: null, cell: cell };
  return null;
}
function dragTarget() {
  const tg = dragFind(); DR.tgt = tg;
  document.querySelectorAll('.tlp').forEach(n => n.remove());
  document.querySelectorAll('.drop-on,.ins-b,.ins-a').forEach(n => n.classList.remove('drop-on', 'ins-b', 'ins-a'));
  if (tg && (tg.trash || tg.qi != null)) { tg.el.classList.add(tg.trash ? 'drop-on' : tg.after ? 'ins-a' : 'ins-b'); return; }
  if (tg && tg.row) {
    const p = document.createElement('div'); p.className = 'tlp';
    p.style.left = pctX(tg.start) + '%'; p.style.width = (tg.boxes * 120 / TLS * 100) + '%';
    p.textContent = fmtT(tg.start); tg.row.appendChild(p);
  } else if (tg && tg.cell) tg.cell.classList.add('drop-on');
}
function dragMove(x, y) {
  DR.x = x; DR.y = y;
  const g = DR.ghost; g.style.left = (x - g.offsetWidth / 2) + 'px'; g.style.top = (y - g.offsetHeight / 2 - 24) + 'px';
  dragTarget();
}
function dragEnd(cancel) {
  if (!DR) return;
  const d = DR; DR = null; clearTimeout(d.timer); clearTimeout(d.hover); clearInterval(d.scroll);
  if (!d.on) return;
  lastDrag = Date.now();
  const tg = d.tgt; d.ghost.remove(); d.el.classList.remove('dragging');
  document.body.classList.remove('is-dragging'); document.body.classList.remove('nosnap');
  document.querySelectorAll('.tlp').forEach(n => n.remove());
  document.querySelectorAll('.drop-on,.ins-b,.ins-a').forEach(n => n.classList.remove('drop-on', 'ins-b', 'ins-a'));
  if (cancel || !tg) return;
  if (d.src.kind === 'oord') {
    const g = state.goals[ui.gk]; const o = g.outcomes[d.src.i]; if (!o || tg.qi == null) return;
    let to = +tg.qi + (tg.after ? 1 : 0); if (to > d.src.i) to -= 1; if (to === d.src.i) return;
    g.outcomes.splice(d.src.i, 1); g.outcomes.splice(to, 0, o); save(); render(); return;
  }
  if (d.src.kind === 'sord') {
    if (tg.qi == null || tg.qi === d.src.id) return;
    const ids = shopList().map(x => x.id); ids.splice(ids.indexOf(d.src.id), 1);
    const j = ids.indexOf(tg.qi); ids.splice(j + (tg.after ? 1 : 0), 0, d.src.id); state.shopOrder = ids; save(); render(); return;
  }
  if (d.src.kind === 'hord') {
    if (tg.qi == null || tg.qi === d.src.id) return;
    const ids = habList().map(h => h[0]); ids.splice(ids.indexOf(d.src.id), 1);
    const j = ids.indexOf(tg.qi); ids.splice(j + (tg.after ? 1 : 0), 0, d.src.id); state.habOrder = ids; save(); render(); return;
  }
  if (d.src.kind === 'qord') {
    const g = state.goals[d.src.gk]; if (!g) return; const ar = g.areas[d.src.i]; if (!ar) return;
    if (tg.trash) {
      if (ar.res) { toast('常駐クエストは消せません'); render(); return; }
      if (ar.locked) { toast('決定済みのクエストは消せません(決定を解除してください)'); render(); return; }
      g.areas.splice(d.src.i, 1); save(); render(); toast('「' + (ar.name || '新しいクエスト') + '」をゴミ箱に入れました'); return;
    }
    if (tg.qi == null) return;
    let to = +tg.qi + (tg.after ? 1 : 0); if (to > d.src.i) to -= 1;
    if (to === d.src.i) return;
    g.areas.splice(d.src.i, 1); g.areas.splice(to, 0, ar); save(); render(); toast('「' + (ar.name || '新しいクエスト') + '」を ' + (to + 1) + ' 番にしました'); return;
  }
  if (d.src.kind === 'icon') {
    const dist = distOf(d.src.area); if (!dist) { render(); toast('クエストの配分を決定してから置けます'); return; }
    const n = addEvent(state, { date: tg.date, start: tg.start, gk: d.src.gk, area: d.src.area, alloc: allocFromDist(dist) });
    const ev = n.events[n.events.length - 1];
    commit(n, jp(tg.date) + ' ' + fmtT(ev.start) + ' に「' + d.src.area + '」を入れました');
  } else {
    const e = state.events.find(x => x.id === d.src.id); if (!e || e.done) return;
    const start = tg.start != null ? tg.start : e.start;
    const n = moveEvent(state, e.id, tg.date, start);
    commit(n, jp(tg.date) + ' ' + fmtT(clampStart(start, e.boxes)) + ' に動かしました');
  }
}
document.addEventListener('mousedown', e => {
  if (e.button !== 0) return; const el = e.target.closest('[data-drag]'); if (!el) return;
  dragBegin(el, e.clientX, e.clientY, false);
});
document.addEventListener('mousemove', e => {
  if (!DR || DR.touch) return;
  if (!DR.on) { if (Math.hypot(e.clientX - DR.sx, e.clientY - DR.sy) > 5) { DR.x = e.clientX; DR.y = e.clientY; dragStart(); } return; }
  e.preventDefault(); dragMove(e.clientX, e.clientY);
});
document.addEventListener('mouseup', () => { if (DR && !DR.touch) dragEnd(false); });
document.addEventListener('touchstart', e => {
  if (DR) return; const el = e.target.closest('[data-drag]'); if (!el || e.touches.length !== 1) return;
  dragBegin(el, e.touches[0].clientX, e.touches[0].clientY, true);
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!DR || !DR.touch) return; const t = e.touches[0];
  if (!DR.on) { if (Math.hypot(t.clientX - DR.sx, t.clientY - DR.sy) > 10) { clearTimeout(DR.timer); DR = null; } return; }
  e.preventDefault(); dragMove(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchend', () => { if (DR && DR.touch) dragEnd(false); });
document.addEventListener('touchcancel', () => { if (DR && DR.touch) dragEnd(true); });
document.addEventListener('contextmenu', e => { if (e.target.closest('[data-drag]')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && DR && DR.on) dragEnd(true); });
document.addEventListener('click', e => { if (Date.now() - lastDrag < 400 && e.target.closest && e.target.closest('summary[data-drag]')) e.preventDefault(); }, true);
