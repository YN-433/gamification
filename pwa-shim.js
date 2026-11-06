/* PWA(Claudeの外)で動かすときの代わり。
   ・downloads: 端末へのダウンロード
   ・mcp: Googleカレンダーだけ、Googleのログイン(OAuth)+Calendar APIで直接つなぐ
   ・それ以外(Googleドライブ・AI)は使えません */
(function () {
  if (window.claude) return;
  window.IS_PWA = true;
  var CLIENT_ID = '334600344134-kan8prpmmvf09fh6hp91mrrsutjv25o1.apps.googleusercontent.com';
  var SCOPE = 'https://www.googleapis.com/auth/calendar.events';
  var TOKEN_KEY = 'gamification-gtoken';
  var TZ = 'Asia/Tokyo';
  var API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  var tokenClient = null;

  function readTok() { try { var t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); return t && t.exp > Date.now() + 60000 ? t : null; } catch (e) { return null; } }
  function loadGIS() {
    return new Promise(function (ok, ng) {
      if (window.google && google.accounts && google.accounts.oauth2) return ok();
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { ng({ code: 'gnet' }); };
      document.head.appendChild(s);
    });
  }
  // アクセストークン(約1時間)。切れていたら、Googleのログイン画面を出す
  function getToken() {
    var t = readTok(); if (t) return Promise.resolve(t.token);
    return loadGIS().then(function () {
      return new Promise(function (ok, ng) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPE,
          callback: function (r) {
            if (!r || r.error || !r.access_token) return ng({ code: 'gauth' });
            try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 })); } catch (e) {}
            ok(r.access_token);
          },
          error_callback: function () { ng({ code: 'gauth' }); }
        });
        tokenClient.requestAccessToken({ prompt: '' });
      });
    });
  }
  function dt(s) { return { dateTime: s, timeZone: TZ }; }
  function bodyOf(a) {
    return { summary: a.summary, description: a.description, start: dt(a.startTime), end: dt(a.endTime), reminders: { useDefault: a.useDefaultReminders !== false } };
  }
  function call(method, url, body, retried) {
    return getToken().then(function (tok) {
      return fetch(url, { method: method, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
        if (r.status === 401 && !retried) { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} return call(method, url, body, true); }
        if (r.status === 204) return { status: 204 };
        return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
      });
    });
  }
  var mcp = {
    listTools: function () { return Promise.resolve({ tools: [] }); },
    callTool: function (server, tool, a) {
      if (server !== 'Google Calendar') return Promise.reject({ code: 'server_not_connected' });
      a = a || {};
      if (tool === 'create_event') return call('POST', API, bodyOf(a)).then(function (j) { if (!j.id) throw { code: 'gapi', status: j.status }; return { payload: { id: j.id } }; });
      if (tool === 'update_event') return call('PATCH', API + '/' + encodeURIComponent(a.eventId), bodyOf(a)).then(function (j) { if (!j.id) throw { code: 'gapi', status: j.status }; return { payload: { id: j.id } }; });
      if (tool === 'delete_event') return call('DELETE', API + '/' + encodeURIComponent(a.eventId)).then(function (j) { if (j.status !== 204 && j.status !== 404 && j.status !== 410) throw { code: 'gapi', status: j.status }; return { payload: {} }; });
      return Promise.reject({ code: 'gapi' });
    }
  };
  window.claude = {
    use: function (name) {
      if (name === 'downloads') return Promise.resolve({ save: function (o) {
        var a = document.createElement('a'); var u = URL.createObjectURL(o.data); a.href = u; a.download = o.filename;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); return Promise.resolve();
      } });
      if (name === 'mcp') return Promise.resolve(mcp);
      return Promise.resolve(null);
    }
  };
  window.GAUTH = {
    signedIn: function () { return !!readTok(); },
    signOut: function () {
      var t = null; try { t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      if (t && window.google && google.accounts && google.accounts.oauth2) try { google.accounts.oauth2.revoke(t.token, function () {}); } catch (e) {}
    }
  };
})();
