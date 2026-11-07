/* ---- メインクエストのカレンダー: 24時間・ズーム・左右(時間)スクロール・上下は週ごとにスクロール。月表示にも切り替え ---- */
const TL0 = DAY_START, TLS = DAY_END - DAY_START;
const ZOOMS = [14, 22, 34, 52]; // 1時間の幅(px)の初期値(ボタン用)
const ZMIN = 12, ZMAX = 170;
const zpx = () => ui.zpx || ZOOMS[ui.zoom];
const RH = 32; // 1日の行の高さ(初期)
const RMIN = 18, RMAX = 110;
const zrh = () => 30;
const dayEvents = d => state.events.filter(e => e.date === d).sort((a, b) => a.start - b.start);
const primaryStat = e => STAT_IDS.slice().sort((a, b) => (e.alloc[b] || 0) - (e.alloc[a] || 0))[0];
const pctX = m => ((m - TL0) / TLS * 100).toFixed(3);
const evName = e => e.area || 'メインクエスト';
const fmtDur = m => { const h = Math.floor(m / 60), r = m % 60; return (h ? h + '時間' : '') + (r ? r + '分' : '') || '0分'; };
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
    const l = L.map[e.id]; const h = 100 / L.n;
    return '<button class="tlb' + (e.done ? ' done' : '') + (e.fin ? ' fin' : '') + (jl[e.id] ? ' mj-l' : '') + (jr[e.id] ? ' mj-r' : '') + '"' + (e.done ? '' : ' data-drag="ev"') + ' data-id="' + e.id + '" data-action="pop" data-k="ev" style="'+ 'left:' + pctX(e.start) + '%;width:' + (e.boxes * 120 / TLS * 100).toFixed(3) + '%;top:' + (l * h) + '%;height:' + h + '%;--c:' + evColor(e.area) + '" aria-label="' + esc(evName(e)) + ' ' + md2(e.date) + ' ' + fmtT(e.start) + '〜' + fmtT(Math.min(evEnd(e), DAY_END) % 1440) + (e.done ? ' 達成 ★' + e.star : '') + '">' +
      '<span>' + (e.done ? '★' + e.star + ' ' : '') + esc(evName(e)) + '</span></button>';
  }).join('');
  return '<div class="tlrow' + (d === state.day ? ' today' : '') + '"><span class="tld' + (dt.getDay() === 0 ? ' sun' : dt.getDay() === 6 ? ' sat' : '') + '">' + WD[dt.getDay()] + '<small>' + (dt.getMonth() + 1) + '/' + dt.getDate() + '</small></span>' +
    '<div class="tltrack" data-row="' + d + '">' + bars + '</div></div>';
}
// weeks: 表示する週(日曜の日付)の配列。id: スクロール位置を覚えるための名前
function timeline(weeks, id) {
  const z = zpx(); const rh = zrh(); const stepM = z >= 100 ? 30 : z >= 52 ? 60 : z >= 34 ? 120 : z >= 22 ? 180 : 360;
  const hours = []; for (let m = 0; m < 1440; m += stepM) hours.push('<span style="left:' + pctX(m) + '%">' + (m % 60 ? Math.floor(m / 60) + ':30' : m / 60) + '</span>');
  const blocks = weeks.map(wk => '<div class="tlweek" data-wk="' + wk + '"><div class="tlwl"><span>' + md2(wk) + '〜' + md2(addDays(wk, 6)) + '</span></div>' +
    [0, 1, 2, 3, 4, 5, 6].map(i => dayRow(addDays(wk, i))).join('') + '</div>').join('');
  return '<div class="calscroll' + (weeks.length > 1 ? ' multi' : '') + '" data-cal="' + id + '" style="--hp:' + z + 'px;--tw:' + (z * 24) + 'px;--rh:' + rh + 'px">' +
    '<div class="tlin"><div class="tlhours"><span class="tld"></span><div class="tlh">' + hours.join('') + '</div></div>' + blocks + '</div></div>';
}
// スクロール位置を、描き直しのあとも保つ
function calSave() {
  document.querySelectorAll('.calscroll[data-cal]').forEach(el => { ui.calPos[el.dataset.cal] = { x: el.scrollLeft, y: el.scrollTop, z: zpx(), rh: zrh() }; });
  ui.trayPos = Array.from(document.querySelectorAll('.qtray')).map(t => t.scrollLeft);
}
function calRestore() {
  document.querySelectorAll('.calscroll[data-cal]').forEach(el => {
    const p = ui.calPos[el.dataset.cal]; const z = zpx(); const rh = zrh();
    if (p && p.x != null) el.scrollLeft = p.z === z ? p.x : (p.x + el.clientWidth / 2) / p.z * z - el.clientWidth / 2;
    else el.scrollLeft = 7 * z;
    const blk = el.querySelector('.tlweek[data-wk="' + (el.dataset.cal === 'goal' ? state.goals.week.start : ui.wk) + '"]');
    if (p && p.y != null && !ui.calJump) el.scrollTop = p.rh && p.rh !== rh ? p.y / p.rh * rh : p.y; else if (blk) el.scrollTop = blk.offsetTop - el.querySelector('.tlhours').offsetHeight;
  });
  ui.calJump = false;
  // クエスト選択(トレイ)の横スクロールは、描き直しても元の位置のまま
  if (ui.trayPos) document.querySelectorAll('.qtray').forEach((t, i) => { if (ui.trayPos[i]) t.scrollLeft = ui.trayPos[i]; });
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
      '<span class="mev">' + E.slice(0, 3).map(e => '<i class="' + (e.done ? 'done' : '') + '" style="--c:' + evColor(e.area) + '">' + esc(evName(e)) + '</i>').join('') + (E.length > 3 ? '<small>+' + (E.length - 3) + '</small>' : '') + '</span>' +
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
        items.push('<span class="qchip" data-drag="icon" data-gk="week" data-area="' + esc(a.name) + '" style="--c:' + wwOf(a)[1] + '"><b>' + esc(a.name) + '</b><small>' + STAT_IDS.filter(k => a.dist[k] > 0).map(k => k + a.dist[k]).join(' ') + '</small></span>');
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
  return '<h2 class="sh outsh">' + (k === 'week' ? '今週' : '今月') + 'の成果目標<small>' + d + ' / ' + os.length + ' 達成</small></h2>' +
    (os.length ? bdRows(os.map(x => [(x.o.done ? '✓ ' : '') + x.o.t, (Number(x.o.v) || 0) + ' / ' + x.o.n + x.o.u])) : '<div class="note">ゴールで成果目標を決めると、ここに出ます。</div>');
}
const gcalBtn = () => { const gc = ui.gc; const busy = gc && gc.busy;
  return '<span class="gcl">Googleカレンダー</span><button class="btn sm gcbtn" data-action="gimport"' + (busy ? ' disabled' : '') + '>' + (busy === 'imp' ? '読込中…' : '読込') + '</button><button class="btn sm gcbtn" data-action="gcal"' + (busy ? ' disabled' : '') + '>' + (busy === 'sync' ? '反映中…' : '反映') + '</button>'; };
function mainQuestSection(title) {
  const month = ui.cv === 'month'; const gc = ui.gc;
  return '<section class="sec"><h2 class="sh">' + title + '<span class="seg mini" role="group" aria-label="表示"><button data-action="cv" data-v="week" aria-pressed="' + !month + '">週</button><button data-action="cv" data-v="month" aria-pressed="' + month + '">月</button></span></h2>' +
    (month
      ? '<div class="wknav"><button class="btn sm" data-action="monprev" aria-label="前の月">‹</button><b class="mlabel">' + ui.mon.replace('-', '年') + '月</b><button class="btn sm" data-action="monnext" aria-label="次の月">›</button>' + questTray() + '</div>' + monthGrid() +
        '<div class="tlfoot">' + infoBtn('cal') + gcalBtn() + '</div>'
      : '<div class="wknav"><button class="btn sm" data-action="wkprev" aria-label="前の週">‹</button><button class="btn sm wklabel" data-action="wktoday">' + wkLabel() + '</button><button class="btn sm" data-action="wknext" aria-label="次の週">›</button>' + questTray() + '</div>' +
        timeline(calWeeks(), 'main') +
        '<div class="tlfoot"><span class="zoom"><button class="btn sm" data-action="zoom" data-d="-1" aria-label="ズームアウト"' + (zpx() > ZMIN + 0.5 ? '' : ' disabled') + '>−</button><button class="btn sm" data-action="zoom" data-d="1" aria-label="ズームイン"' + (zpx() < ZMAX - 0.5 ? '' : ' disabled') + '>＋</button></span>' + infoBtn('cal') + gcalBtn() + '</div>' +
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
    if (!p.rep) {
      act = e.done ? '<div class="note"><b>達成済み ★' + e.star + '</b>(報告は「クエスト受付」で行います)</div>' : '<div class="note">達成の報告は「クエスト受付」で行います。ここでは、予定の内容を保存します。</div>';
    } else if (!e.done) {
      act = future ? '<div class="note">当日になると達成報告できます。</div>'
        : '<div class="field"><span class="lbl">達成報告 · 集中度の評価</span><div class="stars" role="group" aria-label="評価">' + [1, 2, 3, 4, 5].map(v => '<button class="star' + (v <= (p.star || 3) ? ' on' : '') + '" data-action="pstar" data-v="' + v + '" aria-label="★' + v + '">★</button>').join('') + '</div>' +
          '<div class="note">★1 ×0.8 · ★3 ×1.2 · ★5 ×2.0(ゾーン)。獲得は「今日を終了」で確定します。</div>' +
          '<button class="btn primary block" data-action="report">★' + (p.star || 3) + ' で達成報告</button></div>';
    } else {
      act = '<div class="note"><b>達成済み ★' + e.star + '</b>　+' + fmt(e.xp) + ' Pt　+' + fmt(e.g) + ' G' + (e.fin ? '(確定済み)' : '(獲得予定)') + '</div>' +
        (e.fin ? '' : '<button class="btn" data-action="undoev" data-id="' + e.id + '">達成を取り消す</button>');
    }
    const eTags = oTags(e);
    body = '<h3>' + esc(evName(e)) + '</h3><div class="tagrow">' + stats + (p.rep ? eTags.map(t => '<span class="ytg">#' + esc(t) + '</span>').join('') : '') + '</div>' +
      (p.rep ? '' : '<div class="field"><span class="lbl">タグ</span>' + tagIn('e:' + e.id, eTags, 'タグを入力して Enter') + '</div>' +
        '<label class="field"><span class="lbl lbe">メモ' + infoBtn('evmemo') + '</span><textarea class="in memo" rows="3" maxlength="500" data-chg="evmemo" data-id="' + e.id + '" placeholder="このクエストのメモ(Googleカレンダーの説明に入ります)">' + esc(e.memo || '') + '</textarea></label>') +
      '<div class="dates"><label class="field"><span class="lbl">日付</span><input class="in" type="date" value="' + e.date + '" data-chg="evmove" data-k="date" data-id="' + e.id + '"' + (e.done ? ' disabled' : '') + '></label></div>' +
      '<div class="dates"><label class="field"><span class="lbl">開始</span><input class="in" type="time" step="900" value="' + fmtT(e.start) + '" data-chg="evmove" data-k="time" data-id="' + e.id + '"' + (e.done ? ' disabled' : '') + '></label>' +
      '<label class="field"><span class="lbl">終了</span><input class="in" type="time" step="900" value="' + fmtT(evEnd(e) % 1440) + '" data-chg="evmove" data-k="end" data-id="' + e.id + '"' + (e.done ? ' disabled' : '') + '></label></div>' +
      '<div class="note">長さ ' + fmtDur(evEnd(e) - e.start) + '(' + fmtBox(e.boxes) + 'BOX)</div>' +
      (p.rep ? '' : '<button class="btn primary block" data-action="evsave" data-id="' + e.id + '">保存</button>') + act + (e.fin || p.rep ? '' : '<button class="btn danger" data-action="delev" data-id="' + e.id + '">' + (p.del ? 'もう一度押すと削除' : 'この予定を削除') + '</button>');
  } else if (p.k === 'habt') {
    body = '<h3>' + esc(p.name) + 'を記録</h3><div class="note">' + jp(p.date) + ' の分です。「今日を終了」を決めると、この時間でGoogleカレンダーに反映されます。</div>' +
      '<div class="dates"><label class="field"><span class="lbl">開始</span><input class="in" type="time" step="900" value="' + fmtT(p.start) + '" data-pf="start"></label><label class="field"><span class="lbl">終了</span><input class="in" type="time" step="900" value="' + fmtT(p.end % 1440) + '" data-pf="end"></label></div>' +
      '<label class="field"><span class="lbl">メモ</span><textarea class="in" rows="3" data-pf="memo" placeholder="メモ(Googleカレンダーの説明に入ります)"></textarea></label>' +
      '<button class="btn primary block" data-action="habok">記録する</button><button class="btn block" data-action="popclose">やめる</button>';
  } else if (p.k === 'amt') {
    body = '<h3>' + esc(p.name) + '</h3><div class="note">' + (p.sign > 0 ? 'やった' : 'へらす') + '量(' + p.u + ')を入れてください。</div>' +
      '<label class="field"><span class="lbl">' + p.u + '</span><input class="in" type="number" inputmode="decimal" min="0" step="any" value="' + (p.u === '時間' ? 1 : 30) + '" data-pf="amt"></label>' +
      '<button class="btn primary block" data-action="amtok">' + (p.sign > 0 ? '計上する' : 'へらす') + '</button><button class="btn block" data-action="popclose">やめる</button>';
  } else if (p.k === 'lib') {
    body = libPopHTML(p);
  } else if (p.k === 'chara') {
    const cur = state.pet || 'whale';
    body = '<h3>キャラをえらぶ</h3><div class="chgrid">' + Object.keys(PETS).map(k => '<button class="chb' + (cur === k ? ' on' : '') + '" data-action="petset" data-v="' + k + '" aria-pressed="' + (cur === k) + '"><span class="chi">' + petSVG(64, '', k) + '</span><b>' + PETS[k].name + '</b></button>').join('') + '</div><button class="btn block" data-action="popclose">とじる</button>';
  } else if (p.k === 'add') {
    const areas = goalAreas();
    body = '<h3>メインクエストを追加</h3>' +
      '<label class="field"><span class="lbl">領域</span><select class="in" data-p="area">' + areas.map(a => '<option' + (p.area === a.name ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '<option value=""' + (p.area === '' ? ' selected' : '') + '>その他(下に入力)</option></select></label>' +
      (p.area === '' ? '<label class="field"><span class="lbl">クエスト名</span><input class="in" type="text" data-p="name" value="' + esc(p.name || '') + '" placeholder="例：ポートフォリオ作成"></label>' : '') +
      '<div class="field"><span class="lbl">ステータス</span><div class="chips">' + STAT_IDS.map(k => '<button class="chip pick' + (p.stat === k ? ' on' : '') + '" style="--c:' + lc(k) + '" data-action="pset" data-f="stat" data-v="' + k + '">' + k + '</button>').join('') + '</div></div>' +
      '<div class="dates"><label class="field"><span class="lbl">日付</span><input class="in" type="date" data-p="date" value="' + p.date + '"></label></div>' +
      '<div class="dates"><label class="field"><span class="lbl">開始</span><input class="in" type="time" step="900" data-p="time" value="' + p.time + '"></label><label class="field"><span class="lbl">終了</span><input class="in" type="time" step="900" data-p="end" value="' + p.end + '"></label></div>' +
      '<div class="note">標準サイズは設定で変えられます(いま ' + fmtDur(stdMin()) + ')。メモ・タグは、入れたあとにタップして「編集」で付けます。</div>' +
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

/* ---- Googleカレンダー: 反映(アプリが元) と 読込(Googleの予定をアプリに) ---- */
const GCAL = 'Google Calendar';
const gcalId = p => p && (p.id || p.eventId || (p.event && p.event.id) || null);
// 分類の色 → Googleカレンダーの色(ピーコック7・セージ2・グラファイト8・フラミンゴ4)
const GCOLOR = { '#039BE5': '7', '#33B679': '2', '#616161': '8', '#E67C73': '4' };
function gcalBody(e) {
  const end = evEnd(e); const endD = end >= 1440 ? addDays(e.date, 1) : e.date;
  const col = e.area && wwByName(e.area) ? GCOLOR[wwByName(e.area)[1]] : null;
  const stats = STAT_IDS.filter(k => e.alloc[k]).map(k => k + ' ' + Math.round(e.alloc[k] * 20 / Math.max(e.boxes, .0001) * 10) / 10).join(' ');
  const b = {
    summary: (e.done ? '✓ ' : '') + evName(e) + '_' + fmtBox(e.boxes) + 'BOX',
    startTime: e.date + 'T' + fmtT(e.start) + ':00', endTime: endD + 'T' + fmtT(end % 1440) + ':00',
    description: 'ステータス: ' + stats + (e.memo ? '\nメモ: ' + e.memo : '')
  };
  if (col) b.colorId = col;
  return b;
}
const GERR = { no_mcp: 'Googleカレンダーにつなげませんでした。Claudeのアプリで開いているか確認してください。', approval_required: 'Googleカレンダーが許可されていません。許可してから、もう一度押してください。', not_in_manifest: 'この表示では、Googleカレンダーの読込は使えません(PWA版で使えます)。', server_not_connected: 'Googleカレンダーがつながっていません。claude.aiの設定でGoogle Calendarを追加してください。', needs_reauth: 'Googleカレンダーの接続の期限が切れています。つなぎ直してください。', gauth: 'Googleのログインができませんでした。ポップアップを許可して、もう一度押してください(テストユーザーに入れたGoogleアカウントでログインします)。', gnet: 'Googleにつながりませんでした。通信を確認して、もう一度押してください。', gapi: 'Googleカレンダーとのやりとりに失敗しました。ログインし直してから、もう一度押してください。' };
async function gcalSync() {
  const wk = ui.wk; const we = addDays(wk, 6);
  ui.gc = { busy: 'sync' }; render();
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
    ui.gc = { err: GERR[err && err.code] || 'Googleカレンダーへの反映に失敗しました。もう一度お試しください。' };
  }
  save(); render();
}
// Googleの予定のタイトルから、クエスト名を取り出す(「【】」「✓」「_2BOX」を外す)
const gcalName = t => String(t || '').replace(/^✓\s*/, '').replace(/^【(.*?)】.*$/, '$1').replace(/_[0-9.]+\s*BOX\s*$/i, '').trim();
// 説明の「ステータス: CHA 10 VIT 5」から配分を読む(なければ null)
function gcalStats(desc) {
  const m = /ステータス[:：]\s*([^\n]+)/.exec(String(desc || '')); if (!m) return null;
  const o = {}; let tot = 0; m[1].replace(/\b(CHA|VIT|HLT|REG|INT|TEC)\s*([0-9.]+)/g, (_, k, v) => { k = k === "HLT" ? "VIT" : k; o[k] = (o[k] || 0) + Number(v); tot += Number(v); return ''; });
  return tot > 0 ? o : null;
}
// 読み込む期間: 週表示は表示中の1週間、月表示はその月
const gcalRange = () => ui.cv === 'month' ? { start: ui.mon + '-01', end: addDays(md(+ui.mon.slice(0, 4), +ui.mon.slice(5, 7) + 1, 1), -1) } : { start: ui.wk, end: addDays(ui.wk, 6) };
async function gcalImport() {
  const rg = gcalRange(); ui.gc = { busy: 'imp' }; render();
  try {
    const mcp = await window.claude.use('mcp'); if (!mcp) throw { code: 'no_mcp' };
    const r = await mcp.callTool(GCAL, 'list_events', { startTime: rg.start + 'T00:00:00', endTime: addDays(rg.end, 1) + 'T00:00:00', orderBy: 'startTime', pageSize: 250 }, { cache: false });
    const pl = r && r.payload ? r.payload : r; const list = (pl && (pl.events || pl.items)) || (Array.isArray(pl) ? pl : []);
    let made = 0, have = 0, prov = 0, skip = 0;
    const known = {}; state.events.forEach(e => { if (e.gcal && e.gcal.id) known[e.gcal.id] = 1; });
    list.forEach(it => {
      const sd = it.start && (it.start.dateTime || it.start); const ed = it.end && (it.end.dateTime || it.end);
      if (!it.id || it.status === 'cancelled' || typeof sd !== 'string' || typeof ed !== 'string' || sd.length < 16 || ed.length < 16) { skip++; return; }
      if (known[it.id]) { have++; return; }
      const g = state.goals.week;
      const date = sd.slice(0, 10); const st = toMin(sd.slice(11, 16)); let en = ed.slice(0, 10) > date ? 1440 : toMin(ed.slice(11, 16));
      let dur = Math.round((en - st) / 15) * 15; if (dur < 15) dur = 15; if (st + dur > 1440) dur = 1440 - st; if (dur < 15) { skip++; return; }
      let name = gcalName(it.summary) || '(無題)'; let area = g.areas.find(a => a.name === name && distSum(a.dist) === DIST_TOTAL.a);
      let dist = area ? area.dist : null;
      if (!area) { const d2 = distOf(name); if (d2) { dist = d2; const src = state.goals.month.areas.find(x => x.name === name); const lb = state.lib && state.lib.a && state.lib.a[name];
        area = mkArea(name, src ? src.value : (lb ? lb.value : 5), clone(d2), src ? { want: src.want, work: src.work } : (lb ? { want: lb.want, work: lb.work } : {})); area.tags = ((src && src.tags) || (lb && lb.tags) || []).slice(); g.areas.push(area); } }
      if (!area) { name = name + '(仮)'; area = g.areas.find(a => a.name === name);
        if (!area) { const gs = gcalStats(it.description); dist = {}; if (gs) { let t = 0; STAT_IDS.forEach(k => { dist[k] = Math.round((gs[k] || 0) / Object.values(gs).reduce((x, y) => x + y, 0) * DIST_TOTAL.a); t += dist[k]; }); const mx = STAT_IDS.slice().sort((x, y) => dist[y] - dist[x])[0]; dist[mx] += DIST_TOTAL.a - t; } else STAT_IDS.forEach(k => { dist[k] = DIST_TOTAL.a / STAT_IDS.length; });
          area = mkArea(name, 5, dist); area.prov = true; g.areas.push(area); prov++; } else dist = area.dist; }
      const n = addEvent(state, { date: date, start: st, gk: 'week', area: area.name, alloc: allocFromDist(dist, dur / 120) });
      const ev = n.events[n.events.length - 1]; ev.gcal = { id: it.id, sig: '' };
      const memo = String(it.description || '').replace(/ステータス[:：][^\n]*\n?/, '').replace(/^メモ[:：]\s*/m, '').trim(); if (memo) ev.memo = memo.slice(0, 500);
      state = n; known[it.id] = 1; made++;
    });
    syncSP(state); normGoals(state.goals.week);
    ui.gc = { msg: 'Googleカレンダーから読み込みました(追加 ' + made + '・すでにある ' + have + (prov ? '・仮のクエストを作成 ' + prov : '') + (skip ? '・対象外 ' + skip : '') + ')' };
  } catch (err) {
    ui.gc = { err: GERR[err && err.code] || 'Googleカレンダーの読込に失敗しました。もう一度お試しください。' };
  }
  save(); render();
}

/* ---- 2本指のピンチで、カレンダーを拡大・縮小(アプリ全体は拡大しない) ---- */
(function () {
  let pin = null; const LEFT = 44; // 日付の列(40px)+すきま(4px)
  const dxy = ts => ({ x: Math.abs(ts[0].clientX - ts[1].clientX), y: Math.abs(ts[0].clientY - ts[1].clientY) });
  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 2) return;
    const el = e.target.closest && e.target.closest('.calscroll'); if (!el) return;
    const r = el.getBoundingClientRect(); const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left; const d = dxy(e.touches);
    pin = { el: el, d0: Math.max(d.x, 40), v0: Math.max(d.y, 40), z0: zpx(), r0: zrh(), cx: cx, sx: el.scrollLeft };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!pin || e.touches.length !== 2) return;
    e.preventDefault(); const d = dxy(e.touches);
    const z = clampN(pin.z0 * Math.max(d.x, 40) / pin.d0, ZMIN, ZMAX);
    const hoursAtFocal = (pin.sx + pin.cx - LEFT) / pin.z0;
    document.querySelectorAll('.calscroll').forEach(c => { c.style.setProperty('--hp', z + 'px'); c.style.setProperty('--tw', (z * 24) + 'px'); });
    pin.el.scrollLeft = Math.max(0, hoursAtFocal * z + LEFT - pin.cx); ui.zpx = z;
  }, { passive: false });
  const end = e => { if (pin && e.touches.length < 2) { pin = null; calSave(); render(); } };
  document.addEventListener('touchend', end, { passive: true }); document.addEventListener('touchcancel', end, { passive: true });
  // PCでは Ctrl+ホイールで拡大・縮小
  document.addEventListener('wheel', e => {
    const el = e.target.closest && e.target.closest('.calscroll'); if (!el || !e.ctrlKey) return;
    e.preventDefault(); calSave(); const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    ui.zpx = clampN(zpx() * f, ZMIN, ZMAX); render();
  }, { passive: false });
})();
