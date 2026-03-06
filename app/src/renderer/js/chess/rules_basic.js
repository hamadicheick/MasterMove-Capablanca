import { squareToCoords, coordsToSquare } from "./square.js";

function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }

function getPiece(pos, r, c){
  if (!inBounds(r,c)) return null;
  return pos.board[r][c];
}

function isEmpty(pos, r, c){
  return getPiece(pos, r, c) === null;
}

function isEnemy(pos, r, c, color){
  const p = getPiece(pos, r, c);
  return p && p.color !== color;
}

function pathClear(pos, r1,c1, r2,c2){
  const dr = Math.sign(r2-r1);
  const dc = Math.sign(c2-c1);
  let r=r1+dr, c=c1+dc;
  while (r !== r2 || c !== c2){
    if (!isEmpty(pos, r, c)) return false;
    r += dr; c += dc;
  }
  return true;
}

export function pseudoLegalMovesFrom(pos, fromSq){
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const piece = getPiece(pos, fr, fc);
  if (!piece) return [];
  const color = piece.color;
  const moves = [];

  const pushIfOk = (tr, tc) => {
    if (!inBounds(tr,tc)) return;
    const target = getPiece(pos, tr, tc);
    if (!target || target.color !== color){
      moves.push(coordsToSquare(tr, tc));
    }
  };

  if (piece.type === "p"){
    const dir = (color === "w") ? -1 : 1;
    const startRow = (color === "w") ? 6 : 1;

    // forward 1
    const r1 = fr + dir;
    if (inBounds(r1, fc) && isEmpty(pos, r1, fc)){
      moves.push(coordsToSquare(r1, fc));
      // forward 2
      const r2 = fr + 2*dir;
      if (fr === startRow && inBounds(r2, fc) && isEmpty(pos, r2, fc)){
        moves.push(coordsToSquare(r2, fc));
      }
    }
    // captures
    for (const dc of [-1, 1]){
      const tr = fr + dir;
      const tc = fc + dc;
      if (inBounds(tr,tc) && isEnemy(pos, tr, tc, color)){
        moves.push(coordsToSquare(tr, tc));
      }
    }
    return moves;
  }

  if (piece.type === "n"){
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of deltas) pushIfOk(fr+dr, fc+dc);
    return moves;
  }

  if (piece.type === "k"){
    for (let dr=-1; dr<=1; dr++){
      for (let dc=-1; dc<=1; dc++){
        if (dr===0 && dc===0) continue;
        pushIfOk(fr+dr, fc+dc);
      }
    }
    return moves;
  }

  const slideDirs = [];
  if (piece.type === "b" || piece.type === "q"){
    slideDirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  }
  if (piece.type === "r" || piece.type === "q"){
    slideDirs.push([-1,0],[1,0],[0,-1],[0,1]);
  }

  for (const [dr,dc] of slideDirs){
    let tr = fr + dr;
    let tc = fc + dc;
    while (inBounds(tr,tc)){
      const target = getPiece(pos, tr, tc);
      if (!target){
        moves.push(coordsToSquare(tr, tc));
      } else {
        if (target.color !== color) moves.push(coordsToSquare(tr, tc));
        break;
      }
      tr += dr; tc += dc;
    }
  }
  return moves;
}

export function isPseudoLegalMove(pos, fromSq, toSq){
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const piece = getPiece(pos, fr, fc);
  if (!piece) return { ok:false, reason:"Aucune pièce." };
  if (pos.turn && piece.color !== pos.turn) {
    // For now, we keep a gentle restriction: must play side-to-move
    return { ok:false, reason:"Ce n'est pas ton tour." };
  }
  const targets = pseudoLegalMovesFrom(pos, fromSq);
  if (!targets.includes(toSq)) return { ok:false, reason:"Coup non autorisé (mouvement)." };
  return { ok:true, reason:null };
}

export function makeMoveBasic(pos, fromSq, toSq, promotion=null){
  const { r:fr, c:fc } = squareToCoords(fromSq);
  const { r:tr, c:tc } = squareToCoords(toSq);
  const piece = pos.board[fr][fc];
  pos.board[fr][fc] = null;

  // Promotion handling (basic)
  if (piece && piece.type === "p"){
    if ((piece.color === "w" && tr === 0) || (piece.color === "b" && tr === 7)){
      const promo = (promotion || "q").toLowerCase();
      const allowed = ["q","r","b","n"];
      piece.type = allowed.includes(promo) ? promo : "q";
    }
  }

  pos.board[tr][tc] = piece;

  // toggle turn (best effort)
  pos.turn = (pos.turn === "w") ? "b" : "w";
  return pos;
}
