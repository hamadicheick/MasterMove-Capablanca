# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the app (from repo root)
npm --prefix app run start

# Or from inside app/
cd app && npm install && npm run start
```

No build step, no tests, no linter. The app runs directly with Electron.

**Debugging:** Open DevTools with `Ctrl+Shift+I` inside the running app.

## Architecture

Electron app with strict process isolation:

```
app/
  src/main/        ← Node.js main process (file system, IPC handlers)
    main.js        ← app entry, IPC registration, profile/progress persistence
    content.js     ← reads app/content/ JSON files, format conversion
    narration_edge.js / narration_piper.js  ← TTS providers
    storage.js     ← atomic JSON read/write to userData
  src/preload/
    bridge.js      ← contextBridge exposes window.mm to renderer
  src/renderer/
    index.html
    js/app.js      ← entire UI (vanilla JS, no framework)
    styles/app.css
    assets/piecesets*/  ← SVG/PNG piece sets
  content/         ← lesson JSON files + index.json
```

**IPC flow:** renderer calls `window.mm.*` → preload `ipcRenderer.invoke()` → main `ipcMain.handle()` → returns data. All file access happens in the main process only.

**User data** (profiles + progress) is stored in Electron's `userData` (AppData on Windows), not in the repo.

## Content System

### index.json structure

`app/content/index.json` has two arrays:
- `book_chapters` — display metadata for the library chapter groupings
- `chapters` — one entry per lesson file, with `id`, `chapter` (number), `order`, `type`, `file`

When `type === "game"` in index.json, clicking the item calls `openGame()` which navigates to `#/partie/` for full annotated game view. Otherwise `openChapter()` is used, navigating to `#/reader/`.

### Lesson file formats

`content.js` supports three input formats and normalises them at load time:

1. **Legacy format** — has `position_depart_fen` in sequences (pass-through, no conversion).
2. **4-bloc format** (current standard) — sequences with `type` in `{diagram, animation, text, quiz_interactif}`. Converted by `toLegacyFromFourBlocks()`.
3. **BMAD-lite format** — has `initial_fen` + `mainline` array. Converted by `toLegacyChapter()`.
4. **Game format** — has `type: "game"` at root + `moves[]` with `{uci, san, comment}`. Pass-through, used by `partieScreen()`.

**Key rule:** `loadChapter()` in `content.js` checks `parsed.type === "game"` to decide whether to convert or pass through. A lesson file must have `"type": "game"` at its root to be rendered by `partieScreen`. If `type` is absent, it goes through conversion even if the index entry has `type: "game"`.

The `openGame()` fix (commit `808905d`): if the loaded chapter ends up as sequences after conversion, `openGame()` now redirects to `#/reader/` instead of the broken `#/partie/` route.

### 4-bloc format (content production standard)

```json
{
  "id": "capablanca_exNN_...",
  "title": "...",
  "sequences": [
    { "type": "diagram", "fen": "...", "text": "..." },
    { "type": "animation", "fen": "...", "moves": ["e2e4", "e7e5"], "text": "..." },
    { "type": "quiz_interactif", "fen": "...", "correct_move": "g1f3",
      "question": "...", "success_message": "...", "error_message": "..." },
    { "type": "text", "title": "...", "content": ["point 1", "point 2"] }
  ]
}
```

Multi-step quiz uses `steps[]` instead of `correct_move`:
```json
{ "type": "quiz_interactif", "fen": "...", "question": "...",
  "steps": [
    { "coups_acceptes": ["e2e4"], "reponse": "e7e5", "indice": "..." }
  ]
}
```

### Game format (annotated parties — Deuxième partie)

```json
{
  "type": "game", "id": "capablanca_partieN",
  "number": 1, "white": "Marshall", "black": "Capablanca",
  "event": "Match", "year": 1909, "opening": "Gambit-Dame refusé",
  "result": "0-1",
  "moves": [
    { "uci": "d2d4", "san": "d4", "comment": "" },
    { "uci": "d7d5", "san": "d5", "comment": "Réponse symétrique." }
  ]
}
```

### Moves: always UCI

All moves in lesson files must be UCI notation (`e2e4`, `g1f3`, castling as king move `e1g1`/`e8g8`). SAN (`Nf3`, `O-O`) is only used in game `moves[].san` for display.

### TTS rule

All `texte_ecran`, `texte_audio`, `text`, `question` fields must use **proper French with accents** (é, è, à, ç, etc.). The TTS engine reads French — without accents the pronunciation is incompréhensible for children.

## Git Workflow (critical — recurring issue)

Claude Code automatically creates worktrees (`claude/*` branches). Content committed there is NOT visible on `main` until the PR is merged. Every session must end with:

```bash
# In the main repo directory (not the worktree)
git checkout main && git pull origin main
# Rebase worktree branch if needed, then:
gh pr merge <N> --merge
git pull origin main
```

Commits to `main` directly (no PR) are preferred for code fixes to avoid regressions from future branch merges overwriting fixes in `app.js`.

## Content in Progress

- **Source of truth:** `livre.txt` (full book text, has encoding artefacts — use with `sed` or Python to extract)
- **PGN files:** `les_Principes_Fondamentaux_-_Capablanca_*.pgn` at repo root
- **Première partie** (Chapitres I–VI, Ex1–Ex67): complete ✅
- **Deuxième partie** (annotated games, book pp. 78–116, 14 parties total):
  - Partie 1 Marshall–Capablanca 1909: done ✅ (game format)
  - Partie 2 Rubinstein–Capablanca 1911: done ✅ (4-bloc/sequences format)
  - Partie 3 Janowski–Capablanca 1913: done ✅ (game format)
  - Partie 4 Capablanca–Znosko-Borovsky 1913: done ✅ (game format)
  - Parties 5–14: pending
- **Encoding key for livre.txt** (chess figurine font — bytes): 0xcc=Cavalier, 0xcd=Fou, 0xcb=Dame, 0xce=Tour, 0xca=Roi. Pawn moves have no prefix byte. Use python3 binary read + decode latin-1.

## BMAD docs

Operational rules and backlog live in `.bmad/`:
- `PRINCIPES_OPERATIONNELS.md` — non-negotiable technical rules (FEN source of truth, UCI format, TTS rule, git workflow)
- `backlog.md` — pending tasks
- `decisions.md` — architectural decisions log
