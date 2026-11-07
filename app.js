// TOTAL RANK: 月桂樹とリボンで飾ったメダル
const ADVICE = ['まずは5分だけやってみよう', '小さな一歩でも、ゼロとは大違い', '今日できたことを1つ数えてみて', '休むのも、ちゃんと作戦のうち', '完璧より、続けることを大事に',
  '水をひと口のんでみよう', '深呼吸を3回して、もうひと踏ん張り', 'いちばん軽いクエストから手をつけよう', '昨日の自分より、ほんの少しだけ前へ', 'できなかった日があっても、また今日から',
  '予定は欲ばりすぎず、余白を残そう', '終わったらすぐ記録すると、やる気が続くよ', '今の頑張りは、ちゃんと積み上がってる', '眠い日は、早めに寝るのが最強', '立ち上がって、軽くのびをしよう',
  '「やるべき」の前に「やりたい」を1つ', '悩んだら、まず手を動かしてみよう', '今週のゴール、もう一度見てみよう', '誰かに「ありがとう」を言ってみよう', '終わりの時間を決めると集中できるよ',
  'きみのペースで、だいじょうぶ', 'ひとつ終えたら、自分をほめてあげて', '外の空気を吸いに行こう', '今日の1BOXは、未来の自分へのプレゼント', 'ご褒美の券、楽しみにしてるよ',
  '失敗は、次の作戦のヒントだよ', '朝のうちに一番大事なことを', 'スマホを置いて10分だけ集中しよう', 'いいね、その調子！', '今日もおつかれさま。えらい！'];
function pickAdvice() { let t; do { t = ADVICE[Math.floor(Math.random() * ADVICE.length)]; } while (t === ui.adv && ADVICE.length > 1); return t; }
function awardSVG(label) {
  const leaf = (cx, cy, ang, rx, ry) => '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + ang.toFixed(0) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"/>';
  let L = ''; const C = [48, 40];
  for (let i = 0; i < 7; i++) {
    const t = (118 + i * 21) * Math.PI / 180; const rr = 31;
    const x = C[0] + Math.cos(t) * rr, y = C[1] + Math.sin(t) * rr * 1.05; const a = (t * 180 / Math.PI) + 90;
    L += leaf(x, y, a - 25, 2.6, 6.2);
    L += leaf(96 - x, y, -(a - 25), 2.6, 6.2);
  }
  const sp = (x, y, d) => '<path class="sp" style="animation-delay:' + d + 's" d="M' + x + ' ' + (y - 4) + 'L' + (x + 1) + ' ' + (y - 1) + 'L' + (x + 4) + ' ' + y + 'L' + (x + 1) + ' ' + (y + 1) + 'L' + x + ' ' + (y + 4) + 'L' + (x - 1) + ' ' + (y + 1) + 'L' + (x - 4) + ' ' + y + 'L' + (x - 1) + ' ' + (y - 1) + 'Z"/>';
  const long = label.length > 2;
  return '<svg class="award" viewBox="0 0 96 86" width="92" height="82" aria-label="TOTAL RANK ' + esc(label) + '" role="img">' +
    '<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="color-mix(in srgb, var(--tier) 18%, #fff)"/><stop offset="1" stop-color="color-mix(in srgb, var(--tier) 45%, #fff)"/></linearGradient></defs>' +
    '<path class="rb" d="M33 54L22 84l12-6 6 8 8-26zM63 54l11 30-12-6-6 8-8-26z"/>' +
    '<g class="lf">' + L + '</g>' +
    '<path class="crown" d="M38 11l4 5 6-8 6 8 4-5-2 8H40z"/>' +
    '<circle class="mdl" cx="48" cy="42" r="25" fill="url(#mg)"/><circle class="mdl2" cx="48" cy="42" r="20.5"/>' +
    '<text class="rkt' + (long ? ' long' : '') + '" x="48" y="' + (long ? 50 : 54) + '" text-anchor="middle">' + esc(label) + '</text>' +
    '<g class="bn"><path d="M10 66h76l-5 7 5 7H10l5-7z"/><text x="48" y="77" text-anchor="middle">TOTAL RANK</text></g>' +
    sp(14, 24, 0) + sp(83, 20, .8) + sp(88, 48, 1.6) + sp(8, 50, 2.2) +
  '</svg>';
}
function render() {
  const ic = p => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const total = sumPts(state.pts); const r = rankOf(total); const tier = tierOf(r.label);
  const pct = r.next ? (total - r.floor) / (r.next[1] - r.floor) * 100 : 100;
  const cond = condition(); const fb = fallbackMP();
  document.getElementById('head').innerHTML =
    '<div class="hd tier-' + tier + '">' +
      '<div class="hl"><button class="mbtn" data-action="menu" aria-expanded="' + ui.menu + '" aria-label="メニュー">' + ic('<path d="M4 7h16M4 12h16M4 17h16"/>') + '</button>' +
      '<button class="ava" data-action="pop" data-k="chara" aria-label="キャラを変える">' + petSVG(36) + '</button></div>' +
      '<button class="rbub' + (ui.advPop ? ' pop' : '') + '" data-action="advice" aria-live="polite">' + esc(ui.adv || (ui.adv = pickAdvice())) + '</button>' +
      '<div class="hcenter">' + awardSVG(r.label) +
        '<div class="hside"><span class="num hpt"><b>' + fmt(total) + '</b> pt</span>' + barHTML(pct, 'var(--tier)') + '<small>' + (r.next ? '次のランクまで<br><b class="num">' + fmt(r.next[1] - total) + '</b> pt' : '最高ランク') + '</small></div></div>' +
    '</div>' +
    '<div class="hd2"><span class="pill cyc">' + state.cycle + '周目</span>' +
      '<div class="en' + (fb ? ' fb' : '') + '"><span class="num">' + state.mp + '/100</span>' + barHTML(state.mp, state.mp <= CFG.LOW_MP ? 'var(--warn)' : 'var(--mp-fill)') + '</div>' +
      '<span class="cond ' + cond.c + (fb ? ' fb' : '') + '" title="' + (fb ? 'エナジースコアを読み取れなかったので仮の60です' : 'エナジースコア ' + state.morning.score) + '">' + cond.t + '</span></div>' +
    (ui.menu ? '<nav class="menu" aria-label="メニュー">' +
      '<button data-action="tab" data-tab="settings">' + ic('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>') + '設定</button>' +
      '<button data-action="tab" data-tab="qlist">' + ic('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>') + 'クエスト一覧</button>' +
      '<button data-action="tab" data-tab="sync">' + ic('<path d="M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4"/>') + '連携(Google Health・Notion)</button>' +
      '<button data-action="tab" data-tab="widgets">' + ic('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>') + 'ホーム画面ウィジェット</button>' +
      '<button data-action="sub" data-v="skills">' + ic('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z"/>') + 'スキル獲得</button></nav>' : '');
  const views = { qlist: viewQList, home: viewHome, quest: viewQuest, record: viewRecord, shop: viewShop, goals: viewGoals, sync: viewSync, widgets: viewWidgets, settings: viewSettings };
  normGoals(state.goals.week);
  calSave();
  document.getElementById('view').innerHTML = noticeBar() + (views[ui.tab] || viewHome)();
  document.getElementById('pop').innerHTML = popHTML() + rbHTML();
  document.body.classList.toggle('modal', !!ui.pop2 || !!ui.rbf);
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-current', b.dataset.tab === ui.tab ? 'page' : 'false'));
  calRestore();
}

function updateTotals() {
  const el = document.getElementById('totalBox');
  if (el) el.textContent = sumBoxes(state.goals[ui.gk]);
}

/* ---- Claude (sample) ---- */
function goalPrompt(kindWord, unitWord, g, text) {
  const cur = { start: g.start, end: g.end, perDay: g.perDay, areas: g.areas, outcomes: g.outcomes.map(o => o.t), habits: g.habits };
  return 'あなたは、' + kindWord + 'の目標ひな型を埋める手伝いをします。\n' +
    '現在のひな型(JSON):\n' + JSON.stringify(cur) + '\n\n' +
    'ルール:\n' +
    '- 1BOX = 2時間です。「4時間」は2BOX、「1日6時間」は1日3BOXです。\n' +
    '- 話された内容に出てきた項目だけを返し、話されていない項目はキーごと省きます。\n' +
    '- areas を返すときは、現在の領域に変更を反映した全件のリストにします。value は自分の価値観の1〜10(話されていなければ現在の値、新しい領域で不明なら5)、box は予定BOXの数です。\n' +
    '- outcomes は成果目標の全件(文字列の配列)。habits は {morning, night, hiit, reading, lab, meditation} のうち話されたものを、' + unitWord + 'の回数(数値)で。\n' +
    '- start, end は YYYY-MM-DD。perDay は1日のBOXの目安。\n' +
    '- 今日は ' + iso(new Date()) + '(' + WD[new Date().getDay()] + ') です。\n' +
    '返答はJSONオブジェクト1つだけにしてください。例: {"areas":[{"name":"転職活動","value":6,"box":6}],"perDay":3}\n\n' +
    '--- 話した内容 ---\n' + text;
}
async function runSample(kind) {
  if (!ui.sample || ui.busy) return;
  const g = state.goals[ui.gk]; const wk = ui.gk === 'week';
  if (kind === 'fill' && !ui.voice.trim()) { ui.err = '話した内容を入れてから押してください。'; render(); return; }
  ui.busy = kind; ui.err = ''; ui.patch = null; ui.ctl = new AbortController(); render();
  try {
    if (kind === 'fill') {
      const p = await ui.sample.json(goalPrompt(wk ? '今週' : '今月', wk ? '1週間' : '1か月', g, ui.voice), { cache: false, signal: ui.ctl.signal });
      ui.patch = mergePatch(g, p);
    } else {
      const cur = JSON.stringify({ areas: g.areas, outcomes: g.outcomes.map(o => o.t), habits: g.habits });
      const q = await ui.sample.json('あなたは、' + (wk ? '今週' : '今月') + 'の目標を決める手伝いをします。1BOX=2時間です。次の現在の内容を見て、まだ薄い・空いている項目を埋めるために聞くと良い質問を、口語の短い日本語で最大4つ、文字列の配列(JSONのみ)で返してください。\n現在の内容: ' + cur + '\n話した内容: ' + (ui.voice || '(まだありません)'), { cache: false, signal: ui.ctl.signal, modelTier: 'quick' });
      ui.questions = Array.isArray(q) ? q.filter(x => typeof x === 'string').slice(0, 4) : null;
    }
  } catch (e) {
    if (!e || e.code !== 'cancelled') ui.err = sampleErr(e);
  }
  ui.busy = ''; ui.ctl = null; render();
}

// SPを獲得したときのお知らせ
function noticeBar() {
  const n = (state.notices || []).find(x => !x.read); if (!n) return '';
  return '<div class="notice" role="alert"><div><b>お知らせ</b><div>' + esc(n.text) + '</div></div><div class="btnrow"><button class="btn primary sm" data-action="noticeskill">スキルを見る</button><button class="btn sm" data-action="noticeok">OK</button></div></div>';
}

// 設定
function viewSettings() {
  const opts = [6, 0, 1, 2, 3, 4, 5].map(d => [d, WD[d] + '曜はじまり(' + WD[d] + '〜' + WD[(d + 6) % 7] + ')']);
  const sm = stdMin(); const sUnit = state.stdUnit === 'm' || sm % 60 ? 'm' : 'h'; const sVal = sUnit === 'h' ? sm / 60 : sm;
  return '<div class="stack"><div><button class="btn sm" data-action="tab" data-tab="home">← ホームへ</button></div>' +
    '<section class="sec"><h2 class="sh">設定</h2><div class="form"><div class="field"><span class="lbl">クエストの標準サイズ<small>　カレンダーに置いたときの長さ</small></span><span class="stdrow"><input class="in" type="number" inputmode="decimal" min="0.25" step="any" value="' + sVal + '" data-std="v" aria-label="標準サイズの数値"><select class="in" data-std="u" aria-label="単位"><option value="h"' + (sUnit === 'h' ? ' selected' : '') + '>時間</option><option value="m"' + (sUnit === 'm' ? ' selected' : '') + '>分</option></select></span><small>いま ' + fmtDur(sm) + '(15分きざみ・最大12時間)。置いたあとは、予定をタップして開始・終了で変えられます。</small></div><div class="field"><span class="lbl">朝・夜の習慣の時間<small>　記録するときの、はじめの時間(記録のとき変えられます)</small></span>' + [['morning', '朝の習慣'], ['night', '夜の習慣']].map(h => '<span class="stdrow"><span class="hl">' + h[1] + '</span><input class="in" type="time" step="900" value="' + fmtT(habT(h[0])[0]) + '" data-habt="' + h[0] + '" data-w="s" aria-label="' + h[1] + 'の開始"><span>〜</span><input class="in" type="time" step="900" value="' + fmtT(habT(h[0])[1] % 1440) + '" data-habt="' + h[0] + '" data-w="e" aria-label="' + h[1] + 'の終了"></span>').join('') + '</div><div class="field"><span class="lbl">画面の色</span><div class="seg" role="group" aria-label="画面の色">' + THEMES_UI.map(t => '<button data-action="theme" data-v="' + t[0] + '" aria-pressed="' + ((state.theme || 'default') === t[0]) + '">' + t[1] + '</button>').join('') + '</div></div><div class="field"><span class="lbl">1週間の始まり</span>' +
    '<div class="seg col" role="group" aria-label="1週間の始まり">' + opts.map(o => '<button data-action="wks" data-v="' + o[0] + '" aria-pressed="' + (WKS === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
    '<div class="note">基本は土曜はじまり(土〜金)です。7つの曜日から選べます。変えると、カレンダー・今週の目標・イベントクエストの週が、この曜日で区切られます。今週の目標の期間は、今日をふくむ週に合わせ直します。</div></div></div></section>' +
    (window.IS_PWA ? '<section class="sec"><h2 class="sh">Googleカレンダー</h2><div class="form"><div class="note">カレンダーの画面の「反映」を押すと、Googleのログインが出ます(ログインは約1時間ごとに必要です)。ログインに使うのは、アプリのテストユーザーに入れたアカウントです。</div><div class="bkrow"><button class="btn" data-action="gsignout">Googleとの接続を解除</button></div><small>' + (window.GAUTH && GAUTH.signedIn() ? '状態: ログイン中' : '状態: ログインしていません') + '</small></div></section>' : '') +
    '<section class="sec"><h2 class="sh"><span class="shl">データのバックアップ' + infoBtn('backup') + '</span></h2><div class="form">' +
    '<div class="note">いまの記録(クエスト・ステータス・ゴールド・目標・省察など)を、ファイルに保存できます。機種変更や、更新・初期化の前に取っておくと安心です。</div>' +
    '<div class="bkrow"><button class="btn primary" data-action="bkexport">ファイルに保存</button>' +
    '<button class="btn" data-action="bkimport">ファイルから読み込む</button></div>' +
    '<input type="file" id="bkfile" accept=".json,application/json" hidden>' +
    (ui.bkArm ? '<div class="note warn">「' + esc(ui.bkArm.name) + '」(' + esc(ui.bkArm.when) + ' 保存分)で、いまの記録をすべて置き換えます。よければもう一度押してください。</div><div class="bkrow"><button class="btn danger" data-action="bkgo">置き換える</button><button class="btn" data-action="bkcancel">やめる</button></div>' : '') +
    '<div class="note" style="margin-top:6px"><b>表にして書き出す</b>(見るためのもので、読み込みはできません)</div>' +
    '<div class="bkrow"><button class="btn" data-action="dxlsx">Excel(.xlsx)</button><button class="btn" data-action="dcsv">CSV(zip)</button><button class="btn" data-action="dmd">Markdown</button></div>' +
    '<div class="note">Excel・Googleスプレッドシートは.xlsx、Notionは「CSV」を取り込み、Obsidianは「Markdown」をVaultに入れると読めます。</div>' +
    '<small>最後に保存したバックアップ: ' + (state.lastBackup ? esc(state.lastBackup) : 'まだありません') + '</small></div></section></div>';
}
