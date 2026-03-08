
const fs = require("fs/promises");
const path = require("path");
const { app } = require("electron");

function mojibakeScore(s) {
  const str = String(s || "");
  let score = 0;
  const patterns = [
    /Ã./g, /Â/g, /�/g,
    /â€™/g, /â€œ/g, /â€/g, /â€¦/g, /â€“/g, /â€”/g
  ];
  for (const re of patterns) {
    const m = str.match(re);
    if (m) score += m.length;
  }
  return score;
}

function fixMojibakeText(input) {
  const original = String(input ?? "");
  if (!original) return original;

  // Heuristic: decode strings that look like UTF-8 interpreted as latin1/cp1252.
  if (mojibakeScore(original) === 0) return original;

  const decoded = Buffer.from(original, "latin1").toString("utf8");
  return mojibakeScore(decoded) < mojibakeScore(original) ? decoded : original;
}

function normalizeTextDeep(value) {
  if (typeof value === "string") return fixMojibakeText(value);
  if (Array.isArray(value)) return value.map(normalizeTextDeep);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = normalizeTextDeep(v);
  return out;
}

function isUciMove(move) {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(String(move || "").trim());
}

function isLegacySequence(seq) {
  return !!(seq && typeof seq === "object" && typeof seq.position_depart_fen === "string");
}

function toLegacyFromFourBlocks(meta, chapter) {
  const src = Array.isArray(chapter?.sequences) ? chapter.sequences : [];
  const title = String(chapter?.title || meta?.titre || meta?.id || "Chapitre");
  const description = String(
    meta?.description || "Chapitre converti automatiquement depuis le format 4 blocs."
  );

  const firstFen = String(src.find(s => typeof s?.fen === "string")?.fen || "");
  let currentFen = firstFen;
  let sid = 1;
  const out = [];

  for (const s of src) {
    const kind = String(s?.type || "").trim().toLowerCase();
    const fen = String(s?.fen || currentFen || firstFen || "");
    if (fen) currentFen = fen;

    if (kind === "diagram") {
      const text = String(s?.text || "Observe la position.");
      out.push({
        id: sid++,
        type: "theorie_animee",
        texte_ecran: text,
        texte_audio: text,
        position_depart_fen: fen,
        animations: []
      });
      continue;
    }

    if (kind === "animation") {
      const rawMoves = Array.isArray(s?.moves) ? s.moves : [];
      const mappedMoves = rawMoves.map((m) => {
        if (typeof m === "string") {
          const coup = String(m || "").trim().toLowerCase();
          return { coup, commentaire: "" };
        }
        if (m && typeof m === "object") {
          const coup = String(m.uci || m.coup || "").trim().toLowerCase();
          const commentaire = String(m.commentaire || m.comment || "").trim();
          return { coup, commentaire };
        }
        return { coup: "", commentaire: "" };
      }).filter(x => isUciMove(x.coup));
      const text = String(s?.text || "Animation de la séquence.");
      out.push({
        id: sid++,
        type: "theorie_animee",
        texte_ecran: text,
        texte_audio: text,
        position_depart_fen: fen,
        animations: mappedMoves.map(x => ({ coup: x.coup, commentaire: x.commentaire }))
      });
      continue;
    }

    if (kind === "text") {
      const titleText = String(s?.title || "Resume");
      const lines = Array.isArray(s?.content) ? s.content : [];
      const all = [titleText, ...lines.map(x => String(x || "").trim()).filter(Boolean)];
      for (const line of all) {
        out.push({
          id: sid++,
          type: "theorie_animee",
          texte_ecran: line,
          texte_audio: line,
          position_depart_fen: fen || firstFen,
          animations: []
        });
      }
      continue;
    }

    if (kind === "quiz_interactif") {
      const rawSteps = Array.isArray(s?.steps) ? s.steps : [];
      const mappedSteps = rawSteps.map((st) => {
        const accepted = Array.isArray(st?.coups_acceptes)
          ? st.coups_acceptes.map(m => String(m || "").trim().toLowerCase()).filter(isUciMove)
          : [];
        const replies = Array.isArray(st?.reponse)
          ? st.reponse.map(m => String(m || "").trim().toLowerCase()).filter(isUciMove)
          : (isUciMove(st?.reponse) ? [String(st.reponse).trim().toLowerCase()] : []);
        const solution = Array.isArray(st?.solution)
          ? st.solution.map(m => String(m || "").trim().toLowerCase()).filter(isUciMove)
          : (isUciMove(st?.solution) ? [String(st.solution).trim().toLowerCase()] : []);
        return {
          coups_acceptes: accepted,
          reponse: replies.length <= 1 ? (replies[0] || null) : replies,
          indice: String(st?.indice || ""),
          solution: solution.length <= 1 ? (solution[0] || null) : solution
        };
      }).filter(st => st.coups_acceptes.length > 0);

      const correct = String(s?.correct_move || "").trim().toLowerCase();
      if (mappedSteps.length > 0 || isUciMove(correct)) {
        const validation = {
          indice: "Trouve le meilleur coup dans cette position.",
          feedback_succes: String(s?.success_message || "Bien joué."),
          feedback_erreur: String(s?.error_message || "Ce n'est pas encore ça, réessaie.")
        };
        if (mappedSteps.length > 0) validation.steps = mappedSteps;
        else validation.coups_acceptes = [correct];

        out.push({
          id: sid++,
          type: "quiz_interactif",
          texte_ecran: String(s?.question || "À toi de jouer."),
          texte_audio: String(s?.question || "À toi de jouer."),
          position_depart_fen: fen || firstFen,
          validation
        });
      } else {
        out.push({
          id: sid++,
          type: "theorie_animee",
          texte_ecran: "Quiz present, mais coup non UCI.",
          texte_audio: "Le quiz est present, mais le coup n'est pas au format UCI.",
          position_depart_fen: fen || firstFen,
          animations: []
        });
      }
      continue;
    }
  }

  return {
    chapitre_id: String(chapter?.id || meta?.id || ""),
    titre: title,
    description,
    sequences: out
  };
}

function toLegacyChapter(meta, chapter) {
  if (chapter && Array.isArray(chapter.sequences) && chapter.sequences.every(isLegacySequence)) {
    return chapter;
  }

  // Support "4 blocs" format:
  // sequences[].type in {diagram, animation, text, quiz_interactif}
  if (chapter && Array.isArray(chapter.sequences)) {
    return toLegacyFromFourBlocks(meta, chapter);
  }

  const hasBmadLiteShape =
    chapter &&
    typeof chapter === "object" &&
    typeof chapter.initial_fen === "string" &&
    Array.isArray(chapter.mainline);

  if (!hasBmadLiteShape) {
    return chapter;
  }

  const title = String(chapter.title || meta?.titre || meta?.id || "Chapitre");
  const initialFen = String(chapter.initial_fen || "");
  const description = String(
    meta?.description || "Chapitre converti automatiquement depuis le format BMAD simplifie."
  );

  const sequences = [];
  let sid = 1;

  const uciMainline = chapter.mainline
    .map(m => String(m || "").trim().toLowerCase())
    .filter(isUciMove);

  sequences.push({
    id: sid++,
    type: "theorie_animee",
    texte_ecran: title,
    texte_audio: `Chapitre: ${title}.`,
    position_depart_fen: initialFen,
    animations: uciMainline.map(coup => ({ coup }))
  });

  const points = Array.isArray(chapter.summary?.points) ? chapter.summary.points : [];
  for (const p of points) {
    const text = String(p || "").trim();
    if (!text) continue;
    sequences.push({
      id: sid++,
      type: "theorie_animee",
      texte_ecran: text,
      texte_audio: text,
      position_depart_fen: initialFen,
      animations: []
    });
  }

  const quizFen = String(chapter.quiz?.fen || initialFen || "");
  const correct = String(chapter.quiz?.correct_move || "").trim().toLowerCase();
  if (quizFen) {
    if (isUciMove(correct)) {
      sequences.push({
        id: sid++,
        type: "quiz_interactif",
        texte_ecran: "A toi de jouer.",
        texte_audio: "Trouve le bon coup.",
        position_depart_fen: quizFen,
        validation: {
          coups_acceptes: [correct],
          indice: "Cherche le meilleur coup dans cette position.",
          feedback_succes: "Bien joue.",
          feedback_erreur: "Ce n'est pas encore ca, reessaie."
        }
      });
    } else {
      sequences.push({
        id: sid++,
        type: "theorie_animee",
        texte_ecran: `Quiz: coup attendu ${chapter.quiz?.correct_move || "inconnu"}`,
        texte_audio: "Le quiz est present, mais le coup n'est pas en format UCI.",
        position_depart_fen: quizFen,
        animations: []
      });
    }
  }

  return {
    chapitre_id: String(chapter.id || meta?.id || ""),
    titre: title,
    description,
    sequences
  };
}

function getContentDir() {
  // In dev, app.getAppPath() points to the project "app/" folder.
  // In packaged builds, you may copy content into resources and adapt this function.
  return path.join(app.getAppPath(), "content");
}

async function listChapters() {
  const indexPath = path.join(getContentDir(), "index.json");
  const raw = await fs.readFile(indexPath, "utf-8");
  const safeRaw = String(raw || "").replace(/^\uFEFF/, "");
  const index = normalizeTextDeep(JSON.parse(safeRaw));
  return index.chapters || [];
}

async function listBookChapters() {
  const indexPath = path.join(getContentDir(), "index.json");
  const raw = await fs.readFile(indexPath, "utf-8");
  const safeRaw = String(raw || "").replace(/^\uFEFF/, "");
  const index = normalizeTextDeep(JSON.parse(safeRaw));
  return index.book_chapters || [];
}

async function loadChapter(chapterId) {
  const chapters = await listChapters();
  const meta = chapters.find(c => c.id === chapterId);
  if (!meta) {
    throw new Error("Chapter not found: " + chapterId);
  }
  const filePath = path.join(getContentDir(), meta.file);
  const raw = await fs.readFile(filePath, "utf-8");
  const safeRaw = String(raw || "").replace(/^\uFEFF/, "");
  const parsed = normalizeTextDeep(JSON.parse(safeRaw));
  return { meta, chapter: toLegacyChapter(meta, parsed) };
}

async function listPieceSets(){
  const base = path.join(app.getAppPath(), "src", "renderer", "assets");
  const roots = [
    { root: "piecesets", dir: path.join(base, "piecesets") },
    { root: "piecesets_png", dir: path.join(base, "piecesets_png") },
  ];

  const results = [];

  async function exists(p){
    try{ await fs.stat(p); return true; }catch(_){ return false; }
  }

  function hasAll(files, names){
    return names.every(n => files.has(n));
  }

  const lowerSvg = ["wk.svg","wq.svg","wr.svg","wb.svg","wn.svg","wp.svg","bk.svg","bq.svg","br.svg","bb.svg","bn.svg","bp.svg"];
  const lowerPng = ["wk.png","wq.png","wr.png","wb.png","wn.png","wp.png","bk.png","bq.png","br.png","bb.png","bn.png","bp.png"];
  const upperPng = ["wK.png","wQ.png","wR.png","wB.png","wN.png","wP.png","bK.png","bQ.png","bR.png","bB.png","bN.png","bP.png"];
  const upperSvg = ["wK.svg","wQ.svg","wR.svg","wB.svg","wN.svg","wP.svg","bK.svg","bQ.svg","bR.svg","bB.svg","bN.svg","bP.svg"];

  for (const r of roots){
    if (!(await exists(r.dir))) continue;

    let dirs = [];
    try{
      const items = await fs.readdir(r.dir, { withFileTypes:true });
      dirs = items.filter(it => it.isDirectory()).map(it => it.name);
    }catch(_){
      dirs = [];
    }

    for (const id of dirs){
      const d = path.join(r.dir, id);
      let files = [];
      try{
        files = await fs.readdir(d);
      }catch(_){
        continue;
      }
      const set = new Set(files);

      let scheme = null;
      if (hasAll(set, lowerSvg)) scheme = "lower_svg";
      else if (hasAll(set, upperPng)) scheme = "upper_png";
      else if (hasAll(set, lowerPng)) scheme = "lower_png";
      else if (hasAll(set, upperSvg)) scheme = "upper_svg";
      else scheme = "unknown";

      results.push({ id, root: r.root, scheme, label: id });
    }
  }

  results.sort((a,b) => (a.label || a.id).localeCompare((b.label || b.id), "fr"));
  return results;
}

module.exports = {
  listChapters,
  listBookChapters,
  loadChapter,
  listPieceSets
};
