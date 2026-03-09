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

    this._boardEl = null;
    this._ro = null;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this._syncSquareBoard());
    }

    // Annotations Lichess-style (cercles + flèches)
    this._annotations    = [];      // [{type:"circle"|"arrow", sq?, from?, to?, color}]
    this._dragAnnotFrom  = null;    // case de départ du clic-droit
    this._dragAnnotHover = null;    // case survolée pendant le drag
    this._dragAnnotColor = "green"; // couleur en cours
    this._annotSvg       = null;    // référence à l'élément <svg> overlay
    this._onDocMouseUp   = null;    // référence pour nettoyage éventuel
  }

  _syncSquareBoard(){
    if (!this._boardEl) return;
    // Force a perfect square even if CSS layout changes
    const w = this._boardEl.getBoundingClientRect().width;
    if (w > 0) this._boardEl.style.height = `${w}px`;
  }

  mount(node){
    node.appendChild(this.root);

    // Listener global mouseup pour capturer le relâchement hors du plateau
    this._onDocMouseUp = (e) => {
      if (e.button !== 2 || !this._dragAnnotFrom) return;
      const from  = this._dragAnnotFrom;
      const color = this._dragAnnotColor;
      const to    = this._dragAnnotHover;
      this._dragAnnotFrom  = null;
      this._dragAnnotHover = null;
      if (!to) { this._renderAnnotations(); return; }
      if (to === from) this._toggleAnnotCircle(from, color);
      else             this._toggleAnnotArrow(from, to, color);
      this._renderAnnotations();
    };
    document.addEventListener("mouseup", this._onDocMouseUp);
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
        this.onMove({ from: fromSq, to: toSq, promo, uci: fromSq + toSq + promo, source: "user" });
        this.render();
      });
      return;
    }

    const snap = makeMoveLegal(this.pos, fromSq, toSq, null);
    this._history.push(snap);
    this._selected = null;
    this._legalTargets = [];
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

        const isSel = this._selected === sq;
        const isTarget = this._legalTargets.includes(sq);

        const sqEl = h("div", {
          class: [
            "square",
            light ? "light" : "dark",
            isSel ? "sel" : "",
            isTarget ? "target" : "",
          ].filter(Boolean).join(" "),
          "data-sq": sq,
          ondragover: (ev) => { ev.preventDefault(); },
          ondrop: (ev) => {
            ev.preventDefault();
            const from = this._dragFrom;
            this._dragFrom = null;
            if (!from) return;
            this.tryMove(from, sq);
          },
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
            draggable: !this._locked,
            ondragstart: (ev) => {
              if (this._locked) { ev.preventDefault(); return; }
              this._dragFrom = sq;
              // hint selection during drag
              this._selected = sq;
            this._legalTargets = legalMovesFrom(this.pos, sq);
              this.render();
            }
          });
          applyPieceSrcWithFallback(img, getPieceSet(), piece.color, piece.type);
          sqEl.appendChild(img);
        }

        board.appendChild(sqEl);
      }
    }

    // ── Annotation overlay (Lichess-style : cercles + flèches) ──────────────
    const _ns = "http://www.w3.org/2000/svg";
    const _ANNOT_COLORS = {
      green:  "rgba(0,160,0,0.85)",
      red:    "rgba(210,40,40,0.85)",
      blue:   "rgba(40,90,210,0.85)",
      yellow: "rgba(210,175,0,0.85)",
    };

    // Créer le <svg> avec les marqueurs de flèche pour chaque couleur
    const annotSvg = document.createElementNS(_ns, "svg");
    annotSvg.setAttribute("class", "boardAnnotations");
    annotSvg.setAttribute("viewBox", "0 0 8 8");
    annotSvg.setAttribute("xmlns", _ns);
    const _defs = document.createElementNS(_ns, "defs");
    for (const [name, fill] of Object.entries(_ANNOT_COLORS)) {
      const marker = document.createElementNS(_ns, "marker");
      marker.setAttribute("id", `ah-${name}`);
      marker.setAttribute("markerWidth", "4");
      marker.setAttribute("markerHeight", "4");
      marker.setAttribute("refX", "3.5");
      marker.setAttribute("refY", "2");
      marker.setAttribute("orient", "auto");
      const poly = document.createElementNS(_ns, "polygon");
      poly.setAttribute("points", "0,0 4,2 0,4");
      poly.setAttribute("fill", fill);
      marker.appendChild(poly);
      _defs.appendChild(marker);
    }
    annotSvg.appendChild(_defs);
    board.appendChild(annotSvg);
    this._annotSvg = annotSvg;

    // Gestionnaires de clic-droit sur le plateau
    board.addEventListener("contextmenu", e => e.preventDefault());

    board.addEventListener("mousedown", e => {
      // Clic gauche → effacer toutes les annotations
      if (e.button === 0) { this.clearAnnotations(); return; }
      // Clic droit → démarrer une annotation
      if (e.button !== 2) return;
      const sq = this._sqFromAnnotEvent(e);
      if (!sq) return;
      this._dragAnnotFrom  = sq;
      this._dragAnnotHover = sq;
      this._dragAnnotColor = this._annotColorFromEvent(e);
      this._renderAnnotations();
    });

    board.addEventListener("mousemove", e => {
      if (!this._dragAnnotFrom) return;
      const sq = this._sqFromAnnotEvent(e);
      if (sq && sq !== this._dragAnnotHover) {
        this._dragAnnotHover = sq;
        this._renderAnnotations();
      }
    });

    // Dessiner les annotations existantes (survivent aux re-renders)
    this._renderAnnotations();
    // ── Fin overlay annotations ──────────────────────────────────────────────

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

  // ── Méthodes d'annotation (Lichess-style) ─────────────────────────────────

  /** Retourne la case sous le curseur à partir d'un MouseEvent */
  _sqFromAnnotEvent(e) {
    const el = e.target.closest("[data-sq]");
    return el ? el.dataset.sq : null;
  }

  /** Couleur selon les touches modificatrices (style Lichess) */
  _annotColorFromEvent(e) {
    if (e.shiftKey) return "red";
    if (e.altKey)   return "blue";
    if (e.ctrlKey)  return "yellow";
    return "green";
  }

  /** Centre SVG d'une case dans un viewBox 0 0 8 8 */
  _sqCenter(sq) {
    return {
      x: sq.charCodeAt(0) - 97 + 0.5,  // 'a'=0 … 'h'=7
      y: 8 - parseInt(sq[1]) + 0.5     // rang 1 → y=7.5, rang 8 → y=0.5
    };
  }

  /** Toggle : même annotation existante → supprime, sinon → ajoute */
  _toggleAnnotCircle(sq, color) {
    const i = this._annotations.findIndex(
      a => a.type === "circle" && a.sq === sq && a.color === color
    );
    if (i !== -1) this._annotations.splice(i, 1);
    else          this._annotations.push({ type: "circle", sq, color });
  }

  _toggleAnnotArrow(from, to, color) {
    const i = this._annotations.findIndex(
      a => a.type === "arrow" && a.from === from && a.to === to && a.color === color
    );
    if (i !== -1) this._annotations.splice(i, 1);
    else          this._annotations.push({ type: "arrow", from, to, color });
  }

  /** Efface toutes les annotations (appelé par clic gauche ou navigation) */
  clearAnnotations() {
    this._annotations    = [];
    this._dragAnnotFrom  = null;
    this._dragAnnotHover = null;
    this._renderAnnotations();
  }

  /** Reconstruit le contenu SVG à partir de this._annotations */
  _renderAnnotations() {
    if (!this._annotSvg) return;
    const svg = this._annotSvg;
    const ns  = "http://www.w3.org/2000/svg";
    const COLORS = {
      green:  "rgba(0,160,0,0.85)",
      red:    "rgba(210,40,40,0.85)",
      blue:   "rgba(40,90,210,0.85)",
      yellow: "rgba(210,175,0,0.85)",
    };

    // Supprimer tout sauf <defs>
    [...svg.children].forEach(c => { if (c.tagName !== "defs") c.remove(); });

    // Flèche preview pendant le drag (semi-transparente)
    if (this._dragAnnotFrom && this._dragAnnotHover && this._dragAnnotHover !== this._dragAnnotFrom) {
      svg.appendChild(
        this._makeAnnotArrow(this._dragAnnotFrom, this._dragAnnotHover, this._dragAnnotColor, COLORS, ns, 0.4)
      );
    }

    // Annotations validées
    for (const a of this._annotations) {
      if (a.type === "circle") {
        const { x, y } = this._sqCenter(a.sq);
        const el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", x);
        el.setAttribute("cy", y);
        el.setAttribute("r", "0.44");
        el.setAttribute("stroke", COLORS[a.color]);
        el.setAttribute("stroke-width", "0.1");
        el.setAttribute("fill", "none");
        el.setAttribute("opacity", "0.9");
        svg.appendChild(el);
      } else if (a.type === "arrow") {
        svg.appendChild(this._makeAnnotArrow(a.from, a.to, a.color, COLORS, ns, 1));
      }
    }
  }

  /** Crée un élément <line> SVG représentant une flèche annotée */
  _makeAnnotArrow(from, to, color, COLORS, ns, opacity) {
    const p1  = this._sqCenter(from);
    const p2  = this._sqCenter(to);
    const dx  = p2.x - p1.x;
    const dy  = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const SHORTEN = 0.38; // recul pour laisser place à la pointe
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x - (dx / len) * SHORTEN);
    line.setAttribute("y2", p2.y - (dy / len) * SHORTEN);
    line.setAttribute("stroke", COLORS[color]);
    line.setAttribute("stroke-width", "0.14");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", `url(#ah-${color})`);
    line.setAttribute("opacity", opacity);
    return line;
  }

  // ── Fin méthodes d'annotation ─────────────────────────────────────────────

  _onSquareClick(sq){
    if (this._locked) return;

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
