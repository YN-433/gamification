/* ---- 省察: レコードの実績を数字で見て → 話す/書く → 要約 → 100点で採点 → 書き出し(PDF→Drive) ---- */
const rbar = (n, t) => barHTML(t ? Math.min(100, n / t * 100) : 0, 'var(--accent)');
const pctOf = (n, t) => t ? Math.round(Math.min(1, n / t) * 100) : 0;
// 期間(週 or 月)のうちの、週のはじまりの日の一覧
const weeksIn = r => { const a = []; for (let d = r.start; d <= r.end; d = addDays(d, 7)) a.push(d); return a; };
function reflFacts(gk, g) {
  if (gk === 'year') return yearFacts(g);
  const r = prevRange(gk, g); const key = reflKey(gk, g); const snap = state.hist && state.hist[key];
  const qe = questEval(gk, g);
  // サブクエスト(習慣目標)
  const hb = snap && snap.habits ? snap.habits : null; const hu = (snap && snap.hunits) || {};
  const subs = (hb ? habList().filter(h => Number(hb[h[0]]) > 0) : []).map(h => {
    const n = state.log.filter(x => x.kind === 'sub' && x.hk === h[0] && inRange(x.date, r)).length;
    return { name: h[1], n: n, t: Number(hb[h[0]]) * (gk === 'month' ? 4 : 1), u: hu[h[0]] || '回' };
  });
  // 成果目標
  const outs = snap && snap.final ? snap.final.outcomes : [];
  // イベント・緊急クエスト(週ごと)
  const ws = weeksIn(r);
  const evs = ws.map(w => { const ew = eventWeek(w); const n = ew.quests.filter(q => qDone(q.key)).length; return { name: ew.theme.name + (ew.theme.mark || ''), n: n, t: ew.quests.length }; });
  const urs = ws.map(w => { const u = urgentInWeek(w); return { name: ws.length > 1 ? jp(w) + '〜の週' : '緊急クエスト', n: u.filter(q => qDone(q.key)).length, t: u.length }; });
  return { range: r, qe: qe, subs: subs, outs: outs, evs: evs, urs: urs, hasSnap: !!snap,
    tp: qe.rows.reduce((a, x) => a + x.plan, 0), td: qe.rows.reduce((a, x) => a + x.d, 0) };
}
function yearFacts(y) {
  const yr = String(y.year); const evs = state.events.filter(e => e.date.slice(0, 4) === yr);
  const months = Array.from({ length: 12 }, (_, i) => { const m = yr + '-' + pad(i + 1); const l = evs.filter(e => e.date.slice(0, 7) === m);
    return { m: i + 1, p: l.reduce((a, e) => a + e.boxes, 0), d: l.filter(e => e.done).reduce((a, e) => a + e.boxes, 0) }; });
  const done = evs.filter(e => e.done); const sw = done.reduce((a, e) => a + (e.star || 0) * e.boxes, 0); const dd = done.reduce((a, e) => a + e.boxes, 0);
  const sub = state.log.filter(x => x.kind === 'sub' && x.date.slice(0, 4) === yr).length;
  const ev = state.log.filter(x => x.kind === 'event' && x.date.slice(0, 4) === yr).length;
  const ur = state.log.filter(x => x.kind === 'urgent' && x.date.slice(0, 4) === yr).length;
  // 年のはじめから今日まで(未来は数えない)の週ごとの、イベント・緊急クエストの数と達成数
  let evT = 0, evN = 0, urT = 0, urN = 0, subT = 0;
  const last = state.day < yr + '-12-31' ? state.day : yr + '-12-31';
  for (let w = sundayOf(yr + '-01-01'); w <= last; w = addDays(w, 7)) {
    const ew = eventWeek(w); evT += ew.quests.length; evN += ew.quests.filter(q => qDone(q.key)).length;
    const u = urgentInWeek(w); urT += u.length; urN += u.filter(q => qDone(q.key)).length;
    const h = state.hist && state.hist['week:' + w];
    if (h && h.habits) habList().forEach(k => { const n = Number(h.habits[k[0]]) || 0; const u2 = (h.hunits && h.hunits[k[0]]) || '回'; if (n > 0 && (u2 === '回' || u2 === '日')) subT += n; });
  }
  return { year: y.year, items: y.items, months: months, tp: months.reduce((a, x) => a + x.p, 0), td: dd, star: dd ? sw / dd : 0, sub: sub, ev: ev, ur: ur, evT: evT, evN: evN, urT: urT, urN: urN, subT: subT };
}
const rowH = (n, t, u, opt) => '<div class="evr x3"><span class="cn">' + esc(opt.name) + '</span><span class="num' + (t && n >= t ? ' ok' : '') + '">' + n + ' / ' + t + ' ' + u + '</span><span class="num"><small>' + (t ? pctOf(n, t) + '%' : '—') + '</small></span></div>';
const headH = (a, b, c) => '<div class="evr x3 hd"><span>' + a + '</span><span>' + b + '</span><span>' + c + '</span></div>';
// 各項目: 見出しに全体の達成度(数字とバー)だけ出し、詳細はプルダウンで開く
function rdet(id, title, sumHTML, pct, body, info) {
  return '<details class="rd" data-rd="' + id + '"' + (ui.rdo && ui.rdo[id] ? ' open' : '') + '><summary><span class="rdt">' + title + '</span><span class="rds">' + sumHTML + '</span><span class="rdc">⌄</span>' + (pct != null ? '<span class="rdb">' + barHTML(pct, 'var(--accent)') + '</span>' : '') + '</summary><div class="rdbody">' + body + '</div></details>';
}
const sumN = (n, t, u) => '<b class="num">' + n + ' / ' + t + '</b>' + (u ? ' <small>' + u + '</small>' : '') + (t ? ' <em>' + pctOf(n, t) + '%</em>' : '');
function yearGoalsBody(F) {
  const sh = yShown();
  const rows = sh.map(x => '<div class="yitem"><div class="yrow' + (x.o.done ? ' done' : '') + '"><button class="tick" data-action="ytick" data-i="' + x.i + '" aria-label="達成にする" aria-pressed="' + !!x.o.done + '"><span class="check">' + (x.o.done ? '✓' : '') + '</span></button><button class="yt ytb" data-action="yopen" data-i="' + x.i + '" aria-expanded="' + !!(ui.yo && ui.yo[x.i]) + '">' + esc(x.o.t) + '</button></div>' + yDet(x.o, x.i) + '</div>').join('');
  return '<div class="yfrow">' + (yTags().length ? '<span class="lbl">タグで絞り込み</span>' : '<small>タグをつけると、ここで絞り込めます。</small>') + '</div>' + yFilterPanel(true) + (rows || '<div class="note">' + (F.items.length ? 'このタグの目標はありません。' : '今年の目標がありません。') + '</div>') + '<small>チェックをつけると、達成にできます。</small>';
}
function reflFactsHTML(gk, g, label) {
  const F = reflFacts(gk, g);
  const evc = inner => '<div class="cmp evc">' + inner + '</div>';
  if (gk === 'year') {
    const dn = F.items.filter(o => o.done).length;
    const star = F.star ? ' ・ 質(星)の平均 ' + F.star.toFixed(1) : '';
    return rdet('y-goal', '今年の目標', sumN(dn, F.items.length, '達成'), pctOf(dn, F.items.length), yearGoalsBody(F)) +
      rdet('y-box', '月ごとのBOX', sumN(F.td, F.tp, 'BOX'), pctOf(F.td, F.tp), evc(headH('月', '達成 / 予定', '') + F.months.filter(m => m.p).map(m => rowH(m.d, m.p, 'BOX', { name: m.m + '月' })).join('') + (F.tp ? '' : '<div class="note" style="padding:8px 10px">予定はまだありません。</div>')) + '<div class="note">' + (star ? star.slice(3) : '質(星)の平均 —') + '</div>') +
      rdet('y-sub', 'サブクエスト(習慣)', sumN(Math.min(F.sub, F.subT || F.sub), F.subT, '回'), F.subT ? pctOf(F.sub, F.subT) : null, evc('<div class="evr x3"><span class="cn">1年でこなした回数</span><span class="num">' + F.sub + ' 回</span><span></span></div>' + (F.subT ? '<div class="evr x3"><span class="cn">目標の合計(決定した週)</span><span class="num">' + F.subT + ' 回</span><span></span></div>' : ''))) +
      rdet('y-ev', 'イベントクエスト', sumN(F.evN, F.evT, '件'), pctOf(F.evN, F.evT), evc('<div class="evr x3"><span class="cn">今日までのイベント</span><span class="num">' + F.evN + ' / ' + F.evT + ' 件</span><span></span></div>')) +
      rdet('y-ur', '緊急クエスト', '<b class="num">' + F.urN + '</b> <small>件こなした(出た数 ' + F.urT + ')</small>', null, evc('<div class="evr x3"><span class="cn">こなした数 / 出た数</span><span class="num">' + F.urN + ' / ' + F.urT + ' 件</span><span></span></div>') + '<div class="note">やらなくてよい追加枠です。できたらすごい！</div>');
  }
  const qe = F.qe; let h = '';
  // 1) メインクエスト
  h += rdet('box', 'クエスト評価(BOX)', sumN(F.td, F.tp, 'BOX') + (qe.star ? ' <small>★' + qe.star.toFixed(1) + '</small>' : ''), pctOf(F.td, F.tp),
    (qe.rows.length ? '<div class="cmp evc"><div class="evr hd"><span>クエスト(' + label + ')</span><span>達成 / 予定</span><span>質(星)</span></div>' + qe.rows.map(x =>
      '<div class="evr"><span class="cn">' + esc(x.name) + '</span><span class="num' + (x.plan && x.d >= x.plan ? ' ok' : '') + '">' + x.d + ' / ' + x.plan + ' BOX<small>' + Math.round(x.rate * 100) + '%</small></span><span class="evs">' + (x.d ? starsHTML(x.star) + '<small>' + x.star.toFixed(1) + '</small>' : '<small>—</small>') + '</span></div>').join('') +
      '<div class="evr tot"><span class="cn">' + (gk === 'week' ? '週全体' : '月全体') + '</span><span class="num">' + F.td + ' / ' + F.tp + ' BOX<small>' + pctOf(F.td, F.tp) + '%</small></span><span class="evs">' + (qe.star ? starsHTML(qe.star) + '<small>' + qe.star.toFixed(1) + '</small>' : '<small>—</small>') + '</span></div></div>'
      : '<div class="note">' + label + 'の予定・実績はまだありません。</div>'));
  // 2) サブクエスト(習慣目標)
  const sN = F.subs.reduce((a, s) => a + Math.min(s.n, s.t), 0), sT = F.subs.reduce((a, s) => a + s.t, 0);
  h += rdet('sub', 'サブクエスト(習慣目標)', F.subs.length ? sumN(sN, sT, '回') : '<small>—</small>', F.subs.length ? pctOf(sN, sT) : null,
    F.subs.length ? '<div class="cmp evc">' + headH('習慣', '達成 / 目標', '') + F.subs.map(s => rowH(s.n, s.t, s.u === '日' || s.u === '回' ? s.u : '回(目標' + s.u + ')', { name: s.name })).join('') + '</div>' : '<div class="note">' + (F.hasSnap ? '習慣の目標がありませんでした。' : '目標を決定したときの記録がないため、習慣の目標は出せません。') + '</div>');
  // 3) 成果目標
  const oD = F.outs.filter(o => o.done).length;
  h += rdet('out', '成果目標', F.outs.length ? sumN(oD, F.outs.length, '達成') : '<small>—</small>', F.outs.length ? pctOf(oD, F.outs.length) : null,
    F.outs.length ? '<div class="cmp evc">' + F.outs.map(o => '<div class="evr x3"><span class="cn">' + esc(o.t) + '</span><span class="num ' + (o.done ? 'ok' : '') + '">' + (o.n != null ? (o.v || 0) + ' / ' + o.n + (o.u || '') : (o.done ? '達成' : '未達成')) + '</span><span class="' + (o.done ? 'ok' : '') + '">' + (o.done ? '達成' : '') + '</span></div>').join('') + '</div>' : '<div class="note">成果目標の記録がありません(次の' + (gk === 'week' ? '週' : '月') + 'を始めるときに残ります)。</div>');
  // 4) イベントクエスト
  const eN = F.evs.reduce((a, x) => a + x.n, 0), eT = F.evs.reduce((a, x) => a + x.t, 0);
  h += rdet('ev', 'イベントクエスト', sumN(eN, eT, '件'), pctOf(eN, eT), '<div class="cmp evc">' + headH('イベント', '達成 / 全部', '') + F.evs.map(e => rowH(e.n, e.t, '件', { name: e.name })).join('') + '</div>');
  // 5) 緊急クエスト(おまけ枠)
  const urN = F.urs.reduce((a, x) => a + x.n, 0), urT = F.urs.reduce((a, x) => a + x.t, 0);
  h += rdet('ur', '緊急クエスト<span class="rdh">おまけ</span>', '<b class="num">' + urN + '</b> <small>件こなした(出た数 ' + urT + ')</small>' + (urN ? ' ✨' : ''), null,
    '<div class="cmp evc">' + headH('週', 'やった数', '') + F.urs.map(u => '<div class="evr x3"><span class="cn">' + esc(u.name) + '</span><span class="num' + (u.n ? ' ok' : '') + '">' + u.n + ' / ' + u.t + ' 件</span><span>' + (u.n ? '✨' : '') + '</span></div>').join('') + '</div>' +
    (urN ? '<div class="note" style="color:var(--accent);font-weight:700">' + urN + '件も追加でこなしました。すごい！</div>' : '') + '<div class="note">やらなくてよい追加枠です。できたらすごい！</div>');
  return '<div class="rdl">' + h + '</div>';
}
// AIに渡す、実績のまとめ
function reflFactsText(gk, g, label) {
  const F = reflFacts(gk, g);
  if (gk === 'year') return F.year + '年。今年の目標: ' + (F.items.map(o => o.t + (o.done ? '(達成)' : '(未達成)')).join('、') || 'なし') + '。BOX 達成' + F.td + '/予定' + F.tp + '、質の平均星' + F.star.toFixed(1) + '。サブクエスト' + F.sub + '回、イベント' + F.ev + '件、緊急' + F.ur + '件。';
  return label + 'の実績。' + F.qe.rows.map(x => x.name + ' ' + x.d + '/' + x.plan + 'BOX(星' + x.star.toFixed(1) + ')').join('、') + '。全体 ' + F.td + '/' + F.tp + 'BOX。' +
    '習慣: ' + (F.subs.map(s => s.name + ' ' + s.n + '/' + s.t + s.u).join('、') || 'なし') + '。成果目標: ' + (F.outs.map(o => o.t + (o.done ? '(達成)' : '(未達成)')).join('、') || 'なし') + '。' +
    'イベント: ' + F.evs.map(e => e.n + '/' + e.t).join(',') + '。緊急(おまけ): ' + F.urs.reduce((a, x) => a + x.n, 0) + '件こなした。';
}
const reflLabel = gk => gk === 'week' ? '先週' : gk === 'month' ? '先月' : '今年';
function reflSection(gk, g) {
  const key = reflKey(gk, g); const label = reflLabel(gk);
  const rf = state.refl[key] || { text: '', score: null, done: false };
  const pd = ui.pdf && ui.pdf.key === key ? ui.pdf : null; const has = !!String(rf.text || '').trim();
  const range = gk === 'year' ? g.year + '年' : jp(prevRange(gk, g).start) + ' 〜 ' + jp(prevRange(gk, g).end);
  const busy = ui.rbusy === key; const folder = gk === 'week' ? '週の目標・省察' : gk === 'month' ? '月の目標・省察' : '年の目標・省察';
  const sample = ui.sample;
  const score = rf.score != null ? '<div class="rsc"><small>総合評価(AI採点)</small><b class="num">' + rf.score + '<small> / 100点</small></b>' + (rf.comment ? '<div class="note">' + esc(rf.comment) + '</div>' : '') + '</div>' : '';
  const goldRate = gk === 'week' ? 10 : gk === 'month' ? 30 : 100;
  let exp;
  if (pd && pd.busy) exp = '<div class="note" role="status">PDFを作って、Google Driveに保存しています…</div>';
  else exp = (rf.saved ? '<div class="note" style="color:var(--accent);font-weight:700" role="status">Google Driveに保存済み: ' + esc(rf.saved.name) + '</div>' + (rf.saved.url ? '<a class="btn sm" style="display:inline-grid;place-items:center;text-decoration:none;justify-self:start" href="' + esc(rf.saved.url) + '" target="_blank" rel="noopener">Driveで開く</a>' : '') : '') +
    (pd && pd.err ? '<div class="note warn" role="alert">' + esc(pd.err) + '</div>' : '') +
    '<div class="btnrow"><button class="btn primary sm" data-action="reflretry"' + (has ? '' : ' disabled') + '>書き出し(PDFをDriveに保存)</button><button class="btn sm" data-action="reflsave"' + (has ? '' : ' disabled') + '>PDFを端末に保存</button></div>' +
    '<div class="note">' + (gk === 'week' ? '週' : gk === 'month' ? '月' : '年') + 'の様式のPDFにして、Google Driveの「' + folder + '」フォルダに入れます。</div>';
  const done = rf.done ? '<div class="note" style="font-weight:700">省察は完了しています' + (rf.gold ? '(+' + fmt(rf.gold) + ' G)' : '') + '。</div>' :
    '<button class="btn primary block" data-action="reflcomplete"' + (has && rf.score != null ? '' : ' disabled') + '>省察を完了する(ゴールド)</button><div class="note">採点のあとに完了できます。点×' + goldRate + 'Gが入ります。</div>';
  return '<section class="sec"><h2 class="sh">' + label + 'の省察<small>' + range + '</small></h2><div class="form">' +
    '<div class="note">' + infoBtn('reflflow') + '</div>' +
    reflFactsHTML(gk, g, label) +
    '<label class="field"><span class="lbl">ふりかえり<small>　マイクで話すか、文字で入力</small></span><span class="mfield tall">' + (rf.done ? '' : micBtn()) + '<textarea class="in" rows="6" data-rf="text"' + (rf.done ? ' disabled' : '') + ' placeholder="うまくいったこと、うまくいかなかったこと、次に変えることを話します。">' + esc(rf.text || '') + '</textarea></span></label>' +
    (rf.done ? '' : '<div class="btnrow"><button class="btn sm" data-action="reflsum"' + (has && sample && !busy ? '' : ' disabled') + '>' + (busy && ui.rwhat === 'sum' ? '要約中…' : '要約してテキストにする') + '</button><button class="btn primary sm" data-action="reflscore"' + (has && sample && !busy ? '' : ' disabled') + '>' + (busy && ui.rwhat === 'score' ? '採点中…' : '採点してもらう(100点満点)') + '</button></div>' +
      (sample ? '' : '<div class="note">この表示ではAIの要約・採点が使えません。点数は下の欄に自分で入れられます。<input class="in" type="number" inputmode="numeric" min="0" max="100" value="' + (rf.score == null ? '' : rf.score) + '" data-rf="score" style="max-width:120px;display:inline-block" aria-label="総合評価"> 点</div>') +
      (ui.rerr ? '<div class="note warn" role="alert">' + esc(ui.rerr) + '</div>' : '')) +
    score + done + exp + '</div></section>';
}
async function reflAI(what) {
  const gk = ui.gk; const g = state.goals[gk]; const key = reflKey(gk, g); const rf = state.refl[key] || (state.refl[key] = { text: '', score: null, done: false });
  if (!ui.sample || ui.rbusy || !String(rf.text || '').trim() || rf.done) return;
  ui.rbusy = key; ui.rwhat = what; ui.rerr = ''; render(); const label = reflLabel(gk);
  try {
    const facts = reflFactsText(gk, g, label);
    if (what === 'sum') {
      const r = await ui.sample.json('あなたは、振り返り(省察)の聞き役です。次の「話した内容」は、ユーザーが' + label + 'をふりかえって話したものです。ユーザー本人の一人称・常体で、読みやすい4〜8文に要約してください。事実と気持ち、次に変えることを残し、新しい事実は足さないでください。\nJSONオブジェクト {"summary": string} だけを返してください。\n--- 話した内容 ---\n' + rf.text, { cache: false });
      if (!r || typeof r.summary !== 'string') throw { code: 'invalid_json' };
      rf.raw = rf.raw || rf.text; rf.text = r.summary.trim(); rf.score = null; rf.comment = '';
    } else {
      const r = await ui.sample.json('あなたは、ユーザーの' + label + 'の省察を100点満点で採点するコーチです。次の「実績」と「省察」を見て、(1)数字の達成度 (2)ふりかえりの具体性と気づき (3)次の行動の明確さ を総合して0〜100の整数で採点し、やさしく具体的に2〜3文のコメントをください。緊急クエストは、やらなくてよい追加枠なので、できていれば加点し、できていなくても減点しないでください。\nJSONオブジェクト {"score": number, "comment": string} だけを返してください。\n--- 実績 ---\n' + facts + '\n--- 省察 ---\n' + rf.text, { cache: false });
      if (!r || isNaN(Number(r.score))) throw { code: 'invalid_json' };
      rf.score = clampInt(r.score, 0, 100, 0); rf.comment = String(r.comment || '').trim();
    }
    save();
  } catch (e) { if (!e || e.code !== 'cancelled') ui.rerr = sampleErr(e); }
  ui.rbusy = ''; render();
}
