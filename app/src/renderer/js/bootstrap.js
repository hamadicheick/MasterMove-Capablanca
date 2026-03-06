(function(){
  function ensureBanner(){
    let b = document.getElementById("mm_boot_banner");
    if (!b){
      b = document.createElement("div");
      b.id = "mm_boot_banner";
      b.style.position = "fixed";
      b.style.left = "12px";
      b.style.right = "12px";
      b.style.bottom = "12px";
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(255,255,255,.12)";
      b.style.background = "rgba(0,0,0,.75)";
      b.style.backdropFilter = "blur(10px)";
      b.style.color = "#eaeaea";
      b.style.fontFamily = "system-ui,Segoe UI,Arial,sans-serif";
      b.style.fontSize = "13px";
      b.style.zIndex = "999999";
      b.style.whiteSpace = "pre-wrap";
      b.style.display = "none";
      document.body.appendChild(b);
    }
    return b;
  }

function show(msg){
  const b = ensureBanner();
  // Build a small dismissible banner (doesn't block UI)
  b.innerHTML = "";
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.alignItems = "flex-start";

  const pre = document.createElement("div");
  pre.style.flex = "1";
  pre.textContent = msg;

  const btn = document.createElement("button");
  btn.id = "mm_boot_close";
  btn.textContent = "x";
  btn.title = "Fermer";
  btn.style.border = "1px solid rgba(255,255,255,.15)";
  btn.style.background = "rgba(255,255,255,.06)";
  btn.style.color = "#eaeaea";
  btn.style.borderRadius = "10px";
  btn.style.padding = "4px 10px";
  btn.style.cursor = "pointer";
  btn.addEventListener("click", () => { b.style.display = "none"; });

  row.appendChild(pre);
  row.appendChild(btn);
  b.appendChild(row);
  b.style.display = "block";

  // Keep visible until user closes it.
}

  // Minimal loading placeholder
  try{
    const app = document.getElementById("app");
    if (app && !app.__booted){
      app.__booted = true;
      app.innerHTML = '<div style="padding:18px;color:#b9b9b9;font-family:system-ui,Segoe UI,Arial">Chargement...</div>';
    }
  }catch(_){}

  function formatLoc(filename, lineno, colno){
    if (!filename) return "";
    const f = String(filename).replace(/^file:\/\//, "");
    return `${f}:${lineno || 0}:${colno || 0}`;
  }

  window.addEventListener("error", (ev) => {
    const msg = (ev && (ev.message || (ev.error && ev.error.message))) || "Erreur inconnue";
    // Benign Chromium warning sometimes emitted as an error event
    if (/ResizeObserver loop/i.test(msg)) { console.warn("Ignored:", msg); return; }
    const loc = formatLoc(ev && ev.filename, ev && ev.lineno, ev && ev.colno);
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "UA?";
    console.error("Boot error:", ev && (ev.error || ev));
    const stack = ev?.error?.stack ? ("\nStack:\n" + String(ev.error.stack)) : "";
    show(
      "Erreur au demarrage:\n" +
      msg + "\n" +
      (loc ? ("Lieu: " + loc + "\n") : "") +
      "UA: " + ua + "\n" +
      "Ouvre la console: Ctrl+Shift+I" +
      stack
    );
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const msg = (ev && ev.reason && ev.reason.message) ? ev.reason.message : String(ev && ev.reason || "Promise rejetee");
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "UA?";
    console.error("Boot unhandled rejection:", ev && (ev.reason || ev));
    const stack = ev?.reason?.stack ? ("\nStack:\n" + String(ev.reason.stack)) : "";
    show(
      "Erreur au demarrage (Promise):\n" +
      msg + "\n" +
      "UA: " + ua + "\n" +
      "Ouvre la console: Ctrl+Shift+I" +
      stack
    );
  });
})();
