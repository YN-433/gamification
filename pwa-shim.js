/* PWA(Claudeの外)で動かすときの代わり: Claude専用の機能は使えないので、保存だけは端末へのダウンロードにする */
(function () {
  if (window.claude) return;
  window.claude = {
    use: function (name) {
      if (name === 'downloads') return Promise.resolve({ save: function (o) {
        var a = document.createElement('a'); var u = URL.createObjectURL(o.data); a.href = u; a.download = o.filename;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); return Promise.resolve();
      } });
      return Promise.resolve(null); // mcp(Google Drive/カレンダー)・sample(AI)はこの形では使えません
    }
  };
  window.IS_PWA = true;
})();
