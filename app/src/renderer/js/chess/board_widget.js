import { h, clear, toast } from "../ui/dom.js";
import { Store } from "../infra/store.js";
import { parseFen } from "./fen.js";
import { coordsToSquare, squareToCoords, parseUci } from "./square.js";
import { isLegalMove, legalMovesFrom, makeMoveLegal, undoMove } from "./rules_legal.js";

function getPieceSet(){
  const v = Store.get("ui.pieceSet", "classic");
  if (typeof v === "string") return { id: v, root: "piecesets", scheme: "unknown" };
  if (v && typeof v === "object") {
    return { id: v.id || "classic", root: v.root || "piecesets", scheme: v.scheme || "unknown" };
  }
  return { id: "classic", root: "piecesets", scheme: "unknown" };
}

function typeToLetter(type){
  return ({ k:"K", q:"Q", r:"R", b:"B", n:"N", p:"P" })[type] || String(type || "").toUpperCase();
}

function pieceCandidates(set, color, type){
  const base = `./assets/${set.root}/${set.id}/`;
  const lower = `${color}${type}`;
  const upper = `${color}${typeToLetter(type)}`;
  const cands = [];
  const add = (s) => { if (!cands.includes(s)) cands.push(s); };

  switch (set.scheme) {
    case "lower_svg":
      add(base + lower + ".svg"); add(base + lower + ".png"); add(base + upper + ".png"); add(base + upper + ".svg"); break;
    case "upper_png":
      add(base + upper + ".png"); add(base + upper + ".svg"); add(base + lower + ".png"); add(base + lower + ".svg"); break;
    case "lower_png":
      add(base + lower + ".png"); add(base + lower + ".svg"); add(base + upper + ".png"); add(base + upper + ".svg"); break;
    case "upper_svg":
      add(base + upper + ".svg"); add(base + upper + ".png"); add(base + lower + ".svg"); add(base + lower + ".png"); break;
    default:
      add(base + lower + ".svg"); add(base + upper + ".png"); add(base + lower + ".png"); add(base + upper + ".svg"); break;
  }

  return cands;
}

function applyPieceSrcWithFallback(imgEl, set, color, type){
  const cands = pieceCandidates(set, color, type);
  imgEl.dataset.candIndex = "0";
  imgEl.src = cands[0] || "";
  imgEl.onerror = () => {
    const i = parseInt(imgEl.dataset.candIndex || "0", 10);
    const next = i + 1;
    if (next >= cands.length) return;
    imgEl.dataset.candIndex = String(next);
    imgEl.src = cands[next];
  };
}

function isLightSquare(r,c){
  return (r + c) % 2 === 0;
}

function pieceAlt(p){
  if (!p) return "";
  const name = ({p:"Pion", n:"Cavalier", b:"Fou", r:"Tour", q:"Dame", k:"Roi"})[p.type] || p.type;
  const color = p.color === "w" ? "Blanc" : "Noir";
  return `${name} ${color}`;
}

export class BoardWidget {
  constructor({ onMove, onAnimationStep } = {}){
    this.onMove = onMove || (()=>{});
    this.onAnimationStep = onAnimationStep || (()=>{});
    this.root = h("div", {});
    this.pos = null;
    this._selected = null;
    this._legalTargets = [];
    this._dragFrom = null;
    this._locked = false;
    this._fenStart = null;
    this._animations = [];
    this._animTimer = null;
    this._animIndex = 0;

    // Undo history (snapshots)
    this._history = [];
    this._lastMove = null;         // { from, to } dernier coup joué
    this._dragGhost = null;        // élément DOM fantôme pendant le drag custom
    this._suppressNextClick = false;

    this._boardEl = null;
    this._ro = null;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this._syncSquareBoard());
    }
  }

  _syncSquareBoard(){
    if (!this._boardEl) return;
    // Force a perfect square even if CSS layout changes
    const w = this._boardEl.getBoundingClientRect().width;
    if (w > 0) this._boardEl.style.height = `${w}px`;
  }

  mount(node){
    node.appendChild(this.root);
  }

  setLocked(v){
    this._locked = !!v;
    this.render();
  }

  setPositionFromFen(fen){
    this._fenStart = fen;
    this.pos = parseFen(fen);
    this._selected = null;
    this._legalTargets = [];
    this._history = [];
    this.stopAnimations();
    this.render();
  }

  setAnimations(movesUci){
    const src = Array.isArray(movesUci) ? movesUci : [];
    this._animations = src.map((m) => {
      if (typeof m === "string") {
        return { coup: String(m || "").trim().toLowerCase(), commentaire: "" };
      }
      if (m && typeof m === "object") {
        return {
          coup: String(m.coup || m.uci || "").trim().toLowerCase(),
          commentaire: String(m.commentaire || m.comment || "").trim()
        };
      }
      return { coup: "", commentaire: "" };
    }).filter(x => !!x.coup);
    this._animIndex = 0;
  }

  stopAnimations(){
    if (this._animTimer){
      clearTimeout(this._animTimer);
      this._animTimer = null;
    }
  }

  replayPositionAndAnimations({ cadenceMs=900 } = {}){
    if (!this._fenStart) return;
    this.setPositionFromFen(this._fenStart);
    if (!this._animations.length) return;
    this.setLocked(true);
    this.onAnimationStep({ index: 0, total: this._animations.length, move: "", commentaire: "" });
    const step = () => {
      if (this._animIndex >= this._animations.length){
        this.setLocked(false);
        return;
      }
      const cur = this._animations[this._animIndex++];
      const u = cur.coup;
      const commentaire = cur.commentaire || "";
      const ok = this.applyUci(u, { ignoreTurn:true, silent:true });
      let callbackDelay = 0;
      if (ok) {
        const stepInfo = {
          index: this._animIndex,
          total: this._animations.length,
          move: u,
          commentaire
        };
        try{
          const ret = this.onAnimationStep(stepInfo);
          if (typeof ret === "number") callbackDelay = ret;
          else if (ret && typeof ret.delayMs === "number") callbackDelay = ret.delayMs;
        }catch(_){ }
      }
      // Give TTS enough time when a comment exists.
      const commentDelay = commentaire
        ? Math.min(12000, 1800 + (commentaire.length * 55))
        : 0;
      const delay = Math.max(cadenceMs, commentDelay, (typeof callbackDelay === "number" ? callbackDelay : 0));
      this._animTimer = setTimeout(step, delay);
    };
    step();
  }

  applyUci(u, { ignoreTurn=false, silent=false, source="script" } = {}){
    if (!this.pos) return false;
    const parsed = parseUci(u);
    if (!parsed) return false;
    const { from, to, promo } = parsed;

    // if ignoreTurn, temporarily bypass turn check
    const savedTurn = this.pos.turn;
    if (ignoreTurn) this.pos.turn = getPieceColorAt(this.pos, from) || this.pos.turn;

    const check = isLegalMove(this.pos, from, to, promo || null);
    if (!check.ok) {
      if (!silent) toast(check.reason || "Coup refuse.");
      this.pos.turn = savedTurn;
      return false;
    }

    const snap = makeMoveLegal(this.pos, from, to, promo || null);
    this._history.push(snap);

    this._selected = null;
    this._legalTargets = [];
    this._lastMove = { from, to };
    this.pos.turn = ignoreTurn ? savedTurn : this.pos.turn;

    this.onMove({ from, to, promo: promo || null, uci: u, source });
    this.render();
    return true;
  }

  tryMove(fromSq, toSq){
    if (this._locked) return toast("Attends la demonstration.");
    if (!this.pos) return;

    const check = isLegalMove(this.pos, fromSq, toSq, null);
    if (!check.ok) return toast(check.reason || "Coup refuse.");

    // if pawn reaches last rank and no promo provided: ask quickly
    const { r:tr } = squareToCoords(toSq);
    const { r:fr, c:fc } = squareToCoords(fromSq);
    const piece = this.pos.board[fr][fc];
    const needsPromo = piece && piece.type === "p" && ((piece.color === "w" && tr === 0) || (piece.color === "b" && tr === 7));

    if (needsPromo){
      this._openPromotionDialog(piece.color, (promo) => {
        const snap = makeMoveLegal(this.pos, fromSq, toSq, promo);
        this._history.push(snap);
        this._selected = null;
        this._legalTargets = [];
        this._lastMove = { from: fromSq, to: toSq };
        this.onMove({ from: fromSq, to: toSq, promo, uci: fromSq + toSq + promo, source: "user" });
        this.render();
      });
      return;
    }

    const snap = makeMoveLegal(this.pos, fromSq, toSq, null);
    this._history.push(snap);
    this._selected = null;
    this._legalTargets = [];
    this._lastMove = { from: fromSq, to: toSq };
    this.onMove({ from: fromSq, to: toSq, promo: null, uci: fromSq + toSq, source: "user" });
    this.render();
  }

  canUndo(){
    return this._history.length > 0;
  }

  undo(){
    if (!this.pos) return false;
    const snap = this._history.pop();
    if (!snap) return false;
    undoMove(this.pos, snap);
    this._selected = null;
    this._legalTargets = [];
    this.render();
    return true;
  }

  _openPromotionDialog(color, onPick){
    const overlay = h("div", { class:"promoOverlay" });
    const box = h("div", { class:"promoBox card panel" },
      h("div", { class:"h1" }, "Promotion"),
      h("p", { class:"p" }, "Choisis la piece :")
    );

    const pieces = [
      { t:"q", label:"Dame" },
      { t:"r", label:"Tour" },
      { t:"b", label:"Fou" },
      { t:"n", label:"Cavalier" }
    ];

    const row = h("div", { class:"promoRow" },
      ...pieces.map(pp => {
        const img = h("img", { class:"promoPiece", src: "", alt: pp.label });
        applyPieceSrcWithFallback(img, getPieceSet(), color, pp.t);
        const btn = h("button", { class:"btn", onclick: () => {
          overlay.remove();
          onPick(pp.t);
        }}, pp.label);
        return h("div", { class:"promoItem" }, img, btn);
      })
    );

    const cancel = h("button", { class:"btn secondary", onclick: () => overlay.remove() }, "Annuler");

    box.appendChild(h("div", { class:"hr" }));
    box.appendChild(row);
    box.appendChild(h("div", { class:"hr" }));
    box.appendChild(cancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  render(){
    clear(this.root);
    this.root.appendChild(h("div", { class:"h1" }, "Echiquier"));

    const board = h("div", { class:"board" });
    this._boardEl = board;
    // Observe size to keep the board perfectly square
    try{
      if (this._ro) {
        this._ro.disconnect();
        this._ro.observe(board);
      }
    }catch(_){ }
    // Initial sync
    requestAnimationFrame(() => this._syncSquareBoard());

    if (!this.pos){
      board.appendChild(h("div", { class:"small" }, "Aucune position."));
      this.root.appendChild(board);
      return;
    }

    for (let r=0; r<8; r++){
      for (let c=0; c<8; c++){
        const sq = coordsToSquare(r,c);
        const piece = this.pos.board[r][c];
        const light = isLightSquare(r,c);

        const isSel      = this._selected === sq;
        const isTarget   = this._legalTargets.includes(sq);
        const isCapture  = isTarget && !!piece;
        const isLastFrom = this._lastMove?.from === sq;
        const isLastTo   = this._lastMove?.to   === sq;

        const sqEl = h("div", {
          class: [
            "square",
            light ? "light" : "dark",
            isSel ? "sel" : "",
            (isLastFrom || isLastTo) ? "lastmove" : "",
            isTarget ? "target" : "",
            isCapture ? "capture" : "",
          ].filter(Boolean).join(" "),
          "data-sq": sq,
          onclick: () => this._onSquareClick(sq)
        });

        // coordinates
        if (r === 7 && c === 0){
          sqEl.appendChild(h("div", { class:"coord file" }, "a"));
          sqEl.appendChild(h("div", { class:"coord rank" }, "1"));
        } else {
          if (r === 7) sqEl.appendChild(h("div", { class:"coord file" }, String.fromCharCode(97+c)));
          if (c === 0) sqEl.appendChild(h("div", { class:"coord rank" }, String(8-r)));
        }

        if (piece){
          const img = h("img", {
            class: "piece" + (this._locked ? " locked" : ""),
            src: "",
            alt: pieceAlt(piece),
            draggable: false,
            onmousedown: (ev) => {
              if (this._locked) return;
              if (ev.button !== 0) return;
              ev.preventDefault();
              this._startDrag(sq, img, ev);
            }
          });
          applyPieceSrcWithFallback(img, getPieceSet(), piece.color, piece.type);
          sqEl.appendChild(img);
        }

        board.appendChild(sqEl);
      }
    }

    const info = h("div", { class:"small", style:"margin-top:10px;" },
      this._locked ? "Mode demonstration (deplacements bloques)." : "Deplace les pieces en glissant ou en cliquant."
    );

    const ctrl = h("div", { class:"controls", style:"margin-top:10px;" },
      h("span", { class:"kbd" }, `Trait: ${this.pos.turn === "w" ? "Blancs" : "Noirs"}`),
      h("button", { class:"btn secondary", onclick: () => {
        if (this._fenStart) this.setPositionFromFen(this._fenStart);
      }}, "Reset position"),
      h("button", { class:"btn secondary", onclick: () => {
        this._selected = null;
        this._legalTargets = [];
        this.render();
      }}, "Deselectionner")
    );

    this.root.appendChild(board);
    this.root.appendChild(info);
    this.root.appendChild(ctrl);
  }

  _startDrag(sq, pieceImg, ev) {
    // Vérifie que la pièce appartient au camp qui a le trait
    const { r, c } = squareToCoords(sq);
    const p = this.pos.board[r][c];
    if (!p || p.color !== this.pos.turn) return;

    // Sélectionner + coups légaux
    this._selected = sq;
    this._legalTargets = legalMovesFrom(this.pos, sq);
    this._dragFrom = sq;
    this.render();

    // Retrouver l'img après le re-render (le DOM a été reconstruit)
    const freshImg = this._boardEl?.querySelector(`[data-sq="${sq}"] .piece`);

    // Créer le ghost qui suit la souris
    const rect = (freshImg || pieceImg).getBoundingClientRect();
    const ghost = document.createElement("img");
    ghost.src = (freshImg || pieceImg).src;
    ghost.alt = (freshImg || pieceImg).alt;
    ghost.className = "piece piece-drag-ghost";
    ghost.style.width  = rect.width  + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.left   = ev.clientX  + "px";
    ghost.style.top    = ev.clientY  + "px";
    document.body.appendChild(ghost);
    this._dragGhost = ghost;

    // Atténuer la pièce d'origine
    if (freshImg) freshImg.classList.add("dragging-origin");

    const onMove = (e) => {
      ghost.style.left = e.clientX + "px";
      ghost.style.top  = e.clientY + "px";
    };

    const onUp = (e) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      ghost.remove();
      this._dragGhost = null;

      // Retrouver la pièce d'origine (toujours via le DOM actuel)
      const originImg = this._boardEl?.querySelector(`[data-sq="${sq}"] .piece`);
      if (originImg) originImg.classList.remove("dragging-origin");

      // Trouver la case sous le curseur
      ghost.style.display = "none"; // masquer le ghost pour elementFromPoint
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetSq = el?.closest("[data-sq]")?.dataset?.sq;

      const from = this._dragFrom;
      this._dragFrom = null;
      this._suppressNextClick = true;
      // Le click qui suit le mouseup ne doit pas re-déclencher _onSquareClick
      setTimeout(() => { this._suppressNextClick = false; }, 50);

      if (targetSq && targetSq !== from) {
        this.tryMove(from, targetSq);
      } else {
        // Relâché sur la même case ou hors du plateau → déselectionner
        this._selected = null;
        this._legalTargets = [];
        this.render();
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  _onSquareClick(sq){
    if (this._locked) return;
    if (this._suppressNextClick) return;

    if (!this._selected){
      // select if has piece of side-to-move
      const { r, c } = squareToCoords(sq);
      const p = this.pos.board[r][c];
      if (!p) return;
      if (p.color !== this.pos.turn) return toast("Choisis une piece du trait.");
      this._selected = sq;
      this._legalTargets = legalMovesFrom(this.pos, sq);
      this.render();
      return;
    }

    if (this._selected === sq){
      this._selected = null;
      this._legalTargets = [];
      this.render();
      return;
    }

    // attempt move
    const from = this._selected;
    this.tryMove(from, sq);
  }
}

function getPieceColorAt(pos, sq){
  try{
    const { r, c } = squareToCoords(sq);
    return pos.board[r][c]?.color || null;
  }catch(_){
    return null;
  }
}
