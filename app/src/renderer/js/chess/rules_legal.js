import { squareToCoords, coordsToSquare } from "./square.js";
import { clonePos } from "./fen.js";

// Rules engine (local, no external deps)
// Supports: legal moves, check validation, castling, en-passant, promotion.
// Undo is snapshot-based (clone of position before each move).

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getPiece(pos, r, c) {
  if (!inBounds(r, c)) return null;
  return pos.board[r][c];
}

function setPiece(pos, r, c, p) {
  if (!inBounds(r, c)) return;
  pos.board[r][c] = p;
}

function findKing(pos, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (p && p.type === "k" && p.color === color) return { r, c };
    }
  }
  return null;
}

function castlingHas(pos, flag) {
  return typeof pos.castling === "string" && pos.castling.includes(flag);
}

function removeCastling(pos, flag) {
  if (!pos.castling || pos.castling === "-") return;
  pos.castling = pos.castling
    .split("")
    .filter(ch => ch !== flag)
    .join("") || "-";
}

function isSquareAttacked(pos, r, c, byColor) {
  // Pawns
  const pawnDir = (byColor === "w") ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = r - pawnDir; // reverse because we look for attacker
    const pc = c - dc;
    const p = getPiece(pos, pr, pc);
    if (p && p.color === byColor && p.type === "p") return true;
  }

  // Knights
  const nd = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr,dc] of nd) {
    const p = getPiece(pos, r+dr, c+dc);
    if (p && p.color === byColor && p.type === "n") return true;
  }

  // King
  for (let dr=-1; dr<=1; dr++) {
    for (let dc=-1; dc<=1; dc++) {
      if (dr===0 && dc===0) continue;
      const p = getPiece(pos, r+dr, c+dc);
      if (p && p.color === byColor && p.type === "k") return true;
    }
  }

  const dirsB = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const dirsR = [[-1,0],[1,0],[0,-1],[0,1]];

  const scan = (dirs, types) => {
    for (const [dr,dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inBounds(rr,cc)) {
        const p = getPiece(pos, rr, cc);
        if (p) {
          if (p.color === byColor && types.includes(p.type)) return true;
          break;
        }
        rr += dr; cc += dc;
      }
    }
    return false;
  };

  if (scan(dirsB, ["b","q"])) return true;
  if (scan(dirsR, ["r","q"])) return true;
  return false;
}

function isInCheck(pos, color) {
  const k = findKing(pos, color);
  if (!k) return false;
  const opp = (color === "w") ? "b" : "w";
  return isSquareAttacked(pos, k.r, k.c, opp);
}

function makeSnapshot(pos) {
  return clonePos(pos);
}

function restoreSnapshot(targetPos, snap) {
  targetPos.board = snap.board;
  targetPos.turn = snap.turn;
  targetPos.castling = snap.castling;
  targetPos.ep = snap.ep;
  targetPos.halfmove = snap.halfmove;
  targetPos.fullmove = snap.fullmove;
}

function isCastlingMove(fromSq, toSq) {
  try {
    const { c:fc } = squareToCoords(fromSq);
    const { c:tc } = squareToCoords(toSq);
    return Math.abs(tc - fc) === 2;
  } catch (_) {
    return false;
  }
}

function castlingPassesThroughCheck(pos, fromSq, toSq) {
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const { c:tc } = squareToCoords(toSq);
  const king = getPiece(pos, fr, fc);
  if (!king || king.type !== "k") return true;
  const opp = (king.color === "w") ? "b" : "w";

  if (isSquareAttacked(pos, fr, fc, opp)) return true;

  const step = (tc > fc) ? 1 : -1;
  const midC = fc + step;
  const endC = fc + 2 * step;
  if (isSquareAttacked(pos, fr, midC, opp)) return true;
  if (isSquareAttacked(pos, fr, endC, opp)) return true;
  return false;
}

function pseudoMovesFrom(pos, fromSq) {
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const piece = getPiece(pos, fr, fc);
  if (!piece) return [];
  const color = piece.color;

  const moves = [];
  const pushSq = (r, c) => {
    if (!inBounds(r, c)) return;
    const t = getPiece(pos, r, c);
    if (!t || t.color !== color) moves.push(coordsToSquare(r, c));
  };

  if (piece.type === "p") {
    const dir = (color === "w") ? -1 : 1;
    const startRow = (color === "w") ? 6 : 1;

    const oneR = fr + dir;
    if (inBounds(oneR, fc) && !getPiece(pos, oneR, fc)) {
      moves.push(coordsToSquare(oneR, fc));
      const twoR = fr + 2*dir;
      if (fr === startRow && inBounds(twoR, fc) && !getPiece(pos, twoR, fc)) {
        moves.push(coordsToSquare(twoR, fc));
      }
    }

    for (const dc of [-1, 1]) {
      const tr = fr + dir;
      const tc = fc + dc;
      if (!inBounds(tr, tc)) continue;
      const t = getPiece(pos, tr, tc);
      if (t && t.color !== color) moves.push(coordsToSquare(tr, tc));
    }

    // En-passant
    if (pos.ep && pos.ep !== "-") {
      const { r:er, c:ec } = squareToCoords(pos.ep);
      if (er === fr + dir && Math.abs(ec - fc) === 1) moves.push(pos.ep);
    }
    return moves;
  }

  if (piece.type === "n") {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of deltas) pushSq(fr+dr, fc+dc);
    return moves;
  }

  if (piece.type === "k") {
    for (let dr=-1; dr<=1; dr++) {
      for (let dc=-1; dc<=1; dc++) {
        if (dr===0 && dc===0) continue;
        pushSq(fr+dr, fc+dc);
      }
    }

    // Castling empties checked here, check-through validated later.
    if (color === "w" && fr === 7 && fc === 4) {
      const rookH = getPiece(pos, 7, 7);
      const rookA = getPiece(pos, 7, 0);
      if (castlingHas(pos, "K") && rookH?.type === "r" && rookH.color === "w" && !getPiece(pos, 7,5) && !getPiece(pos, 7,6)) moves.push("g1");
      if (castlingHas(pos, "Q") && rookA?.type === "r" && rookA.color === "w" && !getPiece(pos, 7,3) && !getPiece(pos, 7,2) && !getPiece(pos, 7,1)) moves.push("c1");
    }
    if (color === "b" && fr === 0 && fc === 4) {
      const rookH = getPiece(pos, 0, 7);
      const rookA = getPiece(pos, 0, 0);
      if (castlingHas(pos, "k") && rookH?.type === "r" && rookH.color === "b" && !getPiece(pos, 0,5) && !getPiece(pos, 0,6)) moves.push("g8");
      if (castlingHas(pos, "q") && rookA?.type === "r" && rookA.color === "b" && !getPiece(pos, 0,3) && !getPiece(pos, 0,2) && !getPiece(pos, 0,1)) moves.push("c8");
    }
    return moves;
  }

  const slideDirs = [];
  if (piece.type === "b" || piece.type === "q") slideDirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  if (piece.type === "r" || piece.type === "q") slideDirs.push([-1,0],[1,0],[0,-1],[0,1]);

  for (const [dr,dc] of slideDirs) {
    let rr = fr + dr, cc = fc + dc;
    while (inBounds(rr,cc)) {
      const t = getPiece(pos, rr, cc);
      if (!t) moves.push(coordsToSquare(rr, cc));
      else {
        if (t.color !== color) moves.push(coordsToSquare(rr, cc));
        break;
      }
      rr += dr; cc += dc;
    }
  }
  return moves;
}

function applyMoveUnchecked(pos, fromSq, toSq, promotion=null) {
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const { r:tr, c:tc } = squareToCoords(toSq);
  const moving = getPiece(pos, fr, fc);
  const target = getPiece(pos, tr, tc);
  const color = moving?.color;

  // Reset EP by default
  pos.ep = "-";

  const isPawnMove = moving?.type === "p";
  const isCapture = !!target;
  pos.halfmove = (isPawnMove || isCapture) ? 0 : (Number(pos.halfmove || 0) + 1);

  // Update castling rights
  if (moving?.type === "k") {
    if (color === "w") { removeCastling(pos, "K"); removeCastling(pos, "Q"); }
    else { removeCastling(pos, "k"); removeCastling(pos, "q"); }
  }
  if (moving?.type === "r") {
    if (color === "w") {
      if (fromSq === "h1") removeCastling(pos, "K");
      if (fromSq === "a1") removeCastling(pos, "Q");
    } else {
      if (fromSq === "h8") removeCastling(pos, "k");
      if (fromSq === "a8") removeCastling(pos, "q");
    }
  }
  if (target?.type === "r") {
    if (target.color === "w") {
      if (toSq === "h1") removeCastling(pos, "K");
      if (toSq === "a1") removeCastling(pos, "Q");
    } else {
      if (toSq === "h8") removeCastling(pos, "k");
      if (toSq === "a8") removeCastling(pos, "q");
    }
  }

  // Castling
  if (moving?.type === "k" && Math.abs(tc - fc) === 2) {
    setPiece(pos, fr, fc, null);
    setPiece(pos, tr, tc, moving);
    if (tc > fc) {
      // king side rook
      const rook = getPiece(pos, fr, 7);
      setPiece(pos, fr, 7, null);
      setPiece(pos, fr, 5, rook);
    } else {
      // queen side rook
      const rook = getPiece(pos, fr, 0);
      setPiece(pos, fr, 0, null);
      setPiece(pos, fr, 3, rook);
    }
  } else if (moving?.type === "p") {
    // En-passant capture (diagonal move to empty square)
    if (fc !== tc && !target) {
      const capR = (moving.color === "w") ? tr + 1 : tr - 1;
      setPiece(pos, capR, tc, null);
    }

    setPiece(pos, fr, fc, null);
    setPiece(pos, tr, tc, moving);

    // double push sets EP
    const startRow = (moving.color === "w") ? 6 : 1;
    if (fr === startRow && Math.abs(tr - fr) === 2) {
      const epR = (fr + tr) / 2;
      pos.ep = coordsToSquare(epR, fc);
    }

    // promotion
    const promoRank = (moving.color === "w") ? 0 : 7;
    if (tr === promoRank) {
      const promo = (promotion || "q").toLowerCase();
      const allowed = ["q","r","b","n"];
      moving.type = allowed.includes(promo) ? promo : "q";
      setPiece(pos, tr, tc, moving);
    }
  } else {
    setPiece(pos, fr, fc, null);
    setPiece(pos, tr, tc, moving);
  }

  const prevTurn = pos.turn;
  pos.turn = (pos.turn === "w") ? "b" : "w";
  if (prevTurn === "b") pos.fullmove = Number(pos.fullmove || 1) + 1;
}

export function legalMovesFrom(pos, fromSq) {
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const piece = getPiece(pos, fr, fc);
  if (!piece) return [];
  if (pos.turn && piece.color !== pos.turn) return [];

  const out = [];
  const candidates = pseudoMovesFrom(pos, fromSq);
  for (const toSq of candidates) {
    if (piece.type === "k" && isCastlingMove(fromSq, toSq)) {
      if (castlingPassesThroughCheck(pos, fromSq, toSq)) continue;
    }
    const snap = makeSnapshot(pos);
    applyMoveUnchecked(pos, fromSq, toSq, null);
    const ok = !isInCheck(pos, piece.color);
    restoreSnapshot(pos, snap);
    if (ok) out.push(toSq);
  }
  return out;
}

export function isLegalMove(pos, fromSq, toSq, promotion=null) {
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const piece = getPiece(pos, fr, fc);
  if (!piece) return { ok:false, reason:"Aucune pièce." };
  if (pos.turn && piece.color !== pos.turn) return { ok:false, reason:"Ce n'est pas ton tour." };

  const candidates = pseudoMovesFrom(pos, fromSq);
  if (!candidates.includes(toSq)) return { ok:false, reason:"Coup non autorisé (mouvement)." };

  if (piece.type === "k" && isCastlingMove(fromSq, toSq)) {
    if (castlingPassesThroughCheck(pos, fromSq, toSq)) return { ok:false, reason:"Roque illégal (échec)." };
  }

  const snap = makeSnapshot(pos);
  applyMoveUnchecked(pos, fromSq, toSq, promotion);
  const ok = !isInCheck(pos, piece.color);
  restoreSnapshot(pos, snap);
  if (!ok) return { ok:false, reason:"Coup illégal (roi en échec)." };
  return { ok:true, reason:null };
}

export function makeMoveLegal(pos, fromSq, toSq, promotion=null) {
  const snap = makeSnapshot(pos);
  applyMoveUnchecked(pos, fromSq, toSq, promotion);
  return snap;
}

export function undoMove(pos, snapshot) {
  if (!snapshot) return;
  restoreSnapshot(pos, snapshot);
}


export function validatePosition(pos){
  const whiteInCheck = isInCheck(pos, "w");
  const blackInCheck = isInCheck(pos, "b");

  if(whiteInCheck && blackInCheck){
    throw new Error("Position invalide : deux rois en échec.");
  }

  if(pos.turn==="w" && blackInCheck){
    throw new Error("Position incohérente : noir en échec mais trait aux blancs.");
  }

  if(pos.turn==="b" && whiteInCheck){
    throw new Error("Position incohérente : blanc en échec mais trait aux noirs.");
  }
}
