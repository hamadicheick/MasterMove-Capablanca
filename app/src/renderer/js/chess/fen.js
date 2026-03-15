
const map = {
  p: "p", n: "n", b: "b", r: "r", q: "q", k: "k"
};

function kingsAdjacent(board){
  let wk=null, bk=null;
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p = board[r][c];
      if(p && p.type==="k"){
        if(p.color==="w") wk={r,c};
        if(p.color==="b") bk={r,c};
      }
    }
  }
  if(!wk || !bk) throw new Error("Position invalide : roi manquant.");
  if(Math.abs(wk.r-bk.r)<=1 && Math.abs(wk.c-bk.c)<=1){
    throw new Error("Position invalide : rois adjacents.");
  }
}

export function parseFen(fen){
  const parts = String(fen || "").trim().split(/\s+/);
  if (parts.length < 2) throw new Error("FEN invalide.");
  const boardPart = parts[0];
  const turn = parts[1];
  const castling = parts[2] || "-";
  const ep = parts[3] || "-";
  const halfmove = parseInt(parts[4] || "0", 10);
  const fullmove = parseInt(parts[5] || "1", 10);

  const rows = boardPart.split("/");
  if (rows.length !== 8) throw new Error("FEN invalide (8 rangées).");

  const board = Array.from({length:8}, () => Array.from({length:8}, () => null));
  let whiteKings=0, blackKings=0;

  for (let r=0; r<8; r++){
    let c=0;
    for (const ch of rows[r]){
      if (c > 7) break;
      if (ch >= "1" && ch <= "8"){
        c += parseInt(ch, 10);
      } else {
        const isUpper = ch === ch.toUpperCase();
        const color = isUpper ? "w" : "b";
        const t = map[ch.toLowerCase()];
        if (!t) throw new Error("FEN invalide (pièce inconnue).");
        board[r][c] = { color, type: t };
        if(t==="k"){
          if(color==="w") whiteKings++;
          else blackKings++;
        }
        c += 1;
      }
    }
    if (c !== 8) throw new Error("FEN invalide (colonnes).");
  }

  if(whiteKings!==1 || blackKings!==1){
    throw new Error("Position invalide : nombre de rois incorrect.");
  }

  kingsAdjacent(board);

  return { board, turn, castling, ep, halfmove, fullmove };
}

export function toFen(pos){
  const PIECES = { w:{p:"P",n:"N",b:"B",r:"R",q:"Q",k:"K"}, b:{p:"p",n:"n",b:"b",r:"r",q:"q",k:"k"} };
  let boardStr = "";
  for (let r = 0; r < 8; r++){
    let empty = 0;
    for (let c = 0; c < 8; c++){
      const p = pos.board[r][c];
      if (!p){ empty++; }
      else { if (empty){ boardStr += empty; empty = 0; } boardStr += PIECES[p.color][p.type]; }
    }
    if (empty) boardStr += empty;
    if (r < 7) boardStr += "/";
  }
  return `${boardStr} ${pos.turn} ${pos.castling || "-"} ${pos.ep || "-"} ${pos.halfmove ?? 0} ${pos.fullmove ?? 1}`;
}

export function clonePos(pos){
  return {
    board: pos.board.map(row => row.map(p => p ? ({...p}) : null)),
    turn: pos.turn,
    castling: pos.castling,
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove
  };
}
