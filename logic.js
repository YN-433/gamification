// <logic>
// 数値はスプレッドシート(Shop_Master / Skill_Master / Quest_Master / Goal_Master)から。
// BASE_XP_PER_BOX・LOW_MP_PENALTY・ランクの細かい境界は、シートに値がないため仮置き。
const CFG = {
  BASE_XP_PER_BOX: 20, BASE_G_PER_BOX: 120,
  MP_PER_BOX: 15, MP_PER_BOX_ZONE: 20, MP_MAX: 100, MP_FALLBACK: 60,
  LOW_MP: 30, LOW_MP_PENALTY: 0.8,
  STAR: { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 2.0 }
};
const STATS = [
  { id: 'CHA', name: '魅力' }, { id: 'VIT', name: '活力' }, { id: 'REG', name: '規律' },
  { id: 'INT', name: '知性' }, { id: 'TEC', name: '技術' }
];
const RANKS = (function () {
  const r = [['G',0],['G+',300],['F',600],['F+',1000],['E',1500],['E+',2000],['D',2600],['D+',3200],['C',3800],['C+',4400],['B',5000],['B+',5500],['A',6000],['A+',7500],['S',9000],['S+',9800],['SS',10600],['SS+',11300],['SSS',12000]];
  for (let i = 1; i <= 9; i++) r.push(['UE' + i, 13500 + (i - 1) * 300]);
  for (let i = 1; i <= 9; i++) r.push(['UD' + i, 16500 + (i - 1) * 400]);
  return r;
})();
const MAXPT = 19700;
function rankOf(total) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (total >= RANKS[i][1]) idx = i;
  return { label: RANKS[idx][0], idx: idx, floor: RANKS[idx][1], next: RANKS[idx + 1] || null };
}
// 1ステータスのランクは、5つ分の合計に直して総合と同じ表で判定する
function statRank(pt) { const r = rankOf(pt * 5); return { label: r.label, idx: r.idx, pct: r.next ? (pt * 5 - r.floor) / (r.next[1] - r.floor) * 100 : 100 }; }
function tierOf(label) {
  if (label.indexOf('UD') === 0) return 'ud';
  if (label.indexOf('UE') === 0) return 'ue';
  if (label === 'SSS') return 'sss';
  if (label.charAt(0) === 'S') return 's';
  if (label.charAt(0) === 'A') return 'a';
  return 'low';
}
const SKILLS = [
  { id: 'iron',  name: '鉄のメンタル',     cat: 'MP節約',   max: '消費MP −50%',        eff: lv => '消費MP −' + (5 * lv) + '%' },
  { id: 'spa',   name: '温泉 超回復',       cat: 'MP回復',   max: '回復量 +100%',       eff: lv => '休憩・ご褒美の回復 +' + (10 * lv) + '%' },
  { id: 'accel', name: '加速学習',          cat: '全育成',   max: '全獲得Pt +100%',     eff: lv => '全獲得Pt +' + (10 * lv) + '%' },
  { id: 'alch',  name: '錬金術',            cat: 'ゴールド', max: '獲得G +100%',        eff: lv => '獲得G +' + (10 * lv) + '%' },
  { id: 'zone',  name: 'ゾーン突入',        cat: '評価特化', max: '★4・5の倍率 +1.5',   eff: lv => '★4・5の倍率 +' + (0.15 * lv).toFixed(2) },
  { id: 'arch',  name: '建築家の眼',        cat: 'INT特化',  max: 'INT獲得Pt +150%',    eff: lv => 'INT獲得Pt +' + (15 * lv) + '%' },
  { id: 'beau',  name: '美意識の目覚め',    cat: 'CHA特化',  max: 'CHA獲得Pt +150%',    eff: lv => 'CHA獲得Pt +' + (15 * lv) + '%' },
  { id: 'camp',  name: 'ソロキャンパー',    cat: 'VIT特化',  max: 'VIT獲得Pt +150%',    eff: lv => 'VIT獲得Pt +' + (15 * lv) + '%' }
];
const CATSKILL = { INT: 'arch', CHA: 'beau', VIT: 'camp' };
const QUESTS = [
  { id: 'q1', cat: 'CHA', name: '丁寧なスキンケア＆UV対策', kind: 'デイリー', xp: 10, g: 10 },
  { id: 'q2', cat: 'VIT', name: '7時間以上の質の高い睡眠', kind: 'デイリー', xp: 20, g: 20 },
  { id: 'q3', cat: 'VIT', name: 'ストレッチまたは15分運動', kind: 'デイリー', xp: 15, g: 15 },
  { id: 'q4', cat: 'INT', name: '30分間の集中学習', kind: 'デイリー', xp: 20, g: 20 },
  { id: 'q5', cat: 'REG', name: '朝7:00までに起床', kind: 'デイリー', xp: 10, g: 10 },
  { id: 'q6', cat: 'INT', name: '建築・美術館などの文化見学', kind: 'ウィークリー', xp: 100, g: 100 },
  { id: 'q7', cat: 'REG', name: '15分一本勝負：デスク完全整頓', kind: '緊急クエスト', xp: 50, g: 50 }
];
// 券買所の券(構想図の値)。旧版の券は、持っている人のために LEGACY に残す
const SHOP = [
  { id: 't1', cat: 'ガジェット', name: 'ガジェット購入券 (1,000円)', g: 1000, mp: 10, pts: {} },
  { id: 't2', cat: '書籍', name: '古本購入券 (500円)', g: 500, mp: 10, pts: {} },
  { id: 't3', cat: '文化', name: '博物館観覧券 (2,000円)', g: 2000, mp: 20, pts: {} },
  { id: 't4', cat: 'スイーツ', name: 'スイーツ購入券 (500円)', g: 500, mp: 20, pts: {} },
  { id: 't5', cat: '書籍', name: '新刊購入券 (1,000円)', g: 1000, mp: 10, pts: {} },
  { id: 't6', cat: '贈り物', name: '贈品購入券 (2,000円)', g: 2000, mp: 20, pts: {} }
];
const LEGACY = [
  { id: 's8', cat: '転生大報酬', name: '1周目 転生旅行チケット', g: 0, mp: 100, pts: { CHA: 100, VIT: 100, REG: 100, INT: 100, TEC: 100 }, legacy: true },
  { id: 'k1', cat: '転生特別券', name: '旅行特別券', g: 0, mp: 100, pts: {}, legacy: true },
  { id: 'k2', cat: '転生特別券', name: 'ガジェット特別券', g: 0, mp: 100, pts: {}, legacy: true },
  { id: 'k3', cat: '転生特別券', name: '体験特別券', g: 0, mp: 100, pts: {}, legacy: true },
  { id: 's1', cat: 'ガジェット', name: 'ガジェット購入券 (2,000円)', g: 2000, mp: 30, pts: {}, legacy: true },
  { id: 's2', cat: '書籍・教養', name: '古本購入券 (1,000円以下)', g: 1000, mp: 30, pts: {}, legacy: true },
  { id: 's3', cat: '文化・リフレッシュ', name: '美術館・博物館・資料館', g: 1200, mp: 40, pts: {}, legacy: true },
  { id: 's4', cat: 'アウトドア', name: 'キャンプ・温泉・サウナ利用', g: 3000, mp: 60, pts: {}, legacy: true },
  { id: 's5', cat: 'カフェ', name: 'スタバ フラペチーノ券', g: 700, mp: 25, pts: {}, legacy: true },
  { id: 's6', cat: 'スイーツ', name: 'ご褒美スイーツ解禁', g: 400, mp: 15, pts: {}, legacy: true },
  { id: 's7', cat: '嗜好品', name: 'おつまみ贅沢セット (600円)', g: 600, mp: 20, pts: {}, legacy: true }
];
const HAB = [['morning', '朝の習慣'], ['night', '夜の習慣'], ['hiit', 'SIT or HIIT'], ['reading', '読書'], ['lab', 'ラボ'], ['meditation', '瞑想']];

const clone = s => JSON.parse(JSON.stringify(s));
const sumPts = pts => Object.values(pts).reduce((a, b) => a + b, 0);
const spentSP = s => Object.values(s.skills).reduce((a, b) => a + b, 0);
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
function clampInt(v, min, max, def) { if (v == null || v === '') return def; const n = Math.round(Number(v)); return isNaN(n) ? def : clampN(n, min, max); }

/* dates */
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function parseISO(s) { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
// 1週間の始まりの曜日(0=日〜6=土)。基本は土曜はじまり(土〜金)。設定で変えられる。
let WKS = 6;
function sundayOf(s) { const d = parseISO(s); d.setDate(d.getDate() - ((d.getDay() - WKS + 7) % 7)); return iso(d); }
const wdList = () => Array.from({ length: 7 }, (_, i) => WD[(WKS + i) % 7]);
// 1クエスト(領域)に割り振れるBOXの上限 = 期間の日数 × 2BOX(1日4時間)
const capFor = g => Math.max(2, (Math.round((parseISO(g.end) - parseISO(g.start)) / 864e5) + 1) * 2);
const BOX_PT = 20;
function jp(s) { const d = parseISO(s); return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '(' + WD[d.getDay()] + ')'; }

/* goals */
const STAT_IDS = STATS.map(s => s.id);
/* ステータスの配分(dist): クエストと成果目標は基本20pt、習慣は10ptを、5つのステータスに分ける */
const DIST_TOTAL = { a: 20, o: 20, h: 10 };
const emptyDist = () => { const d = {}; STAT_IDS.forEach(k => { d[k] = 0; }); return d; };
const fullDist = x => { const d = emptyDist(); STAT_IDS.forEach(k => { d[k] = Math.max(0, Math.round(Number(x && x[k]) || 0)); }); return d; };
const distSum = x => STAT_IDS.reduce((a, k) => a + (Number(x && x[k]) || 0), 0);
const mkDist = o => Object.assign(emptyDist(), o);
// 古い保存データ(BOXごとのステータスの並び)を、20ptの配分にする
function distFromStats(stats) {
  const d = emptyDist(); const n = stats.length; if (!n) { d.INT = 20; return d; }
  stats.forEach(st => { if (d[st] != null) d[st] += 1; });
  let left = 20; const ks = STAT_IDS.filter(k => d[k]);
  ks.forEach(k => { d[k] = Math.floor(d[k] * 20 / n); left -= d[k]; });
  ks.sort((a, b) => d[b] - d[a]); for (let i = 0; left > 0; i++, left--) d[ks[i % ks.length]] += 1;
  return d;
}
const allocFromDist = (d, boxes) => { const a = {}; STAT_IDS.forEach(k => { if (d[k] > 0) a[k] = Math.round(d[k] / DIST_TOTAL.a * 1000) / 1000; }); return boxes && boxes !== 1 ? scaleAlloc(a, boxes) : a; };
// 予定BOXは、カレンダーに置いた予定の数から自動で数える
const areaBox = (g, a) => a.name ? Math.round(state.events.filter(e => e.area === a.name && inRange(e.date, g)).reduce((t, e) => t + e.boxes, 0) * 1000) / 1000 : 0;
const sumBoxes = g => g.areas.reduce((t, a) => t + areaBox(g, a), 0);
function normArea(a) {
  if (!a.id) a.id = 'a' + Math.random().toString(36).slice(2, 9);
  if (!a.dist) a.dist = Array.isArray(a.stats) ? distFromStats(a.stats) : emptyDist();
  a.dist = fullDist(a.dist); delete a.stats; delete a.box;
  if (a.locked == null) a.locked = false; if (a.ed == null) a.ed = false;
  if (a.want !== 'm') a.want = 'w'; a.work = !!a.work;
  if (!Array.isArray(a.tags)) a.tags = a.tag ? tagParse(a.tag) : []; delete a.tag; delete a.memo;
  return a;
}
/* 枠の色: やりたい(want)/やるべき(must) × 仕事/私用 */
const WW = { w1: ['want×working', '#039BE5'], w0: ['want×private', '#33B679'], m1: ['must×working', '#616161'], m0: ['must×private', '#E67C73'] }; // Googleカレンダーの ピーコック/セージ/グラファイト/フラミンゴ
const wwOf = a => WW[(a.want === 'm' ? 'm' : 'w') + (a.work ? 1 : 0)];
const wwByName = n => { for (const k of ['week', 'month']) { const a = state.goals[k].areas.find(x => x.name === n); if (a) return wwOf(a); } const l = state.lib && state.lib.a && state.lib.a[n]; return l ? WW[(l.want === 'm' ? 'm' : 'w') + (l.work ? 1 : 0)] : null; };
// カレンダーの色は、分類(want/must × working/private)の色だけ
const evColor = n => { const w = n ? wwByName(n) : null; return w ? w[1] : '#8a9a9c'; };
// ステータスの比率で、多色(デュエマの多色カードのように)に塗り分ける。色はごく淡く(bar=カレンダーの棒はやや濃いめ)
function gradOf(o, bar) {
  const ks = STAT_IDS.filter(k => o && o[k] > 0); if (!ks.length) return 'none';
  const t = ks.reduce((s, k) => s + o[k], 0); let p = 0; const st = [];
  ks.forEach(k => { const a = p; p += o[k] / t * 100; const c = 'color-mix(in srgb,var(--' + k.toLowerCase() + ') 40%,transparent)'; st.push(c + ' ' + a.toFixed(1) + '% ' + p.toFixed(1) + '%'); });
  return 'linear-gradient(90deg,' + st.join(',') + ')';
}
/* 常駐クエスト: 毎週の目標に自動で入る(消せない) */
const RESIDENT = [
  { k: 'shop', name: '買出', dist: { REG: 10, VIT: 10 }, rec: 1, on: () => true },
  { k: 'wk', name: '1週間の予定', dist: { REG: 10, INT: 10 }, on: () => true },
  // 月末をふくむ週の、ひとつ前の週に出る
  { k: 'mo', name: '1か月の予定', dist: { REG: 8, INT: 12 }, on: g => { for (let i = 7; i <= 13; i++) { const d = addDays(g.start, i); if (addDays(d, 1).slice(8) === '01') return true; } return false; } },
  // とりあえず12月の間
  { k: 'yr', name: '1年の予定', dist: { INT: 12, REG: 8 }, on: g => { for (let i = 0; i <= 6; i++) if (addDays(g.start, i).slice(5, 7) === '12') return true; return false; } }
];
function ensureResident(g) {
  RESIDENT.forEach(r => {
    const ex = g.areas.find(a => a.res === r.k);
    if (r.on(g)) { if (!ex && !g.areas.some(a => a.name === r.name)) { const a = mkArea(r.name, 5, r.dist); a.res = r.k; a.want = 'm'; a.rec = r.rec || 0; g.areas.push(normArea(a)); } }
    else if (ex && !state.events.some(e => e.area === ex.name && inRange(e.date, g))) g.areas.splice(g.areas.indexOf(ex), 1);
  });
}
function normOutcome(o) {
  if (!o.id) o.id = 'o' + Math.random().toString(36).slice(2, 9);
  if (!o.dist) o.dist = mkDist({ INT: 20 }); o.dist = fullDist(o.dist);
  if (o.locked == null) o.locked = false; if (o.ed == null) o.ed = false;
  if (!(Number(o.n) >= 0) || o.n === '' || o.n == null) o.n = 1; if (!o.u) o.u = '回'; if (o.v == null) o.v = o.done ? o.n : 0;
  if (!Array.isArray(o.tags)) o.tags = [];
  return o;
}
function normGoals(g) { g.areas.forEach(normArea); g.outcomes.forEach(normOutcome); if (!g.hunits) g.hunits = {}; if (g === state.goals.week) ensureResident(g); return g; }
const mkArea = (name, value, dist, ww) => Object.assign({ id: 'a' + Math.random().toString(36).slice(2, 9), name: name, value: value, dist: mkDist(dist), locked: false, ed: false, want: 'w', work: false }, ww || {});
// 習慣(サブクエスト): 基本の6つ + 自分で足したもの。配分は習慣ごとに10pt
const HAB_UNITS = ['回', '日', '個', 'つ', '人', '分', '時間', 'ページ', '冊', 'km', '杯', '円'];
const habUnit = (g, id) => (g.hunits && g.hunits[id]) || '回';
const habList = () => { const l = HAB.filter(h => (state.habHide || []).indexOf(h[0]) < 0).map(h => [h[0], h[1], false]).concat((state.hab || []).map(h => [h.id, h.name, true])); const o = state.habOrder || []; const ix = id => { const n = o.indexOf(id); return n < 0 ? 999 : n; }; return l.map((h, n) => [h, n]).sort((a, b) => ix(a[0][0]) - ix(b[0][0]) || a[1] - b[1]).map(x => x[0]); };
const habDist = id => { const c = (state.hab || []).find(h => h.id === id); if (c) return fullDist(c.dist); const o = state.habDist && state.habDist[id]; if (o) return fullDist(o); return mkDist({ [HABIT_STAT[id] || 'INT']: 10 }); };

function seedGoals(td) {
  const ws = sundayOf(td);
  return {
    week: {
      start: ws, end: addDays(ws, 6), perDay: 3,
      areas: [mkArea('バイト', 3, { REG: 12, CHA: 8 }, { want: 'm', work: true }), mkArea('転職活動・引越', 6, { REG: 10, INT: 10 }, { work: true }), mkArea('ゲーミフィケーション', 10, { INT: 17, REG: 3 }), mkArea('サッカー観戦', 8, { CHA: 10, VIT: 6, TEC: 4 })],
      outcomes: [{ t: '不動産を見に行く', done: false, locked: false, dist: mkDist({ REG: 12, INT: 8 }) }, { t: 'バイトに入る', done: false, locked: false, dist: mkDist({ REG: 20 }) }],
      habits: { morning: 2, night: 2, hiit: 2, reading: 1, lab: 1, meditation: 1 }
    },
    month: {
      start: ws, end: addDays(ws, 27), perDay: 3,
      areas: [mkArea('転職活動・住宅設計', 8, { INT: 16, REG: 4 }), mkArea('自己研鑽・教養', 8, { INT: 20 })],
      outcomes: [{ t: '転職活動を完了する', done: false, locked: false, dist: mkDist({ INT: 12, CHA: 8 }) }],
      habits: { morning: 8, night: 8, hiit: 8, reading: 4, lab: 4, meditation: 4 }
    }
  };
}
function nextPeriod(g, days) {
  const n = clone(g);
  n.start = addDays(g.end, 1); n.end = addDays(n.start, days - 1);
  n.outcomes = n.outcomes.map(o => ({ id: o.id, t: o.t, done: false, locked: false, dist: o.dist, ed: false }));
  n.areas.forEach(a => { a.locked = false; a.ed = false; });
  return n;
}
// 話した内容から返ってきたJSONを、ひな型に安全に取り込む。決定済みの領域・成果目標は、書き換えない。
function mergePatch(g, p) {
  const out = clone(g); const ch = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { g: out, changes: ch };
  const ds = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof p.start === 'string' && ds.test(p.start)) { out.start = p.start; ch.push(['開始日', jp(p.start)]); }
  if (typeof p.end === 'string' && ds.test(p.end)) { out.end = p.end; ch.push(['終了日', jp(p.end)]); }
  if (Array.isArray(p.areas)) {
    const a = p.areas.filter(x => x && typeof x.name === 'string' && x.name.trim()).map(x => {
      const nm = x.name.trim().slice(0, 30); const old = g.areas.find(o => o.name === nm);
      if (old && old.locked) return clone(old);
      const r = { name: nm, value: clampInt(x.value, 1, 10, 5), box: clampInt(x.box, 0, capFor(g), 0), stats: old ? old.stats.slice() : [], locked: false };
      return normArea(r);
    });
    g.areas.forEach(o => { if (o.locked && !a.some(x => x.name === o.name)) a.push(clone(o)); });
    if (a.length) { out.areas = a; ch.push(['領域', a.map(x => x.name + '(' + x.value + ') ' + x.box + 'BOX').join('、')]); }
  }
  if (p.perDay != null) { const v = clampInt(p.perDay, 1, 12, null); if (v != null) { out.perDay = v; ch.push(['1日の目安', v + ' BOX']); } }
  if (Array.isArray(p.outcomes)) {
    const prev = {}; g.outcomes.forEach(o => { prev[o.t] = o; });
    const o = p.outcomes.filter(x => typeof x === 'string' && x.trim()).map(x => { const t = x.trim().slice(0, 60); return { t: t, done: !!(prev[t] && prev[t].done), locked: !!(prev[t] && prev[t].locked) }; });
    g.outcomes.forEach(x => { if (x.locked && !o.some(y => y.t === x.t)) o.push(clone(x)); });
    out.outcomes = o; ch.push(['成果目標', o.length ? o.map(x => x.t).join('、') : '(なし)']);
  }
  if (p.habits && typeof p.habits === 'object') {
    const parts = [];
    HAB.forEach(h => { if (p.habits[h[0]] != null) { const v = clampInt(p.habits[h[0]], 0, 99, null); if (v != null) { out.habits[h[0]] = v; parts.push(h[1] + ' ' + v); } } });
    if (parts.length) ch.push(['習慣', parts.join('、')]);
  }
  if (ch.some(c => c[0] === '領域')) ch.push(['予定BOXの計', sumBoxes(out) + ' BOX']);
  return { g: out, changes: ch };
}

/* state */
// シートのDaily_Log(10/24 INT 3BOX、104Pt、78G)を、最初の記録として入れておく
function seedEvents() {
  return [{ fin: true, id: 'seed-1024', date: '2026-10-24', start: 540, gk: null, area: 'シートの記録', alloc: { INT: 3 }, boxes: 3, star: 3, done: true, xpBy: { INT: 104 }, xp: 104, g: 78, spent: 0 }];
}
function seedState(td) {
  return {
    v: 5, wkStart: 6, habHide: [], hab: [], habDist: {}, qlib: {}, day: td, pend: { pts: {}, gold: 0 }, closed: {}, journal: {}, widgets: ['qstat', 'gain', 'health', 'box'], gcalDel: [], cycle: 1,
    pts: { CHA: 0, VIT: 0, REG: 0, INT: 104, TEC: 0 },
    gold: 78, mp: CFG.MP_FALLBACK, mpBase: CFG.MP_FALLBACK, morning: { src: 'fallback', score: null },
    sp: 0, spRank: 0, spStats: [], notices: [],
    today: { boxes: 0, steps: null, sleep: null, habits: 0, xp: 0, g: 0 },
    goals: Object.assign(seedGoals(td), { year: { year: Number(td.slice(0, 4)), items: [] } }), refl: {},
    done: {}, shopLog: [], custom: [], inv: {}, entries: [], events: seedEvents(), log: [],
    health: { on: false }, notion: { on: false, log: [] },
    skills: { iron: 0, spa: 0, accel: 0, alch: 0, zone: 0, arch: 0, beau: 0, camp: 0 }
  };
}
// 日付が変わったら、MPを朝の値に戻す。Google Healthが読めていないうちは60の仮値。
function rollover(s, td) {
  if (s.day === td) return s;
  let n = clone(s);
  // 「今日を終了」を押さずに日付が変わったら、その日の獲得分をまとめて確定する
  if (n.pend && !pendEmpty(n.pend)) { const d0 = n.day; n = flushDay(n, d0, true); n.notices = n.notices || []; n.notices.unshift({ id: newId(), text: jp(d0) + ' の獲得分を自動で確定しました(今日を終了が押されていなかったため)', at: Date.now(), read: false }); }
  n.day = td; n.done = {}; n.entries = [];
  n.morning = { src: 'fallback', score: null }; n.mpBase = CFG.MP_FALLBACK; n.mp = CFG.MP_FALLBACK;
  n.today = { boxes: 0, steps: null, sleep: null, habits: 0, xp: 0, g: 0 };
  return n;
}
// Google Healthの読み取り結果を反映。energy が null なら読めなかった日として60にする。
function applyHealth(s0, h) {
  const s = clone(s0);
  const base = (h.energy == null || h.energy === '') ? CFG.MP_FALLBACK : clampN(Math.round(Number(h.energy)), 0, 100);
  s.mp = clampN(s.mp + (base - s.mpBase), 0, CFG.MP_MAX);
  s.mpBase = base;
  s.morning = (h.energy == null || h.energy === '') ? { src: 'fallback', score: null } : { src: 'health', score: base };
  if (h.steps != null && h.steps !== '') s.today.steps = Math.max(0, Math.round(Number(h.steps)));
  if (h.sleep != null && h.sleep !== '') s.today.sleep = Math.max(0, Number(h.sleep));
  s.health.on = true;
  return s;
}
function buildRecord(s) {
  const total = sumPts(s.pts); const r = {
    '日付': s.day, '周回': s.cycle + '周目', '総合ランク': rankOf(total).label, '総合Pt': total,
    'MP': s.mp, '朝MPの元': s.morning.src === 'health' ? 'Google Health ' + s.morning.score : '読み取れず(60)',
    '所持G': s.gold, '達成BOX': s.today.boxes, '歩数': s.today.steps, '睡眠(h)': s.today.sleep,
    '獲得Pt': s.today.xp, '獲得G': s.today.g
  };
  STATS.forEach(x => { r[x.id] = s.pts[x.id] + ' Pt / ' + statRank(s.pts[x.id]).label; });
  return r;
}

function penalty(s) { return s.mp <= CFG.LOW_MP ? CFG.LOW_MP_PENALTY : 1; }
function catMult(s, cat) { const id = CATSKILL[cat]; return 1 + (id ? 0.15 * s.skills[id] : 0); }
function starMult(s, star) { return CFG.STAR[star] + (star >= 4 ? 0.15 * s.skills.zone : 0); }
/* 時間: 1BOX = 2時間。カレンダーは0:00〜24:00、30分きざみ */
const HP = 26; // 1時間の高さ(px)
const DAY_START = 0, DAY_END = 24 * 60;
const fmtT = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const toMin = t => { const a = String(t || '').split(':').map(Number); return (a[0] || 0) * 60 + (a[1] || 0); };
const evEnd = e => Math.round(e.start + e.boxes * 120);
function clampStart(start, boxes) { return clampN(Math.round(start / 15) * 15, DAY_START, Math.max(DAY_START, DAY_END - Math.round(boxes * 120))); }
// クエストの標準サイズ(分)。設定で変えられる。基本は120分(=1BOX)
const stdMin = () => clampN(Math.round(Number(state.stdMin) || 120), 15, 720);
const stdBoxes = () => stdMin() / 120;
const fmtBox = b => String(Math.round(b * 100) / 100);
// ステータスごとのBOX配分(alloc)の比率を保ったまま、合計をboxesにそろえる
function scaleAlloc(alloc, boxes) {
  const ks = Object.keys(alloc).filter(k => alloc[k] > 0); const tot = ks.reduce((a, k) => a + alloc[k], 0); const out = {};
  if (!ks.length || !(tot > 0)) return alloc;
  let used = 0; ks.forEach((k, i) => { if (i < ks.length - 1) { out[k] = Math.round(alloc[k] / tot * boxes * 10000) / 10000; used += out[k]; } });
  out[ks[ks.length - 1]] = Math.round((boxes - used) * 10000) / 10000; return out;
}
// 複数タグ(今年の目標・クエスト・予定で共通)。区切りは空白・カンマ
const tagParse = s => { const r = []; String(s || '').split(/[,、，\s]+/).forEach(t => { t = t.replace(/^#/, '').trim().slice(0, 12); if (t && r.indexOf(t) < 0) r.push(t); }); return r.slice(0, 8); };
const oTags = o => Array.isArray(o.tags) ? o.tags : (o.tag ? tagParse(o.tag) : []);
// その日の空いている時間(9:00から)に入れる
function autoSlot(s, date, boxes) {
  const dur = boxes * 120; let t = 540;
  s.events.filter(e => e.date === date).sort((a, b) => a.start - b.start).forEach(e => { if (t < evEnd(e) && t + dur > e.start) t = evEnd(e); });
  return clampStart(t, boxes);
}
const allocTotal = a => Math.round(Object.values(a).reduce((x, y) => x + y, 0) * 1000) / 1000;
// 1つの予定(ステータスごとのBOX配分 alloc)を達成にしたときの、獲得Pt・G・MP。Ptはステータスごとに計算する。
function calcEvent(s, o, np) {
  const lv = s.skills; const pen = np ? 1 : penalty(s);
  const xpBy = {}; let xp = 0;
  STATS.forEach(st => {
    const b = o.alloc[st.id] || 0;
    if (b > 0) {
      const v = Math.round(b * CFG.BASE_XP_PER_BOX * starMult(s, o.star) * (1 + 0.10 * lv.accel) * catMult(s, st.id) * pen);
      xpBy[st.id] = v; xp += v;
    }
  });
  const boxes = allocTotal(o.alloc);
  const g = Math.round(boxes * CFG.BASE_G_PER_BOX * (1 + 0.10 * lv.alch));
  const mp = Math.round(boxes * (o.star === 5 ? CFG.MP_PER_BOX_ZONE : CFG.MP_PER_BOX) * (1 - 0.05 * lv.iron));
  return { xpBy: xpBy, xp: xp, g: g, mp: mp, boxes: boxes };
}
function calcQuest(s, q, np) {
  return {
    xp: Math.round(q.xp * (1 + 0.10 * s.skills.accel) * catMult(s, q.cat) * (np ? 1 : penalty(s))),
    g: Math.round(q.g * (1 + 0.10 * s.skills.alch))
  };
}
function shopGain(s, item) { return item.mp >= CFG.MP_MAX ? CFG.MP_MAX : Math.round(item.mp * (1 + 0.10 * s.skills.spa)); }
const inRange = (d, g) => d >= g.start && d <= g.end;
const newId = () => 'e' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
// 予定を入れる。ステータスの配分(alloc)は、このときに決める。達成にするまで、ステータスには反映されない。
function addEvent(s0, spec) {
  const s = clone(s0); const boxes = allocTotal(spec.alloc);
  const start = spec.start != null ? clampStart(spec.start, boxes) : autoSlot(s0, spec.date, boxes);
  s.events.push({ id: newId(), date: spec.date, start: start, gk: spec.gk || null, area: spec.area || '', alloc: spec.alloc, boxes: boxes, star: 0, done: false, xpBy: {}, xp: 0, g: 0, spent: 0 });
  return s;
}
function updateEvent(s0, id, spec) {
  const i = s0.events.findIndex(e => e.id === id);
  if (i < 0 || s0.events[i].done) return s0;
  const s = clone(s0); const e = s.events[i];
  e.date = spec.date; e.gk = spec.gk || null; e.area = spec.area || ''; e.alloc = spec.alloc; e.boxes = allocTotal(spec.alloc);
  e.start = clampStart(spec.start != null ? spec.start : e.start, e.boxes);
  return s;
}
// 予定の長さを変える(終了時間の入力)。ステータスの配分は比率を保つ
function resizeEvent(s0, id, boxes) {
  const i = s0.events.findIndex(e => e.id === id);
  if (i < 0 || s0.events[i].done) return s0;
  const s = clone(s0); const e = s.events[i];
  const mins = clampN(Math.round(boxes * 120 / 15) * 15, 15, DAY_END - e.start);
  e.alloc = scaleAlloc(e.alloc, mins / 120); e.boxes = allocTotal(e.alloc);
  return s;
}
// 日付と開始時間を動かす(ドラッグや時間の入力)。達成済みの予定は、取り消してから動かす。
function moveEvent(s0, id, date, start) {
  const i = s0.events.findIndex(e => e.id === id);
  if (i < 0 || s0.events[i].done) return s0;
  const s = clone(s0); const e = s.events[i];
  e.date = date; e.start = clampStart(start, e.boxes);
  return s;
}
// 予定を達成にして、集中度(★)を決める。Pt・G・BOXが反映される。MPの減りと30以下の補正は、今日の分だけ入る。
function completeEvent(s0, id, star) {
  const i = s0.events.findIndex(e => e.id === id);
  if (i < 0 || s0.events[i].done || s0.events[i].date > s0.day) return s0;
  const s = clone(s0); const ev = s.events[i]; const isToday = ev.date === s.day;
  const c = calcEvent(s, { alloc: ev.alloc, star: star }, !isToday);
  ev.done = true; ev.star = star; ev.xpBy = c.xpBy; ev.xp = c.xp; ev.g = c.g; ev.spent = 0;
  addPend(s, c.xpBy, c.g);
  if (isToday) { ev.spent = Math.min(s.mp, c.mp); s.mp -= ev.spent; s.today.boxes += ev.boxes; s.today.xp += c.xp; s.today.g += c.g; }
  return s;
}
// 達成を取り消して、反映していたぶんを戻す(予定は残る)
function undoEvent(s0, id) {
  const i = s0.events.findIndex(e => e.id === id);
  if (i < 0 || !s0.events[i].done || s0.events[i].fin) return s0;
  const s = clone(s0); const ev = s.events[i];
  const neg = {}; for (const k in ev.xpBy) neg[k] = -ev.xpBy[k];
  addPend(s, neg, -ev.g);
  if (ev.date === s.day) {
    s.today.xp = Math.max(0, s.today.xp - ev.xp); s.today.g = Math.max(0, s.today.g - ev.g);
    s.today.boxes = Math.max(0, s.today.boxes - ev.boxes);
    s.mp = clampN(s.mp + ev.spent, 0, CFG.MP_MAX);
  }
  ev.done = false; ev.star = 0; ev.xpBy = {}; ev.xp = 0; ev.g = 0; ev.spent = 0;
  return s;
}
function deleteEvent(s0, id) {
  const e0 = s0.events.find(e => e.id === id); if (!e0 || e0.fin) return s0;
  const s = clone(undoEvent(s0, id));
  s.events = s.events.filter(e => e.id !== id);
  return s;
}
// サブクエスト(デイリーなど)は、その日に押して達成、もう一度押して取り消し
function recordQuest(s0, qid, date) {
  const q = QUESTS.find(x => x.id === qid);
  if (!q || date > s0.day || s0.log.some(x => x.qid === qid && x.date === date)) return s0;
  const s = clone(s0); const isToday = date === s.day;
  const c = calcQuest(s, q, !isToday); const daily = q.kind === 'デイリー';
  s.pts[q.cat] += c.xp; s.gold += c.g;
  if (isToday) { s.done[q.id] = true; if (daily) s.today.habits += 1; s.today.xp += c.xp; s.today.g += c.g; }
  s.log.push({ id: newId(), date: date, kind: 'quest', cat: q.cat, qid: qid, text: q.name, xp: c.xp, g: c.g, daily: daily });
  return s;
}
function reverseQuest(s0, e) {
  const s = clone(s0);
  s.pts[e.cat] = Math.max(0, s.pts[e.cat] - e.xp); s.gold = Math.max(0, s.gold - e.g);
  if (e.date === s.day) {
    s.today.xp = Math.max(0, s.today.xp - e.xp); s.today.g = Math.max(0, s.today.g - e.g);
    delete s.done[e.qid]; if (e.daily) s.today.habits = Math.max(0, s.today.habits - 1);
  }
  s.log = s.log.filter(x => x.id !== e.id);
  return s;
}
// 期間(今週・今月)のBOX。d=達成済み、p=まだ達成にしていない予定
function periodBoxes(s, g) {
  let d = 0, p = 0;
  s.events.forEach(e => { if (inRange(e.date, g)) { if (e.done) d += e.boxes; else p += e.boxes; } });
  return { d: d, p: p };
}
function areaBoxes(s, gk, name) {
  const g = s.goals[gk]; let d = 0, p = 0;
  s.events.forEach(e => { if (e.gk === gk && e.area === name && inRange(e.date, g)) { if (e.done) d += e.boxes; else p += e.boxes; } });
  return { d: d, p: p };
}
// 予定BOXのアイコン(領域ごとのステータス)のうち、まだ予定に入れていないもの
function areaPool(s, gk, a) {
  const g = s.goals[gk]; const pool = a.stats.slice(0, a.box);
  s.events.forEach(e => {
    if (e.gk === gk && e.area === a.name && inRange(e.date, g)) {
      STAT_IDS.forEach(id => { let n = e.alloc[id] || 0; while (n-- > 0) { const i = pool.indexOf(id); if (i >= 0) pool.splice(i, 1); else if (pool.length) pool.pop(); } });
    }
  });
  return pool;
}
/* ご褒美ショップ: 交換(購入)すると交換所に入り、交換所で使うとMP回復とステータスが付く */
const shopList = () => { const l = SHOP.filter(x => (state.shopHide || []).indexOf(x.id) < 0).concat(state.custom || []); const o = state.shopOrder || []; const ix = id => { const n = o.indexOf(id); return n < 0 ? 999 : n; }; return l.map((x, n) => [x, n]).sort((a, b) => ix(a[0].id) - ix(b[0].id) || a[1] - b[1]).map(x => x[0]); };
const shopItems = s => SHOP.concat(s.custom || [], LEGACY);
function buyItem(s0, id) {
  const it = shopItems(s0).find(x => x.id === id);
  if (!it || it.locked || it.legacy || s0.gold < it.g) return s0;
  const s = clone(s0);
  s.gold -= it.g; s.inv[id] = (s.inv[id] || 0) + 1;
  s.shopLog.unshift({ kind: 'buy', name: it.name, n: 1, g: it.g, at: Date.now() });
  return s;
}
function useGain(s, it, n) { return it.mp >= CFG.MP_MAX ? CFG.MP_MAX : shopGain(s, it) * n; }
function settleUse(s0, uses) {
  const s = clone(s0); let any = false;
  Object.keys(uses).forEach(id => {
    const it = shopItems(s0).find(x => x.id === id); const n = Math.min(uses[id] || 0, s.inv[id] || 0);
    if (!it || n <= 0) return;
    any = true; const gain = useGain(s, it, n);
    s.mp = Math.min(CFG.MP_MAX, s.mp + gain);
    for (const k in it.pts) s.pts[k] += it.pts[k] * n;
    s.inv[id] -= n; if (s.inv[id] <= 0) delete s.inv[id];
    s.shopLog.unshift({ kind: 'use', name: it.name, n: n, mp: gain, at: Date.now() });
  });
  return any ? s : s0;
}
function addCustomItem(s0, f) {
  const name = String(f.name || '').trim().slice(0, 40);
  if (!name) return s0;
  const pt = clampInt(f.pt, 0, 999, 0); const pts = {};
  if (pt > 0 && STAT_IDS.indexOf(f.stat) >= 0) pts[f.stat] = pt;
  const s = clone(s0);
  s.custom.push({ id: 'c' + newId(), cat: String(f.cat || '').trim().slice(0, 20) || 'オリジナル', name: name, g: clampInt(f.g, 0, 999999, 0), mp: clampInt(f.mp, 0, 100, 0), pts: pts, custom: true });
  return s;
}
function delCustomItem(s0, id) {
  if ((s0.inv[id] || 0) > 0) return s0;
  const s = clone(s0); s.custom = s.custom.filter(x => x.id !== id); return s;
}
/* スキル: 割り振り(draft)は「決定」で確定し、確定後は変えられない */
const draftTotal = d => Object.values(d).reduce((a, b) => a + b, 0);
function commitSkills(s0, draft) {
  if (!draftTotal(draft) || draftTotal(draft) > s0.sp - spentSP(s0)) return s0;
  const s = clone(s0);
  for (const id in draft) s.skills[id] = Math.min(10, s.skills[id] + draft[id]);
  return s;
}
/* SPは、条件を満たした時点で自動で入る(転生を待たない) */
const SP_RANKS = [[6000, 'A'], [9000, 'S'], [12000, 'SSS'], [13500, 'UE1'], [16500, 'UD1']];
const SP_STAT_PT = 2400;
function syncSP(s0) {
  const total = sumPts(s0.pts); const have = s0.spRank || 0; const got = s0.spStats || [];
  let rk = 0; SP_RANKS.forEach((r, i) => { if (total >= r[0]) rk = i + 1; });
  const fresh = STATS.filter(st => s0.pts[st.id] >= SP_STAT_PT && got.indexOf(st.id) < 0);
  if (rk <= have && !fresh.length) return s0;
  const s = clone(s0); const parts = []; let gain = 0;
  for (let i = have; i < rk; i++) { gain++; parts.push('総合ランク ' + SP_RANKS[i][1] + ' に到達'); }
  s.spStats = got.slice();
  fresh.forEach(st => { gain++; parts.push(st.name + '(' + st.id + ') が 2,400 Pt に到達'); s.spStats.push(st.id); });
  s.spRank = Math.max(have, rk); s.sp = (s.sp || 0) + gain;
  s.notices = s.notices || [];
  s.notices.unshift({ id: newId(), text: 'SPを ' + gain + ' 獲得しました。' + parts.join('、'), at: Date.now(), read: false });
  return s;
}
// </logic>

/* ---- v15: 朝・夜の習慣の時間 / 時間単位の計上 ---- */
const HABT_DEF = { morning: [420, 480], night: [1320, 1410] };
const HABCAL = { morning: 1, night: 1 };
const habT = hk => { const t = (state.habT || {})[hk]; return Array.isArray(t) && t.length === 2 ? t : HABT_DEF[hk]; };
const isTU = u => u === '分' || u === '時間';
const fmtAmt = v => String(Math.round((Number(v) || 0) * 100) / 100);
// 「今日の終了」を決めたとき、朝・夜の習慣の記録をカレンダーの予定(完了済み)にする
function habCalFlush(s0) {
  const list = (s0.habCal || []).filter(h => !h.flushed); if (!list.length) return s0;
  const adds = list.map(h => { const dur = Math.max(15, h.end - h.start); const nm = (HAB.find(x => x[0] === h.hk) || [0, h.hk])[1]; const dist = habDist(h.hk);
    const alloc = distSum(dist) > 0 ? allocFromDist(dist, dur / 120) : { REG: dur / 120 };
    return { h: h, ev: { id: newId(), date: h.date, start: h.start, gk: 'week', area: nm, alloc: alloc, boxes: dur / 120, star: 0, done: true, fin: true, xpBy: {}, xp: 0, g: 0, spent: 0, memo: h.memo || '', tags: [], habCal: true } };
  });
  const s = clone(s0);
  adds.forEach(x => { s.events.push(x.ev); s.habCal.find(y => y.id === x.h.id).flushed = true; });
  return s;
}

/* ---- v15: 転生。その周回で獲得したSPの量で、選べる特別券の枚数がふえる(何周目かは関係ない) ---- */
const RB_TICKETS = [['k1', '旅行特別券'], ['k2', 'ガジェット特別券'], ['k3', '体験特別券']];
const RB_STEP = 3; // SPがこの数ふえるごとに、選べる枚数が+1(はじめは1枚)
const cycSP = s => Math.max(0, (Number(s.sp) || 0) - (Number(s.cycSP0) || 0));
const rbPicks = s => 1 + Math.floor(cycSP(s) / RB_STEP);
function rebirth(s0, pick) {
  const tot = RB_TICKETS.reduce((a, t) => a + (Number(pick[t[0]]) || 0), 0);
  if (tot < 1 || tot > rbPicks(s0)) return s0;
  const s = clone(s0); const got = [];
  RB_TICKETS.forEach(t => { const n = Number(pick[t[0]]) || 0; if (n > 0) { s.inv[t[0]] = (s.inv[t[0]] || 0) + n; got.push(t[1] + ' ×' + n); } });
  s.cycle = (s.cycle || 1) + 1; s.cycSP0 = s.sp || 0;
  s.shopLog.unshift({ kind: 'buy', name: '転生: ' + got.join('、'), n: 1, g: 0, at: Date.now() });
  return s;
}
