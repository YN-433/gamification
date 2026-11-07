/* ---- 獲得予定(今日を終了で確定する) ---- */
function addPend(s, xpBy, g) {
  s.pend = s.pend || { pts: {}, gold: 0 };
  for (const k in xpBy) s.pend.pts[k] = (s.pend.pts[k] || 0) + xpBy[k];
  s.pend.gold = (s.pend.gold || 0) + (g || 0);
}
const pendEmpty = p => !p || (!(p.gold) && !Object.keys(p.pts || {}).some(k => p.pts[k]));
// 獲得予定をステータス・ゴールドに確定する。確定した達成は取り消せなくなる。
function flushDay(s0, date, auto) {
  const s = clone(s0); const p = s.pend || { pts: {}, gold: 0 };
  for (const k in p.pts) s.pts[k] = Math.max(0, (s.pts[k] || 0) + p.pts[k]);
  s.gold = Math.max(0, s.gold + (p.gold || 0));
  s.events.forEach(e => { if (e.done) e.fin = true; });
  s.log.forEach(x => { x.fin = true; });
  s.closed = s.closed || {};
  s.closed[date] = { at: Date.now(), pts: p.pts, gold: p.gold || 0, auto: !!auto };
  s.pend = { pts: {}, gold: 0 };
  return s;
}
// 確定したら増えるSP(見込み)
function spPreview(s) { return syncSP(flushDay(s, s.day)).sp - (s.sp || 0); }

/* ---- 乱数(週ごとに同じ結果になるように) ---- */
function hashStr(t) { let h = 1779033703 ^ t.length; for (let i = 0; i < t.length; i++) { h = Math.imul(h ^ t.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---- クエストの値 ---- */
const QV = { sub: { xp: 10, g: 10 }, event: { xp: 10, g: 0 }, urgent: { xp: 14, g: 60 }, bonus: 300 };
const HABIT_STAT = { morning: 'REG', night: 'REG', hiit: 'VIT', reading: 'INT', lab: 'INT', meditation: 'VIT' };

/* ---- イベントクエスト: 土曜〜金曜で入れ替わる。祝日や季節の行事がある週は、その行事のイベントになる ---- */
const T = (t, cat, min) => ({ t: t, cat: cat, min: min });
const THEMES = [
  { name: '片づけ週間', mark: '🧹', tone: 'calm', tasks: [T('机の上を5分片づける', 'REG', 5), T('引き出しを1つ整理する', 'REG', 10), T('いらない物を3つ手放す', 'REG', 10), T('玄関を整える', 'CHA', 5), T('冷蔵庫の中を拭く', 'VIT', 10)] },
  { name: 'からだメンテ週間', mark: '💪', tone: 'calm', tasks: [T('ストレッチを10分', 'VIT', 10), T('白湯かお茶をゆっくり飲む', 'VIT', 5), T('エレベーターより階段を使う', 'VIT', 5), T('姿勢リセットを5分', 'VIT', 5), T('寝る前のスマホを10分早く置く', 'VIT', 10)] },
  { name: 'まなび週間', mark: '📚', tone: 'calm', tasks: [T('記事を1本読む', 'INT', 10), T('英単語を10個', 'INT', 10), T('気になる建築を1つ調べる', 'INT', 10), T('本を10分読む', 'INT', 10), T('学んだことを3行メモ', 'INT', 5)] },
  { name: 'つながり週間', mark: '🤝', tone: 'calm', tasks: [T('友人に連絡する', 'CHA', 5), T('家族にありがとうを伝える', 'CHA', 5), T('身だしなみを10分整える', 'CHA', 10), T('人を1回ほめる', 'CHA', 5), T('一緒に行きたい場所に誘う', 'CHA', 5)] }
];
function nthWd(y, m, wd, n) { const d = new Date(y, m - 1, 1); const off = (wd - d.getDay() + 7) % 7; return iso(new Date(y, m - 1, 1 + off + (n - 1) * 7)); }
const md = (y, m, d) => iso(new Date(y, m - 1, d));
const shunbun = y => md(y, 3, Math.floor(20.8431 + 0.242194 * (y - 1980)) - Math.floor((y - 1980) / 4));
const shubun = y => md(y, 9, Math.floor(23.2488 + 0.242194 * (y - 1980)) - Math.floor((y - 1980) / 4));
const SEASONS = [
  { name: 'お正月', mark: '🎍', tone: 'newyear', at: y => md(y, 1, 1), tasks: [T('今年の目標を3行で書く', 'INT', 10), T('書き初めで一文字書く', 'CHA', 10), T('近所の神社に寄る', 'VIT', 10), T('年賀のお礼を1通送る', 'CHA', 5), T('机の上を新年仕様に整える', 'REG', 10)] },
  { name: '節分', mark: '👹', tone: 'setsubun', at: y => md(y, 2, 3), tasks: [T('豆を年の数だけ食べる', 'VIT', 5), T('部屋の「鬼」(不要品)を3つ捨てる', 'REG', 10), T('恵方を調べて巻き寿司を食べる', 'CHA', 10), T('追い出したい悪習慣を1つ書く', 'REG', 5), T('玄関を掃く', 'REG', 5)] },
  { name: 'バレンタイン', mark: '💝', tone: 'valentine', at: y => md(y, 2, 14), tasks: [T('お世話になっている人にお礼を伝える', 'CHA', 5), T('自分へのご褒美チョコを選ぶ', 'VIT', 10), T('カカオ70%以上を試す', 'VIT', 5), T('手書きのメッセージを1枚書く', 'CHA', 10), T('身だしなみを10分整える', 'CHA', 10)] },
  { name: 'ひな祭り', mark: '🎎', tone: 'spring', at: y => md(y, 3, 3), tasks: [T('季節の花を1輪飾る', 'CHA', 10), T('ちらし寿司か桜餅を食べる', 'VIT', 10), T('家族に連絡する', 'CHA', 5), T('引き出しを1つ整理する', 'REG', 10), T('春物の服を1着出す', 'CHA', 10)] },
  { name: '春分の日', mark: '🌸', tone: 'spring', at: shunbun, tasks: [T('朝日か夕日を見る', 'VIT', 10), T('衣替えの準備を10分', 'REG', 10), T('春の目標を1つ決める', 'INT', 5), T('外を10分歩く', 'VIT', 10), T('植物に水をやる', 'VIT', 5)] },
  { name: 'ゴールデンウィーク', mark: '🎏', tone: 'summer', at: y => md(y, 5, 3), tasks: [T('行きたい場所を3つ調べる', 'INT', 10), T('早起きして散歩10分', 'VIT', 10), T('連休の予定を書き出す', 'REG', 5), T('読みたい本を1冊選ぶ', 'INT', 5), T('部屋の窓を拭く', 'REG', 10)] },
  { name: '母の日', mark: '💐', tone: 'valentine', at: y => nthWd(y, 5, 0, 2), tasks: [T('母に連絡する', 'CHA', 5), T('感謝を1行書く', 'CHA', 5), T('花を1輪買う', 'CHA', 10), T('家事を1つ代わる', 'REG', 10), T('昔の写真を1枚見返す', 'VIT', 5)] },
  { name: '父の日', mark: '👔', tone: 'summer', at: y => nthWd(y, 6, 0, 3), tasks: [T('父に連絡する', 'CHA', 5), T('靴を磨く', 'CHA', 10), T('身だしなみを5分整える', 'CHA', 5), T('感謝を1行書く', 'CHA', 5), T('一緒に行きたい場所を調べる', 'INT', 10)] },
  { name: '七夕', mark: '🎋', tone: 'night', at: y => md(y, 7, 7), tasks: [T('短冊に願いを1つ書く', 'INT', 5), T('夜空を5分見上げる', 'VIT', 5), T('願いのための一歩を1つやる', 'REG', 10), T('そうめんを食べる', 'VIT', 10), T('遠くの友人に連絡する', 'CHA', 5)] },
  { name: '海の日', mark: '🌊', tone: 'summer', at: y => nthWd(y, 7, 1, 3), tasks: [T('水をコップ2杯飲む', 'VIT', 5), T('日焼け止めを塗る', 'CHA', 5), T('水辺の写真を1枚飾る', 'CHA', 5), T('ストレッチを10分', 'VIT', 10), T('夏の計画を立てる', 'REG', 10)] },
  { name: 'お盆', mark: '🏮', tone: 'night', at: y => md(y, 8, 13), tasks: [T('家族や先祖を思う5分', 'VIT', 5), T('実家に連絡する', 'CHA', 5), T('写真立てを拭く', 'REG', 5), T('夏野菜を食べる', 'VIT', 10), T('休む日を1日決める', 'REG', 5)] },
  { name: '敬老の日', mark: '🍵', tone: 'autumn', at: y => nthWd(y, 9, 1, 3), tasks: [T('祖父母や年長者に連絡する', 'CHA', 5), T('背中をのばすストレッチ', 'VIT', 10), T('お茶をゆっくり淹れる', 'VIT', 10), T('年長者に聞きたいことを書く', 'INT', 5), T('健康診断の予定を確かめる', 'VIT', 5)] },
  { name: '秋分の日', mark: '🍂', tone: 'autumn', at: shubun, tasks: [T('秋の味覚を1つ食べる', 'VIT', 10), T('夜長に読書10分', 'INT', 10), T('衣替えを10分', 'REG', 10), T('夕暮れに散歩10分', 'VIT', 10), T('下半期のふりかえりを3行', 'INT', 10)] },
  { name: 'スポーツの日', mark: '🏃', tone: 'summer', at: y => nthWd(y, 10, 1, 2), tasks: [T('スクワットを20回', 'VIT', 5), T('10分ジョグか早歩き', 'VIT', 10), T('ストレッチを10分', 'VIT', 10), T('観戦したい試合を調べる', 'CHA', 5), T('卵かプロテインをとる', 'VIT', 5)] },
  { name: 'ハロウィン', mark: '🎃', tone: 'halloween', at: y => md(y, 10, 31), tasks: [T('かぼちゃ料理を食べる', 'VIT', 10), T('部屋に季節の飾りを1つ', 'CHA', 10), T('ミステリーを10分読む', 'INT', 10), T('いつもと違う服を試す', 'CHA', 5), T('お菓子を1つ人に渡す', 'CHA', 5)] },
  { name: '文化の日', mark: '🎨', tone: 'culture', at: y => md(y, 11, 3), tasks: [T('美術館・建築の情報を1つ調べる', 'INT', 10), T('好きな作品を10分鑑賞する', 'INT', 10), T('1枚スケッチする', 'CHA', 10), T('行きたい文化施設をメモする', 'INT', 5), T('古い道具を手入れする', 'REG', 10)] },
  { name: '勤労感謝の日', mark: '🙏', tone: 'autumn', at: y => md(y, 11, 23), tasks: [T('自分の仕事をねぎらう3行', 'VIT', 5), T('働く人にお礼を伝える', 'CHA', 5), T('デスクを10分整える', 'REG', 10), T('仕事道具を1つ手入れする', 'REG', 10), T('早めに寝る準備をする', 'VIT', 10)] },
  { name: 'クリスマス', mark: '🎄', tone: 'xmas', at: y => md(y, 12, 24), tasks: [T('家の装飾をする', 'CHA', 10), T('ケーキを買う', 'VIT', 10), T('大切な人にメッセージを送る', 'CHA', 5), T('今年うれしかったことを3つ書く', 'INT', 10), T('プレゼントを1つ選ぶ', 'CHA', 10)] }
];
// 土曜はじまりの週
function evWeekStart(d) { return sundayOf(d); }
function eventWeek(d) {
  const ws = evWeekStart(d); const we = addDays(ws, 6); const mid = parseISO(addDays(ws, 3)).getTime();
  let best = null;
  [Number(ws.slice(0, 4)), Number(we.slice(0, 4))].forEach(y => SEASONS.forEach(se => {
    const at = se.at(y); if (at < ws || at > we) return;
    const dist = Math.abs(parseISO(at).getTime() - mid);
    if (!best || dist < best.dist) best = { se: se, at: at, dist: dist };
  }));
  const th = best ? Object.assign({}, best.se, { seasonal: true, at: best.at }) : Object.assign({ seasonal: false }, THEMES[Math.floor(parseISO(ws).getTime() / 6048e5) % THEMES.length]);
  return { ws: ws, we: we, theme: th, quests: th.tasks.map((x, i) => ({ key: 'evq:' + ws + ':' + i, kind: 'event', t: x.t, cat: x.cat, min: x.min })) };
}
/* ---- 緊急クエスト: 週に2〜3日だけ出る。イベントより少し重い(1.2〜1.5倍) ---- */
const URGENT = [T('コアトレーニング5分', 'VIT', 5), T('読書10分', 'INT', 10), T('デスク15分一本勝負', 'REG', 15), T('腕立て20回', 'VIT', 5), T('床を10分拭く', 'REG', 10), T('早歩き15分', 'VIT', 15),
  T('洗濯物をすぐたたむ', 'REG', 10), T('メール整理10分', 'REG', 10), T('瞑想5分', 'VIT', 5), T('水を1L飲む', 'VIT', 5), T('英語の音声を10分', 'INT', 10), T('今日の支出を記録する', 'REG', 5)];
function urgentWeek(ws) {
  const r = rng(hashStr('urg' + ws)); const n = 2 + (r() < 0.5 ? 1 : 0); const days = [];
  while (days.length < n) { const d = Math.floor(r() * 7); if (days.indexOf(d) < 0) days.push(d); }
  const out = {};
  days.forEach(di => {
    const d = addDays(ws, di); const k = 1 + (r() < 0.45 ? 1 : 0); const pick = [];
    while (pick.length < k) { const j = Math.floor(r() * URGENT.length); if (pick.indexOf(j) < 0) pick.push(j); }
    out[d] = pick.map((j, i) => ({ key: 'urg:' + d + ':' + i, kind: 'urgent', t: URGENT[j].t, cat: URGENT[j].cat, min: URGENT[j].min }));
  });
  return out;
}
const urgentFor = d => urgentWeek(evWeekStart(d))[d] || [];
function urgentInWeek(d) { const w = urgentWeek(evWeekStart(d)); return Object.keys(w).reduce((a, k) => a.concat(w[k]), []); }
/* ---- サブクエスト(習慣): 今週の目標の「やるべき習慣」から ---- */
function subFor(d) {
  const g = state.goals.week; const hb = g.habits || {};
  return habList().filter(h => (Number(hb[h[0]]) || 0) > 0 && h[1]).map(h => {
    const wkS = sundayOf(d); const wkE = addDays(wkS, 6); const dist = habDist(h[0]);
    const wl = state.log.filter(x => x.kind === 'sub' && x.hk === h[0] && x.date >= wkS && x.date <= wkE); const cnt = wl.length; const amt = wl.reduce((a, x) => a + (Number(x.amt) || 0), 0);
    const top = STAT_IDS.slice().sort((a, b) => dist[b] - dist[a])[0];
    return { key: 'sub:' + d + ':' + h[0], kind: 'sub', hk: h[0], t: h[1], cat: top, dist: dist, target: Number(hb[h[0]]), unit: habUnit(g, h[0]), cnt: cnt, amt: amt };
  });
}
const qDone = key => state.log.some(x => x.qk === key);
const qEntry = key => state.log.find(x => x.qk === key);
function doQuest(s0, q, date) {
  if (date > s0.day || s0.log.some(x => x.qk === q.key)) return s0;
  const s = clone(s0); const v = QV[q.kind]; const pen = date === s.day ? penalty(s) : 1;
  let xpBy = {}; let xp = 0;
  if (q.dist && distSum(q.dist) > 0) { const sm = distSum(q.dist); STAT_IDS.forEach(k => { if (q.dist[k] > 0) { xpBy[k] = Math.round(v.xp * q.dist[k] / sm * (1 + 0.10 * s.skills.accel) * catMult(s, k) * pen); xp += xpBy[k]; } }); }
  else { xp = Math.round(v.xp * (1 + 0.10 * s.skills.accel) * catMult(s, q.cat) * pen); xpBy = { [q.cat]: xp }; }
  const g = Math.round(v.g * (1 + 0.10 * s.skills.alch));
  addPend(s, xpBy, g);
  if (date === s.day) { s.today.xp += xp; s.today.g += g; if (q.kind === 'sub') s.today.habits += 1; }
  s.log.push({ id: newId(), qk: q.key, kind: q.kind, hk: q.hk, date: date, cat: q.cat, text: q.t, xp: xp, xpBy: xpBy, g: g, fin: false });
  // イベントクエストを全部達成したらゴールド
  if (q.kind === 'event') {
    const ew = eventWeek(date); const bk = 'evb:' + ew.ws;
    if (ew.quests.every(x => s.log.some(y => y.qk === x.key)) && !s.log.some(y => y.qk === bk)) {
      const bg = Math.round(QV.bonus * (1 + 0.10 * s.skills.alch));
      addPend(s, {}, bg); if (date === s.day) s.today.g += bg;
      s.log.push({ id: newId(), qk: bk, kind: 'bonus', date: date, cat: null, text: ew.theme.name + ' コンプリート', xp: 0, g: bg, fin: false });
    }
  }
  return s;
}
function undoQuest(s0, key) {
  const e = s0.log.find(x => x.qk === key); if (!e || e.fin) return s0;
  const s = clone(s0); const rm = [e];
  if (e.kind === 'event') { const b = s.log.find(x => x.qk === 'evb:' + key.split(':')[1]); if (b && !b.fin) rm.push(b); }
  rm.forEach(x => {
    { const neg = {}; if (x.xpBy) for (const k in x.xpBy) neg[k] = -x.xpBy[k]; else if (x.cat) neg[x.cat] = -x.xp; addPend(s, neg, -x.g); }
    if (x.date === s.day) { s.today.xp = Math.max(0, s.today.xp - x.xp); s.today.g = Math.max(0, s.today.g - x.g); if (x.kind === 'sub') s.today.habits = Math.max(0, s.today.habits - 1); }
  });
  const ids = rm.map(x => x.id); s.log = s.log.filter(x => ids.indexOf(x.id) < 0);
  return s;
}
// 今週のクエスト達成度(サブは回数の合計、イベントは5つ、緊急はその週に出た数)
function questStats(d) {
  const wkS = sundayOf(d); const wkE = addDays(wkS, 6); const hb = state.goals.week.habits || {};
  const subT = habList().reduce((a, h) => { const n = Number(hb[h[0]]) || 0; if (!n || !h[1]) return a; const u = habUnit(state.goals.week, h[0]); return a + (u === '回' || u === '日' ? n : 7); }, 0);
  const subD = state.log.filter(x => x.kind === 'sub' && x.date >= wkS && x.date <= wkE).length;
  const ew = eventWeek(d); const evD = ew.quests.filter(q => qDone(q.key)).length;
  const ur = urgentInWeek(d); const urD = ur.filter(q => qDone(q.key)).length;
  return { sub: [Math.min(subD, subT), subT], ev: [evD, ew.quests.length], ur: [urD, ur.length] };
}

/* ---- 成果目標: 達成すると、割り振ったステータスのptが入る(今日を終了で確定。確定前なら戻せる) ---- */
function tickOutcome(gk, i) {
  const g = state.goals[gk]; const o = g && g.outcomes[i]; if (!o) return;
  if (!o.done) {
    if (!String(o.t || '').trim()) return;
    o.done = true;
    if (!o.paid && distSum(o.dist) > 0) { const xp = {}; STAT_IDS.forEach(k => { if (o.dist[k] > 0) xp[k] = o.dist[k]; }); addPend(state, xp, 0); o.paid = state.day; }
    save(); render(); toast('成果目標を達成！' + (o.paid ? '  ' + STAT_IDS.filter(k => o.dist[k] > 0).map(k => k + ' +' + o.dist[k]).join(' ') : ''));
  } else {
    if (o.paid && (o.paid !== state.day || state.closed[o.paid])) { toast('確定した達成は戻せません'); return; }
    if (o.paid) { const neg = {}; STAT_IDS.forEach(k => { if (o.dist[k] > 0) neg[k] = -o.dist[k]; }); addPend(state, neg, 0); delete o.paid; }
    o.done = false; save(); render();
  }
}
