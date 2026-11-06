/* ---- 操作 ---- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function findQuest(key, date) {
  const all = subFor(date).concat(urgentFor(date), eventWeek(date).quests);
  return all.find(q => q.key === key);
}
document.addEventListener('click', e => {
  if (Date.now() - lastDrag < 400) return;
  const el = e.target.closest('[data-action]');
  if (ui.menu && !e.target.closest('.hd') && !e.target.closest('.menu')) { ui.menu = false; if (!el) { render(); return; } }
  if (!el) return;
  const a = el.dataset.action; const g = state.goals[ui.gk];
  if (a === 'tab') { ui.tab = el.dataset.tab; ui.sub = null; ui.menu = false; ui.resetArm = false; ui.wedit = false; ui.pop2 = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'sub') { ui.tab = 'home'; ui.sub = el.dataset.v || null; ui.menu = false; ui.pop2 = null; render(); window.scrollTo(0, 0); return; }
  if (a === 'wgedit') { ui.wgEdit = !ui.wgEdit; render(); return; }
  if (a === 'wgadd') { wgPlaced().push({ id: 'w' + newId(), t: el.dataset.t }); save(); render(); toast(WG_CAT[el.dataset.t].size + '・' + WG_CAT[el.dataset.t].name + ' を置きました'); return; }
  if (a === 'wgdel') { state.wgp.list = wgPlaced().filter(w => w.id !== el.dataset.id); save(); render(); return; }
  if (a === 'wgmv') { const L = wgPlaced(); const i = L.findIndex(w => w.id === el.dataset.id); const j = i + (+el.dataset.d); if (i < 0 || j < 0 || j >= L.length) return; const t = L[i]; L[i] = L[j]; L[j] = t; save(); render(); return; }
  if (a === 'wcv') { ui.wcv = el.dataset.v; render(); return; }
  if (a === 'theme') { state.theme = el.dataset.v; applyTheme(); save(); render(); return; }
  if (a === 'wks') {
    const v = +el.dataset.v; if (v === WKS) return;
    WKS = v; state.wkStart = v; const ws0 = sundayOf(state.day);
    state.goals.week.start = ws0; state.goals.week.end = addDays(ws0, 6); ui.wk = ws0; ui.calJump = true; ui.calPos = {};
    save(); render(); toast('1週間の始まりを' + WD[v] + '曜にしました'); return;
  }
  if (a === 'menu') { ui.menu = !ui.menu; render(); return; }
  if (a === 'reset') {
    if (!ui.resetArm) { ui.resetArm = true; render(); return; }
    ui.resetArm = false; ui.patch = null; ui.questions = null; ui.draft = {}; ui.pop2 = null;
    { const s0 = seedState(iso(new Date())); commit(s0, '最初の値に戻しました'); } return;
  }
  if (a === 'noticeok') { const n = clone(state); n.notices.forEach(x => { x.read = true; }); commit(n); return; }
  if (a === 'noticeskill') { const n = clone(state); n.notices.forEach(x => { x.read = true; }); ui.tab = 'home'; ui.sub = 'skills'; commit(n); window.scrollTo(0, 0); return; }
  if (a === 'pet') { ui.petMsg = petLine(); ui.petJump++; render(); return; }

  /* ポップアップ */
  if (a === 'pop') {
    const k = el.dataset.k;
    if (k === 'add') { const ar = goalAreas()[0]; ui.pop2 = { k: 'add', area: ar ? ar.name : '', name: '', stat: ar && ar.stats[0] ? ar.stats[0] : 'INT', boxes: 1, date: inRange(state.day, { start: ui.wk, end: addDays(ui.wk, 6) }) ? state.day : ui.wk, time: '09:00', tag: '', memo: '' }; }
    else if (k === 'ticket') ui.pop2 = { k: 'ticket', id: el.dataset.id, n: 1 };
    else ui.pop2 = { k: k, id: el.dataset.id, star: 3 };
    render(); return;
  }
  if (a === 'popclose') { ui.pop2 = null; render(); return; }
  if (a === 'pstar') { if (ui.pop2) { ui.pop2.star = +el.dataset.v; render(); } return; }
  if (a === 'pset') { if (ui.pop2) { const f = el.dataset.f; ui.pop2[f] = f === 'stat' ? el.dataset.v : +el.dataset.v; render(); } return; }
  if (a === 'report') {
    const p = ui.pop2; if (!p) return;
    const n = completeEvent(state, p.id, p.star || 3); if (n === state) return;
    const ne = n.events.find(x => x.id === p.id); ui.pop2 = null;
    commit(n, '達成報告 ★' + ne.star + '  +' + fmt(ne.xp) + ' Pt  +' + fmt(ne.g) + ' G(獲得予定)'); return;
  }
  if (a === 'undoev') { commit(undoEvent(state, el.dataset.id), '達成を取り消しました'); return; }
  if (a === 'delev') {
    const p = ui.pop2; if (!p) return;
    if (!p.del) { p.del = true; render(); return; }
    const ev = state.events.find(x => x.id === p.id); const n = deleteEvent(state, p.id); if (n === state) return;
    if (ev && ev.gcal && ev.gcal.id) n.gcalDel = (n.gcalDel || []).concat(ev.gcal.id);
    ui.pop2 = null; commit(n, '予定を削除しました'); return;
  }
  if (a === 'addev') {
    const p = ui.pop2; if (!p || !DATE_RE.test(p.date || '')) return;
    const name = p.area || String(p.name || '').trim(); if (!name) { toast('クエスト名を入れてください'); return; }
    const n = addEvent(state, { date: p.date, start: toMin(p.time), gk: p.area ? 'week' : null, area: name, alloc: { [p.stat]: p.boxes } });
    const ev = n.events[n.events.length - 1]; if (p.tag) ev.tag = String(p.tag).slice(0, 20); if (p.memo) ev.memo = String(p.memo).slice(0, 200);
    ui.pop2 = null; ui.wk = sundayOf(p.date); commit(n, md2(p.date) + ' ' + fmtT(ev.start) + ' に入れました'); return;
  }
  if (a === 'useticket') {
    const p = ui.pop2; if (!p) return; const it = shopItems(state).find(x => x.id === p.id);
    const n = settleUse(state, { [p.id]: p.n || 1 }); if (n === state) return;
    ui.pop2 = { k: 'used', name: it.name, n: p.n || 1, mp: n.mp - state.mp }; commit(n); return;
  }
  if (a === 'closeyes') {
    const before = state; const pe = clone(state.pend);
    const n = flushDay(state, state.day, false); commit(n);
    ui.pop2 = { k: 'cele', pts: pe.pts, gold: pe.gold || 0, sp: state.sp - before.sp }; render(); return;
  }

  /* 週の切り替え・Googleカレンダー */
  if (a === 'wkprev' || a === 'wknext') { ui.wk = addDays(ui.wk, a === 'wknext' ? 7 : -7); ui.calJump = true; render(); return; }
  if (a === 'wktoday') { ui.wk = sundayOf(state.day); ui.calJump = true; render(); return; }
  if (a === 'cv') { ui.cv = el.dataset.v; if (ui.cv === 'month') ui.mon = addDays(ui.wk, 3).slice(0, 7); else ui.calJump = true; render(); return; }
  if (a === 'monprev' || a === 'monnext') { const p = ui.mon.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + (a === 'monnext' ? 1 : -1), 1); ui.mon = d.getFullYear() + '-' + pad(d.getMonth() + 1); render(); return; }
  if (a === 'mday') { ui.cv = 'week'; ui.wk = sundayOf(el.dataset.d); ui.calJump = true; render(); return; }
  if (a === 'zoom') { calSave(); ui.zoom = clampN(ui.zoom + (+el.dataset.d), 0, ZOOMS.length - 1); render(); return; }
  if (a === 'gcal') { gcalSync(); return; }

  /* クエスト */
  if (a === 'qv') { ui.qv = el.dataset.v; render(); return; }
  if (a === 'qtog') {
    const key = el.dataset.key; const date = el.dataset.date;
    if (qDone(key)) { const n = undoQuest(state, key); if (n !== state) commit(n, '取り消しました'); return; }
    const q = findQuest(key, date); if (!q) return;
    const n = doQuest(state, q, date); if (n === state) return;
    const got = n.log.filter(x => x.qk === key)[0]; const bonus = q.kind === 'event' && n.log.some(x => x.qk === 'evb:' + key.split(':')[1]) && !state.log.some(x => x.qk === 'evb:' + key.split(':')[1]);
    commit(n, q.t + '  +' + got.xp + ' Pt' + (got.g ? ' +' + got.g + ' G' : '') + (bonus ? '  コンプリート +' + QV.bonus + ' G！' : '')); return;
  }

  /* レコード */
  if (a === 'wedit') { ui.wedit = !ui.wedit; render(); return; }
  if (a === 'wmv') { const i = +el.dataset.i; const j = i + (+el.dataset.d); const w = state.widgets.filter(k => WIDGETS[k]); if (j < 0 || j >= w.length) return; const t = w[i]; w[i] = w[j]; w[j] = t; state.widgets = w; save(); render(); return; }
  if (a === 'wdel') { state.widgets = state.widgets.filter(k => k !== el.dataset.k); save(); render(); return; }
  if (a === 'wadd') { state.widgets.push(el.dataset.k); save(); render(); return; }
  if (a === 'talkopen') { ui.talkOpen = true; ui.jerr = ''; render(); const ta = document.querySelector('[data-ui="talk"]'); if (ta) ta.focus(); return; }
  if (a === 'talkclose') { if (ui.rec && recog) recog.stop(); ui.talkOpen = false; render(); return; }
  if (a === 'mic') { micToggle(); return; }
  if (a === 'jsum') { journalSummarize(); return; }
  if (a === 'mdsave') { saveDailyNote(); return; }

  /* ショップ */
  if (a === 'sh') { ui.sh = el.dataset.v; render(); return; }
  if (a === 'buy') { const it = shopItems(state).find(x => x.id === el.dataset.id); const n = buyItem(state, el.dataset.id); if (n !== state) commit(n, '「' + it.name + '」を買いました'); return; }
  if (a === 'openitem') { ui.addItem = true; render(); return; }
  if (a === 'cancelitem') { ui.addItem = false; render(); return; }
  if (a === 'additem') {
    const n = addCustomItem(state, ui.ni);
    if (n === state) { toast('券の名前を入れてください'); return; }
    ui.addItem = false; ui.ni = { name: '', cat: '', g: 500, mp: 20, stat: 'INT', pt: 0 }; commit(n, '券を追加しました'); return;
  }
  if (a === 'shopedit') { ui.shopEdit = !ui.shopEdit; ui.addItem = false; render(); return; }
  if (a === 'delitem') {
    const id = el.dataset.id; const it = shopItems(state).find(x => x.id === id); if (!it) return;
    if (state.inv[id] > 0) { toast('持っている券は消せません(先に使ってください)'); return; }
    if (it.custom) { commit(delCustomItem(state, id), '消しました'); return; }
    state.shopHide = (state.shopHide || []).concat(id); save(); render(); toast('消しました'); return;
  }

  /* スキル */
  if (a === 'lvup' || a === 'lvdn') {
    const id = el.dataset.id; const d = ui.draft[id] || 0; const free = state.sp - spentSP(state) - draftTotal(ui.draft);
    if (a === 'lvup') { if (free <= 0 || state.skills[id] + d >= 10) return; ui.draft[id] = d + 1; }
    else { if (d <= 0) return; if (d === 1) delete ui.draft[id]; else ui.draft[id] = d - 1; }
    render(); return;
  }
  if (a === 'skcommit') { const n = commitSkills(state, ui.draft); if (n === state) return; ui.draft = {}; commit(n, 'スキルを決定しました'); return; }

  /* ゴール */
  if (a === 'gv') { ui.gv = el.dataset.v; render(); return; }
  if (a === 'reflsum') { reflAI('sum'); return; }
  if (a === 'reflscore') { reflAI('score'); return; }
  if (a === 'reflauto') { const key = reflKey(ui.gk, state.goals[ui.gk]); const rf = state.refl[key] || (state.refl[key] = { text: '', score: null, done: false }); const h = questEval(ui.gk, state.goals[ui.gk]).hint; if (h != null && !rf.done) { rf.score = h; save(); render(); } return; }
  if (a === 'gk') { ui.gk = el.dataset.v; ui.patch = null; ui.questions = null; ui.err = ''; render(); return; }
  if (a === 'yadd') { const t = String(ui.newYear || '').trim(); if (!t) return; state.goals.year.items.push({ t: t.slice(0, 60), done: false }); ui.newYear = ''; save(); render(); return; }
  if (a === 'ytick') { const o = state.goals.year.items[+el.dataset.i]; if (o) { o.done = !o.done; save(); render(); if (o.done) toast('今年の目標をひとつ達成！'); } return; }
  if (a === 'ydel') { state.goals.year.items.splice(+el.dataset.i, 1); save(); render(); return; }
  if (a === 'deltoggle') { ui.delMode = !ui.delMode; render(); if (ui.delMode) toast('消したいクエストの×を押すか、見出しをゴミ箱へドラッグ'); return; }
  if (a === 'micf') { micField(el); return; }
  if (a === 'trayadd') { ui.trayAdd = !ui.trayAdd; render(); return; }
  if (a === 'trayput') {
    const n = el.dataset.name; const gw = state.goals.week; if (gw.areas.some(x => x.name === n)) return;
    const src = state.goals.month.areas.find(x => x.name === n); const dist = src ? clone(src.dist) : fullDist(state.qlib && state.qlib[n]);
    const ar = mkArea(n, src ? src.value : 5, dist, src ? { want: src.want, work: src.work } : {}); gw.areas.push(ar); ui.trayAdd = false; save(); render(); toast('「' + n + '」を今週の目標に足しました'); return;
  }
  if (a === 'aww') { const gg = state.goals[ui.gk]; const ar = gg.areas[+el.dataset.i]; if (ar && !ar.locked) { if (el.dataset.k === 'want') ar.want = el.dataset.v; else ar.work = el.dataset.v === '1'; save(); render(); } return; }
  if (a === 'hrestore') { const id = el.dataset.id; state.habHide = (state.habHide || []).filter(x => x !== id); const gg = state.goals[ui.gk]; if (gg && !gg.habits[id]) gg.habits[id] = 1; save(); render(); return; }
  if (a === 'gedit') { ui.ge[el.dataset.k] = !ui.ge[el.dataset.k]; render(); return; }
  if (a === 'hadd') { const id = 'h' + newId(); state.hab = state.hab || []; state.hab.push({ id: id, name: '', dist: emptyDist() }); if (g) g.habits[id] = 1; ui.edH = id; save(); render(); return; }
  if (a === 'hedit') { ui.edH = el.dataset.id; render(); return; }
  if (a === 'hok') {
    const id = el.dataset.id; const c = (state.hab || []).find(h => h.id === id);
    if ((c && !String(c.name || '').trim()) || distSum(habDist(id)) !== DIST_TOTAL.h) { toast('名前と、' + DIST_TOTAL.h + 'ptの配分を決めてください'); return; }
    ui.edH = null; save(); render(); toast('習慣を決定しました'); return;
  }
  if (a === 'hdel') { const id = el.dataset.id; if (HAB.some(h => h[0] === id)) { state.habHide = state.habHide || []; if (state.habHide.indexOf(id) < 0) state.habHide.push(id); } state.hab = (state.hab || []).filter(h => h.id !== id); Object.keys(state.goals).forEach(k => { if (state.goals[k].habits) delete state.goals[k].habits[id]; }); if (ui.edH === id) ui.edH = null; save(); render(); return; }
  if (a === 'dst') {
    const [kd, key, st] = el.dataset.ds.split(':'); const d = distRef(kd, key); if (!d) return;
    const tot = DIST_TOTAL[kd]; const v = (Number(d[st]) || 0) + (+el.dataset.d);
    if (v < 0 || distSum(d) - (Number(d[st]) || 0) + v > tot) return;
    d[st] = v; save(); render(); return;
  }
  if (a === 'qout') { tickOutcome(el.dataset.k, +el.dataset.i); return; }
  if (!g) return;
  if (a === 'addarea') { const ar = mkArea('', 5, {}); ar.ed = true; g.areas.push(ar); ui.qo[ar.id] = true; save(); render(); return; }
  if (a === 'delarea') { const ar = g.areas[+el.dataset.i]; if (ar && ar.res) { toast('常駐クエストは消せません'); return; } if (ar && !ar.locked) { g.areas.splice(+el.dataset.i, 1); save(); render(); toast('クエストを消しました'); } return; }
  if (a === 'aedit') { const ar = g.areas[+el.dataset.i]; if (ar && !ar.locked) { ar.ed = true; ui.qo[ar.id] = true; render(); } return; }
  if (a === 'aok') {
    const ar = g.areas[+el.dataset.i]; if (!ar) return;
    if (!String(ar.name || '').trim() || distSum(ar.dist) !== DIST_TOTAL.a) { toast('名前と、' + DIST_TOTAL.a + 'ptの配分を決めてください'); return; }
    ar.ed = false; state.qlib = state.qlib || {}; state.qlib[ar.name.trim()] = clone(ar.dist); save(); render(); toast('「' + ar.name + '」を決定しました'); return;
  }
  if (a === 'addout') { g.outcomes.push({ id: 'o' + newId(), t: '', done: false, locked: false, dist: emptyDist(), ed: true }); save(); render(); return; }
  if (a === 'oedit') { const o = g.outcomes[+el.dataset.i]; if (o && !o.locked) { o.ed = true; render(); } return; }
  if (a === 'ook') {
    const o = g.outcomes[+el.dataset.i]; if (!o) return;
    if (!String(o.t || '').trim() || distSum(o.dist) !== DIST_TOTAL.o) { toast('成果目標の名前と、' + DIST_TOTAL.o + 'ptの配分を決めてください'); return; }
    o.ed = false; save(); render(); toast('成果目標を決定しました'); return;
  }
  if (a === 'delout') { const o = g.outcomes[+el.dataset.i]; if (o && o.locked) { toast('決定済みです(決定を解除すると消せます)'); return; } if (o) { g.outcomes.splice(+el.dataset.i, 1); save(); render(); } return; }
  if (a === 'advice') { ui.adv = pickAdvice(); ui.advPop = true; render(); ui.advPop = false; return; }
  if (a === 'tickout') { tickOutcome(el.dataset.gk || ui.gk, +el.dataset.i); return; }
  if (a === 'outinc' || a === 'outdec') {
    const gk = el.dataset.gk || 'week'; const o = state.goals[gk].outcomes[+el.dataset.i]; if (!o) return;
    const n = Number(o.n) || 1;
    if (a === 'outinc') { o.v = Math.min(n, (Number(o.v) || 0) + 1); if (o.v >= n && !o.done) { tickOutcome(gk, +el.dataset.i); return; } }
    else { if (!(o.v > 0)) return; o.v = Math.max(0, o.v - 1); if (o.done && o.v < n) { tickOutcome(gk, +el.dataset.i); return; } }
    save(); render(); return;
  }
  if (a === 'subinc') {
    const hk = el.dataset.hk; const ws = sundayOf(state.day);
    for (let d = state.day; d >= ws; d = addDays(d, -1)) { const q = subFor(d).find(x => x.hk === hk); if (!q || qDone(q.key)) continue;
      const n = doQuest(state, q, d); if (n !== state) commit(n, q.t + ' +1回  +' + n.log.filter(x => x.qk === q.key)[0].xp + ' Pt'); return; }
    toast('今週は毎日つけ終わっています'); return;
  }
  if (a === 'subdec') {
    const hk = el.dataset.hk; const ws = sundayOf(state.day);
    const e = state.log.filter(x => x.kind === 'sub' && x.hk === hk && x.date >= ws && !x.fin).sort((x, y) => x.date < y.date ? 1 : -1)[0];
    if (!e) { toast('取り消せる記録がありません'); return; } const n = undoQuest(state, e.qk); if (n !== state) commit(n, '1回へらしました'); return;
  }
  if (a === 'aval') { const ar = g.areas[+el.dataset.i]; if (!ar || ar.locked) return; ar.value = clampN((Number(ar.value) || 5) + (+el.dataset.d), 1, 10); save(); render(); return; }
  if (a === 'decide') {
    g.areas = g.areas.filter(x => x.locked || (x.name && x.name.trim()));
    g.outcomes = g.outcomes.filter(x => x.locked || (x.t && x.t.trim()));
    if (g.areas.some(x => !x.locked && (x.ed || distSum(x.dist) !== DIST_TOTAL.a)) || g.outcomes.some(x => !x.locked && (x.ed || distSum(x.dist) !== DIST_TOTAL.o))) { save(); render(); toast('配分が終わっていない項目があります。各項目の「決定」を押してください'); return; }
    g.areas.forEach(x => { x.locked = true; }); g.outcomes.forEach(x => { x.locked = true; });
    snapGoal(ui.gk); save(); render(); toast((ui.gk === 'week' ? '今週' : '今月') + 'の目標を決定しました'); return;
  }
  if (a === 'undecide') { g.areas.forEach(x => { x.locked = false; }); g.outcomes.forEach(x => { x.locked = false; }); save(); render(); toast('決定を解除しました'); return; }
  if (a === 'nextperiod') { finalGoal(ui.gk); state.goals[ui.gk] = nextPeriod(g, ui.gk === 'week' ? 7 : 28); ui.pdf = null; save(); render(); toast((ui.gk === 'week' ? '次の週' : '次の月') + 'を始めました'); return; }
  /* 省察: 完了すると採点に応じたゴールド(週 点×10G・月 点×30G)が入り、PDFをDriveに保存 */
  if (a === 'reflcomplete') {
    const key = reflKey(ui.gk, g); const rf = state.refl[key];
    if (!rf || !String(rf.text || '').trim() || rf.score == null || rf.done) return;
    const n = clone(state); const bonus = (rf.score || 0) * (ui.gk === 'week' ? 10 : ui.gk === 'month' ? 30 : 100);
    n.refl[key] = Object.assign({}, rf, { done: true, doneAt: Date.now(), gold: bonus }); n.gold += bonus;
    ui.pdf = null; commit(n, '省察を完了しました' + (bonus ? '  +' + fmt(bonus) + ' G' : '')); return;
  }
  if (a === 'reflretry') { runReflPDF(ui.gk, reflKey(ui.gk, g)); return; }
  if (a === 'reflsave') { downloadReflPDF(ui.gk, reflKey(ui.gk, g)); return; }

  /* 連携 */
  if (a === 'hread') { commit(applyHealth(state, ui.h), 'エナジースコアを反映しました'); return; }
  if (a === 'hunread') { commit(applyHealth(state, { energy: null, steps: null, sleep: null }), '読み取れなかった日にしました(MP 60)'); return; }
  if (a === 'nconnect') { const n = clone(state); n.notion.on = true; commit(n, 'Notionに接続しました(試作)'); return; }
  if (a === 'nsave') { const n = clone(state); n.notion.log.unshift(buildRecord(n)); n.notion.log = n.notion.log.slice(0, 7); commit(n, '今日の行を保存しました(試作)'); return; }
});
document.addEventListener('change', e => {
  const el = e.target; const d = el.dataset || {};
  if (d.chg === 'evmove') {
    const ev = state.events.find(x => x.id === d.id); if (!ev || ev.done) return;
    const date = d.k === 'date' ? el.value : ev.date; const start = d.k === 'time' ? toMin(el.value) : ev.start;
    if (!DATE_RE.test(date) || (d.k === 'time' && !el.value)) { render(); return; }
    ui.wk = sundayOf(date); commit(moveEvent(state, ev.id, date, start)); return;
  }
  if (d.p === 'area' && ui.pop2) { ui.pop2.area = el.value; const ar = goalAreas().find(x => x.name === el.value); if (ar && ar.stats[0]) ui.pop2.stat = ar.stats[0]; render(); return; }
  if (d.ds) { render(); return; }
  if (d.ou != null) { const gg = state.goals[ui.gk]; const o = gg.outcomes[+d.ou]; if (o) { o.u = el.value; save(); } return; }
  if (d.hu) { const gg = state.goals[ui.gk]; gg.hunits = gg.hunits || {}; gg.hunits[d.hu] = el.value; save(); return; }
  if (d.f && /^areas\.\d+\.name$/.test(d.f)) {
    const ar = state.goals[ui.gk].areas[+d.f.split('.')[1]]; const nm = String(ar.name || '').trim(); const lib = state.qlib && state.qlib[nm];
    if (ar && ar.ed && lib && distSum(ar.dist) === 0) { ar.dist = fullDist(lib); save(); render(); toast('同じクエストの配分を引き継ぎました'); }
    return;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (ui.pop2) { ui.pop2 = null; render(); } else if (ui.menu) { ui.menu = false; render(); } } });
document.addEventListener('input', e => {
  const el = e.target; const d = el.dataset || {};
  if (d.rf) {
    const key = reflKey(ui.gk, state.goals[ui.gk]);
    const rf = state.refl[key] || (state.refl[key] = { text: '', score: null, done: false });
    if (rf.done) return;
    if (d.rf === 'score') rf.score = el.value === '' ? null : clampInt(el.value, 0, 100, null); else rf.text = el.value;
    save();
    const has = !!String(rf.text || '').trim(); const set = (act, off) => { const b = document.querySelector('[data-action="' + act + '"]'); if (b) b.disabled = off; };
    set('reflsum', !has || !ui.sample || !!ui.rbusy); set('reflscore', !has || !ui.sample || !!ui.rbusy); set('reflretry', !has); set('reflsave', !has); set('reflcomplete', !has || rf.score == null);
  } else if (d.rv != null) {
    const key = reflKey(ui.gk, state.goals[ui.gk]);
    const rf = state.refl[key] || (state.refl[key] = { text: '', score: null, done: false });
    if (rf.done) return; rf.vals = rf.vals || {}; rf.vals[d.rv] = el.value === '' ? null : clampInt(el.value, 1, 10, null); save();
  } else if (d.jn) {
    const j = state.journal[state.day] || (state.journal[state.day] = {}); j.text = el.value; save();
  } else if (d.ds) {
    const [kd, key, st] = d.ds.split(':'); const dd = distRef(kd, key); if (!dd) return; const tot = DIST_TOTAL[kd];
    const others = distSum(dd) - (Number(dd[st]) || 0); const v = Math.min(Number(el.value) || 0, tot - others);
    if (+el.value !== v) el.value = v; dd[st] = v; save();
    const box = el.closest('.dse'); const sum = distSum(dd); box.querySelector('.dsum').className = 'dsum' + (sum === tot ? ' ok' : '');
    box.querySelector('.dsum').innerHTML = 'ステータスの配分　合計 <b class="num">' + sum + '</b> / ' + tot + ' pt<small>' + (sum < tot ? '(あと ' + (tot - sum) + ')' : '(OK)') + '</small>';
    el.parentNode.querySelector('.dsn').textContent = v;
    const ok = box.parentNode.querySelector('[data-action="aok"],[data-action="ook"],[data-action="hok"]'); if (ok) ok.disabled = sum !== tot || !(box.parentNode.querySelector('input[type=text]') ? box.parentNode.querySelector('input[type=text]').value.trim() : true);
  } else if (d.hn) {
    const c = (state.hab || []).find(h => h.id === d.hn); if (c) { c.name = el.value; save(); const w = el.closest('.oed'); const b = w && w.querySelector('[data-action="hok"]'); const sm = w && w.querySelector('.dsum'); if (b && sm) b.disabled = !(sm.classList.contains('ok') && el.value.trim()); }
  } else if (d.y != null) {
    const o = state.goals.year.items[+d.y]; if (o) { o.t = el.value; save(); }
  } else if (d.p && ui.pop2 && d.p !== 'area') {
    ui.pop2[d.p] = el.value;
  } else if (d.f) {
    let v = el.value;
    if (d.t === 'n') { v = v === '' ? 0 : Number(v); if (isNaN(v)) return; }
    setPath(state.goals[ui.gk], d.f, v); save(); updateTotals();
    if (/\.(name|t)$/.test(d.f)) { const w = el.closest('.qbody, .oed'); const b = w && w.querySelector('[data-action="aok"],[data-action="ook"]'); const sm = w && w.querySelector('.dsum'); if (b && sm) b.disabled = !(sm.classList.contains('ok') && String(v).trim()); }
  } else if (d.ui) {
    let v = el.value;
    if (d.t === 'n') { v = v === '' ? null : Number(v); if (v !== null && isNaN(v)) return; }
    setPath(ui, d.ui, v);
  }
});
document.addEventListener('toggle', e => { const el = e.target; if (el.dataset && el.dataset.q) ui.qopen[el.dataset.q] = el.open; if (el.dataset && el.dataset.qa) ui.qo[el.dataset.qa] = el.open; }, true);
// ウィジェットの長押しで編集モード
let wHold = null;
const wStart = t => { const w = t.closest && t.closest('.wdg'); if (!w || ui.wedit) return; clearTimeout(wHold); wHold = setTimeout(() => { ui.wedit = true; render(); if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} } }, 600); };
const wStop = () => clearTimeout(wHold);
document.addEventListener('touchstart', e => wStart(e.target), { passive: true });
document.addEventListener('mousedown', e => wStart(e.target));
['touchend', 'touchmove', 'touchcancel', 'mouseup', 'mouseleave'].forEach(t => document.addEventListener(t, wStop, { passive: true }));

['week', 'month'].forEach(k => { const g0 = state.goals[k]; if (g0.areas.some(a => a.locked) && !(state.hist && state.hist[k + ':' + g0.start])) snapGoal(k); });
render();
try {
  if (window.claude && window.claude.use) window.claude.use('sample').then(f => { if (f) { ui.sample = f; render(); } }, () => {});
} catch (e) {}
// 日付が変わったら(開きっぱなしでも)切り替える
setInterval(() => { const td = iso(new Date()); if (state.day !== td && !DR) { state = syncSP(rollover(state, td)); ui.wk = sundayOf(td); save(); render(); } }, 60000);
