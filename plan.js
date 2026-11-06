/* ---- goals tab ---- */
const SAMPLE_ERR = {
  not_granted: 'Claudeの利用が許可されていません。許可すると使えます。', sampling_disabled: 'このアカウントでは自動記入を使えません。',
  rate_limited: '回数の上限に近づいています。少し待ってからもう一度押してください。', session_expired: 'ログインし直してから、もう一度お試しください。',
  invalid_json: 'うまく読み取れませんでした。もう少し具体的に話してから、もう一度押してください。', refused: 'この内容は自動記入できませんでした。表現を変えてお試しください。',
  upstream_error: '通信が途切れました。もう一度押してください。', empty_completion: 'うまく読み取れませんでした。内容を足してもう一度お試しください。'
};
const sampleErr = e => (e && SAMPLE_ERR[e.code]) || '自動記入に失敗しました。もう一度お試しください。';

/* 省察は「ひとつ前の期間」のものを書く */
const prevRange = (gk, g) => { const d = gk === 'week' ? 7 : 28; return { start: addDays(g.start, -d), end: addDays(g.start, -1) }; };
const reflKey = (gk, g) => gk === 'year' ? 'year:' + g.year : gk + ':' + prevRange(gk, g).start;
function prevSummary(gk, g) {
  const r = prevRange(gk, g); const byArea = {}; let d = 0, p = 0;
  state.events.forEach(e => {
    if (!inRange(e.date, r)) return;
    const k = e.area || '目標なし'; byArea[k] = byArea[k] || { name: k, d: 0, p: 0 };
    if (e.done) { byArea[k].d += e.boxes; d += e.boxes; } else { byArea[k].p += e.boxes; p += e.boxes; }
  });
  return { range: r, d: d, p: p, areas: Object.keys(byArea).map(k => byArea[k]) };
}
/* レコード(実績)から、その期間のクエストごとの評価を出す */
function questEval(gk, g) {
  const r = prevRange(gk, g); const snap = state.hist && state.hist[reflKey(gk, g)];
  const by = {};
  state.events.forEach(e => {
    if (!inRange(e.date, r) || !e.area) return;
    const b = by[e.area] || (by[e.area] = { name: e.area, p: 0, d: 0, sw: 0, n: 0 });
    b.p += e.boxes; if (e.done) { b.d += e.boxes; b.n++; b.sw += (e.star || 0) * e.boxes; }
  });
  const names = []; if (snap) snap.areas.forEach(a => names.push(a.name)); Object.keys(by).forEach(k => { if (names.indexOf(k) < 0) names.push(k); });
  const rows = names.map(n => {
    const b = by[n] || { name: n, p: 0, d: 0, sw: 0, n: 0 }; const sa = snap ? snap.areas.find(a => a.name === n) : null;
    const plan = Math.max(sa ? sa.box : 0, b.p); const rate = plan ? Math.min(1, b.d / plan) : 0; const star = b.d ? b.sw / b.d : 0;
    return { name: n, plan: plan, d: b.d, n: b.n, rate: rate, star: star };
  });
  const tp = rows.reduce((a, x) => a + x.plan, 0), td = rows.reduce((a, x) => a + Math.min(x.d, x.plan), 0), sw = rows.reduce((a, x) => a + x.star * x.d, 0), dd = rows.reduce((a, x) => a + x.d, 0);
  const rate = tp ? td / tp : 0, star = dd ? sw / dd : 0;
  return { rows: rows, rate: rate, star: star, hint: tp ? Math.round(rate * 60 + star / 5 * 40) : null };
}
const starsHTML = s => { const f = Math.round(s); return '<span class="stars" aria-label="星' + s.toFixed(1) + '">' + '★'.repeat(f) + '<i>' + '★'.repeat(5 - f) + '</i></span>'; };
function evalHTML(gk, g, label) {
  const ev = questEval(gk, g);
  if (!ev.rows.length) return '<div class="note">' + label + 'の予定・実績はまだありません。</div>';
  const rows = ev.rows.map(x => '<div class="evr"><span class="cn">' + esc(x.name) + '</span><span class="num' + (x.plan && x.d >= x.plan ? ' ok' : '') + '">' + x.d + ' / ' + x.plan + ' BOX<small>' + Math.round(x.rate * 100) + '%</small></span><span class="evs">' + (x.d ? starsHTML(x.star) + '<small>' + x.star.toFixed(1) + '</small>' : '<small>—</small>') + '</span></div>').join('');
  return '<div class="cmp evc"><div class="evr hd"><span>クエスト(' + label + ')</span><span>こなした数</span><span>質(星)</span></div>' + rows +
    '<div class="evr tot"><span class="cn">ぜんぶ</span><span class="num">達成 ' + Math.round(ev.rate * 100) + '%</span><span class="evs">' + (ev.star ? starsHTML(ev.star) + '<small>' + ev.star.toFixed(1) + '</small>' : '<small>—</small>') + '</span></div></div>' +
    '<div class="note">レコードに残した実績から自動で出しています。星は、そのクエストの完了した予定の平均(BOXの長さで重みづけ)です。</div>';
}

/* ---- 共通パーツ ---- */
const MIC_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3"/></svg>';
const micBtn = () => '<button type="button" class="micb" data-action="micf" aria-label="話して入力">' + MIC_SVG + '</button>';
const GRIP_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const INFO = {
  stats: ['5つのステータス', '魅力(CHA)：身だしなみ・人づきあい・美意識など、人に向けた行動。\n免疫(IMM)：食事・睡眠・運動・休養など、からだを整える行動。\n体力(STR)：運動・筋トレ・外出など、からだを動かす行動。\n規律(REG)：片づけ・習慣・仕事や家事の継続など、決めたことを守る行動。\n知性(INT)：学習・読書・制作・企画など、頭を使う行動。\n\nどれに入るかは、クエスト・成果目標・習慣を作るときの「ステータスの配分」で決まります。1BOX(2時間)こなすと、その配分でPtが入ります(★で×0.8〜2.0)。成果目標は達成したとき、習慣はこなしたときに入ります。確定は「今日を終了」で行われます。'],
  cal: ['カレンダーの使い方', '左右で時間、上下で週を動かします。予定を長押ししてドラッグすると動かせます。タップすると、報告・★評価・削除ができます。月表示では、日付を押すとその週の時間表示に移り、クエストを日付に落とすと空いている時間に入ります。'],
  tray: ['クエストを置く', 'クエストを長押ししてカレンダーにドラッグします(1回で1BOX)。置いた数が、各クエストの予定BOXに自動で入ります。メインクエストで時間の変更・報告・評価ができます。'],
  qlist: ['クエストの並べ替え・削除', '上から優先順です(1,2,3…。常駐クエストは「-」)。見出しを長押しして並べ替え、ゴミ箱へドラッグで消せます。ゴミ箱を押すと×が出ます。'],
  numunit: ['数値と単位', '回・日・個・つ・人・分などの単位を選んで、目標の数値を入れられます。右上の✎を押すと、並べ替えと削除ができます。'],
  decide: ['「決定」について', '決定すると、クエストと成果目標の名前・配分は変えられなくなります。あとから足すことはできます。直したいときは「決定を解除して直す」を押します。'],
  reflflow: ['省察の流れ', '① レコードの数字を確認 → ② マイクで話す(またはテキスト) → ③ 要約してテキストにする → ④ 100点満点で採点 → ⑤ 書き出し(PDFをGoogleドライブに保存)。'],
  urgent: ['緊急クエストについて', 'やらなくてOKです。追加でできたらすごい！という枠なので、できていなくても評価は下がりません。'],
  board: ['クエストボード', '成果目標・サブクエスト・イベント・緊急は、内容と数だけを表示します。達成の記録は「クエスト受付」で行います。'],
  qhist: ['クエスト一覧について', 'これまでに作ったクエストを見返す場所です(閲覧用)。押すと、ステータスの配分と、週・月ごとの予定BOXと実績が見られます。クエストを作ったり直したりするのは、ゴールの「今週の目標」で行います。'],
  wg: ['ウィジェットの置き方', '「追加できるウィジェット」から、種類ごとに別々に置けます。同じ種類を何枚でも置けます。Galaxy Z Foldでは、外側の画面の2ページ目が、内側の画面では追加で表示されるだけなので、外側・内側を分けずに1つの並びで置きます。右上の✎を押すと、並べ替えと外すことができます。実際のホーム画面ウィジェットはAndroid専用の仕組みで作るので、アプリ化の段階で用意します。'],
  ach: ['今週の達成度', '成果目標・サブクエスト・イベントクエスト・緊急クエストの今週の達成数です。押すと、1つずつの詳細が見られます。']
};
const infoBtn = id => '<button class="ibtn sm infob" type="button" data-action="pop" data-k="info" data-id="' + id + '" aria-label="説明を見る">' + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></svg></button>';
const INFO_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></svg>';
const EDIT_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3"/></svg>';
const editBtn = k => '<button class="ibtn sm lbe-b" data-action="gedit" data-k="' + k + '" aria-pressed="' + !!(ui.ge && ui.ge[k]) + '" aria-label="並べ替え・削除(編集)">' + EDIT_SVG + '</button>';
const PLUS_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
const distChips = d => STAT_IDS.filter(k => d[k] > 0).map(k => '<span class="dch" style="--c:' + lc(k) + '">' + k + ' ' + d[k] + '</span>').join('') || '<span class="dch none">配分なし</span>';
// ステータスの配分エディタ(kind: a=クエスト o=成果目標 h=習慣)。スライダーで動かし、合計が決まった値になるまで決定できない
function distEditor(kind, key, dist, total) {
  const sum = distSum(dist); const d = fullDist(dist);
  const rows = STATS.map(s => { const id = 'data-ds="' + kind + ':' + key + ':' + s.id + '"';
    return '<div class="dsr" style="--c:' + lc(s.id) + '"><span class="dsl">' + s.id + '</span><button type="button" class="dsb" data-action="dst" ' + id + ' data-d="-1" aria-label="' + s.id + 'を1減らす">−</button>' +
      '<input type="range" min="0" max="' + total + '" step="1" value="' + d[s.id] + '" ' + id + ' aria-label="' + s.id + 'のpt"><button type="button" class="dsb" data-action="dst" ' + id + ' data-d="1" aria-label="' + s.id + 'を1増やす">＋</button><b class="num dsn">' + d[s.id] + '</b></div>'; }).join('');
  return '<div class="dse" data-total="' + total + '"><div class="dsum' + (sum === total ? ' ok' : '') + '">ステータスの配分　合計 <b class="num">' + sum + '</b> / ' + total + ' pt<small>' + (sum < total ? '(あと ' + (total - sum) + ')' : sum === total ? '(OK)' : '') + '</small></div>' + rows + '</div>';
}
function distRef(kind, key) {
  const g = state.goals[ui.gk];
  if (kind === 'a') return g.areas[+key] && g.areas[+key].dist;
  if (kind === 'o') return g.outcomes[+key] && g.outcomes[+key].dist;
  if (kind === 'h') { const c = (state.hab || []).find(h => h.id === key); if (c) return c.dist; state.habDist = state.habDist || {}; if (!state.habDist[key]) state.habDist[key] = habDist(key); return state.habDist[key]; }
  return null;
}
function distOf(name) {
  for (const k of ['week', 'month']) { const a = state.goals[k].areas.find(x => x.name === name && distSum(x.dist) === DIST_TOTAL.a && !x.ed); if (a) return a.dist; }
  const l = state.qlib && state.qlib[name]; return l && distSum(l) === DIST_TOTAL.a ? fullDist(l) : null;
}

// クエスト1つ分。見出しを押すと開閉、見出しを長押しでドラッグ(並べ替え・ゴミ箱)
function qCard(k, g, a, i) {
  const lk = a.locked; const bx = areaBox(g, a);
  const open = ui.qo[a.id] != null ? ui.qo[a.id] : a.ed;
  const ok = String(a.name || '').trim() && distSum(a.dist) === DIST_TOTAL.a;
  const num = g.areas.slice(0, i).filter(x => !x.res).length + 1;
  const head = '<summary' + (a.res ? '' : ' data-drag="qord" data-gk="' + k + '" data-i="' + i + '"') + '><span class="qn' + (a.res ? ' dash' : '') + '">' + (a.res ? '-' : num) + '</span><span class="qt">' + (esc(a.name) || '<i>新しいクエスト</i>') + '</span>' +
    '<span class="qdc">' + (a.res ? '<span class="dch res">常駐</span>' : '') + '<span class="dch ww" style="--c:' + wwOf(a)[1] + '">' + wwOf(a)[0] + '</span>' + distChips(a.dist) + '</span><span class="qm num">' + bx + '<small>BOX' + (a.rec ? ' / 目安' + a.rec : '') + '</small></span>' +
    (ui.delMode && !lk && !a.res ? '<button type="button" class="xbtn" data-action="delarea" data-i="' + i + '" aria-label="このクエストを消す">×</button>' : '') + '</summary>';
  let body;
  if (a.ed && !lk) {
    body = '<div class="ahead mfield"><input class="in" type="text" aria-label="クエスト名" placeholder="クエスト名(例：副業)" value="' + esc(a.name) + '" data-f="areas.' + i + '.name">' + micBtn() + '</div>' +
      '<div class="av"><span class="lbl">価値観<small> 自分の価値観をどれだけ満たすか 1〜10</small></span><div class="alc big"><button data-action="aval" data-i="' + i + '" data-d="-1" aria-label="価値観を下げる">−</button><b class="num">' + a.value + '</b><button data-action="aval" data-i="' + i + '" data-d="1" aria-label="価値観を上げる">＋</button></div></div>' +
      '<div class="wwsel"><div class="seg" role="group" aria-label="want・must"><button data-action="aww" data-i="' + i + '" data-k="want" data-v="w" aria-pressed="' + (a.want !== 'm') + '">want</button><button data-action="aww" data-i="' + i + '" data-k="want" data-v="m" aria-pressed="' + (a.want === 'm') + '">must</button></div>' +
        '<div class="seg" role="group" aria-label="working・private"><button data-action="aww" data-i="' + i + '" data-k="work" data-v="1" aria-pressed="' + !!a.work + '">working</button><button data-action="aww" data-i="' + i + '" data-k="work" data-v="0" aria-pressed="' + !a.work + '">private</button></div>' +
        '<div class="note">枠の色が変わります: <span class="wwk">' + Object.keys(WW).map(x => '<i style="--c:' + WW[x][1] + '">' + WW[x][0] + '</i>').join('') + '</span></div></div>' +
      distEditor('a', i, a.dist, DIST_TOTAL.a) +
      '<div class="note">基本' + DIST_TOTAL.a + 'ptを5つのステータスに分けます。1BOX(2時間)こなすたびに、この配分でPtが入ります(★で×0.8〜2.0)。同じ名前のクエストは、同じ配分を引き継ぎます。</div>' +
      '<button class="btn primary block" data-action="aok" data-i="' + i + '"' + (ok ? '' : ' disabled') + '>決定</button>';
  } else {
    body = '<div class="qrd"><div class="qrr"><span class="lbl">価値観</span><b class="num">' + a.value + '</b><span class="lbl">予定BOX</span><b class="num">' + bx + '</b><small>(' + bx * 2 + '時間・カレンダーに置いた数)</small></div>' +
      '<div class="qrr"><span class="lbl">配分</span><span class="dcs">' + distChips(a.dist) + '</span></div></div>' +
      '<div class="dates"><label class="field"><span class="lbl">タグ</span><span class="mfield"><input class="in" type="text" value="' + esc(a.tag || '') + '" data-f="areas.' + i + '.tag" placeholder="例：転職">' + micBtn() + '</span></label>' +
      '<label class="field"><span class="lbl">内容の詳細</span><span class="mfield"><input class="in" type="text" value="' + esc(a.memo || '') + '" data-f="areas.' + i + '.memo" placeholder="メモ">' + micBtn() + '</span></label></div>' +
      (lk ? '<div class="note">🔒 決定済み(「決定を解除して直す」で変えられます)</div>' : '<div class="btnrow"><button class="btn sm" data-action="aedit" data-i="' + i + '">編集</button></div>') + (a.res ? '<div class="note">常駐クエストです。毎週(月・年は時期になると)自動で入り、消せません。</div>' : '');
  }
  return '<details class="qa' + (lk ? ' locked' : '') + '" data-qa="' + a.id + '" data-qi="' + i + '" style="--fc:' + wwOf(a)[1] + ';--gr:' + gradOf(a.dist) + '"' + (open ? ' open' : '') + '>' + head + '<div class="qbody">' + body + '</div></details>';
}
// 成果目標の行(達成チェック・配分・編集)
function outRow(g, o, i) {
  const lk = o.locked; const ok = String(o.t || '').trim() && distSum(o.dist) === DIST_TOTAL.o;
  if (o.ed && !lk) return '<div class="oed" data-oi="' + i + '"><div class="ahead mfield"><input class="in" type="text" aria-label="成果目標" placeholder="成果目標(例：不動産を見に行く)" value="' + esc(o.t) + '" data-f="outcomes.' + i + '.t">' + micBtn() + '</div>' +
    distEditor('o', i, o.dist, DIST_TOTAL.o) + '<div class="note">達成したとき、この配分のptが1回だけ入ります。</div>' +
    '<div class="btnrow"><button class="btn primary sm" data-action="ook" data-i="' + i + '"' + (ok ? '' : ' disabled') + '>決定</button><button class="btn sm" data-action="delout" data-i="' + i + '">やめる</button></div></div>';
  const ge = ui.ge && ui.ge.o;
  return '<div class="ocrow ow' + (ge ? ' ge' : '') + '" data-oi="' + i + '">' + (ge ? '<span class="grip" data-drag="oord" data-i="' + i + '" role="button" aria-label="長押しして並べ替え">' + GRIP_SVG + '</span>' : '') +
    '<div class="ot2"><span class="ot">' + esc(o.t) + '</span><span class="dcs">' + distChips(o.dist) + '</span></div>' +
    '<span class="hc"><input class="in" type="number" inputmode="decimal" min="0" aria-label="' + esc(o.t) + 'の数値" value="' + (Number(o.n) || 0) + '" data-f="outcomes.' + i + '.n" data-t="n"><select class="in" aria-label="単位" data-ou="' + i + '">' + HAB_UNITS.map(u => '<option' + (u === (o.u || '回') ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></span>' +
    '<span class="oact">' + (lk ? '<span aria-label="決定済み">🔒</span>' : '<button class="lnk" data-action="oedit" data-i="' + i + '">編集</button>') + (ge ? '<button class="xbtn" data-action="delout" data-i="' + i + '" aria-label="この成果目標を消す">×</button>' : '') + '</span></div>';
}
// サブクエスト(習慣目標): 数値と単位(回・日・個・つ・人・分など)を入れる。すべて×で消せる
function habSection(g, wk) {
  const rows = habList().map(h => {
    const id = h[0]; const custom = h[2]; const ed = ui.edH === id; const d = habDist(id); const ok = (!custom || String(h[1] || '').trim()) && distSum(d) === DIST_TOTAL.h;
    const un = habUnit(g, id);
    return '<div class="hbx" data-hi="' + id + '"><div class="hbr' + (ui.ge && ui.ge.h ? ' ge' : '') + '">' + (ui.ge && ui.ge.h ? '<span class="grip" data-drag="hord" data-id="' + id + '" role="button" aria-label="長押しして並べ替え">' + GRIP_SVG + '</span>' : '') + '<span class="hn">' + (esc(h[1]) || '<i>新しい習慣</i>') + '</span><span class="hc"><input class="in" type="number" inputmode="decimal" min="0" aria-label="' + esc(h[1]) + 'の数値" value="' + (Number(g.habits[id]) || 0) + '" data-f="habits.' + id + '" data-t="n">' +
      '<select class="in" aria-label="単位" data-hu="' + id + '">' + HAB_UNITS.map(u => '<option' + (u === un ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></span>' +
      '<span class="oact">' + (ed ? '' : '<button class="lnk" data-action="hedit" data-id="' + id + '">編集</button>') + (ui.ge && ui.ge.h ? '<button class="xbtn" data-action="hdel" data-id="' + id + '" aria-label="この習慣を消す">×</button>' : '') + '</span></div>' +
      (ed ? '<div class="oed">' + (custom ? '<div class="ahead mfield"><input class="in" type="text" aria-label="習慣の名前" placeholder="習慣の名前(例：日記)" value="' + esc(h[1]) + '" data-hn="' + id + '">' + micBtn() + '</div>' : '') +
        distEditor('h', id, d, DIST_TOTAL.h) + '<div class="note">1回達成するたびに、この配分で' + DIST_TOTAL.h + 'ptが入ります。</div><div class="btnrow"><button class="btn primary sm" data-action="hok" data-id="' + id + '"' + (ok ? '' : ' disabled') + '>決定</button></div></div>'
        : '<div class="dcs">' + distChips(d) + '</div>') + '</div>';
  }).join('');
  const hid = HAB.filter(h => (state.habHide || []).indexOf(h[0]) >= 0).map(h => '<button class="tg" data-action="hrestore" data-id="' + h[0] + '">＋ ' + h[1] + '</button>').join('');
  return '<div class="field"><span class="lbl lbe">サブクエスト(習慣目標)' + infoBtn('numunit') + editBtn('h') + '</span>' + rows +
    '<div class="btnrow"><button class="btn sm" data-action="hadd">＋ 習慣を追加</button></div>' + (hid ? '<div class="tagrow"><small>消した習慣を戻す:</small>' + hid + '</div>' : '') + '</div>';
}
function viewGoals() {
  if (ui.gk === 'year') return viewYear();
  const k = ui.gk; const g = state.goals[k]; const wk = k === 'week'; normGoals(g);
  if (ui.gv === 'refl') return '<div class="stack">' + goalSeg() + goalSeg2() + reflSection(k, g) + '</div>';
  const lab = wk ? '今週' : '今月';
  const total = sumBoxes(g);
  const cards = g.areas.map((a, i) => qCard(k, g, a, i)).join('');
  const outs = g.outcomes.map((o, i) => outRow(g, o, i)).join('');
  const strip = wk ? '<div class="field"><span class="lbl lbe">カレンダーに置く' + infoBtn('tray') + '</span>' + questTray() + timeline([g.start], 'goal') +
    '</div>' : '';
  const nUnl = g.areas.filter(a => !a.locked).length + g.outcomes.filter(o => !o.locked).length;
  const nLock = g.areas.filter(a => a.locked).length + g.outcomes.filter(o => o.locked).length;
  return '<div class="stack">' +
    goalSeg() + goalSeg2() + '' +
    '<section class="sec"><h2 class="sh">' + lab + 'の目標<span class="hbtns"><button class="ibtn" data-action="pop" data-k="howto" aria-label="' + lab + 'の目標の作り方">' + INFO_SVG + '</button><button class="ibtn" data-action="addarea" aria-label="クエストを追加">' + PLUS_SVG + '</button><button class="ibtn' + (ui.delMode ? ' on' : '') + '" data-trash="1" data-action="deltoggle" aria-pressed="' + ui.delMode + '" aria-label="ゴミ箱(クエストをここにドラッグして消す)">' + TRASH_SVG + '</button></span></h2><div class="form">' +
      '<div class="dates"><label class="field"><span class="lbl">はじまり</span><input class="in" type="date" value="' + g.start + '" data-f="start"></label><label class="field"><span class="lbl">おわり</span><input class="in" type="date" value="' + g.end + '" data-f="end"></label></div>' +
      '<div class="field"><span class="lbl lbe">クエスト' + infoBtn('qlist') + '</span><div class="qalist" data-qlist="' + k + '">' + (cards || '<div class="note">まだクエストがありません。右上の＋で作ります。</div>') + '</div></div>' +
      '<div class="totalbox"><span><b>計 <span class="v" id="totalBox">' + total + '</span> BOX</b></span><span class="note" id="perDayNote">1日 <input class="in" style="width:64px;min-height:36px;text-align:center;display:inline-block" type="number" inputmode="numeric" min="1" max="12" aria-label="1日のBOXの目安" value="' + g.perDay + '" data-f="perDay" data-t="n"> BOX程度 (1BOX = 2時間)</span></div>' +
      strip +
      '<div class="field"><span class="lbl lbe">成果目標' + infoBtn('numunit') + editBtn('o') + '</span>' + outs + '<button class="btn sm" data-action="addout" style="justify-self:start">＋ 成果目標を足す</button></div>' +
      habSection(g, wk) +
      '<div class="field"><button class="btn primary block" data-action="decide"' + (nUnl ? '' : ' disabled') + '>' + (nUnl ? lab + 'の目標を決定する(未決定 ' + nUnl + '件)' : '決定済み') + '</button>' +
        '<div class="note">' + infoBtn('decide') + '</div>' +
        (nLock ? '<button class="btn sm" data-action="undecide" style="justify-self:start">決定を解除して直す</button>' : '') + '</div>' +
    '</div></section>' +
    '<div class="fine"><small>' + lab + 'の達成 ' + periodBoxes(state, g).d + ' / ' + total + ' BOX</small><button class="btn" data-action="nextperiod">' + (wk ? '次の週を始める' : '次の月を始める') + '</button></div>' +
  '</div>';
}

const goalSeg2 = () => '<div class="seg seg2" role="group" aria-label="目標と省察">' + [['goal', '目標'], ['refl', '省察']].map(x => '<button data-action="gv" data-v="' + x[0] + '" aria-pressed="' + ((ui.gv || 'goal') === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
const goalSeg = () => '<div class="seg" role="group" aria-label="期間">' + [['week', '今週'], ['month', '今月'], ['year', '今年']].map(x => '<button data-action="gk" data-v="' + x[0] + '" aria-pressed="' + (ui.gk === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
function viewYear() {
  const y = state.goals.year; const d = y.items.filter(x => x.done).length;
  const rows = y.items.map((o, i) => '<div class="ocrow' + (o.done ? ' done' : '') + '"><button class="tick" data-action="ytick" data-i="' + i + '" aria-label="達成にする" aria-pressed="' + o.done + '"><span class="check">' + (o.done ? '✓' : '') + '</span></button>' +
    '<input class="in" type="text" aria-label="今年の目標" value="' + esc(o.t) + '" data-y="' + i + '"><button class="xbtn" data-action="ydel" data-i="' + i + '" aria-label="この目標を消す">×</button></div>').join('');
  if (ui.gv === 'refl') return '<div class="stack">' + goalSeg() + goalSeg2() + reflSection('year', y) + '</div>';
  return '<div class="stack">' + goalSeg() + goalSeg2() +
    '<section class="sec"><h2 class="sh">' + y.year + '年の目標<small>' + d + ' / ' + y.items.length + ' 達成</small></h2>' + barHTML(y.items.length ? d / y.items.length * 100 : 0, 'var(--accent)') +
    '<div class="form" style="margin-top:10px">' + (rows || '<div class="note">まだ今年の目標がありません。いくつでも作れます。ホームの「今年」の達成度はこの数から出します。</div>') +
    '<div class="arow2"><input class="in" type="text" data-ui="newYear" value="' + esc(ui.newYear) + '" placeholder="例：転職を決める"><button class="btn primary" data-action="yadd">追加</button></div></div></section></div>';
}

// 目標時(決定したとき)と省察時の比較
function compareHTML(gk, key, sm, rf) {
  const snap = state.hist && state.hist[key]; const r = sm.range;
  const done = {}; sm.areas.forEach(a => { done[a.name] = a.d; });
  const names = snap ? snap.areas.map(a => a.name) : sm.areas.map(a => a.name);
  if (!names.length) return '<div class="note">比較できる目標の記録がありません(決定したときの目標が、次から残ります)。</div>';
  const vals = rf.vals || {};
  const rows = names.map(n => {
    const sa = snap ? snap.areas.find(a => a.name === n) : null; const plan = sa ? sa.box : null; const d = done[n] || 0;
    return '<div class="cmpr"><span class="cn">' + esc(n) + '</span><span class="num">' + (sa ? sa.value : '—') + ' → <input class="in mini" type="number" inputmode="numeric" min="1" max="10" aria-label="' + esc(n) + 'の省察時の価値観" value="' + (vals[n] == null ? '' : vals[n]) + '" data-rv="' + esc(n) + '"' + (rf.done ? ' disabled' : '') + '></span>' +
      '<span class="num' + (plan != null && d >= plan ? ' ok' : '') + '">' + (plan == null ? '—' : plan) + ' → ' + d + '</span></div>';
  }).join('');
  const hb = snap ? snap.habits : null;
  const habs = hb ? habList().filter(h => Number(hb[h[0]]) > 0).map(h => { const n = state.log.filter(x => x.kind === 'sub' && x.hk === h[0] && inRange(x.date, r)).length; const u = (snap.hunits && snap.hunits[h[0]]) || '回'; return '<div class="cmpr h"><span class="cn">' + h[1] + '</span><span></span><span class="num' + (u === '回' && n >= hb[h[0]] ? ' ok' : '') + '">' + hb[h[0]] + u + ' → ' + n + '回</span></div>'; }).join('') : '';
  const outs = snap && snap.final ? snap.final.outcomes.map(o => '<div class="cmpr h"><span class="cn">' + esc(o.t) + '</span><span></span><span class="' + (o.done ? 'ok' : '') + '">' + (o.done ? '達成' : '未達成') + '</span></div>').join('') : '';
  return '<div class="cmp"><div class="cmpr hd"><span>目標時 → 省察時</span><span>価値観</span><span>BOX(予定→実績)</span></div>' + rows +
    (habs ? '<div class="cmpr hd"><span>サブクエスト(習慣目標)</span><span></span><span>目標 → 実績</span></div>' + habs : '') +
    (outs ? '<div class="cmpr hd"><span>成果目標</span><span></span><span></span></div>' + outs : '') + '</div>' +
    '<div class="note">省察時の価値観は、そのクエストが実際に価値観をどれだけ満たしたかを1〜10で入れます。</div>';
}
// 決定したときの目標を残す(省察で比べるため)
function snapGoal(gk) {
  const g = state.goals[gk]; state.hist = state.hist || {};
  const k = gk + ':' + g.start; const old = state.hist[k] || {};
  state.hist[k] = Object.assign(old, { areas: g.areas.filter(a => a.name).map(a => ({ name: a.name, value: a.value, box: areaBox(g, a) })), habits: clone(g.habits), hunits: clone(g.hunits || {}), perDay: g.perDay, at: Date.now() });
}
function finalGoal(gk) {
  const g = state.goals[gk]; state.hist = state.hist || {}; const k = gk + ':' + g.start;
  if (!state.hist[k]) snapGoal(gk);
  state.hist[k].final = { outcomes: g.outcomes.filter(o => o.t).map(o => ({ t: o.t, done: !!o.done, v: o.v, n: o.n, u: o.u })) };
}
// ≡ メニューの「クエスト一覧」: これまでに作ったクエストを見返す場所(閲覧用)
function questHistory() {
  const by = {}; const get = n => by[n] || (by[n] = { name: n, dist: null, value: null, plan: 0, done: 0, last: '', periods: [], cur: false });
  Object.keys(state.hist || {}).forEach(k => {
    const gk = k.split(':')[0]; const start = k.slice(gk.length + 1); const end = addDays(start, gk === 'week' ? 6 : 27); const h = state.hist[k];
    (h.areas || []).forEach(a => { const q = get(a.name); const evs = state.events.filter(e => e.area === a.name && e.date >= start && e.date <= end);
      q.periods.push({ gk: gk, start: start, plan: a.box, done: evs.filter(e => e.done).reduce((t, e) => t + e.boxes, 0), value: a.value }); if (a.value != null) q.value = a.value; });
  });
  ['week', 'month'].forEach(gk => state.goals[gk].areas.forEach(a => { if (!a.name) return; const q = get(a.name); q.cur = true; if (!a.res && distSum(a.dist) > 0) q.dist = q.dist || a.dist; if (q.value == null) q.value = a.value; }));
  Object.keys(state.qlib || {}).forEach(n => { const q = get(n); q.dist = state.qlib[n]; });
  state.events.forEach(e => { if (!e.area) return; const q = by[e.area]; if (!q) return; q.plan += 0; if (e.date > q.last) q.last = e.date; });
  Object.keys(by).forEach(n => { const q = by[n]; const evs = state.events.filter(e => e.area === n); q.plan = evs.reduce((t, e) => t + e.boxes, 0); q.done = evs.filter(e => e.done).reduce((t, e) => t + e.boxes, 0);
    q.periods.sort((x, y) => x.start < y.start ? 1 : -1); if (!q.last && q.periods.length) q.last = q.periods[0].start; });
  return Object.keys(by).map(n => by[n]).sort((x, y) => (y.cur - x.cur) || (x.last < y.last ? 1 : x.last > y.last ? -1 : 0));
}
function viewQList() {
  const list = questHistory();
  const rows = list.map(q => {
    const d = q.dist ? fullDist(q.dist) : null;
    const pr = q.periods.length ? q.periods.map(p => '<div class="achr"><span>' + (p.gk === 'week' ? '週 ' : '月 ') + md2(p.start) + '〜</span><b class="num">予定 ' + p.plan + ' → 実績 ' + p.done + ' BOX' + (p.value != null ? ' · 価値観 ' + p.value : '') + '</b></div>').join('') : '<div class="note">期間ごとの記録はまだありません(目標を決定すると残ります)。</div>';
    return '<details class="qd qh"><summary><b>' + esc(q.name) + (q.cur ? ' <span class="dch ww" style="--c:var(--accent)">いま</span>' : '') + '</b><small>' + (q.done ? q.done + ' / ' : '') + q.plan + ' BOX' + (q.last ? ' · 最終 ' + md2(q.last) : '') + '</small><span class="chev" aria-hidden="true">▾</span></summary>' +
      '<div class="qdb">' + (d ? '<div class="dcs">' + distChips(d) + '</div>' : '') + (q.value != null ? '<div class="note">価値観 ' + q.value + '</div>' : '') + '<div class="achl">' + pr + '</div></div></details>';
  }).join('');
  return '<div class="stack"><div><button class="btn sm" data-action="tab" data-tab="home">← ホームへ</button></div>' +
    '<section class="sec"><h2 class="sh lbe">クエスト一覧<small>これまでに作ったクエスト · ' + list.length + '件</small>' + infoBtn('qhist') + '</h2>' +
      (rows || '<div class="note">まだクエストがありません。ゴールの「今週の目標」で作ると、ここに残ります。</div>') + '</section></div>';
}
