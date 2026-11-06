/* ---- sync / widgets ---- */
function viewSync() {
  const hOn = state.health.on; const nOn = state.notion.on;
  const rec = state.notion.log[0];
  const recHTML = rec
    ? '<dl class="kv">' + Object.keys(rec).map(k => '<dt>' + esc(k) + '</dt><dd>' + esc(rec[k] == null ? '—' : rec[k]) + '</dd>').join('') + '</dl>'
    : '<div class="note">まだ保存していません。</div>';
  return '<div class="stack"><div><button class="btn sm" data-action="tab" data-tab="home">← ホームへ</button></div>' +
    '<section class="sec"><h2 class="sh">Google Health<span class="status' + (hOn ? ' on' : '') + '">' + (hOn ? '読み取り済み(試作)' : '未接続') + '</span></h2><div class="form">' +
      '<div class="note">朝にエナジースコアを読み取って、その日のMPの出だしにします。読み取れない日は60にして、ホームのMPを点線の枠とオレンジの文字でお知らせします。歩数と睡眠時間も同じところから読み取ります。</div>' +
      '<div class="hgrid"><label class="field"><span class="lbl">エナジースコア</span><input class="in" id="hEnergy" type="number" inputmode="numeric" min="0" max="100" value="' + (ui.h.energy == null ? '' : ui.h.energy) + '" data-ui="h.energy" data-t="n"></label>' +
      '<label class="field"><span class="lbl">歩数</span><input class="in" type="number" inputmode="numeric" min="0" value="' + (ui.h.steps == null ? '' : ui.h.steps) + '" data-ui="h.steps" data-t="n"></label>' +
      '<label class="field"><span class="lbl">睡眠時間(h)</span><input class="in" type="number" inputmode="decimal" step="0.1" min="0" value="' + (ui.h.sleep == null ? '' : ui.h.sleep) + '" data-ui="h.sleep" data-t="n"></label></div>' +
      '<div class="btnrow"><button class="btn primary" data-action="hread">読み取れた日にする</button><button class="btn" data-action="hunread">読み取れなかった日にする</button></div>' +
      '<div class="note">この試作はブラウザの中なので、端末の健康データには届きません。ここで値を入れて、MPの反映や色の変化を確かめられます。実際の読み取りは、アプリ化のときに作ります。</div>' +
    '</div></section>' +
    '<section class="sec"><h2 class="sh">Notion<span class="status' + (nOn ? ' on' : '') + '">' + (nOn ? '接続済み(試作)' : '未接続') + '</span></h2><div class="form">' +
      '<div class="note">毎日のステータスをNotionのデータベースに1日1行で残します。ランク、各ステータスのPt、MP、ゴールド、BOX、歩数、睡眠が入ります。</div>' +
      '<div class="btnrow">' + (nOn ? '' : '<button class="btn" data-action="nconnect">接続する(試作)</button>') +
      '<button class="btn primary" data-action="nsave"' + (nOn ? '' : ' disabled') + '>今日のデータを保存</button></div>' +
      '<div><span class="lbl">保存される行の内容</span>' + recHTML + '</div>' +
      '<div class="note">この試作は、実際にはNotionへ送りません。保存される内容の確認用です。</div>' +
    '</div></section></div>';
}

function wgSmall() {
  const total = sumPts(state.pts); const r = rankOf(total); const fb = fallbackMP();
  return '<div class="wg tier-' + tierOf(r.label) + '"><span class="lbl">総合ランク · ' + state.cycle + '周目</span><span class="wg-rank">' + r.label + '</span><span class="p">' + fmt(total) + ' Pt</span>' +
    '<div class="gauge">' + barHTML(state.mp, 'var(--mp-fill)') + '<span class="th"></span></div><span class="p' + (fb ? ' fbk' : '') + '">MP ' + state.mp + (fb ? ' (仮)' : '') + '</span></div>';
}
const wgol = n => { const os = state.goals.week.outcomes.filter(o => o.t && o.t.trim()); const d = os.filter(o => o.done).length;
  return '<div class="wgo"><span class="lbl">今週の成果目標 · ' + d + ' / ' + os.length + ' 達成</span>' + (os.length ? '<ul class="wol">' + os.slice(0, n).map(o => '<li' + (o.done ? ' class="done"' : '') + '>' + esc(o.t) + '<i class="num">' + (Number(o.v) || 0) + '/' + o.n + o.u + '</i></li>').join('') + '</ul>' : '<span class="p">ゴールで決めると出ます</span>') + '</div>'; };
// 大: ランク・MP・ステータス・成果目標(総合ランクの数字は1か所だけ)
function wgMedium() {
  const total = sumPts(state.pts); const r = rankOf(total); const fb = fallbackMP();
  const vb = STATS.map(s => '<div class="vb" style="--c:' + lc(s.id) + '"><div class="col"><i style="--h:' + statRank(state.pts[s.id]).pct + '%"></i></div><span>' + statRank(state.pts[s.id]).label + '</span></div>').join('');
  return '<div class="wg tier-' + tierOf(r.label) + '"><div class="wg-row"><div><span class="lbl">総合ランク · ' + state.cycle + '周目</span><div class="wg-rank">' + r.label + '</div></div>' +
    '<div class="stk"><span class="p' + (fb ? ' fbk' : '') + '">MP ' + state.mp + (fb ? ' (仮)' : ' / 100') + '</span><div class="gauge">' + barHTML(state.mp, 'var(--mp-fill)') + '<span class="th"></span></div><span class="p" style="color:var(--gold)">' + fmt(state.gold) + ' G</span></div></div>' +
    '<div class="vbars">' + vb + '</div>' + wgol(3) + '</div>';
}
// 中: 総合ランク・ステータス・MP・成果目標・各クエスト
function wgMid() {
  const total = sumPts(state.pts); const r = rankOf(total); const fb = fallbackMP(); const q = questStats(state.day);
  const st = STATS.map(s => { const sr = statRank(state.pts[s.id]); return '<div class="wst" style="--c:' + lc(s.id) + '"><b>' + sr.label + '</b><span class="col"><i style="--h:' + sr.pct + '%"></i></span><small>' + s.id + '</small></div>'; }).join('');
  const qc = (n, a) => '<span><small>' + n + '</small><b class="num">' + a[0] + '<i>/' + a[1] + '</i></b></span>';
  return '<div class="wg wgm tier-' + tierOf(r.label) + '"><div class="wgm-t"><div><span class="lbl">総合ランク · ' + state.cycle + '周目</span><span class="wg-rank">' + r.label + '</span><span class="p">' + fmt(total) + ' Pt</span></div>' +
    '<div class="wgm-b"><span class="p' + (fb ? ' fbk' : '') + '">MP ' + state.mp + (fb ? ' (仮)' : '') + '</span><div class="gauge">' + barHTML(state.mp, 'var(--mp-fill)') + '<span class="th"></span></div></div></div>' +
    '<div class="wsts">' + st + '</div>' + wgol(2) +
    '<div class="wgm-q">' + qc('サブ', q.sub) + qc('イベント', q.ev) + qc('緊急', q.ur) + '</div></div>';
}
const wlab = (t, h) => '<div class="wl"><small class="wsz">' + t + '</small>' + h + '</div>';
function wgOutcomes() {
  const g = state.goals.week; const os = g.outcomes.filter(o => o.t && o.t.trim()); const d = os.filter(o => o.done).length;
  return '<div class="wg"><span class="lbl">今週の成果目標</span><span class="t">' + d + '<small> / ' + os.length + ' 達成</small></span>' +
    (os.length ? '<ul class="wol">' + os.slice(0, 4).map(o => '<li' + (o.done ? ' class="done"' : '') + '>' + esc(o.t) + '<i class="num">' + (Number(o.v) || 0) + '/' + o.n + o.u + '</i></li>').join('') + '</ul>' : '<span class="p">ゴールで決めると出ます</span>') + '</div>';
}
// 横長(高さをおさえた帯)のランク&ステータス
function wgWide() {
  const total = sumPts(state.pts); const r = rankOf(total); const fb = fallbackMP();
  const st = STATS.map(s => { const sr = statRank(state.pts[s.id]); return '<div class="wst" style="--c:' + lc(s.id) + '"><b>' + sr.label + '</b><span class="col"><i style="--h:' + sr.pct + '%"></i></span><small>' + s.id + '</small></div>'; }).join('');
  return '<div class="wg wgw tier-' + tierOf(r.label) + '"><div class="wgw-l"><span class="lbl">総合ランク · ' + state.cycle + '周目</span><span class="wg-rank">' + r.label + '</span><span class="p">' + fmt(total) + ' Pt</span></div>' +
    '<div class="wgw-r"><div class="wsts">' + st + '</div><div class="wgw-b"><span class="p' + (fb ? ' fbk' : '') + '">MP ' + state.mp + (fb ? ' (仮)' : '') + '</span><div class="gauge">' + barHTML(state.mp, 'var(--mp-fill)') + '</div><span class="p" style="color:var(--gold)">' + fmt(state.gold) + ' G</span></div></div></div>';
}
// カレンダー(大): 週と月を切り替え
function wgCalendar() {
  const month = ui.wcv === 'month'; const today = state.day;
  const seg = '<span class="seg mini" role="group" aria-label="表示"><button data-action="wcv" data-v="week" aria-pressed="' + !month + '">週</button><button data-action="wcv" data-v="month" aria-pressed="' + month + '">月</button></span>';
  const dots = d => state.events.filter(e => e.date === d).sort((a, b) => a.start - b.start);
  let body, title;
  if (!month) {
    const ws = sundayOf(today); title = md2(ws) + '〜' + md2(addDays(ws, 6));
    body = '<div class="wcw">' + wdList().map((_, i) => { const d = addDays(ws, i); const dt = parseISO(d); const E = dots(d);
      return '<div class="wcd' + (d === today ? ' today' : '') + '"><b>' + WD[dt.getDay()] + '</b><span class="num">' + dt.getDate() + '</span>' + E.slice(0, 3).map(e => '<i class="wce' + (e.done ? ' done' : '') + '" style="--c:' + lc(primaryStat(e)) + '">' + esc(evName(e)) + '</i>').join('') + (E.length > 3 ? '<small>+' + (E.length - 3) + '</small>' : '') + '</div>'; }).join('') + '</div>';
  } else {
    const m = today.slice(0, 7); const first = m + '-01'; const dt0 = parseISO(first); title = dt0.getFullYear() + '年' + (dt0.getMonth() + 1) + '月';
    const gs = sundayOf(first); const cells = []; for (let i = 0; i < 42; i++) { const d = addDays(gs, i); if (i >= 35 && d.slice(0, 7) !== m) break; cells.push(d); }
    body = '<div class="wcm">' + wdList().map((_, i) => '<b class="wh">' + WD[(WKS + i) % 7] + '</b>').join('') + cells.map(d => { const E = dots(d); const dt = parseISO(d);
      return '<div class="wmc' + (d.slice(0, 7) !== m ? ' out' : '') + (d === today ? ' today' : '') + '"><span class="num">' + dt.getDate() + '</span><span class="wdots">' + E.slice(0, 4).map(e => '<i style="--c:' + lc(primaryStat(e)) + '"></i>').join('') + '</span></div>'; }).join('') + '</div>';
  }
  return '<div class="wg wgc"><div class="wgc-h"><span class="lbl">カレンダー · ' + title + '</span>' + seg + '</div>' + body + '</div>';
}
function wgToday() {
  const t = state.today; const w = state.goals.week; const pb = periodBoxes(state, w);
  return '<div class="wg"><span class="lbl">今日</span><span class="t">' + t.boxes + '<small> BOX</small></span><span class="p">今週 ' + pb.d + '/' + sumBoxes(w) + '</span><span class="p" style="color:var(--gold)">+' + fmt(t.g) + ' G</span></div>';
}
function wgStrip() {
  return '<div class="wg"><span class="lbl">所持ゴールド</span><span class="t" style="color:var(--gold)">' + fmt(state.gold) + '<small> G</small></span></div>';
}
/* ---- ホーム画面ウィジェット: 種類ごとに別々のウィジェットを、外側・内側の画面へ自由に設置 ---- */
const WG_CAT = {
  big: { name: 'ランクとステータス', size: '大', info: '総合ランク・MP・ステータス・成果目標', fn: wgMedium },
  cal: { name: 'カレンダー', size: '大', info: '週と月を切り替え', fn: wgCalendar },
  mid: { name: 'ランク・ステータス・クエスト', size: '中', info: '総合ランク・ステータス・MP・成果目標・各クエスト', fn: wgMid },
  wide: { name: 'ランクとステータス', size: '横長', info: '総合ランク・ステータス・MPの帯', fn: wgWide },
  outc: { name: '成果目標', size: '小', info: '今週の成果目標', fn: wgOutcomes },
  today: { name: '今日', size: '小', info: '今日のBOXと今週の進み具合', fn: wgToday },
  small: { name: '総合ランク', size: '小', info: '総合ランクとMP', fn: wgSmall },
  gold: { name: '所持ゴールド', size: '小', info: '所持ゴールド', fn: wgStrip }
};
function wgPlaced() {
  if (!state.wgp || !state.wgp.list) { const o = state.wgp; state.wgp = { list: o ? (o.cover || []).concat(o.inner || []) : [{ id: 'w1', t: 'big' }, { id: 'w2', t: 'cal' }, { id: 'w3', t: 'mid' }, { id: 'w4', t: 'wide' }] }; }
  return state.wgp.list;
}
function wgScreen() {
  const L = wgPlaced(); const ed = !!ui.wgEdit;
  const items = L.filter(w => WG_CAT[w.t]).map((w, i) => '<div class="wl' + (ed ? ' wled' : '') + '"><small class="wsz">' + WG_CAT[w.t].size + ' ・ ' + WG_CAT[w.t].name + '</small>' + WG_CAT[w.t].fn() +
    (ed ? '<div class="wctl2"><button class="btn sm" data-action="wgmv" data-id="' + w.id + '" data-d="-1" aria-label="上へ"' + (i ? '' : ' disabled') + '>↑</button><button class="btn sm" data-action="wgmv" data-id="' + w.id + '" data-d="1" aria-label="下へ"' + (i < L.length - 1 ? '' : ' disabled') + '>↓</button><button class="btn sm danger" data-action="wgdel" data-id="' + w.id + '" aria-label="このウィジェットを外す">外す</button></div>' : '') + '</div>').join('');
  return '<div class="wp">' + (items || '<div class="note" style="color:#fff;text-align:center">ウィジェットがありません。下の「追加できるウィジェット」から置けます。</div>') + '</div>';
}
function viewWidgets() {
  const cat = Object.keys(WG_CAT).map(t => '<div class="wcat"><div class="wcat-h"><div><b>' + WG_CAT[t].size + ' ・ ' + WG_CAT[t].name + '</b><small>' + WG_CAT[t].info + '</small></div>' +
    '<div class="btnrow"><button class="btn sm primary" data-action="wgadd" data-t="' + t + '">＋ 置く</button></div></div>' +
    '<div class="wcat-p"><div class="wp">' + WG_CAT[t].fn() + '</div></div></div>').join('');
  return '<div class="stack"><div><button class="btn sm" data-action="tab" data-tab="home">← ホームへ</button></div>' +
    '<section class="sec"><h2 class="sh lbe">ホーム画面のウィジェット<small>Galaxy Z Fold 6 · 見た目の試作</small>' + infoBtn('wg') + '<button class="ibtn sm lbe-b' + (ui.wgEdit ? ' on' : '') + '" data-action="wgedit" aria-pressed="' + !!ui.wgEdit + '" aria-label="並べ替え・外す(編集)">' + EDIT_SVG + '</button></h2>' +
    '<div class="devs"><div class="dev dev-inner" aria-label="ホーム画面">' + wgScreen() + '</div></div></section>' +
    '<section class="sec"><h2 class="sh">追加できるウィジェット<small>種類ごとに別々に置けます</small></h2><div class="wcats">' + cat + '</div></section></div>';
}
