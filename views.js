/* ---- クエスト ---- */
function qItem(q, date) {
  const d = qDone(q.key); const en = qEntry(q.key); const lock = en && en.fin; const fut = date > state.day;
  return '<button class="qi' + (d ? ' on' : '') + '" data-action="qtog" data-key="' + q.key + '" data-date="' + date + '" aria-pressed="' + d + '"' + (lock || fut ? ' disabled' : '') + ' style="--c:' + lc(q.cat) + '">' +
    '<span class="box">' + (d ? '✓' : '') + '</span><span class="qt">' + esc(q.t) + (q.min ? ' <small>' + q.min + '分</small>' : '') + '</span>' +
    (q.target ? '<span class="qc num">' + (q.unit === '回' ? q.cnt + '/' + q.target + '回' : q.target + q.unit + ' · ' + q.cnt + '回') + '</span>' : '<span class="qc num">' + q.cat + '</span>') + '</button>';
}
// サブ・緊急・イベントは、見出しを押すと開け閉めできる
const qdet = (id, head, sub, body, cls) => '<details class="qd' + (cls ? ' ' + cls : '') + '" data-q="' + id + '"' + (ui.qopen[id] ? ' open' : '') + '><summary><b>' + head + '</b><small>' + sub + '</small><span class="chev" aria-hidden="true">▾</span></summary><div class="qdb">' + body + '</div></details>';
function questLists(date) {
  const subs = subFor(date); const urg = urgentFor(date); const ew = eventWeek(date);
  const evD = ew.quests.filter(q => qDone(q.key)).length; const sD = subs.filter(q => qDone(q.key)).length; const uD = urg.filter(q => qDone(q.key)).length;
  return qdet('sub', 'サブクエスト', '今日 ' + sD + '/' + subs.length + ' · 1回 +' + QV.sub.xp + 'Pt +' + QV.sub.g + 'G',
      subs.length ? '<div class="qgrid">' + subs.map(q => qItem(q, date)).join('') + '</div>' : '<div class="note">今週のサブクエスト(習慣目標)がありません。ゴールで回数を入れると出ます。</div>') +
    (urg.length ? qdet('ur', '緊急クエスト', '今日だけ ' + uD + '/' + urg.length + ' · +' + QV.urgent.xp + 'Pt +' + QV.urgent.g + 'G', '<div class="qlist2">' + urg.map(q => qItem(q, date)).join('') + '</div>', 'urgent') : '') +
    qdet('ev', 'イベントクエスト', evD + '/' + ew.quests.length + ' · 全部で +' + QV.bonus + 'G',
      '<div class="evbanner tone-' + ew.theme.tone + '"><span class="mk" aria-hidden="true">' + ew.theme.mark + '</span><div><b>' + esc(ew.theme.name) + (ew.theme.seasonal ? 'イベント' : '') + '</b><small>' + md2(ew.ws) + '〜' + md2(ew.we) + (ew.theme.seasonal ? ' · ' + md2(ew.theme.at) + 'にちなんだ期間限定' : ' · 週替わり') + '</small></div><span class="num evc">' + evD + '/' + ew.quests.length + '</span></div>' +
      '<div class="qlist2" style="margin-top:8px">' + ew.quests.map(q => qItem(q, date)).join('') + '</div>');
}
function viewQuest() {
  const board = ui.qv === 'board';
  let body;
  if (board) body = mainQuestSection('メインクエスト') + boardLists(state.day);
  else {
    const today = dayEvents(state.day);
    const over = state.events.filter(e => !e.done && e.date < state.day && e.date >= addDays(state.day, -7)).sort((a, b) => a.date < b.date ? -1 : 1);
    const row = e => '<div class="rep"><div><b>' + esc(evName(e)) + '</b><small>' + md2(e.date) + ' ' + fmtT(e.start) + '〜' + fmtT(Math.min(evEnd(e), DAY_END)) + ' · ' + STAT_IDS.filter(k => e.alloc[k]).map(k => k + ' ' + Math.round(e.alloc[k] * 20)).join(' ') + '</small></div>' +
      (e.done ? '<span class="pill">★' + e.star + (e.fin ? ' 確定' : ' 報告済み') + '</span>' : '<button class="btn sm primary" data-action="pop" data-k="ev" data-rep="1" data-id="' + e.id + '">報告する</button>') + '</div>';
    body = '<section class="sec"><h2 class="sh">今日のメインクエスト<small>' + md2(state.day) + '</small></h2>' + (today.length ? today.map(row).join('') : '<div class="note">今日のメインクエストはありません。</div>') + '</section>' +
      (over.length ? qdet('over', '報告がまだの予定', '過去7日 · ' + over.length + '件', over.map(row).join('')) : '') +
      acceptLists(state.day);
  }
  return '<div class="stack"><div class="seg" role="group" aria-label="クエスト"><button data-action="qv" data-v="board" aria-pressed="' + board + '">クエストボード</button><button data-action="qv" data-v="report" aria-pressed="' + !board + '">クエスト受付</button></div>' + body + '</div>';
}

/* ---- レコード ---- */
const WIDGETS = {
  qstat: { name: 'クエスト達成度', html: () => { const q = questStats(state.day); return '<div class="wq"><div><small>サブ</small><b class="num">' + q.sub[0] + '<i>/' + q.sub[1] + '</i></b></div><div><small>イベント</small><b class="num">' + q.ev[0] + '<i>/' + q.ev[1] + '</i></b></div><div><small>緊急</small><b class="num">' + q.ur[0] + '<i>/' + q.ur[1] + '</i></b></div></div>'; } },
  gain: { name: '今日獲得予定', html: () => { const p = state.pend; return '<div class="wgain">' + STAT_IDS.map(k => '<span style="color:' + lc(k) + '">' + k + ' <b class="num">+' + (p.pts[k] || 0) + '</b></span>').join('') + '</div><div class="wgain2"><span>ゴールド <b class="num" style="color:var(--gold)">' + fmt(p.gold || 0) + 'G</b></span><span>SP <b class="num">' + spPreview(state) + 'P</b></span></div>'; } },
  health: { name: 'Google Health', html: () => { const fb = fallbackMP(); const t = state.today; return '<div class="wh"><div><small>エナジー</small><b class="num' + (fb ? ' fbk' : '') + '">' + (fb ? '—' : state.morning.score) + '</b></div><div><small>歩数</small><b class="num">' + (t.steps == null ? '—' : fmt(t.steps)) + '</b></div><div><small>睡眠</small><b class="num">' + (t.sleep == null ? '—' : t.sleep + 'h') + '</b></div></div><button class="lnk" data-action="tab" data-tab="sync">連携で読み取る</button>'; } },
  box: { name: 'BOX', html: () => { const tE = dayEvents(state.day); const w = state.goals.week; const pb = periodBoxes(state, w); return '<div class="wq"><div><small>今日</small><b class="num">' + tE.reduce((a, e) => a + (e.done ? e.boxes : 0), 0) + '<i>/' + tE.reduce((a, e) => a + e.boxes, 0) + '</i></b></div><div><small>今週</small><b class="num">' + pb.d + '<i>/' + sumBoxes(w) + '</i></b></div></div>'; } },
  mp: { name: 'MP・調子', html: () => { const c = condition(); return '<div class="wh"><div><small>MP</small><b class="num">' + state.mp + '</b></div><div><small>調子</small><b class="cond ' + c.c + '">' + c.t + '</b></div></div>'; } },
  gold: { name: '所持ゴールド', html: () => '<div class="wh"><div><small>所持</small><b class="num" style="color:var(--gold)">' + fmt(state.gold) + 'G</b></div></div>' }
};
function viewRecord() {
  const day = state.day; const j = state.journal[day] || {}; const closed = state.closed[day];
  const ws = state.widgets.filter(k => WIDGETS[k]);
  const wg = ws.map((k, i) => '<div class="wdg' + (ui.wedit ? ' edit' : '') + '" data-wdg="' + k + '"><div class="wdh"><b>' + WIDGETS[k].name + '</b>' +
    (ui.wedit ? '<span class="wctl"><button data-action="wmv" data-i="' + i + '" data-d="-1" aria-label="前へ"' + (i ? '' : ' disabled') + '>‹</button><button data-action="wmv" data-i="' + i + '" data-d="1" aria-label="後ろへ"' + (i < ws.length - 1 ? '' : ' disabled') + '>›</button><button data-action="wdel" data-k="' + k + '" aria-label="外す">×</button></span>' : '') + '</div>' + WIDGETS[k].html() + '</div>').join('');
  const addable = Object.keys(WIDGETS).filter(k => ws.indexOf(k) < 0);
  const talk = ui.talkOpen ? '<div class="talk"><div class="note">' + (window.SpeechRecognition || window.webkitSpeechRecognition ? (ui.rec ? '<b style="color:var(--warn)">● 聞いています…</b> 話し終わったら止めます。' : 'マイクで1日の感想を話すか、キーボードの音声入力で書いてください。') : 'この画面ではマイクを直接使えないため、キーボードのマイク(音声入力)で話してください。') + '</div>' +
    '<textarea class="in" rows="5" data-ui="talk" placeholder="今日あったこと、感じたことを思いつくまま…">' + esc(ui.talk) + '</textarea>' +
    '<div class="btnrow">' + (window.SpeechRecognition || window.webkitSpeechRecognition ? '<button class="btn" data-action="mic">' + (ui.rec ? '止める' : '話す') + '</button>' : '') +
    '<button class="btn primary" data-action="jsum"' + (ui.jbusy || !ui.sample ? ' disabled' : '') + '>' + (ui.jbusy ? '要約中…' : '要約してジャーナルへ') + '</button><button class="btn" data-action="talkclose">閉じる</button></div>' +
    (ui.sample ? '' : '<div class="note">この表示では要約が使えません。話した内容はそのままジャーナルに書けます。</div>') + (ui.jerr ? '<div class="note warn" role="alert">' + esc(ui.jerr) + '</div>' : '') + '</div>' : '';
  return '<div class="stack">' + mainQuestSection('メインクエスト') + achSection() +
    '<section class="sec"><h2 class="sh">ウィジェット<button class="lnk" data-action="wedit">' + (ui.wedit ? '完了' : '編集') + '</button></h2><div class="wgrid2">' + wg + '</div>' +
      (ui.wedit ? (addable.length ? '<div class="tagrow" style="margin-top:8px">' + addable.map(k => '<button class="tg" data-action="wadd" data-k="' + k + '">＋ ' + WIDGETS[k].name + '</button>').join('') + '</div>' : '') : '<small>ウィジェットを長押しすると、並べ替え・追加・削除ができます。</small>') + '</section>' +
    '<section class="sec"><h2 class="sh">ジャーナル<small>' + md2(day) + '</small></h2>' +
      '<textarea class="in" rows="6" data-jn="text" placeholder="1日の内容">' + esc(j.text || '') + '</textarea>' +
      (j.feedback ? '<div class="jfb"><b>今日のふりかえり</b>' + (j.rating ? '<span class="rate" aria-label="評価 ' + j.rating + '/5">' + '●'.repeat(j.rating) + '<i>' + '○'.repeat(5 - j.rating) + '</i></span>' : '') + '<p>' + esc(j.feedback) + '</p></div>' : '') +
      talk +
      '<div class="endrow">' + (closed ? '<div class="closed">今日は終了しました' + (closed.auto ? '(自動)' : '') + '</div>' : '<button class="btn primary endbtn" data-action="pop" data-k="close">今日を終了</button>') +
        '<button class="micbtn' + (ui.rec ? ' on' : '') + '" data-action="talkopen" aria-label="マイクで1日の感想を話す"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg></button></div>' +
      '<button class="lnk" data-action="mdsave">デイリーノート(.md)として保存</button><small>Obsidianのデイリーノートに入れられる形式です。</small>' +
    '</section></div>';
}

/* ---- ショップ(券買所) ---- */
function viewShop() {
  const inv = ui.sh === 'inv';
  const edit = !!ui.shopEdit; const items = shopList();
  const shop = items.map(it => {
    const own = state.inv[it.id] || 0; const short = state.gold < it.g;
    return '<div class="item' + (edit ? ' sedit' : '') + '" data-si="' + it.id + '">' + (edit ? '<span class="grip" data-drag="sord" data-id="' + it.id + '" aria-label="並べ替え">' + GRIP_SVG + '</span>' : '') + '<div class="ih"><b>' + esc(it.name) + '</b><small>' + esc(it.cat) + ' · MP +' + it.mp + (Object.keys(it.pts || {}).length ? ' · ' + Object.keys(it.pts).map(k => k + ' +' + it.pts[k]).join(' ') : '') + (own ? ' · 所持 ' + own + '枚' : '') + '</small></div>' +
      '<div class="ib"><span class="price num">' + (it.locked ? '転生で解放' : fmt(it.g) + ' G') + '</span>' + (it.locked ? '' : '<button class="btn sm primary" data-action="buy" data-id="' + it.id + '"' + (short ? ' disabled' : '') + '>' + (short ? 'G不足' : '買う') + '</button>') +
      (edit ? '<button class="xbtn" data-action="delitem" data-id="' + it.id + '" aria-label="この券を消す">×</button>' : '') + '</div></div>';
  }).join('');
  const add = !edit ? '' : ui.addItem ? '<div class="form card">' +
    '<label class="field"><span class="lbl">券の名前</span><input class="in" type="text" data-ui="ni.name" value="' + esc(ui.ni.name) + '" placeholder="例：映画鑑賞券 (1,800円)"></label>' +
    '<div class="dates"><label class="field"><span class="lbl">分類</span><input class="in" type="text" data-ui="ni.cat" value="' + esc(ui.ni.cat) + '"></label><label class="field"><span class="lbl">値段(G)</span><input class="in" type="number" inputmode="numeric" data-ui="ni.g" data-t="n" value="' + ui.ni.g + '"></label></div>' +
    '<label class="field"><span class="lbl">MP回復</span><input class="in" type="number" inputmode="numeric" data-ui="ni.mp" data-t="n" value="' + ui.ni.mp + '"></label>' +
    '<div class="btnrow"><button class="btn primary" data-action="additem">追加する</button><button class="btn" data-action="cancelitem">やめる</button></div></div>'
    : '<button class="btn sm" data-action="openitem" style="justify-self:start">＋ 券を追加</button>';
  const owned = Object.keys(state.inv).filter(id => state.inv[id] > 0).map(id => { const it = shopItems(state).find(x => x.id === id); return it ? '<button class="tkt" data-action="pop" data-k="ticket" data-id="' + id + '"><span>' + esc(it.name) + '</span><b class="num">×' + state.inv[id] + '</b></button>' : ''; }).join('');
  const hist = (state.shopLog || []).slice(0, 20).map(h => '<div class="entry"><span>' + (h.kind === 'buy' ? '購入' : '使用') + '　' + esc(h.name) + (h.n > 1 ? ' ×' + h.n : '') + '</span><span class="num">' + (h.kind === 'buy' ? '−' + fmt(h.g) + 'G' : 'MP +' + h.mp) + '　' + new Date(h.at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) + '</span></div>').join('');
  return '<div class="stack"><div class="seg" role="group" aria-label="ショップ"><button data-action="sh" data-v="shop" aria-pressed="' + !inv + '">券買所</button><button data-action="sh" data-v="inv" aria-pressed="' + inv + '">所持券・履歴</button></div>' +
    '<div class="goldbar"><span>所持ゴールド</span><b class="num">' + fmt(state.gold) + ' G</b>' + (state.pend.gold ? '<small>獲得予定 +' + fmt(state.pend.gold) + ' G(今日を終了で確定)</small>' : '<small>1G = 1円</small>') + '</div>' +
    (inv ? '<section class="sec"><h2 class="sh">所持している券<small>タップで使う</small></h2><div class="tkts">' + (owned || '<span class="note">持っている券はありません。</span>') + '</div></section>' +
      '<section class="sec"><h2 class="sh">購入・使用の履歴</h2>' + (hist || '<div class="note">まだ履歴はありません。</div>') + '</section>'
      : '<section class="sec"><h2 class="sh">転生</h2><div class="form">' + (state.rbPend ? '<div class="note">転生の準備ができています。スキルと特別券を選んで、次の周回へ進みます。</div><button class="btn primary block" data-action="rbstart">転生をはじめる</button>' : '<div class="note">転生は、6/30 と 12/31 の「今日を終了」のあとに行います。(いまは ' + state.cycle + '周目)</div>') + '</div></section>' + '<section class="sec"><h2 class="sh">券買所<button class="btn sm shedit" data-action="shopedit" aria-pressed="' + edit + '">' + (edit ? '完了' : '✎ 編集') + '</button></h2>' + shop + add + '</section>') + '</div>';
}

/* ---- スキル獲得 ---- */
function viewSkills() {
  const spent = spentSP(state); const dr = draftTotal(ui.draft); const free = state.sp - spent - dr;
  const rows = SKILLS.map(s => {
    const lv = state.skills[s.id]; const d = ui.draft[s.id] || 0;
    const pips = Array.from({ length: 10 }, (_, i) => '<i class="' + (i < lv ? 'on' : i < lv + d ? 'draft' : '') + '"></i>').join('');
    return '<div class="skill' + (lv >= 6 ? ' goldsk' : '') + '"><div class="skill-top"><div><b>' + s.name + '</b><small>' + s.cat + '</small></div>' +
      '<div class="lvctl"><button class="btn" data-action="lvdn" data-id="' + s.id + '" aria-label="' + s.name + 'の割り振りを1つ戻す"' + (d <= 0 ? ' disabled' : '') + '>−</button><span class="lv">Lv.' + lv + (d ? '<b style="color:var(--accent)"> +' + d + '</b>' : '') + '</span>' +
      '<button class="btn primary" data-action="lvup" data-id="' + s.id + '" aria-label="' + s.name + 'のレベルを上げる"' + (lv + d >= 10 || free <= 0 ? ' disabled' : '') + '>＋</button></div></div>' +
      '<div class="pips" aria-hidden="true">' + pips + '</div>' +
      '<div class="eff2">' + (lv ? '現在 ' + s.eff(lv) : '未習得') + (d ? ' → 決定後 ' + s.eff(lv + d) : '') + '　Lv.10で ' + s.max + '</div></div>';
  }).join('');
  return '<div class="spbox"><div><small>獲得SP(累計) ' + infoBtn('sp') + '</small><span class="v">' + state.sp + '</span></div><div><small>決定済み</small><span class="v">' + spent + '</span></div><div><small>割り振れる</small><span class="v" style="color:var(--accent)">' + free + '</span></div></div>' +
    '<section class="sec"><h2 class="sh">スキル<small>1Lv = 1SP / 最大Lv.10 / Lv.6から金スキル</small></h2>' + rows +
      '<button class="btn primary block" data-action="skcommit" style="margin-top:12px"' + (dr ? '' : ' disabled') + '>' + (dr ? '割り振り ' + dr + ' SP を決定する' : '割り振ってから決定します') + '</button>' +
      '<div class="note" style="margin-top:6px">決定すると、そのレベルは変えられません。決定前なら、＋と−で戻せます。</div></section>';
}

/* ---- ジャーナル: 話した内容を要約して、今日のふりかえり(1〜5)をもらう ---- */
async function journalSummarize() {
  if (!ui.sample || ui.jbusy) return;
  const raw = (ui.talk || '').trim(); if (!raw) { ui.jerr = '話した内容を入れてから押してください。'; render(); return; }
  ui.jbusy = true; ui.jerr = ''; render();
  try {
    const qs = questStats(state.day); const tE = dayEvents(state.day);
    const r = await ui.sample.json('あなたは、日記(ジャーナル)の聞き役です。次の「話した内容」は、ユーザーが1日の終わりに思いつくまま話したもの(エクスプレッシブ・ライティング)です。\n' +
      '1) summary: 話した内容を、ユーザー本人の一人称・常体で、日記として読みやすい3〜6文に要約。事実と気持ちを残し、新しい事実は足さない。\n' +
      '2) feedback: 今日のふりかえりを、やさしく具体的に2〜3文。点数はつけない。\n' +
      '3) rating: 今日の手ごたえを1〜5の整数で(5がとても良い)。\n' +
      '参考: 今日のメインクエスト ' + tE.filter(e => e.done).length + '/' + tE.length + '件、今週のサブ ' + qs.sub[0] + '/' + qs.sub[1] + '。\n' +
      'JSONオブジェクト {"summary": string, "feedback": string, "rating": number} だけを返してください。\n--- 話した内容 ---\n' + raw, { cache: false });
    if (!r || typeof r.summary !== 'string') throw { code: 'invalid_json' };
    const j = state.journal[state.day] || {};
    j.text = (j.text ? j.text.trim() + '\n\n' : '') + r.summary.trim();
    j.feedback = String(r.feedback || '').trim(); j.rating = clampInt(r.rating, 1, 5, null); j.raw = (j.raw ? j.raw + '\n\n' : '') + raw;
    state.journal[state.day] = j; ui.talk = ''; ui.talkOpen = false; save(); toast('ジャーナルに記録しました');
  } catch (e) { if (!e || e.code !== 'cancelled') ui.jerr = sampleErr(e); }
  ui.jbusy = false; render();
}
let recog = null;
function micToggle() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
  if (ui.rec && recog) { recog.stop(); return; }
  try {
    recog = new SR(); recog.lang = 'ja-JP'; recog.continuous = true; recog.interimResults = false;
    const base = ui.talk ? ui.talk.trim() + '\n' : '';
    let got = '';
    recog.onresult = ev => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) got += ev.results[i][0].transcript; ui.talk = base + got; const ta = document.querySelector('[data-ui="talk"]'); if (ta) ta.value = ui.talk; };
    recog.onerror = ev => { ui.rec = false; ui.jerr = ev.error === 'not-allowed' ? 'マイクが使えませんでした。キーボードの音声入力で話してください。' : 'うまく聞き取れませんでした。'; render(); };
    recog.onend = () => { ui.rec = false; render(); };
    recog.start(); ui.rec = true; ui.jerr = ''; render();
  } catch (e) { ui.rec = false; ui.jerr = 'マイクが使えませんでした。キーボードの音声入力で話してください。'; render(); }
}
async function saveDailyNote() {
  const d = state.day; const j = state.journal[d] || {}; const c = state.closed[d]; const tE = dayEvents(d);
  const lines = ['---', 'date: ' + d, 'tags: [journal, gamification]', 'rank: ' + rankOf(sumPts(state.pts)).label, 'mp: ' + state.mp, j.rating ? 'rating: ' + j.rating : null, '---', '', '# ' + jp(d), '',
    '## ジャーナル', j.text || '', '', j.feedback ? '## ふりかえり\n' + j.feedback + '\n' : null,
    '## メインクエスト', tE.length ? tE.map(e => '- [' + (e.done ? 'x' : ' ') + '] ' + fmtT(e.start) + ' ' + evName(e) + ' (' + e.boxes + 'BOX)' + (e.done ? ' ★' + e.star : '')).join('\n') : '- なし', '',
    '## クエスト', state.log.filter(x => x.date === d).map(x => '- [x] ' + x.text).join('\n') || '- なし', '',
    c ? '## 獲得\n' + STAT_IDS.filter(k => c.pts[k]).map(k => '- ' + k + ' +' + c.pts[k]).join('\n') + '\n- ゴールド +' + c.gold + 'G' : null,
    j.raw ? '\n## 話した内容(原文)\n' + j.raw : null].filter(x => x != null);
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (!dl) { toast('この表示では保存を使えません'); return; }
    await dl.save({ filename: d + '.md', data: new Blob([lines.join('\n')], { type: 'text/markdown' }) });
  } catch (e) { if (!e || e.code !== 'declined') toast('保存できませんでした'); }
}

// 各入力欄のマイク: 押して話すと、その欄に文字が入る(使えないときは、キーボードのマイクを案内)
let fieldRec = null;
function micField(btn) {
  const wrap = btn.closest('.mfield'); const f = wrap && wrap.querySelector('input,textarea'); if (!f || f.disabled) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (fieldRec) { const r = fieldRec; fieldRec = null; try { r.stop(); } catch (e) {} document.querySelectorAll('.micb.rec').forEach(b => b.classList.remove('rec')); return; }
  const fallback = () => { f.focus(); toast('キーボードのマイク(音声入力)で話してください'); };
  if (!SR) { fallback(); return; }
  try {
    const r = new SR(); r.lang = 'ja-JP'; r.continuous = false; r.interimResults = false; fieldRec = r; btn.classList.add('rec');
    r.onresult = ev => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) t += ev.results[i][0].transcript; if (!t) return; f.value = (f.value ? f.value.replace(/\s*$/, '') + (f.tagName === 'TEXTAREA' ? '\n' : ' ') : '') + t; f.dispatchEvent(new Event('input', { bubbles: true })); };
    r.onerror = ev => { fieldRec = null; btn.classList.remove('rec'); if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') fallback(); else toast('うまく聞き取れませんでした'); };
    r.onend = () => { fieldRec = null; btn.classList.remove('rec'); };
    r.start();
  } catch (e) { fieldRec = null; btn.classList.remove('rec'); fallback(); }
}

/* ---- クエストボード: 成果目標・サブ・イベント・緊急は「内容と数」だけ ---- */
const bdRows = rows => '<div class="bd">' + rows.map(r => '<div class="bdr"><span>' + esc(r[0]) + '</span><b class="num">' + r[1] + '</b></div>').join('') + '</div>';
function subCount(q) { if (isTU(q.unit)) return fmtAmt(q.amt) + ' / ' + q.target + q.unit; return q.unit === '回' ? q.cnt + ' / ' + q.target + '回' : q.target + q.unit + ' · ' + q.cnt + '回'; }
function boardLists(date) {
  const subs = subFor(date); const urg = urgentInWeek(date); const ew = eventWeek(date);
  const sD = subs.reduce((a, q) => a + (q.unit === '回' ? Math.min(q.cnt, q.target) : q.cnt), 0), sT = subs.reduce((a, q) => a + (q.unit === '回' ? q.target : 0), 0);
  const evD = ew.quests.filter(q => qDone(q.key)).length; const uD = urg.filter(q => qDone(q.key)).length;
  const mk = q => (qDone(q.key) ? '✓ 済' : '—');
  return '<section class="sec"><h2 class="sh">サブクエスト<small>今週 ' + sD + (sT ? ' / ' + sT : '') + ' 回</small></h2>' + (subs.length ? bdRows(subs.map(q => [q.t, subCount(q)])) : '<div class="note">今週のサブクエスト(習慣目標)がありません。</div>') + '</section>' +
    '<section class="sec"><h2 class="sh">イベントクエスト<small>' + esc(ew.theme.name) + ' · ' + evD + ' / ' + ew.quests.length + '</small></h2>' + bdRows(ew.quests.map(q => [q.t, mk(q)])) + '</section>' +
    (urg.length ? '<section class="sec urgent"><h2 class="sh">緊急クエスト<small>今週 ' + uD + ' / ' + urg.length + '</small></h2>' + bdRows(urg.map(q => [q.t, mk(q)])) + '</section>' : '') +
    '<div class="note">' + infoBtn('board') + '</div>';
}
/* ---- クエスト受付: 成果目標・サブ・イベント・緊急をここで評価(数はワンタップで足す) ---- */
function acceptLists(date) {
  const g = state.goals.week; const os = g.outcomes.map((o, i) => ({ o: o, i: i })).filter(x => x.o.t && x.o.t.trim());
  const subs = subFor(date); const urg = urgentFor(date); const ew = eventWeek(date);
  const evD = ew.quests.filter(q => qDone(q.key)).length; const uD = urg.filter(q => qDone(q.key)).length;
  const outH = os.length ? '<div class="qlist2">' + os.map(x => '<div class="subq' + (x.o.done ? ' fin' : '') + '" style="--c:var(--accent)"><span class="qt">' + (x.o.done ? '✓ ' : '') + esc(x.o.t) + '</span><span class="qc num">' + (Number(x.o.v) || 0) + ' / ' + x.o.n + x.o.u + '</span><button class="btn sm" data-action="outdec" data-gk="week" data-i="' + x.i + '" aria-label="' + esc(x.o.t) + 'を1へらす"' + (x.o.v > 0 ? '' : ' disabled') + '>−</button><button class="btn sm primary" data-action="outinc" data-gk="week" data-i="' + x.i + '" aria-label="' + esc(x.o.t) + 'を1ふやす"' + (x.o.done ? ' disabled' : '') + '>＋</button></div>').join('') + '</div>' : '<div class="note">ゴールで成果目標を決めると、ここに出ます。</div>';
  const subH = subs.length ? '<div class="qlist2">' + subs.map(q => '<div class="subq" style="--c:' + lc(q.cat) + '"><span class="qt">' + esc(q.t) + '</span><span class="qc num">' + subCount(q) + '</span><button class="btn sm" data-action="subdec" data-hk="' + q.hk + '" aria-label="' + esc(q.t) + 'を1回へらす"' + (q.cnt ? '' : ' disabled') + '>−</button><button class="btn sm primary" data-action="subinc" data-hk="' + q.hk + '" aria-label="' + esc(q.t) + 'を1回ふやす">＋</button></div>').join('') + '</div>' : '<div class="note">今週のサブクエスト(習慣目標)がありません。ゴールで回数を入れると出ます。</div>';
  return qdet('ao', '成果目標', os.filter(x => x.o.done).length + '/' + os.length + ' 達成', outH) +
    qdet('sub', 'サブクエスト', '今週 ' + subs.reduce((a, q) => a + q.cnt, 0) + '回 · 1回 +' + QV.sub.xp + 'Pt +' + QV.sub.g + 'G', subH) +
    qdet('ev', 'イベントクエスト', evD + '/' + ew.quests.length + ' · 全部で +' + QV.bonus + 'G', '<div class="evbanner tone-' + ew.theme.tone + '"><span class="mk" aria-hidden="true">' + ew.theme.mark + '</span><div><b>' + esc(ew.theme.name) + '</b><small>' + md2(ew.ws) + '〜' + md2(ew.we) + '</small></div><span class="num evc">' + evD + '/' + ew.quests.length + '</span></div><div class="qlist2" style="margin-top:8px">' + ew.quests.map(q => qItem(q, date)).join('') + '</div>') +
    (urg.length ? qdet('ur', '緊急クエスト', '今日だけ ' + uD + '/' + urg.length, '<div class="qlist2">' + urg.map(q => qItem(q, date)).join('') + '</div>', 'urgent') : '');
}

/* ---- レコード: 成果目標・サブ・イベント・緊急の達成度(押すと詳細) ---- */
function achData() {
  const date = state.day; const g = state.goals.week; const subs = subFor(date); const ew = eventWeek(date); const urg = urgentInWeek(date);
  const os = g.outcomes.filter(o => o.t && o.t.trim());
  const sD = subs.reduce((a, q) => a + (q.unit === '回' ? Math.min(q.cnt, q.target) : q.cnt), 0), sT = subs.reduce((a, q) => a + (q.unit === '回' ? q.target : 0), 0);
  const mk = q => [q.t, qDone(q.key) ? '済' : '—', qDone(q.key)];
  return {
    out: { name: '成果目標', n: os.filter(o => o.done).length, t: os.length, sum: os.filter(o => o.done).length + ' / ' + os.length, rows: os.map(o => [o.t, (Number(o.v) || 0) + ' / ' + o.n + o.u, !!o.done]) },
    sub: { name: 'サブクエスト', n: sD, t: sT, sum: '今週 ' + sD + (sT ? ' / ' + sT : '') + '回', rows: subs.map(q => [q.t, subCount(q), q.unit === '回' && q.cnt >= q.target]) },
    ev: { name: 'イベントクエスト', n: ew.quests.filter(q => qDone(q.key)).length, t: ew.quests.length, sum: ew.quests.filter(q => qDone(q.key)).length + ' / ' + ew.quests.length, note: esc(ew.theme.name) + '(' + md2(ew.ws) + '〜' + md2(ew.we) + ')', rows: ew.quests.map(mk) },
    ur: { name: '緊急クエスト', n: urg.filter(q => qDone(q.key)).length, t: urg.length, sum: urg.filter(q => qDone(q.key)).length + ' / ' + urg.length, note: 'やらなくてOK。できたらすごい！', rows: urg.map(q => [md2(q.key.split(':')[1]) + ' ' + q.t, qDone(q.key) ? '済' : '—', qDone(q.key)]) }
  };
}
function achSection() {
  const A = achData(); const pc = a => a.t ? Math.round(Math.min(1, a.n / a.t) * 100) : 0;
  return '<section class="sec"><h2 class="sh">今週の達成度' + infoBtn('ach') + '</h2><div class="achg">' + ['out', 'sub', 'ev', 'ur'].map(k => {
    const a = A[k]; return '<button class="acht' + (a.t && a.n >= a.t ? ' full' : '') + '" data-action="pop" data-k="ach" data-id="' + k + '"><small>' + a.name + '</small><b class="num">' + (k === 'sub' ? a.n + (a.t ? '<i>/' + a.t + '</i>' : '') : a.n + '<i>/' + a.t + '</i>') + '</b>' + barHTML(pc(a), 'var(--accent)') + '</button>';
  }).join('') + '</div></section>';
}

/* SPが入る条件(ⓘのポップアップに出す) */
function spConds() {
  return SP_RANKS.map((r, i) => ({ ok: (state.spRank || 0) > i, t: '総合ランク ' + r[1] + ' に到達(' + fmt(r[0]) + ' Pt)', v: '1SP' }))
    .concat(STATS.map(s => ({ ok: (state.spStats || []).indexOf(s.id) >= 0, t: s.name + '(' + s.id + ') が 2,400 Pt に到達 (' + fmt(state.pts[s.id]) + ' Pt)', v: '1SP' })));
}

/* ---- 転生(6/30・12/31の「今日を終了」のあと): 演出 → スキル → 特別券 → 演出 ---- */
function rbPicker() {
  const rb = ui.rb || (ui.rb = { n: {} }); const N = rbPicks(state); const tot = RB_TICKETS.reduce((a, t) => a + (rb.n[t[0]] || 0), 0);
  return '<div class="note">この周回で獲得したSP <b class="num">' + cycSP(state) + '</b> → 選べる特別券 <b class="num">' + N + '枚</b>(はじめは1枚、SPが' + RB_STEP + 'ふえるごとに+1枚)。何周目でも同じです。</div>' +
    RB_TICKETS.map(t => '<div class="item"><div class="ih"><b>' + t[1] + '</b><small>MP +100</small></div><div class="ib"><button class="btn sm" data-action="rbadj" data-id="' + t[0] + '" data-d="-1" aria-label="' + t[1] + 'をへらす"' + ((rb.n[t[0]] || 0) > 0 ? '' : ' disabled') + '>−</button><b class="num">' + (rb.n[t[0]] || 0) + '</b><button class="btn sm primary" data-action="rbadj" data-id="' + t[0] + '" data-d="1" aria-label="' + t[1] + 'をふやす"' + (tot < N ? '' : ' disabled') + '>＋</button></div></div>').join('') +
    '<button class="btn primary block" data-action="rbgo"' + (tot >= 1 ? '' : ' disabled') + '>選んだ ' + tot + '枚 で転生する</button>';
}
const rbRings = () => '<div class="rbrings" aria-hidden="true"><i></i><i></i><i></i></div>';
function rbHTML() {
  const f = ui.rbf; if (!f) return '';
  let body;
  if (f.step === 'intro') {
    const c = f.cele;
    body = '<div class="rbst">' + rbRings() + '<div class="rbpet">' + petSVG(96, 'celepet') + '</div><h2>' + state.cycle + '周目の旅が終わります</h2><p>ここまでの歩みが、次の旅の力になります。</p>' +
      (c ? '<div class="gainbox big">' + (STAT_IDS.filter(k => c.pts[k]).map(k => '<span style="color:' + lc(k) + '">' + k + ' +' + c.pts[k] + '</span>').join('　') || 'ステータス +0') + '<br><span style="color:var(--gold)">+' + fmt(c.gold) + ' G</span>' + (c.sp ? '　<b>SP +' + c.sp + '</b>' : '') + '</div>' : '') +
      '<button class="btn primary block" data-action="rbstep" data-s="skill">スキルを選ぶ</button></div>';
  } else if (f.step === 'skill') {
    body = '<div class="rbst left"><h2>スキルを選ぶ</h2><div class="note">SPを使って、スキルを伸ばします。使わない分は、あとで選べます。</div>' + viewSkills() + '<button class="btn primary block" data-action="rbstep" data-s="ticket">つぎへ(特別券を選ぶ)</button></div>';
  } else if (f.step === 'ticket') {
    body = '<div class="rbst left"><h2>特別券を選ぶ</h2>' + rbPicker() + '</div>';
  } else {
    const got = f.got || [];
    body = '<div class="rbst">' + rbRings() + '<div class="confetti rbconf" aria-hidden="true">' + Array.from({ length: 34 }, (_, i) => '<i style="--x:' + ((i * 29) % 100) + '%;--d:' + (i % 9) * 0.12 + 's;--c:' + lc(STAT_IDS[i % 5]) + '"></i>').join('') + '</div><div class="rbpet">' + petSVG(96, 'celepet') + '</div><h2>' + state.cycle + '周目へ転生しました！</h2>' +
      (got.length ? '<div class="gainbox big">' + got.map(esc).join('<br>') + '</div>' : '') + '<button class="btn primary block" data-action="rbstep" data-s="end">新しい旅をはじめる</button></div>';
  }
  return '<div class="rbov" role="dialog" aria-modal="true">' + body + '</div>';
}
