export function squareToCoords(sq){
  // "a1" -> {r:7,c:0} where r=0 is rank8, r=7 is rank1
  const file = sq[0];
  const rank = sq[1];
  const c = file.charCodeAt(0) - 97;
  const r = 8 - parseInt(rank, 10);
  return { r, c };
}

export function coordsToSquare(r, c){
  const file = String.fromCharCode(97 + c);
  const rank = String(8 - r);
  return file + rank;
}

export function uci(fromSq, toSq, promo=null){
  return promo ? (fromSq + toSq + promo) : (fromSq + toSq);
}

export function parseUci(u){
  const s = String(u || "").trim();
  if (s.length < 4) return null;
  const from = s.slice(0,2);
  const to = s.slice(2,4);
  const promo = s.length >= 5 ? s[4].toLowerCase() : null;
  return { from, to, promo };
}
