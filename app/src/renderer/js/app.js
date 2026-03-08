import { h, clear, toast } from "./ui/dom.js";
import { Store } from "./infra/store.js";
import { TTS } from "./audio/tts.js";
import { ensureChapterProgress, getChapterLastIndex } from "./course/progress.js";
import { BoardWidget } from "./chess/board_widget.js";
import { QuizRunner } from "./course/quiz_runner.js";

function withTimeout(promise, ms, label){
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error((label ? label + ": " : "") + "timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function requireBridge(){
  if (!window.mm) {
    throw new Error("Bridge Electron indisponible. Lance l'app via Electron (npm run start) et pas en ouvrant index.html.");
  }
  return window.mm;
}

async function mmCall(fn, label, ms=3500){
  const mm = requireBridge();
  try{
    return await withTimeout(fn(mm), ms, label);
  }catch(e){
    console.error(e);
    toast("Erreur: " + String(e?.message || e), 5000);
    throw e;
  }
}

const state = {

  profile: null,
  profiles: [],
  chapters: [],
  current: {
    meta: null,
    chapter: null,
    seqIndex: 0,
    progress: null,
    animationComment: ""
  },
  tts: new TTS(),
  board: null,
  quiz: {
    runner: null,
    status: null
  }
};

function topbar(){
  const prof = state.profile ? `Profil: ${state.profile.name}` : "Aucun profil";
  return h("div", { class:"topbar" },
    h("div", { class:"brand" },
      h("span", {}, "MasterMove"),
      h("span", { class:"badge" }, "Capablanca - MVP v1")
    ),
    h("div", { class:"row" },
      h("span", { class:"badge", id:"topbarProfile" }, prof),
      h("button", { class:"btn secondary", onclick: () => navigate("#/profiles") }, "Profils")
    )
  );
}

function layout(contentNode){
  return h("div", {}, topbar(), h("div", { class:"main" }, contentNode));
}

function navigate(hash){
  window.location.hash = hash;
}

async function refreshTopbar(){
  const el = document.getElementById("topbarProfile");
  if (el) el.textContent = state.profile ? `Profil: ${state.profile.name}` : "Aucun profil";
}

async function loadProfiles(){
  // First run on some Windows setups can be slow (AV scan, userData init).
  state.profiles = await mmCall(mm => mm.profiles.list(), "profiles:list", 10000);
  return state.profiles;
}

async function setProfile(profile){
  state.profile = profile;
  Store.set("currentProfileId", profile?.id || null);
  await refreshTopbar();
}

async function bootProfileFromStore(){
  const id = Store.get("currentProfileId", null);
  if (!id) return false;
  await loadProfiles();
  const p = state.profiles.find(x => x.id === id);
  if (!p) return false;
  await setProfile(p);
  return true;
}

function profilesScreen(){
  const input = h("input", { class:"input", placeholder:"Nom du profil (ex: Lina, Adam...)" });
  const list = h("div", { class:"grid" });

  const renderList = async () => {
    try{
    clear(list);
    const profiles = await loadProfiles();
    if (!profiles.length) {
      list.appendChild(h("div", { class:"card panel" },
        h("div", { class:"h1" }, "Aucun profil"),
        h("p", { class:"p" }, "Cree un profil eleve pour commencer.")
      ));
      return;
    }
    for (const p of profiles){
      const delBtn = h("button", {
        class:"btn danger",
        onclick: async (ev) => {
          ev.stopPropagation();
          const ok = confirm(`Supprimer le profil "${p.name}" ?`);
          if (!ok) return;
          await mmCall(mm => mm.profiles.delete(p.id), "profiles:delete", 10000);
          if (state.profile?.id === p.id) await setProfile(null);
          toast("Profil supprime.");
          await renderList();
        }
      }, "[x] Supprimer");

      const card = h("div", { class:"card item", onclick: async () => {
        await setProfile(p);
        toast(`Profil selectionne: ${p.name}`);
        navigate("#/library");
      }},
        h("div", { class:"spread" },
          h("div", {},
            h("div", { class:"h1" }, p.name),
            h("div", { class:"small" }, new Date(p.createdAt).toLocaleString("fr-FR"))
          ),
          delBtn
        )
      );
      list.appendChild(card);
    }
    }catch(e){
      console.error(e);
      clear(list);
      list.appendChild(h("div", { class:"card panel" },
        h("div", { class:"h1" }, "Erreur"),
        h("p", { class:"p" }, String(e?.message || e))
      ));
    }
  };

  const createBtn = h("button", {
    class:"btn",
    onclick: async () => {
      const name = input.value.trim();
      if (!name) return toast("Nom vide.");
      try{
        const p = await mmCall(mm => mm.profiles.create(name), "profiles:create", 10000);
        input.value = "";
        toast("Profil cree.");
        await renderList();
        await setProfile(p);
        navigate("#/library");
      }catch(e){
        toast(String(e?.message || e));
      }
    }
  }, "[+] Creer");

  const content = h("div", { class:"card panel scroll", style:"width:100%;" },
    h("div", { class:"h1" }, "Profils eleves"),
    h("p", { class:"p" }, "Cree un profil par eleve. La progression est sauvegardee localement."),
    h("div", { class:"hr" }),
    h("div", { class:"row" }, input, createBtn),
    h("div", { class:"hr" }),
    list
  );

  renderList().catch(e => console.error(e));
  return layout(content);
}

async function loadChapters(){
  state.chapters = await mmCall(mm => mm.content.listChapters(), "content:listChapters");
  return state.chapters;
}

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
function toRoman(n){ return ROMAN[n - 1] || String(n); }

async function loadBookChapters(){
  if (!state.bookChapters){
    state.bookChapters = await mmCall(mm => mm.content.listBookChapters(), "content:listBookChapters");
  }
  return state.bookChapters;
}

function libraryScreen(){
  const list = h("div", { class:"chapterSelect" });

  const render = async () => {
    try{
      clear(list);
      if (!state.profile) {
        list.appendChild(h("div", { class:"card panel" },
          h("div", { class:"h1" }, "Choisis un profil"),
          h("p", { class:"p" }, "Tu dois selectionner un profil eleve avant d'ouvrir un chapitre."),
          h("div", { class:"hr" }),
          h("button", { class:"btn", onclick: () => navigate("#/profiles") }, "Aller aux profils")
        ));
        return;
      }

      const [chapters, progress, bookChapters] = await Promise.all([
        loadChapters(),
        mmCall(mm => mm.progress.load(state.profile.id), "progress:load", 10000),
        loadBookChapters()
      ]);

      for (const bc of bookChapters){
        const lessons = chapters.filter(c => c.chapter === bc.chapter);
        const done = lessons.filter(c => progress.chapters?.[c.id]?.completedAt).length;
        const inProgress = lessons.filter(c => !progress.chapters?.[c.id]?.completedAt && (progress.chapters?.[c.id]?.lastSequenceIndex ?? 0) > 0).length;

        const card = h("div", { class:"chapterCard card item", onclick: () => navigate(`#/library/${bc.chapter}`) },
          h("div", { class:"chapterNum" }, toRoman(bc.chapter)),
          h("div", { class:"chapterCardBody" },
            h("div", { class:"h1" }, bc.titre),
            h("p", { class:"p" }, bc.description),
            h("div", { class:"hr" }),
            h("div", { class:"spread" },
              h("div", { class:"small" }, `${bc.pages} — ${bc.exemples || bc.parties || ""}`),
              h("div", { class:"row" },
                done > 0 ? h("div", { class:"kbd tagDone" }, `${done} termine${done > 1 ? "s" : ""}`) : null,
                inProgress > 0 ? h("div", { class:"kbd" }, `${inProgress} en cours`) : null,
                h("div", { class:"small" }, `${lessons.length} lecons`)
              )
            )
          )
        );
        list.appendChild(card);
      }
    }catch(e){
      console.error(e);
      clear(list);
      list.appendChild(h("div", { class:"card panel" },
        h("div", { class:"h1" }, "Erreur"),
        h("p", { class:"p" }, "Impossible de charger la bibliotheque."),
        h("div", { class:"hr" }),
        h("div", { class:"small" }, String(e?.message || e)),
        h("div", { class:"hr" }),
        h("button", { class:"btn", onclick: () => navigate("#/profiles") }, "Retour aux profils")
      ));
      toast("Erreur bibliotheque: " + String(e?.message || e), 5000);
    }
  };

  const content = h("div", { class:"card panel scroll", style:"width:100%;" },
    h("div", { class:"spread" },
      h("div", {},
        h("div", { class:"h1" }, "Capablanca — Principes fondamentaux"),
        h("p", { class:"p" }, "Choisis un chapitre pour commencer.")
      ),
      h("button", { class:"btn secondary", onclick: () => navigate("#/profiles") }, "Changer de profil")
    ),
    h("div", { class:"hr" }),
    list
  );

  render().catch(e => console.error(e));
  return layout(content);
}

function chapterLessonsScreen(chapterNum){
  const list = h("div", { class:"lessonList" });
  const titleEl = h("div", { class:"h1" }, `Chapitre ${toRoman(chapterNum)}`);
  const descEl  = h("p",   { class:"p"  }, "");

  const render = async () => {
    try{
      clear(list);
      if (!state.profile) {
        navigate("#/profiles");
        return;
      }

      const [chapters, progress, bookChapters] = await Promise.all([
        loadChapters(),
        mmCall(mm => mm.progress.load(state.profile.id), "progress:load", 10000),
        loadBookChapters()
      ]);

      const bc = bookChapters.find(c => c.chapter === chapterNum) || {};
      if (bc.titre)       titleEl.textContent = bc.titre;
      if (bc.description !== undefined) descEl.textContent = bc.description;

      const lessons = chapters
        .filter(c => c.chapter === chapterNum)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (!lessons.length){
        list.appendChild(h("div", { class:"card panel" },
          h("p", { class:"p" }, "Aucune lecon pour ce chapitre.")
        ));
        return;
      }

      for (const c of lessons){
        const isGame = c.type === "game";
        const chProg = progress.chapters?.[c.id];
        const lastIdx = chProg?.lastSequenceIndex ?? 0;
        const isDone = !!chProg?.completedAt;
        const tag = isGame ? "Partie" : (isDone ? "Termine" : (lastIdx > 0 ? `Seq. ${lastIdx + 1}` : "Nouveau"));
        const orderLabel = isGame ? `P.${c.order}` : `Ex.${c.order}`;

        const item = h("div", { class:"lessonItem", onclick: async () => {
          if (isGame) await openGame(c.id);
          else await openChapter(c.id);
        }},
          h("div", { class:"lessonItemOrder" }, orderLabel),
          h("div", { class:"lessonItemTitle" },
            h("div", {}, c.titre),
            h("div", { class:"small" }, c.description)
          ),
          h("div", { class:"lessonItemMeta" },
            h("div", { class:"kbd" }, isGame ? "jeu complet" : (c.level || "-")),
            h("div", { class:`kbd ${isDone && !isGame ? "tagDone" : ""}` }, tag)
          )
        );
        list.appendChild(item);
      }
    }catch(e){
      console.error(e);
      clear(list);
      list.appendChild(h("div", { class:"card panel" },
        h("p", { class:"p" }, "Erreur: " + String(e?.message || e))
      ));
      toast("Erreur: " + String(e?.message || e), 5000);
    }
  };

  const content = h("div", { class:"card panel scroll", style:"width:100%;" },
    h("div", { class:"spread" },
      h("div", {},
        titleEl,
        descEl
      ),
      h("button", { class:"btn secondary", onclick: () => navigate("#/library") }, "[<] Chapitres")
    ),
    h("div", { class:"hr" }),
    list
  );

  render().catch(e => console.error(e));
  return layout(content);
}

function readerScreen(){
  const left = h("div", { class:"leftCol card panel scroll" });
  const right = h("div", { class:"rightCol card scroll" });
  const container = h("div", { class:"split" }, left, right);
  let animationCommentEl = null;

  // Board widget is kept alive during the reader screen lifetime
  const boardHost = h("div", { id:"boardHost" });
  const setAnimationComment = (text) => {
    const msg = String(text || "").trim();
    state.current.animationComment = msg;
    if (animationCommentEl) {
      animationCommentEl.textContent = msg || "Lecture de la séquence...";
    }
  };

  if (!state.board) {
    state.board = new BoardWidget({
      onMove: (mv) => {
        // Quiz validation hooks (ignore script moves)
        state.quiz.runner?.handleMove(mv);
      },
      onAnimationStep: (st) => {
        const moveTxt = st?.move ? `Coup ${st.index}/${st.total}: ${st.move}` : "";
        const msg = String(st?.commentaire || moveTxt || "").trim();
        setAnimationComment(msg);
        if (st?.commentaire) {
          state.tts.speak(st.commentaire);
          return { delayMs: state.tts.estimateSpeakMs(st.commentaire) + 500 };
        }
        return { delayMs: 0 };
      }
    });
  }

  if (!state.quiz.runner) {
    state.quiz.runner = new QuizRunner({
      board: state.board,
      toast,
      onStatusChange: (st) => {
        state.quiz.status = st;
        // persist solved flag once
        try{
          const seq = state.current.chapter?.sequences?.[state.current.seqIndex];
          if (seq?.type === "quiz_interactif" && st?.solved && state.profile && state.current.meta && state.current.progress){
            const chId = state.current.meta.id;
            const chProg = ensureChapterProgress(state.current.progress, chId);
            const key = String(seq.id ?? state.current.seqIndex);
            if (!chProg.quizState) chProg.quizState = {};
            if (!chProg.quizState[key]?.solved) {
              chProg.quizState[key] = { solved:true, attempts: Number(st.attempts || 0) };
              mmCall(mm => mm.progress.save(state.profile.id, state.current.progress), "progress:save", 10000).catch(()=>{});
            }
          }
        }catch(_){ }
        // refresh left panel to show status
        try { renderLeft(); } catch(_){ }
      }
    });
  }

  const renderRight = () => {
    const meta = state.current.meta;
    const chapter = state.current.chapter;
    // seq defined above

    clear(right);
    animationCommentEl = null;

// Board
const seq = chapter?.sequences?.[state.current.seqIndex];
right.appendChild(boardHost);
// mount (idempotent)
if (!boardHost.__mounted) {
  state.board.mount(boardHost);
  boardHost.__mounted = true;
}

if (seq?.position_depart_fen) {
  try{
    state.board.setPositionFromFen(seq.position_depart_fen);
    const animMoves = (seq.animations || []).slice();
    state.board.setAnimations(animMoves);
    const isDemo = seq.type === "theorie_animee" && animMoves.length > 0;
    const isQuiz = seq.type === "quiz_interactif";

    state.board.setLocked(isDemo);

    // Start/stop quiz engine depending on sequence
    if (isQuiz) state.quiz.runner?.start(seq);
    else state.quiz.runner?.stop();

    if (isDemo) {
      setAnimationComment("");
      // auto-play demonstration moves (simple cadence)
      state.board.replayPositionAndAnimations({ cadenceMs: 1200 });
    }
  }catch(e){
    console.error(e);
    state.quiz.runner?.stop();
    toast("Erreur position/FEN: " + String(e?.message || e), 5000);
  }
}

const controls = h("div", { class:"rightColPad" });
    if (seq?.type === "theorie_animee" && (seq.animations || []).length > 0){
      animationCommentEl = h("div", { class:"p" }, state.current.animationComment || "Lecture de la séquence...");
      controls.appendChild(h("div", { class:"hr" }));
      controls.appendChild(h("div", { class:"card panel", style:"margin-bottom:12px;" },
        h("div", { class:"h1" }, "Commentaire du coup"),
        animationCommentEl
      ));
    }
    controls.appendChild(h("div", { class:"hr" }));
    controls.appendChild(renderTtsPanel());
    controls.appendChild(h("div", { class:"hr" }));
    controls.appendChild(renderAppearancePanel());
    right.appendChild(controls);
  };

  const renderAppearancePanel = () => {
  const wrap = h("div", {},
    h("div", { class:"h1" }, "Apparence"),
    h("div", { class:"label" }, "Jeu de pieces")
  );

  const select = h("select", { class:"input" },
    h("option", { value:"__loading__" }, "Chargement...")
  );

  const previewWrap = h("div", { class:"piecePreviewWrap" },
    h("div", { class:"label", style:"margin-top:12px;" }, "Apercu"),
    h("div", { class:"piecePreviewGrid" })
  );
  const grid = previewWrap.querySelector(".piecePreviewGrid");

  const row = h("div", { class:"row", style:"gap:10px;margin-top:12px;" });
  const btnOpen = h("button", { class:"btn", type:"button" }, "Ouvrir le dossier");
  row.appendChild(btnOpen);

  const hint = h("div", { class:"small", style:"margin-top:10px;" },
    "SVG ou PNG. Pour PNG, le nommage type Lichess est accepte: wK.png wQ.png ... bP.png."
  );

  wrap.appendChild(select);
  wrap.appendChild(previewWrap);
  wrap.appendChild(row);
  wrap.appendChild(hint);

  function typeToLetter(type){
    return ({ k:"K", q:"Q", r:"R", b:"B", n:"N", p:"P" })[type] || String(type || "").toUpperCase();
  }

  function pieceCandidates(meta, color, type){
    const base = `./assets/${meta.root}/${meta.id}/`;
    const lower = `${color}${type}`;
    const upper = `${color}${typeToLetter(type)}`;
    const cands = [];
    const add = (s) => { if (!cands.includes(s)) cands.push(s); };

    switch (meta.scheme) {
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

  function setImgWithFallback(imgEl, meta, color, type){
    const cands = pieceCandidates(meta, color, type);
    imgEl.dataset.ci = "0";
    imgEl.src = cands[0] || "";
    imgEl.onerror = () => {
      const i = parseInt(imgEl.dataset.ci || "0", 10);
      const n = i + 1;
      if (n >= cands.length) return;
      imgEl.dataset.ci = String(n);
      imgEl.src = cands[n];
    };
  }

  function updatePreview(meta){
    clear(grid);
    const order = [
      ["w","k"], ["w","q"], ["w","r"], ["w","b"], ["w","n"], ["w","p"],
      ["b","k"], ["b","q"], ["b","r"], ["b","b"], ["b","n"], ["b","p"],
    ];
    for (const [c,t] of order){
      const cell = h("div", { class:"piecePreviewCell" });
      const img = h("img", { class:"piecePreviewImg", alt: `${c}${t}` });
      setImgWithFallback(img, meta, c, t);
      cell.appendChild(img);
      grid.appendChild(cell);
    }
  }

  const byKey = new Map();
  const current = Store.get("ui.pieceSet", "classic");
  const currentKey = (typeof current === "string")
    ? ("piecesets:" + current)
    : ((current.root || "piecesets") + ":" + (current.id || "classic"));

  const fill = (sets) => {
    clear(select);
    byKey.clear();

    if (Array.isArray(sets) && sets.length){
      for (const s of sets){
        const key = `${s.root}:${s.id}`;
        byKey.set(key, s);
        select.appendChild(h("option", { value: key }, `${s.label || s.id}`));
      }
    } else {
      const basic = [
        { root:"piecesets", id:"classic", scheme:"unknown", label:"classic" },
        { root:"piecesets", id:"flat", scheme:"unknown", label:"flat" },
        { root:"piecesets", id:"lettres_fr", scheme:"unknown", label:"lettres_fr" },
      ];
      for (const s of basic){
        const key = `${s.root}:${s.id}`;
        byKey.set(key, s);
        select.appendChild(h("option", { value: key }, s.label));
      }
    }

    const has = Array.from(select.options).some(o => o.value === currentKey);
    select.value = has ? currentKey : (select.options[0]?.value || currentKey);

    const meta = byKey.get(select.value) || { root:"piecesets", id:"classic", scheme:"unknown", label:"classic" };
    updatePreview(meta);

    select.addEventListener("change", () => {
      const meta = byKey.get(select.value) || { root:"piecesets", id:"classic", scheme:"unknown" };
      Store.set("ui.pieceSet", { id: meta.id, root: meta.root, scheme: meta.scheme });
      state.board?.render?.();
      updatePreview(meta);
      toast("Jeu de pieces applique.");
    });

    btnOpen.onclick = async () => {
      const meta = byKey.get(select.value) || { root:"piecesets", id:"classic", scheme:"unknown" };
      try{
        if (window.mm?.content?.openPieceSetFolder){
          const res = await window.mm.content.openPieceSetFolder(meta.root, meta.id);
          if (res) toast("Impossible d'ouvrir: " + String(res), 5000);
          else toast("Dossier ouvert.");
        } else {
          toast("Fonction indisponible (bridge).", 5000);
        }
      }catch(e){
        console.error(e);
        toast("Erreur: " + String(e?.message || e), 5000);
      }
    };
  };

  (async () => {
    try{
      if (window.mm?.content?.listPieceSets){
        const sets = await window.mm.content.listPieceSets();
        fill(sets);
      } else {
        fill([]);
      }
    }catch(e){
      console.error(e);
      fill([]);
    }
  })();

  return wrap;
};

  const renderTtsPanel = () => {
    const tts = state.tts;

    const enabled = h("input", { type:"checkbox" });
    enabled.checked = tts.enabled;
    enabled.addEventListener("change", () => {
      tts.setEnabled(enabled.checked);
      toast(tts.enabled ? "Audio active." : "Audio desactive.");
    });

    const providerSelect = h("select", { class:"input" },
      h("option", { value:"webspeech" }, "Web Speech (systeme)"),
      h("option", { value:"piper" }, "Piper (local)")
    );

    const voicesSelect      = h("select", { class:"input" });
    const piperVoicesSelect = h("select", { class:"input" });
    const edgeVoicesSelect  = h("select", { class:"input" });

    const fillVoices = (voices) => {
      clear(voicesSelect);
      voicesSelect.appendChild(h("option", { value:"" }, "Voix par defaut"));
      for (const v of voices){
        const opt = h("option", { value: v.voiceURI }, `${v.name} (${v.lang})`);
        if (tts.voiceURI && v.voiceURI === tts.voiceURI) opt.selected = true;
        voicesSelect.appendChild(opt);
      }
    };

    const fillPiperVoices = (voices) => {
      clear(piperVoicesSelect);
      if (!Array.isArray(voices) || !voices.length) {
        piperVoicesSelect.appendChild(h("option", { value:"" }, "Aucune voix Piper detectee"));
        return;
      }

      const selectedId = tts.piperVoiceId || null;
      const favoriteOrder = ["gilles", "tom", "siwis"];
      const scoreVoice = (voice) => {
        const label = String(voice?.label || voice?.id || "").toLowerCase();
        const idx = favoriteOrder.findIndex((k) => label.includes(k));
        if (idx === -1) return 0;
        return 100 - idx;
      };

      const scored = [...voices].sort((a, b) => {
        const aLabel = String(a?.label || a?.id || "").toLowerCase();
        const bLabel = String(b?.label || b?.id || "").toLowerCase();
        const aScore = scoreVoice(a);
        const bScore = scoreVoice(b);
        if (aScore !== bScore) return bScore - aScore;
        return aLabel.localeCompare(bLabel, "fr");
      });

      let visible = scored.slice(0, 10);
      if (selectedId && !visible.some(v => v.id === selectedId)) {
        const selectedVoice = scored.find(v => v.id === selectedId);
        if (selectedVoice) {
          visible = [...visible.slice(0, 9), selectedVoice];
        }
      }

      for (const v of visible){
        const opt = h("option", { value: v.id }, `${v.label || v.id}`);
        if (tts.piperVoiceId && v.id === tts.piperVoiceId) opt.selected = true;
        piperVoicesSelect.appendChild(opt);
      }
    };

    const fillEdgeVoices = (voices) => {
      clear(edgeVoicesSelect);
      if (!Array.isArray(voices) || !voices.length) {
        edgeVoicesSelect.appendChild(h("option", { value:"" }, "edge-tts non detecte (pip install edge-tts)"));
        return;
      }
      for (const v of voices) {
        const opt = h("option", { value: v.id }, v.label);
        if ((tts.edgeVoiceId || "fr-FR-DeniseNeural") === v.id) opt.selected = true;
        edgeVoicesSelect.appendChild(opt);
      }
    };

    const syncProviderVisibility = () => {
      const isPiper = tts.provider === "piper";
      const isEdge  = tts.provider === "edge";
      voicesSelect.disabled      = isPiper || isEdge;
      piperVoicesSelect.disabled = !isPiper;
      edgeVoicesSelect.disabled  = !isEdge;
    };

    providerSelect.addEventListener("change", async () => {
      tts.setProvider(providerSelect.value);
      await tts.refreshProviders();
      providerSelect.value = tts.provider;
      syncProviderVisibility();
      toast(`Provider audio: ${tts.provider}`);
    });

    voicesSelect.addEventListener("change", () => {
      tts.setVoiceURI(voicesSelect.value || null);
    });

    piperVoicesSelect.addEventListener("change", () => {
      tts.setPiperVoiceId(piperVoicesSelect.value || null);
    });

    edgeVoicesSelect.addEventListener("change", () => {
      tts.setEdgeVoiceId(edgeVoicesSelect.value || null);
    });

    const rate = h("input", { type:"range", min:"0.5", max:"1.5", step:"0.05" });
    rate.value = String(tts.rate);
    rate.addEventListener("input", () => tts.setRate(rate.value));

    const volume = h("input", { type:"range", min:"0", max:"1", step:"0.05" });
    volume.value = String(tts.volume);
    volume.addEventListener("input", () => tts.setVolume(volume.value));

    const onTtsState = ({ voices, piperVoices, edgeVoices, providers, provider } = {}) => {
      fillVoices(voices || []);
      fillPiperVoices(piperVoices || []);
      fillEdgeVoices(edgeVoices || []);
      providerSelect.innerHTML = "";
      for (const p of (providers || [])) {
        const suffix = p.available ? "" : " (indisponible)";
        providerSelect.appendChild(h("option", {
          value: p.id
        }, `${p.label}${suffix}`));
      }
      providerSelect.value = provider || "webspeech";
      syncProviderVisibility();
    };
    tts.init(onTtsState).catch(e => console.error(e));
    onTtsState({
      voices: tts.voices,
      piperVoices: tts.piperVoices,
      edgeVoices: tts.edgeVoices,
      providers: tts.providers,
      provider: tts.provider
    });

    const playBtn = h("button", { class:"btn", onclick: () => {
      const seq = state.current.chapter?.sequences?.[state.current.seqIndex];
      tts.speak(seq?.texte_audio || seq?.texte_ecran || "");
    }}, "Lire");

    const stopBtn = h("button", { class:"btn secondary", onclick: () => tts.stop() }, "Stop");

    return h("div", {},
      h("div", { class:"h1" }, "Audio / Narration"),
      h("div", { class:"row" }, enabled, h("div", { class:"small" }, "Lecture automatique a chaque sequence")),
      h("div", { class:"hr" }),
      h("div", { class:"label" }, "Provider"),
      providerSelect,
      h("div", { class:"hr" }),
      h("div", { class:"label" }, "Voix Web Speech"),
      voicesSelect,
      h("div", { class:"label", style:"margin-top:8px;" }, "Voix Piper (10 affichees)"),
      piperVoicesSelect,
      h("div", { class:"label", style:"margin-top:8px;" }, "Voix Edge TTS (Neural, en ligne)"),
      edgeVoicesSelect,
      h("div", { class:"hr" }),
      h("div", { class:"sliderRow" },
        h("div", {},
          h("div", { class:"label" }, `Vitesse: ${Number(tts.rate).toFixed(2)}`),
          rate
        ),
        h("div", {},
          h("div", { class:"label" }, `Volume: ${Number(tts.volume).toFixed(2)}`),
          volume
        )
      ),
      h("div", { class:"hr" }),
      h("div", { class:"controls" }, playBtn, stopBtn),
      h("div", { class:"small", style:"margin-top:10px;" },
        "Piper : actif si piper.exe + modeles .onnx presents. Edge TTS : connexion internet + pip install edge-tts."
      )
    );
  };

  const speakCurrent = () => {
    const seq = state.current.chapter?.sequences?.[state.current.seqIndex];
    state.tts.speak(seq?.texte_audio || "");
  };

  const saveSeqIndex = async () => {
    if (!state.profile || !state.current.meta) return;
    const progress = state.current.progress;
    const chId = state.current.meta.id;
    const chProg = ensureChapterProgress(progress, chId);
    chProg.lastSequenceIndex = state.current.seqIndex;
    await mmCall(mm => mm.progress.save(state.profile.id, progress), "progress:save", 10000);
  };

  const renderLeft = () => {
    const meta = state.current.meta;
    const chapter = state.current.chapter;
    const seq = chapter?.sequences?.[state.current.seqIndex];

    clear(left);

    left.appendChild(h("div", { class:"spread" },
      h("div", {},
        h("div", { class:"h1" }, meta?.titre || "Chapitre"),
        h("p", { class:"p" }, meta?.description || "")
      ),
      h("button", { class:"btn secondary", onclick: () => {
        const ch = state.current.meta?.chapter;
        navigate(ch ? `#/library/${ch}` : "#/library");
      }}, "[<] Retour")
    ));

    left.appendChild(h("div", { class:"hr" }));

    if (!seq){
      left.appendChild(h("p", { class:"p" }, "Séquence introuvable."));
      return;
    }

    const idx = state.current.seqIndex + 1;
    const total = chapter.sequences.length;

    left.appendChild(h("div", { class:"seqCounter" }, `${idx} / ${total}`));
    left.appendChild(h("div", { class:"hr" }));
    left.appendChild(h("p", { class:"p lessonText" }, seq.texte_ecran));

    if (seq.type === "quiz_interactif"){
      left.appendChild(h("div", { class:"hr" }));
      left.appendChild(h("div", { class:"h1" }, "Quiz"));

      const st = state.quiz.status;
      const active = !!st?.active;
      const solved = !!st?.solved;

      const line = solved
        ? "Termine"
        : (active
            ? `Etape ${Math.min((st.stepIndex || 0) + 1, st.totalSteps || 0)}/${st.totalSteps || 0}`
            : "Preparation...");

      left.appendChild(h("div", { class:"kbd" }, line));

      if (!solved) {
        left.appendChild(h("div", { class:"small", style:"margin-top:8px;" }, "Objectif: joue la suite. L'app repond automatiquement."));
        if ((st?.errors || 0) > 0) {
          left.appendChild(h("div", { class:"small", style:"margin-top:6px;" }, `Erreurs sur cette etape: ${st.errors}`));
        }
      }

      const btnRow = h("div", { class:"controls", style:"margin-top:10px;" },
        h("button", { class:"btn secondary", disabled: solved, onclick: () => state.quiz.runner?.undoStep() }, "[<] Annuler"),
        h("button", { class:"btn secondary", disabled: solved, onclick: () => state.quiz.runner?.showHint() }, "[i] Indice")
      );
      left.appendChild(btnRow);

      if (solved) {
        left.appendChild(h("div", { class:"quizDoneBanner", style:"margin-top:10px;" },
          "Quiz termine. Clique sur Suivant -> pour continuer."
        ));
      }

      // Optional developer info
      if (seq.validation?.coups_acceptes?.length){
        left.appendChild(h("div", { class:"small", style:"margin-top:8px;" }, `Coups acceptes: ${seq.validation.coups_acceptes.join(", ")}`));
      }
    }

    left.appendChild(h("div", { class:"hr" }));

    const prevBtn = h("button", { class:"btn secondary", onclick: async () => {
      if (state.current.seqIndex <= 0) return;
      state.current.seqIndex -= 1;
      await saveSeqIndex();
      renderLeft(); renderRight(); speakCurrent();
    }}, "[<] Precedent");

    const isQuizSolved = seq.type === "quiz_interactif" && !!state.quiz.status?.solved;

    const nextBtn = h("button", { class:`btn ${isQuizSolved ? "nextCue" : ""}`, onclick: async () => {
      if (state.current.seqIndex >= total - 1) return;
      state.current.seqIndex += 1;
      await saveSeqIndex();
      renderLeft(); renderRight(); speakCurrent();
    }}, isQuizSolved ? "Suivant [>] (Quiz fini)" : "Suivant [>]");

    const replayBtn = h("button", { class:"btn secondary", onclick: async () => {
      // Reset position + replay animations (if any) + re-speak
      const seq = state.current.chapter?.sequences?.[state.current.seqIndex];
      if (seq?.position_depart_fen) {
        setAnimationComment("");
        state.board?.setPositionFromFen(seq.position_depart_fen);
        const animMoves = (seq.animations || []).slice();
        state.board?.setAnimations(animMoves);
        if (seq.type === "theorie_animee" && animMoves.length) {
          state.board?.setLocked(true);
          state.board?.replayPositionAndAnimations({ cadenceMs: 1200 });
        } else {
          state.board?.setLocked(false);
        }
      }
      speakCurrent();
      toast("Séquence rejouée.");
    }}, "[R] Rejouer");

    left.appendChild(h("div", { class:"controls" }, prevBtn, nextBtn, replayBtn));
    left.appendChild(h("div", { class:"small", style:"margin-top:10px;" },
      "Astuce: l'app sauvegarde automatiquement la séquence courante."
    ));
  };

  renderLeft();
  renderRight();
  speakCurrent();

  return layout(container);
}

async function openChapter(chapterId){
  if (!state.profile) return toast("Selectionne un profil.");
  try{
    const { meta, chapter } = await mmCall(mm => mm.content.loadChapter(chapterId), "content:loadChapter");
    const progress = await mmCall(mm => mm.progress.load(state.profile.id), "progress:load", 10000);

    state.current.meta = meta;
    state.current.chapter = chapter;
    state.current.progress = progress;

    const last = getChapterLastIndex(progress, meta.id);
    state.current.seqIndex = Math.max(0, Math.min(last, (chapter.sequences?.length || 1) - 1));

    navigate(`#/reader/${encodeURIComponent(meta.id)}`);
  }catch(e){
    toast(String(e?.message || e));
  }
}

/**
 * Convertit un coup en notation algébrique française (SAN) en texte lisible.
 * Exemples : "Cxf3" → "cavalier prend f3"
 *            "Fd3"  → "fou en d3"
 *            "Tab8" → "tour a en b8"
 *            "exd5" → "pion e prend d5"
 *            "0-0"  → "petit roque"
 */
function sanToFr(san) {
  if (!san) return "";
  const raw = String(san).trim();

  // Extraire le suffixe d'échec avant de nettoyer (ordre important : ++ avant +)
  let suffix = "";
  if (raw.endsWith("#"))       suffix = ", échec et mat";
  else if (raw.endsWith("++")) suffix = ", échec double";
  else if (raw.endsWith("+"))  suffix = ", échec";

  const s = raw.replace(/[+#!?]/g, "").trim();
  if (s === "0-0-0") return "grand roque" + suffix;
  if (s === "0-0")   return "petit roque" + suffix;

  const pieces = { C: "cavalier", F: "fou", T: "tour", D: "dame", R: "roi" };
  const pieceChar = pieces[s[0]] ? s[0] : null;
  const pieceName = pieceChar ? pieces[pieceChar] : "pion";
  const rest      = pieceChar ? s.slice(1) : s;

  const xIdx      = rest.indexOf("x");
  const isCapture = xIdx !== -1;

  let disambiguation, target;
  if (isCapture) {
    disambiguation = rest.slice(0, xIdx);
    target         = rest.slice(xIdx + 1, xIdx + 3);
  } else {
    target         = rest.slice(-2);
    disambiguation = rest.slice(0, -2);
  }

  let result = pieceName;
  if (disambiguation) result += " " + disambiguation;
  result += isCapture ? " prend " + target : " en " + target;
  return result + suffix;
}

/**
 * Prépare un commentaire pour la narration TTS :
 * traduit les notations algébriques françaises en texte parlé.
 *
 * "7.cxd5"  → "coup 7 des Blancs, pion c prend d5"
 * "8...Cf6" → "coup 8 des Noirs, cavalier en f6"
 * "...Fb7"  → "les Noirs jouent fou en b7"
 * "Tb1+"    → "tour en b1"
 * "9...b6"  → "coup 9 des Noirs, pion en b6"
 */
function commentToSpeech(text) {
  if (!text) return "";
  let s = String(text);

  // Motif d'un coup : pièces (CFTDR), captures de pion (cxd5), pions simples (b6), roques
  const mv = "(?:0-0-0|0-0|[CFTDR][a-h]?[1-8]?x?[a-h][1-8][+#!?]*|[a-h]x[a-h][1-8][+#!?]*|[a-h][1-8][+#]?)";

  // 1. Coup des Noirs avec numéro — 3 points : "8...Cf6", "9...b6"
  //    Traiter avant le 1 point pour éviter que "8." absorbe "8..."
  s = s.replace(
    new RegExp("(\\d+)\\.{3}\\s*(" + mv + ")", "g"),
    (_, num, move) => `coup ${num} des Noirs, ${sanToFr(move)}`
  );

  // 2. Coup des Blancs avec numéro — 1 point : "7.cxd5", "12.Ce5"
  s = s.replace(
    new RegExp("(\\d+)\\.\\s*(" + mv + ")", "g"),
    (_, num, move) => `coup ${num} des Blancs, ${sanToFr(move)}`
  );

  // 3. Points de suspension seuls sans numéro : "...Fb7"
  s = s.replace(
    new RegExp("\\.{3}\\s*(" + mv + ")", "g"),
    (_, move) => `les Noirs jouent ${sanToFr(move)}`
  );

  // 4. Pièces seules restantes (sans numéro) : "Tb1+", "Ce5"
  //    (?!\w) au lieu de \b final pour inclure les suffixes +#!? dans la correspondance
  s = s.replace(
    /\b([CFTDR][a-h]?[1-8]?x?[a-h][1-8][+#!?]*)(?!\w)/g,
    (_, move) => sanToFr(move)
  );

  // 5. Pions seuls : "b6", "d5" — évite les faux positifs après "en " ou "prend "
  //    (ce sont des cibles de pièces déjà traduites, pas des coups de pion autonomes)
  s = s.replace(
    /(?<!(?:en|prend) )(?<![a-zA-Z0-9])([a-h][1-8])(?![a-zA-Z0-9])/g,
    (_, sq) => `pion en ${sq}`
  );

  return s;
}

async function openGame(gameId){
  if (!state.profile) return toast("Selectionne un profil.");
  try{
    const { meta, chapter } = await mmCall(mm => mm.content.loadChapter(gameId), "content:loadChapter");
    state.current.meta = meta;
    state.current.chapter = chapter;
    navigate(`#/partie/${encodeURIComponent(gameId)}`);
  }catch(e){
    toast(String(e?.message || e));
  }
}

function partieScreen(){
  const game = state.current.chapter;
  if (!game || game.type !== "game") {
    navigate("#/library");
    return h("div", {});
  }

  const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  let moveIndex = -1;

  // DOM elements
  const commentEl  = h("div", { class: "partieComment" });
  const counterEl  = h("div", { class: "partieCounter" });
  const moveListEl = h("div", { class: "moveList" });
  const btnPrev    = h("button", { class: "btn secondary" }, "← Précédent");
  const btnNext    = h("button", { class: "btn" }, "Suivant →");
  const boardHost  = h("div", { id: "boardHost" });

  // Board widget (singleton, locked = lecture seule)
  if (!state.board) {
    state.board = new BoardWidget({ onMove: () => {} });
  }
  if (!boardHost.__mounted) {
    state.board.mount(boardHost);
    boardHost.__mounted = true;
  }
  state.board.setLocked(true);

  // Build move list (paires 1.d4 d5  2.c4 e6 ...)
  const moveSpans = [];
  for (let i = 0; i < game.moves.length; i++){
    const move    = game.moves[i];
    const isWhite = i % 2 === 0;
    const moveNum = Math.floor(i / 2) + 1;

    if (isWhite){
      moveListEl.appendChild(h("span", { class: "moveNum" }, `${moveNum}.`));
    }
    const span = h("span", {
      class: "moveToken" + (move.comment ? " hasComment" : ""),
      onclick: () => goTo(i),
      title: move.san  // notation compacte en tooltip
    }, sanToFr(move.san));
    moveSpans.push(span);
    moveListEl.appendChild(span);
  }

  const goTo = (idx) => {
    const clamped = Math.max(-1, Math.min(game.moves.length - 1, idx));
    moveIndex = clamped;

    // Replay position from start
    state.board.setPositionFromFen(STARTING_FEN);
    for (let i = 0; i <= clamped; i++){
      state.board.applyUci(game.moves[i].uci, { ignoreTurn: true, silent: true });
    }

    // Commentaire + TTS (affiché tel quel, parlé avec notation traduite)
    const comment = clamped >= 0 ? (game.moves[clamped].comment || "") : "";
    commentEl.textContent = comment;
    if (comment) state.tts.speak(commentToSpeech(comment));

    // Compteur
    if (clamped === -1){
      counterEl.textContent = "Position initiale";
    } else {
      const moveNum   = Math.floor(clamped / 2) + 1;
      const side      = clamped % 2 === 0 ? "Blancs" : "Noirs";
      const moveFr    = sanToFr(game.moves[clamped].san);
      counterEl.textContent = `Coup ${moveNum} — ${side} : ${moveFr}`;
    }

    // Surlignage dans la liste
    moveSpans.forEach((span, i) => {
      span.className = "moveToken"
        + (game.moves[i].comment ? " hasComment" : "")
        + (i === clamped ? " activeMove" : "");
    });

    btnPrev.disabled = clamped <= -1;
    btnNext.disabled = clamped >= game.moves.length - 1;

    // Scroll coup actif
    if (clamped >= 0 && moveSpans[clamped]){
      moveSpans[clamped].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  btnPrev.onclick = () => goTo(moveIndex - 1);
  btnNext.onclick = () => goTo(moveIndex + 1);

  // Navigation clavier
  const onKey = (e) => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(moveIndex - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(moveIndex + 1); }
  };
  document.addEventListener("keydown", onKey);
  const cleanup = () => {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", cleanup);
  };
  window.addEventListener("hashchange", cleanup);

  // Position initiale
  goTo(-1);

  // En-tête
  const headerEl = h("div", { class: "partieHeader" },
    h("div", { class: "partieTitle" }, `Partie n°${game.number}`),
    h("div", { class: "partieVs" }, `${game.white}  –  ${game.black}`),
    h("div", { class: "partieMeta" }, `${game.event}, ${game.year}  ·  ${game.opening}`)
  );

  const left = h("div", { class: "leftCol card panel scroll" },
    h("div", { class: "spread" },
      headerEl,
      h("button", { class: "btn secondary", onclick: () => {
        const ch = state.current.meta?.chapter;
        navigate(ch ? `#/library/${ch}` : "#/library");
      }}, "[<] Retour")
    ),
    h("div", { class: "hr" }),
    counterEl,
    h("div", { class: "hr" }),
    moveListEl,
    h("div", { class: "hr" }),
    commentEl,
    h("div", { class: "hr" }),
    h("div", { class: "controls" }, btnPrev, btnNext)
  );

  const right = h("div", { class: "rightCol card scroll" }, boardHost);

  return layout(h("div", { class: "split" }, left, right));
}

function router(){
  try{
  const app = document.getElementById("app");
  const hash = window.location.hash || "#/profiles";

  // Simple router
  const [_, route, arg] = hash.split("/");

  clear(app);

  if (route === "profiles") {
    app.appendChild(profilesScreen());
    return;
  }

  if (route === "library") {
    if (arg && /^\d+$/.test(arg)) {
      if (!state.profile) {
        app.appendChild(profilesScreen());
        toast("Selectionne un profil.");
        return;
      }
      app.appendChild(chapterLessonsScreen(parseInt(arg, 10)));
    } else {
      app.appendChild(libraryScreen());
    }
    return;
  }

  if (route === "reader") {
    // Ensure chapter loaded (in case of reload)
    if (!state.profile) {
      app.appendChild(profilesScreen());
      toast("Selectionne un profil.");
      return;
    }
    if (!state.current.chapter || !state.current.meta || decodeURIComponent(arg || "") !== state.current.meta.id) {
      // fallback to library
      app.appendChild(libraryScreen());
      toast("Ouvre un chapitre depuis la bibliotheque.");
      return;
    }
    app.appendChild(readerScreen());
    return;
  }

  if (route === "partie") {
    if (!state.profile) {
      app.appendChild(profilesScreen());
      toast("Selectionne un profil.");
      return;
    }
    if (!state.current.chapter || state.current.chapter.type !== "game" || decodeURIComponent(arg || "") !== state.current.meta?.id) {
      app.appendChild(libraryScreen());
      toast("Ouvre une partie depuis la bibliotheque.");
      return;
    }
    app.appendChild(partieScreen());
    return;
  }

  // default
  navigate("#/profiles");
  }catch(e){
    console.error(e);
    const app = document.getElementById("app");
    if (app){
      clear(app);
      app.appendChild(layout(h("div", { class:"card panel scroll", style:"width:100%;" },
        h("div", { class:"h1" }, "Erreur de rendu"),
        h("p", { class:"p" }, "Une erreur est survenue dans l'interface."),
        h("div", { class:"hr" }),
        h("div", { class:"small" }, String(e?.message || e)),
        h("div", { class:"hr" }),
        h("button", { class:"btn", onclick: () => navigate("#/profiles") }, "Retour profils")
      )));
    }
    toast("Erreur UI: " + String(e?.message || e), 5000);
  }
}

function installGlobalErrorHandlers(){
  window.addEventListener("error", (ev) => {
    const msg = ev?.error?.message || ev?.message || "Erreur inconnue";
    console.error("Renderer error:", ev?.error || ev);
    toast("Erreur: " + msg, 5000);
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const msg = ev?.reason?.message || String(ev?.reason || "Promise rejetee");
    console.error("Unhandled rejection:", ev?.reason || ev);
    toast("Erreur: " + msg, 5000);
  });
}

async function init(){
  installGlobalErrorHandlers();

  // Render ASAP
  if (!window.location.hash || window.location.hash === "#") {
    window.location.hash = "#/profiles";
  }
  window.addEventListener("hashchange", router);
  router();

  // Restore profile in background (no blank screen if it hangs)
  try{
    const ok = await bootProfileFromStore();
    if (ok) {
      // Go library by default after restore
      if (window.location.hash === "#/profiles") navigate("#/library");
      router();
    }
  }catch(e){
    console.error(e);
    // remain on profiles
  }
}

init();
