export function h(tag, attrs={}, ...children){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs || {})){
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (v !== null && v !== undefined) el.setAttribute(k, String(v));
  }
  for (const c of children.flat()){
    if (c === null || c === undefined) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(node){
  while(node.firstChild) node.removeChild(node.firstChild);
}

let _toastEl = null;
let _toastTimer = null;

export function toast(msg, ms=2200){
  // Keep a single toast on screen to avoid overlapping messages.
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  if (!_toastEl || !_toastEl.isConnected) {
    _toastEl = h("div", { class:"toast" }, "");
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = String(msg ?? "");
  _toastTimer = setTimeout(() => {
    if (_toastEl?.isConnected) _toastEl.remove();
    _toastEl = null;
    _toastTimer = null;
  }, Math.max(600, Number(ms) || 2200));
}
