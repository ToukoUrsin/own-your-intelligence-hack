// Northwind Outfitters support chat bubble. Served by storefront/server.ts at /widget.js (token and URL injected).
(() => {
  if (window.__nwChat) return;
  window.__nwChat = true;
  const TOKEN = "__CHAT_TOKEN__";
  const src = document.currentScript && document.currentScript.src;
  const BASE = "__CHAT_URL__" || (src ? new URL(src).origin : "");
  const sid = (() => { try { return sessionStorage.nwSid || (sessionStorage.nwSid = Math.random().toString(36).slice(2)); } catch { return "s" + Date.now(); } })();
  const css = `
  .nw-bubble{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;background:#1f3a2e;color:#f5efe4;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;font:600 24px/1 Georgia,serif}
  .nw-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));display:none;flex-direction:column;background:#faf7f1;border:1px solid #d9d1c3;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#2b2a27}
  .nw-panel.open{display:flex}
  .nw-head{background:#1f3a2e;color:#f5efe4;padding:14px 16px}
  .nw-head b{font:600 16px Georgia,serif;display:block}.nw-head span{font-size:12px;opacity:.8}
  .nw-email{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid #e6dfd2;background:#f3eee4}
  .nw-email input{flex:1;border:1px solid #d9d1c3;border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;background:#fff}
  .nw-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .nw-msg{max-width:85%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}
  .nw-me{align-self:flex-end;background:#1f3a2e;color:#f5efe4;border-bottom-right-radius:4px}
  .nw-bot{align-self:flex-start;background:#fff;border:1px solid #e6dfd2;border-bottom-left-radius:4px}
  .nw-meta{display:flex;gap:6px;align-items:center;margin-top:6px;font-size:11px;color:#7a7266}
  .nw-tier{font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;padding:3px 6px;border-radius:4px;color:#fff}
  .nw-t-explored{background:#b5652b}.nw-t-recalled{background:#3b6ea8}.nw-t-compiled{background:#2f7d4f}
  .nw-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e6dfd2;background:#fff}
  .nw-form textarea{flex:1;resize:none;border:1px solid #d9d1c3;border-radius:8px;padding:8px;font:inherit;height:40px}
  .nw-form button{border:0;border-radius:8px;background:#1f3a2e;color:#f5efe4;padding:0 14px;font-weight:600;cursor:pointer}
  .nw-form button:disabled{opacity:.5}
  .nw-typing{align-self:flex-start;color:#7a7266;font-size:12px;font-style:italic}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const bubble = el("button", "nw-bubble", "?"); bubble.setAttribute("aria-label", "Chat with Northwind support");
  const panel = el("div", "nw-panel");
  panel.innerHTML = `<div class="nw-head"><b>Northwind Outfitters support</b><span>Orders, refunds, returns, account. Usually answers in seconds.</span></div>
  <div class="nw-email"><input type="email" placeholder="Your order email" autocomplete="email"></div>
  <div class="nw-log"></div>
  <form class="nw-form"><textarea placeholder="How can we help?" maxlength="1000"></textarea><button type="submit">Send</button></form>`;
  document.body.append(panel, bubble);
  const [emailIn] = panel.querySelectorAll(".nw-email input"), log = panel.querySelector(".nw-log"), form = panel.querySelector("form"), ta = form.querySelector("textarea"), btn = form.querySelector("button");
  try { emailIn.value = localStorage.nwEmail || ""; } catch {}
  bubble.onclick = () => { panel.classList.toggle("open"); bubble.textContent = panel.classList.contains("open") ? "×" : "?"; (emailIn.value ? ta : emailIn).focus(); };
  const add = (cls, text) => { const m = el("div", "nw-msg " + cls, text); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
  add("nw-bot", "Hi! I'm the Northwind support agent. Enter your order email above and ask me anything about your orders.");
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = emailIn.value.trim(), message = ta.value.trim();
    if (!email) { emailIn.focus(); emailIn.style.borderColor = "#b5652b"; return; }
    if (!message) return;
    try { localStorage.nwEmail = email; } catch {}
    add("nw-me", message); ta.value = ""; btn.disabled = true;
    const typing = el("div", "nw-typing", "Agent is working…"); log.appendChild(typing); log.scrollTop = log.scrollHeight;
    try {
      const r = await fetch(BASE + "/chat", { method: "POST", headers: { "content-type": "application/json", "x-chat-token": TOKEN }, body: JSON.stringify({ email, message, sessionId: sid }) });
      const d = await r.json().catch(() => ({}));
      typing.remove();
      if (!r.ok) { add("nw-bot", d.error || "Sorry, something went wrong."); return; }
      const m = add("nw-bot", d.reply);
      const meta = el("div", "nw-meta"); const tier = String(d.tier || "explored");
      meta.append(el("span", "nw-tier nw-t-" + tier, tier.toUpperCase()), el("span", "", `${(d.ms / 1000).toFixed(1)} s · ${d.steps.length} tool call${d.steps.length === 1 ? "" : "s"}`));
      m.appendChild(meta); log.scrollTop = log.scrollHeight;
    } catch { typing.remove(); add("nw-bot", "Can't reach support right now. Please try again."); }
    finally { btn.disabled = false; ta.focus(); }
  };
})();
