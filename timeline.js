/* ---- メインクエストのカレンダー: 24時間・ズーム・左右(時間)スクロール・上下は週ごとにスクロール。月表示にも切り替え ---- */
const TL0 = DAY_START, TLS = DAY_END - DAY_START;
const ZOOMS = [14, 22, 34, 52]; // 1時間の幅(px)
const RH = 32; // 1日の行の高さ
const dayEvents = d => state.events.filter(e => e.date === d).sort((a, b) => a.start - b.start);
const primaryStat = e => STAT_IDS.slice().sort((a, b) => (e.alloc[b] || 0) - (e.alloc[a] || 0))[0];
const pctX = m => ((m - TL0) / TLS * 100).toFixed(3);
const evName = e => e.area || 'メインクエスト';
function lanes(E) {
  const out = {}; const ends = [];
  E.forEach(e => { let l = ends.findIndex(t => t <= e.start); if (l < 0) { l = ends.length; ends.push(0); } ends[l] = evEnd(e); out[e.id] = l; });
  return { map: out, n: Math.max(1, ends.length) };
}
function dayRow(d) {
  const dt = parseISO(d); const E = dayEvents(d); const L = lanes(E);
  // 同じクエストが隣り合っていたら、見た目はひとつにつなげる
  const jl = {}, jr = {};
  E.forEach(e => { const n = E.find(x => x !== e && x.area && x.area === e.area && x.start === evEnd(e) && L.map[x.id] === L.map[e.id]); if (n) { jr[e.id] = 1; jl[n.id] = 1; } });
  const bars = E.map(e => {
    const l = L.map[e.id]; const h = 100 / L.n; const ww = e.area ? wwByName(e.area) : null;
    return '<button class="tlb' + (e.done ? ' done' : '') + (e.fin ? ' fin' : '') + (jl[e.id] ? ' mj-l' : '') + (jr[e.id] ? ' mj-r' : '') + '"' + (e.done ? '' : ' data-drag="ev"') + ' data-id="' + e.id + '" data-action="pop" data-k="ev" style="--g:' + gradOf(e.alloc, true) + ';' + (ww ? '--fc:color-mix(in srgb,' + ww[1] + ' 50%,transparent);' : '') + 'left:' + pctX(e.start) + '%;width:' + (e.boxes * 120 / TLS * 100).toFixed(3) + '%;top:' + (l * h) + '%;height:' + h + '%;--c:' + lc(primaryStat(e)) + '" aria-label="' + esc(evName(e)) + ' ' + md2(e.date) + ' ' + fmtT(e.start) + '〜' + fmtT(Math.min(evEnd(e), DAY_END) % 1440) + (e.done ? ' 達成 ★' + e.star : '') + '">' +
      '<span>' + (e.done ? '★' + e.star + ' ' : '') + esc(evName(e)) + '</span></button>';
  }).join('');
  return '<div class="tlrow' + (d === state.day ? ' today' : '') + '"><span class="tld' + (dt.getDay() === 0 ? ' sun' : dt.getDay() === 6 ? ' sat' : '') + '">' + WD[dt.getDay()] + '<small>' + (dt.getMonth() + 1) + '/' + dt.getDate() + '</small></span>' +
    '<div class="tltrack" data-row="' + d + '">' + bars + '</div></div>';
}
// weeks: 表示する週(日曜の日付)の配列。id: スクロール位置を覚えるための名前
function timeline(weeks, id) {
  const z = ZOOMS[ui.zoom]; const step = z >= 52 ? 1 : z >= 34 ? 2 : z >= 22 ? 3 : 6;
  const hours = []; for (let h = 0; h < 24; h += step) hours.push('<span style="left:' + pctX(h * 60) + '%">' + h + '</span>');
  const blocks = weeks.map(wk => '<div class="tlweek" data-wk="' + wk + '"><div class="tlwl"><span>' + md2(wk) + '〜' + md2(addDays(wk, 6)) + '</span></div>' +
    [0, 1, 2, 3, 4, 5, 6].map(i => dayRow(addDays(wk, i))).join('') + '</div>').join('');
  return '<div class="calscroll' + (weeks.length > 1 ? ' multi' : '') + '" data-cal="' + id + '" style="--hp:' + z + 'px;--tw:' + (z * 24) + 'px">' +
    '<div class="tlin"><div class="tlhours"><span class="tld"></span><div class="tlh">' + hours.join('') + '</div></div>' + blocks + '</div></div>';
}
// スクロール位置を、描き直しのあとも保つ
function calSave() {
  document.querySelectorAll('.calscroll[data-cal]').forEach(el => { ui.calPos[el.dataset.cal] = { x: el.scrollLeft, y: el.scrollTop, z: ui.zoom }; });
}
function calRestore() {
  document.querySelectorAll('.calscroll[data-cal]').forEach(el => {
    const p = ui.calPos[el.dataset.cal]; const z = ZOOMS[ui.zoom];
    if (p && p.x != null) el.scrollLeft = p.z === ui.zoom ? p.x : (p.x + el.clientWidth / 2) / ZOOMS[p.z] * z - el.clientWidth / 2;
    else el.scrollLeft = 7 * z;
    const blk = el.querySelector('.tlweek[data-wk="' + (el.dataset.cal === 'goal' ? state.goals.week.start : ui.wk) + '"]');
    if (p && p.y != null && !ui.calJump) el.scrollTop = p.y; else if (blk) el.scrollTop = blk.offsetTop - el.querySelector('.tlhours').offsetHeight;
  });
  ui.calJump = false;
}
// 上下にスクロールしたら、見えている週を「今週」の欄に出す
document.addEventListener('scroll', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('multi')) return;
  const head = el.querySelector('.tlhours').offsetHeight; let cur = null;
  el.querySelectorAll('.tlweek').forEach(b => { if (b.offsetTop - head <= el.scrollTop + 8) cur = b.dataset.wk; });
  if (cur && cur !== ui.wk) { ui.wk = cur; const lb = document.querySelector('.wklabel'); if (lb) lb.textContent = wkLabel(); }
}, true);
const wkLabel = () => ui.wk === sundayOf(state.day) ? '今週' : md2(ui.wk) + '〜';
function calWeeks() { const w = []; for (let i = -8; i <= 12; i++) w.push(addDays(sundayOf(state.day), i * 7)); if (w.indexOf(ui.wk) < 0) w.push(ui.wk); return w.sort(); }
// 月表示
function monthGrid() {
  const y = Number(ui.mon.slice(0, 4)), m = Number(ui.mon.slice(5, 7));
  const first = md(y, m, 1); const start = sundayOf(first); const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i); if (i >= 35 && d.slice(0, 7) !== ui.mon) break;
    const E = dayEvents(d); const box = E.reduce((a, e) => a + e.boxes, 0); const dn = E.reduce((a, e) => a + (e.done ? e.boxes : 0), 0);
    cells.push('<button class="mcell' + (d.slice(0, 7) !== ui.mon ? ' out' : '') + (d === state.day ? ' today' : '') + '" data-action="mday" data-d="' + d + '" data-dropdate="' + d + '"><b>' + parseISO(d).getDate() + '</b>' +
      '<span class="mev">' + E.slice(0, 3).map(e => '<i class="' + (e.done ? 'done' : '') + '" style="--c:' + lc(primaryStat(e)) + '">' + esc(evName(e)) + '</i>').join('') + (E.length > 3 ? '<small>+' + (E.length - 3) + '</small>' : '') + '</span>' +
      (box ? '<small class="num">' + dn + '/' + box + '</small>' : '') + '</button>');
  }
  return '<div class="mhead">' + wdList().map(w => '<span>' + w + '</span>').join('') + '</div><div class="mgrid">' + cells.join('') + '</div>';
}
// 今週の目標に入れたクエストだけを並べる(長押しでドラッグ、1回で1BOX)。右上の＋で、今月の目標・過去のクエストから足せる
function trayCandidates() {
  const have = {}; state.goals.week.areas.forEach(a => { have[a.name] = 1; }); const out = []; const seen = {};
  const add = (n, d) => { if (n && !have[n] && !seen[n] && d && distSum(d) === DIST_TOTAL.a) { seen[n] = 1; out.push(n); } };
  state.goals.month.areas.forEach(a => { if (!a.ed) add(a.name, a.dist); });
  Object.keys(state.qlib || {}).forEach(n => add(n, state.qlib[n]));
  return out;
}
function questTray() {
  const items = [];
  state.goals.week.areas.forEach(a => {
    if (!a.name || a.ed || distSum(a.dist) !== DIST_TOTAL.a) return;
    const top = STAT_IDS.slice().sort((x, y) => a.dist[y] - a.dist[x])[0];
    items.push('<span class="qchip" data-drag="icon" data-gk="week" data-area="' + esc(a.name) + '" style="--c:' + lc(top) + ';--g:' + gradOf(a.dist, true) + ';border-color:color-mix(in srgb,' + wwOf(a)[1] + ' 50%,transparent)"><b>' + esc(a.name) + '</b><small>' + STAT_IDS.filter(k => a.dist[k] > 0).map(k => k + a.dist[k]).join(' ') + '</small></span>');
  });
  const cand = ui.trayAdd ? trayCandidates() : [];
  return '<div class="trayw"><div class="trayrow"><div class="qtray" aria-label="置けるクエスト">' + (items.length ? items.join('') : '<span class="note">今週の目標のクエストが並びます。</span>') + '</div>' +
    '<button class="ibtn sm" data-action="trayadd" aria-label="今週に置けるクエストを足す" aria-pressed="' + !!ui.trayAdd + '">' + PLUS_SVG + '</button></div>' +
    (ui.trayAdd ? '<div class="traypick"><small>今週の目標に足すクエスト</small>' + (cand.length ? cand.map(n => '<button class="tg" data-action="trayput" data-name="' + esc(n) + '">＋ ' + esc(n) + '</button>').join('') : '<span class="note">足せるクエストがありません(今月の目標や、決定したことのあるクエストから選べます)。</span>') + '</div>' : '') + '</div>';
}
// 成果目標のチェック(ゴールで決めた成果目標が達成できたか)
function outcomeCheck() {
  const k = ui.cv === 'month' ? 'month' : 'week'; const g = state.goals[k];
  const os = g.outcomes.map((o, i) => ({ o: o, i: i })).filter(x => x.o.t && x.o.t.trim());
  const d = os.filter(x => x.o.done).length;
  return '<div class="outc"><div class="outh"><b>' + (k === 'week' ? '今週' : '今月') + 'の成果目標</b><span class="num">' + d + ' / ' + os.length + ' 達成</span></div>' +
    (os.length ? '<ul class="outl">' + os.map(x => '<li' + (x.o.done ? ' class="done"' : '') + '>' + esc(x.o.t) + ' <small class="num">' + (Number(x.o.v) || 0) + ' / ' + x.o.n + x.o.u + '</small></li>').join('') + '</ul>'
      : '<div class="note">ゴールで成果目標を決めると、ここに出ます。</div>') + '</div>';
}
const gcalBtn = () => { const gc = ui.gc; return '<button class="btn sm gcbtn" data-action="gcal"' + (gc && gc.busy ? ' disabled' : '') + '>' + (gc && gc.busy ? '反映中…' : 'Googleカレンダーに反映') + '</button>'; };
function mainQuestSection(title) {
  const month = ui.cv === 'month'; const gc = ui.gc;
  return '<section class="sec"><h2 class="sh">' + title + '<span class="seg mini" role="group" aria-label="表示"><button data-action="cv" data-v="week" aria-pressed="' + !month + '">週</button><button data-action="cv" data-v="month" aria-pressed="' + month + '">月</button></span></h2>' +
    (month
      ? '<div class="wknav"><button class="btn sm" data-action="monprev" aria-label="前の月">‹</button><b class="mlabel">' + ui.mon.replace('-', '年') + '月</b><button class="btn sm" data-action="monnext" aria-label="次の月">›</button>' + questTray() + '</div>' + monthGrid() +
        '<div class="tlfoot">' + infoBtn('cal') + gcalBtn() + '</div>'
      : '<div class="wknav"><button class="btn sm" data-action="wkprev" aria-label="前の週">‹</button><button class="btn sm wklabel" data-action="wktoday">' + wkLabel() + '</button><button class="btn sm" data-action="wknext" aria-label="次の週">›</button>' + questTray() + '</div>' +
        timeline(calWeeks(), 'main') +
        '<div class="tlfoot"><span class="zoom"><button class="btn sm" data-action="zoom" data-d="-1" aria-label="ズームアウト"' + (ui.zoom ? '' : ' disabled') + '>−</button><button class="btn sm" data-action="zoom" data-d="1" aria-label="ズームイン"' + (ui.zoom < ZOOMS.length - 1 ? '' : ' disabled') + '>＋</button></span>' + infoBtn('cal') + gcalBtn() + '</div>' +
        '') +
    outcomeCheck() +
        (gc && gc.msg ? '<div class="note" role="status">' + esc(gc.msg) + '</div>' : '') + (gc && gc.err ? '<div class="note warn" role="alert">' + esc(gc.err) + '</div>' : '') + '</section>';
}

/* ---- ポップアップ ---- */
function goalAreas() { return state.goals.week.areas.filter(a => a.name); }
function popHTML() {
  const p = ui.pop2; if (!p) return '';
  let body = '';
  if (p.k === 'ev') {
    const e = state.events.find(x => x.id === p.id); if (!e) { ui.pop2 = null; return ''; }
    const stats = STAT_IDS.filter(k => e.alloc[k]).map(k => '<span class="tg" style="--c:' + lc(k) + '">' + k + ' ' + Math.round(e.alloc[k] * 20) + 'pt</span>').join('');
    const future = e.date > state.day;
    let act = '';
    if (!e.done) {
      act = future ? '<div class="note">当日になると達成報告できます。</div>'
        : '<div class="field"><span class="lbl">達成報告 · 集中度の評価</span><div class="stars" role="group" aria-label="評価">' + [1, 2, 3, 4, 5].map(v => '<button class="star' + (v <= (p.star || 3) ? ' on' : '') + '" data-action="pstar" data-v="' + v + '" aria-label="★' + v + '">★</button>').join('') + '</div>' +
          '<div class="note">★1 ×0.8 · ★3 ×1.2 · ★5 ×2.0(ゾーン)。獲得は「今日を終了」で確定します。</div>' +
          '<button class="btn primary block" data-action="report">★' + (p.star || 3) + ' で達成報告</button></div>';
    } else {
      act = '<div class="note"><b>達成済み ★' + e.star + '</b>　+' + fmt(e.xp) + ' Pt　+' + fmt(e.g) + ' G' + (e.fin ? '(確定済み)' : '(獲得予定)') + '</div>' +
        (e.fin ? '' : '<button class="btn" data-action="undoev" data-id="' + e.id + '">達成を取り消す</button>');
    }
    body = '<h3>' + esc(evName(e)) + '</h3><div class="tagrow">' + stats + (e.tag ? '<span class="tg">#' + esc(e.tag) + '</span>' : '') + '</div>' +
      (e.memo ? '<div class="note">' + esc(e.memo) + '</div>' : '') +
      '<div class="dates"><label class="field"><span class="lbl">日付</span><input class="in" type="date" value="' + e.date + '" data-chg="evmove" data-k="date" data-id="' + e.id + '"' + (e.done ? ' disabled' : '') + '></label>' +
      '<label class="field"><span class="lbl">開始(' + e.boxes * 2 + '時間)</span><input class="in" type="time" step="1800" value="' + fmtT(e.start) + '" data-chg="evmove" data-k="time" data-id="' + e.id + '"' + (e.done ? ' disabled' : '') + '></label></div>' +
      act + (e.fin ? '' : '<button class="btn danger" data-action="delev" data-id="' + e.id + '">' + (p.del ? 'もう一度押すと削除' : 'この予定を削除') + '</button>');
  } else if (p.k === 'add') {
    const areas = goalAreas();
    body = '<h3>メインクエストを追加</h3>' +
      '<label class="field"><span class="lbl">領域</span><select class="in" data-p="area">' + areas.map(a => '<option' + (p.area === a.name ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '<option value=""' + (p.area === '' ? ' selected' : '') + '>その他(下に入力)</option></select></label>' +
      (p.area === '' ? '<label class="field"><span class="lbl">クエスト名</span><input class="in" type="text" data-p="name" value="' + esc(p.name || '') + '" placeholder="例：ポートフォリオ作成"></label>' : '') +
      '<div class="field"><span class="lbl">ステータス</span><div class="chips">' + STAT_IDS.map(k => '<button class="chip pick' + (p.stat === k ? ' on' : '') + '" style="--c:' + lc(k) + '" data-action="pset" data-f="stat" data-v="' + k + '">' + k + '</button>').join('') + '</div></div>' +
      '<div class="field"><span class="lbl">BOX(1BOX = 2時間)</span><div class="stepper"><button class="btn" data-action="pset" data-f="boxes" data-v="' + Math.max(1, p.boxes - 1) + '">−</button><b class="num">' + p.boxes + '</b><button class="btn" data-action="pset" data-f="boxes" data-v="' + Math.min(4, p.boxes + 1) + '">＋</button></div></div>' +
      '<div class="dates"><label class="field"><span class="lbl">日付</span><input class="in" type="date" data-p="date" value="' + p.date + '"></label><label class="field"><span class="lbl">開始</span><input class="in" type="time" step="1800" data-p="time" value="' + p.time + '"></label></div>' +
      '<div class="dates"><label class="field"><span class="lbl">タグ</span><input class="in" type="text" data-p="tag" value="' + esc(p.tag || '') + '" placeholder="例：転職"></label><label class="field"><span class="lbl">内容の詳細</span><input class="in" type="text" data-p="memo" value="' + esc(p.memo || '') + '" placeholder="メモ"></label></div>' +
      '<button class="btn primary block" data-action="addev">カレンダーに入れる</button>';
  } else if (p.k === 'info' && p.id === 'sp') {
    body = '<h3>SPが入る条件</h3><div class="note">満たすと自動で獲得します(今日を終了で確定した値で判定)。</div><div class="achl">' + spConds().map(c => '<div class="achr' + (c.ok ? ' ok' : '') + '"><span>' + (c.ok ? '✓ ' : '') + esc(c.t) + '</span><b class="num">' + (c.ok ? '獲得済み' : c.v) + '</b></div>').join('') + '</div><div class="note">いまの総合は ' + fmt(sumPts(state.pts)) + ' Pt です。</div><button class="btn primary block" data-action="popclose">とじる</button>';
  } else if (p.k === 'info') {
    const I = INFO[p.id]; if (!I) { ui.pop2 = null; return ''; }
    body = '<h3>' + I[0] + '</h3><p class="note" style="font-size:14px;line-height:1.7;white-space:pre-line">' + esc(I[1]) + '</p><button class="btn primary block" data-action="popclose">とじる</button>';
  } else if (p.k === 'ach') {
    const A = achData()[p.id]; if (!A) { ui.pop2 = null; return ''; }
    body = '<h3>' + A.name + ' <span class="num">' + A.sum + '</span></h3>' + (A.note ? '<div class="note">' + A.note + '</div>' : '') +
      '<div class="achl">' + (A.rows.length ? A.rows.map(r => '<div class="achr' + (r[2] ? ' ok' : '') + '"><span>' + (r[2] ? '✓ ' : '') + esc(r[0]) + '</span><b class="num">' + esc(r[1]) + '</b></div>').join('') : '<div class="note">まだありません。</div>') + '</div>' +
      '<button class="btn primary block" data-action="popclose">とじる</button>';
  } else if (p.k === 'howto') {
    const wk = ui.gk !== 'month'; const lab = wk ? '今週' : '今月';
    body = '<h3>' + lab + 'の目標の作り方</h3><ol class="howol"><li>＋でクエストを作り、ステータスの配分を決める</li><li>価値観(1〜10)を決める</li><li>クエストをカレンダーに置く(BOXは自動)</li><li>成果目標・サブクエストを決めて「決定」</li><li>' + (wk ? '週の最後の' + WD[(WKS + 6) % 7] + '曜' : '月末') + 'に省察 → 採点でゴールド獲得 → PDFをDriveに保存</li></ol><button class="btn primary block" data-action="popclose">とじる</button>';
  } else if (p.k === 'skill') {
    const s = SKILLS.find(x => x.id === p.id); const lv = state.skills[s.id];
    body = '<h3' + (lv >= 6 ? ' class="goldtxt"' : '') + '>' + s.name + ' <span class="num">Lv.' + lv + '</span></h3><div class="note">' + s.cat + '</div>' +
      '<div class="pips">' + Array.from({ length: 10 }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<p>いまの効果：<b>' + (lv ? s.eff(lv) : '未習得') + '</b></p><p class="note">Lv.10で ' + s.max + '。Lv.6以上は金スキルです。</p>' +
      '<button class="btn" data-action="sub" data-v="skills">スキル獲得画面へ</button>';
  } else if (p.k === 'ticket') {
    const it = shopItems(state).find(x => x.id === p.id); const own = state.inv[p.id] || 0;
    if (!it || !own) { ui.pop2 = null; return ''; }
    const n = clampN(p.n || 1, 1, own);
    body = '<h3>' + esc(it.name) + '</h3><div class="note">残り ' + own + ' 枚。1枚で MP +' + shopGain(state, it) + (Object.keys(it.pts || {}).length ? '・' + Object.keys(it.pts).map(k => k + ' +' + it.pts[k]).join(' ') : '') + '</div>' +
      '<div class="field"><span class="lbl">使う枚数</span><div class="stepper"><button class="btn" data-action="pset" data-f="n" data-v="' + Math.max(1, n - 1) + '">−</button><b class="num">' + n + '</b><button class="btn" data-action="pset" data-f="n" data-v="' + Math.min(own, n + 1) + '">＋</button></div></div>' +
      '<div class="note">使ったあと 残り ' + (own - n) + ' 枚</div><button class="btn primary block" data-action="useticket">' + n + '枚 使う</button>';
  } else if (p.k === 'close') {
    const pe = state.pend; const pts = STAT_IDS.filter(k => pe.pts[k]).map(k => k + ' +' + pe.pts[k]).join('　');
    body = '<h3>今日を終了しますか？</h3><div class="note">「はい」で今日のクエストを終え、獲得したステータス・ゴールド・SPを確定します。確定した達成は取り消せません。</div>' +
      '<div class="gainbox">' + (pts || 'ステータス +0') + '<br>ゴールド +' + fmt(pe.gold || 0) + ' G　SP +' + spPreview(state) + '</div>' +
      '<div class="btnrow"><button class="btn primary" data-action="closeyes">はい</button><button class="btn" data-action="popclose">いいえ</button></div>';
  } else if (p.k === 'cele') {
    body = '<div class="cele"><div class="confetti" aria-hidden="true">' + Array.from({ length: 26 }, (_, i) => '<i style="--x:' + ((i * 37) % 100) + '%;--d:' + (i % 7) * 0.12 + 's;--c:' + lc(STAT_IDS[i % 5]) + '"></i>').join('') + '</div>' +
      petSVG(72, 'celepet') + '<h3>おつかれさま！</h3><div class="gainbox big">' + (STAT_IDS.filter(k => p.pts[k]).map(k => '<span style="color:' + lc(k) + '">' + k + ' +' + p.pts[k] + '</span>').join('　') || 'ステータス +0') +
      '<br><span style="color:var(--gold)">+' + fmt(p.gold) + ' G</span>' + (p.sp ? '　<b>SP +' + p.sp + '</b>' : '') + '</div>' +
      '<button class="btn primary block" data-action="popclose">OK</button></div>';
  } else if (p.k === 'used') {
    body = '<div class="cele"><div class="confetti" aria-hidden="true">' + Array.from({ length: 18 }, (_, i) => '<i style="--x:' + ((i * 41) % 100) + '%;--d:' + (i % 6) * 0.1 + 's;--c:var(--gold-fill)"></i>').join('') + '</div>' +
      '<h3>' + esc(p.name) + ' を ' + p.n + '枚 使いました</h3><div class="gainbox big"><span style="color:var(--mp)">MP +' + p.mp + '</span></div><button class="btn primary block" data-action="popclose">OK</button></div>';
  }
  return '<div class="scrim" data-action="popclose"></div><div class="sheet" role="dialog" aria-modal="true"><button class="xclose" data-action="popclose" aria-label="閉じる">×</button>' + body + '</div>';
}

/* ---- Googleカレンダーへ反映(アプリが元。新しい予定は作り、動かした予定は直し、消した予定は消す) ---- */
const GCAL = 'Google Calendar';
const gcalId = p => p && (p.id || p.eventId || (p.event && p.event.id) || null);
function gcalBody(e) {
  const end = evEnd(e); const endD = end >= 1440 ? addDays(e.date, 1) : e.date;
  return {
    summary: (e.done ? '✓ ' : '') + '【' + evName(e) + '】' + STAT_IDS.filter(k => e.alloc[k]).map(k => k + Math.round(e.alloc[k] * 20)).join(' '),
    startTime: e.date + 'T' + fmtT(e.start) + ':00', endTime: endD + 'T' + fmtT(end % 1440) + ':00',
    description: 'ゲーミフィケーションのメインクエスト(' + e.boxes + 'BOX)' + (e.tag ? '\nタグ: ' + e.tag : '') + (e.memo ? '\n' + e.memo : '')
  };
}
async function gcalSync() {
  const wk = ui.wk; const we = addDays(wk, 6);
  ui.gc = { busy: true }; render();
  try {
    const mcp = await window.claude.use('mcp');
    if (!mcp) throw { code: 'no_mcp' };
    let made = 0, upd = 0, del = 0;
    const ids = state.events.filter(e => inRange(e.date, { start: wk, end: we })).map(e => e.id);
    for (const id of ids) {
      const e = state.events.find(x => x.id === id); if (!e) continue;
      const b = gcalBody(e); const sig = JSON.stringify(b);
      if (!e.gcal || !e.gcal.id) {
        const r = await mcp.callTool(GCAL, 'create_event', Object.assign({ useDefaultReminders: false }, b), { cache: false });
        e.gcal = { id: gcalId(r.payload), sig: sig }; made++; save();
      } else if (e.gcal.sig !== sig) {
        await mcp.callTool(GCAL, 'update_event', Object.assign({ eventId: e.gcal.id }, b), { cache: false });
        e.gcal.sig = sig; upd++; save();
      }
    }
    while (state.gcalDel.length) { const gid = state.gcalDel[0]; await mcp.callTool(GCAL, 'delete_event', { eventId: gid }, { cache: false }); state.gcalDel.shift(); del++; save(); }
    ui.gc = { msg: 'Googleカレンダーに反映しました(追加 ' + made + '・変更 ' + upd + '・削除 ' + del + ')' };
  } catch (err) {
    const M = { no_mcp: 'Googleカレンダーにつなげませんでした。Claudeのアプリで開いているか確認してください。', approval_required: 'Googleカレンダーへの反映が許可されていません。許可してから、もう一度押してください。', not_in_manifest: 'Googleカレンダーへの反映が許可されていません。', server_not_connected: 'Googleカレンダーがつながっていません。claude.aiの設定でGoogle Calendarを追加してください。', needs_reauth: 'Googleカレンダーの接続の期限が切れています。claude.aiの設定でつなぎ直してください。', gauth: 'Googleのログインができませんでした。ポップアップを許可して、もう一度押してください(テストユーザーに入れたGoogleアカウントでログインします)。', gnet: 'Googleにつながりませんでした。通信を確認して、もう一度押してください。', gapi: 'Googleカレンダーに反映できませんでした。ログインし直してから、もう一度押してください。' };
    ui.gc = { err: M[err && err.code] || 'Googleカレンダーへの反映に失敗しました。もう一度お試しください。' };
  }
  save(); render();
}
