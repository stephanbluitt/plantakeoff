// PLAN TAKEOFF 3.4 — 📑 Quotes uses your TerraTakeoff account through a limited connection.
// In TerraTakeoff (owner account): Settings → Team & usage → PLAN TAKEOFF → Get a connection code. Paste it here once.
// The connection can only use Quotes on terratakeoff.com — not your projects, plans, account or billing — and it doesn't sign
// you out of TerraTakeoff. It's kept in this browser until you disconnect (or it expires after 30 days).
(function () {
  "use strict";
  var API = "https://terratakeoff.com/api", KEY = "pt.tt.quotes";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {} }
  var conn = load();
  if (conn && conn.expires_at && conn.expires_at * 1000 < Date.now()) { save(null); conn = null; }
  function say(msg) { if (typeof window.toast === "function") window.toast(msg, 6000); else alert(msg); }

  var back = null;
  function showConnect() {
    if (!back) {
      back = document.createElement("div");
      back.className = "modalBack"; back.id = "ptConnectBack";
      var m = document.createElement("div"); m.className = "modal"; m.style.width = "420px";
      var h3 = document.createElement("h3"); h3.textContent = "Connect your TerraTakeoff account";
      var p = document.createElement("p");
      p.textContent = "Quotes reads supplier quotes with AI on terratakeoff.com, using your TerraTakeoff account and its monthly allowances. In TerraTakeoff, open Settings → Team & usage → PLAN TAKEOFF → Get a connection code, then paste the code here. It works once, for 10 minutes.";
      var row = document.createElement("div"); row.className = "frow";
      var inp = document.createElement("input"); inp.type = "text"; inp.id = "ptConnectCode"; inp.placeholder = "XXXXX-XXXXX"; inp.autocomplete = "off"; inp.spellcheck = false;
      inp.style.cssText = "flex:1; font:600 18px/1.2 var(--mono, monospace); letter-spacing:2px; text-transform:uppercase";
      row.appendChild(inp);
      var msg = document.createElement("p"); msg.id = "ptConnectMsg"; msg.style.color = "#c0392b"; msg.style.minHeight = "1em";
      var acts = document.createElement("div"); acts.className = "actions";
      var cancel = document.createElement("button"); cancel.className = "btn"; cancel.type = "button"; cancel.textContent = "Cancel";
      var go = document.createElement("button"); go.className = "btn primary"; go.type = "button"; go.textContent = "Connect";
      acts.appendChild(cancel); acts.appendChild(go);
      m.appendChild(h3); m.appendChild(p); m.appendChild(row); m.appendChild(msg); m.appendChild(acts); back.appendChild(m);
      document.body.appendChild(back);
      cancel.onclick = function () { back.classList.remove("open"); };
      var submit = async function () {
        var code = inp.value.trim();
        if (!code) { inp.focus(); return; }
        go.disabled = true; msg.textContent = "Connecting…"; msg.style.color = "";
        try {
          var r = await fetch(API + "/auth/toolredeem", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({code: code})});
          var j = {}; try { j = await r.json(); } catch (e) {}
          if (!r.ok || j.error) throw new Error((j.error && j.error.message) || "Couldn't connect (" + r.status + ")");
          conn = j.data.session; save(conn);
          back.classList.remove("open"); inp.value = ""; msg.textContent = "";
          say("Connected to TerraTakeoff as " + conn.user.email);
          if (window.ttQuotes) window.ttQuotes.open();
        } catch (e) { msg.textContent = e.message || "Couldn't connect"; msg.style.color = "#c0392b"; }
        finally { go.disabled = false; }
      };
      go.onclick = submit;
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); if (e.key === "Escape") back.classList.remove("open"); });
    }
    back.classList.add("open");
    setTimeout(function () { var i = document.getElementById("ptConnectCode"); if (i) i.focus(); }, 30);
  }

  window.TT_QUOTES_HOST = {
    name: "plantakeoff",
    signedIn: function () { return !!conn; },
    signIn: showConnect,
    api: function () { return conn ? {base: API, token: function () { return conn && conn.access_token; }} : null; },
    projectId: function () { return null; },   // PLAN TAKEOFF projects live on GitHub, not in TerraTakeoff
    me: function () { return conn && conn.user && conn.user.id; },
    email: function () { return conn && conn.user && conn.user.email; },
    isAdmin: function () { return false; },
    plans: function () { window.open("https://terratakeoff.com/app/", "_blank", "noopener"); },
    refreshAccount: async function () {},
    lost: function () {   // the connection ended (disconnected in TerraTakeoff, or expired)
      if (!conn) return;
      save(null); conn = null;
      say("The TerraTakeoff connection ended — get a new code in TerraTakeoff to connect again");
      if (window.ttQuotes) window.ttQuotes.close();
    },
    disconnect: async function () {
      var c = conn; save(null); conn = null;
      if (c) { try { await fetch(API + "/auth/signout", {method: "POST", headers: {Authorization: "Bearer " + c.access_token, "Content-Type": "application/json"}, body: "{}"}); } catch (e) {} }
      say("Disconnected from TerraTakeoff");
    }
  };
})();
