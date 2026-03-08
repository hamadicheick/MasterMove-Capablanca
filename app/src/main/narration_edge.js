/**
 * EdgeNarrationService — synthèse vocale via edge-tts (Python).
 * Même architecture que PiperNarrationService :
 *   main process → spawn python edge_tts → fichier .mp3 en cache → renderer joue le fichier.
 *
 * Prérequis : pip install edge-tts
 * Commande : edge-tts --voice fr-FR-DeniseNeural --rate +0% --text "..." --write-media out.mp3
 */

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const { ensureDir } = require("./storage");

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

function rateToPercent(rate) {
  const pct = Math.round((Number(rate) || 1) * 100 - 100);
  return (pct >= 0 ? "+" : "") + pct + "%";
}

/** Voix françaises Neural disponibles via edge-tts. */
const EDGE_FR_VOICES = [
  { id: "fr-FR-DeniseNeural",   label: "Denise — fr-FR (féminin)" },
  { id: "fr-FR-HenriNeural",    label: "Henri — fr-FR (masculin)" },
  { id: "fr-BE-CharlineNeural", label: "Charline — fr-BE (féminin)" },
  { id: "fr-BE-GerardNeural",   label: "Gérard — fr-BE (masculin)" },
  { id: "fr-CA-SylvieNeural",   label: "Sylvie — fr-CA (féminin)" },
  { id: "fr-CH-ArianeNeural",   label: "Ariane — fr-CH (féminin)" },
];

class EdgeNarrationService {
  constructor(app) {
    this.app = app;
    this._cmdCache = undefined; // undefined = pas encore résolu, null = introuvable
  }

  /**
   * Teste si une commande fonctionne.
   * edge-tts n'a pas de --version fiable, on utilise --help.
   */
  _testCmd(exe, prefix) {
    try {
      const res = spawnSync(exe, [...prefix, "--help"], { encoding: "utf8", timeout: 6000 });
      // Succès si code 0, ou si stderr vide (certaines versions quittent avec 1 mais fonctionnent)
      return res.status === 0 || (res.stdout && res.stdout.includes("edge"));
    } catch (_) {
      return false;
    }
  }

  /**
   * Résout la commande edge-tts disponible sur ce système (résultat mis en cache).
   * Retourne { exe, prefix } ou null.
   */
  async resolveEdgeCmd() {
    if (this._cmdCache !== undefined) return this._cmdCache;

    const candidates = [
      { exe: "edge-tts",  prefix: [] },                   // CLI direct dans PATH
      { exe: "python",    prefix: ["-m", "edge_tts"] },   // module Python (Windows)
      { exe: "python3",   prefix: ["-m", "edge_tts"] },   // module Python (Unix/Mac)
      { exe: "py",        prefix: ["-m", "edge_tts"] },   // lanceur py (Windows)
    ];

    for (const c of candidates) {
      if (this._testCmd(c.exe, c.prefix)) {
        this._cmdCache = c;
        return c;
      }
    }

    this._cmdCache = null;
    return null;
  }

  async isAvailable() {
    const cmd = await this.resolveEdgeCmd();
    return cmd !== null;
  }

  /** Liste statique — les voix Edge sont définies ici, pas sur disque. */
  listVoices() {
    return EDGE_FR_VOICES;
  }

  async getCacheDir() {
    const dir = path.join(this.app.getPath("userData"), "narration_cache", "edge");
    await ensureDir(dir);
    return dir;
  }

  /**
   * Synthétise du texte via edge-tts.
   * Retourne { ok: true, path } ou { ok: false, error }.
   */
  async synthesize({ text, voiceId = "fr-FR-DeniseNeural", rate = 1.0 }) {
    const t = String(text || "").trim();
    if (!t) return { ok: false, error: "Texte vide." };

    const cmd = await this.resolveEdgeCmd();
    if (!cmd) {
      return {
        ok: false,
        error: "edge-tts introuvable. Installez-le avec : pip install edge-tts"
      };
    }

    const safeRate = Math.max(0.5, Math.min(1.5, Number(rate) || 1));
    const rateStr  = rateToPercent(safeRate);

    // Clé de cache SHA1 : voix + vitesse + texte
    const key      = sha1(JSON.stringify({ v: voiceId, r: safeRate, t }));
    const cacheDir = await this.getCacheDir();
    const outFile  = path.join(cacheDir, `${key}.mp3`);

    // Retourner le fichier en cache s'il existe déjà
    try {
      await fs.access(outFile);
      return { ok: true, path: outFile, cached: true };
    } catch (_) { /* synthétiser */ }

    const args = [
      ...cmd.prefix,
      "--voice",       voiceId,
      "--rate",        rateStr,
      "--text",        t,
      "--write-media", outFile,
    ];

    return new Promise((resolve) => {
      let stderr = "";
      const child = spawn(cmd.exe, args, { stdio: ["ignore", "ignore", "pipe"] });
      child.stderr.on("data", (d) => { stderr += String(d || ""); });
      child.on("error", (e) => resolve({ ok: false, error: String(e?.message || e) }));
      child.on("close", (code) => {
        if (code === 0) resolve({ ok: true, path: outFile, cached: false });
        else resolve({ ok: false, error: stderr.trim() || `edge-tts a quitté avec le code ${code}` });
      });
    });
  }
}

module.exports = { EdgeNarrationService };
