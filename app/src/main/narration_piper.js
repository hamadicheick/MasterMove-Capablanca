const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { ensureDir } = require("./storage");
const { spawnSync } = require("child_process");

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function modelLabelFromFile(fileName) {
  return String(fileName || "")
    .replace(/\.onnx$/i, "")
    .replace(/[_\-]+/g, " ")
    .trim();
}

function speakerEntriesFromConfig(cfg) {
  const map = cfg && typeof cfg === "object" ? cfg.speaker_id_map : null;
  if (!map || typeof map !== "object") return [];
  const out = [];
  for (const [name, value] of Object.entries(map)) {
    const id = Number(value);
    if (Number.isFinite(id)) out.push({ name: String(name), id });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

class PiperNarrationService {
  constructor(app) {
    this.app = app;
  }

  getPiperRoot() {
    return path.join(this.app.getAppPath(), "resources", "piper");
  }

  canRunPiper(exePath) {
    try {
      const opts = { encoding: "utf8", timeout: 5000 };
      if (exePath && exePath.includes(path.sep)) {
        opts.cwd = path.dirname(exePath);
      }
      const res = spawnSync(exePath, ["--help"], opts);
      return res && res.status === 0;
    } catch (_) {
      return false;
    }
  }

  async resolvePiperExe() {
    const root = this.getPiperRoot();
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const candidates = process.platform === "win32"
      ? [
          path.join(programFiles, "piper_win_final", "piper.exe"),
          path.join(programFilesX86, "piper_win_final", "piper.exe"),
          path.join(root, "piper.exe"),
          path.join(process.cwd(), "resources", "piper", "piper.exe"),
          path.join(this.app.getPath("userData"), "piper", "piper.exe"),
          "piper.exe",
          "piper"
        ]
      : [
          path.join(root, "piper"),
          path.join(process.cwd(), "resources", "piper", "piper"),
          path.join(this.app.getPath("userData"), "piper", "piper"),
          "piper"
        ];

    for (const c of candidates) {
      try {
        if (c.includes(path.sep)) {
          await fs.access(c);
        }
        if (this.canRunPiper(c)) return c;
      } catch (_) {
        // continue
      }
    }
    // Last chance on Windows: query PATH via where.exe
    if (process.platform === "win32") {
      try {
        const res = spawnSync("where", ["piper.exe"], { encoding: "utf8" });
        const all = String(res?.stdout || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        for (const first of all) {
          if (this.canRunPiper(first)) return first;
        }
      } catch (_) {}
    }
    return null;
  }

  getModelsDirCandidates(exePath) {
    const out = [];
    const add = (p) => { if (p && !out.includes(p)) out.push(p); };
    add(process.env.PIPER_MODELS_DIR || "");
    add(path.join(this.getPiperRoot(), "models"));
    add(path.join(process.cwd(), "resources", "piper", "models"));
    add(path.join(this.app.getPath("userData"), "piper", "models"));
    if (exePath && exePath.includes(path.sep)) {
      add(path.join(path.dirname(exePath), "models"));
      add(path.dirname(exePath));
    }
    return out.filter(Boolean);
  }

  async resolveModelsDir(exePath) {
    const candidates = this.getModelsDirCandidates(exePath);
    for (const d of candidates) {
      try {
        await fs.access(d);
        const files = await fs.readdir(d);
        if (files.some(n => /\.onnx$/i.test(n))) return d;
      } catch (_) {
        // continue
      }
    }
    return null;
  }

  async listVoices() {
    const exe = await this.resolvePiperExe();
    const modelsDir = await this.resolveModelsDir(exe);
    if (!modelsDir) return [];
    try {
      const items = await fs.readdir(modelsDir);
      const voices = [];
      for (const file of items.filter((n) => /\.onnx$/i.test(n))) {
        const modelPath = path.join(modelsDir, file);
        const baseLabel = modelLabelFromFile(file);
        const cfgPath = modelPath + ".json";
        let cfg = null;
        try {
          const raw = await fs.readFile(cfgPath, "utf-8");
          cfg = JSON.parse(raw);
        } catch (_) {
          cfg = null;
        }

        const speakers = speakerEntriesFromConfig(cfg);
        if (speakers.length > 1) {
          for (const spk of speakers) {
            voices.push({
              id: `${file}::${spk.id}`,
              label: `${baseLabel} - speaker ${spk.name}`,
              modelPath,
              speakerId: spk.id
            });
          }
          continue;
        }

        voices.push({
          id: file,
          label: baseLabel,
          modelPath
        });
      }
      voices.sort((a, b) => a.label.localeCompare(b.label, "fr"));
      return voices;
    } catch (_) {
      return [];
    }
  }

  async isAvailable() {
    const exe = await this.resolvePiperExe();
    const voices = await this.listVoices();
    return !!exe && voices.length > 0;
  }

  async getDefaultVoiceId() {
    const voices = await this.listVoices();
    return voices[0]?.id || null;
  }

  async getVoiceById(voiceId) {
    const voices = await this.listVoices();
    const found = voices.find((v) => v.id === voiceId);
    return found || voices[0] || null;
  }

  async getCacheDir() {
    const dir = path.join(this.app.getPath("userData"), "narration_cache", "piper");
    await ensureDir(dir);
    return dir;
  }

  async synthesize({ text, voiceId, rate }) {
    const t = String(text || "").trim();
    if (!t) return { ok: false, error: "Texte vide." };

    const exe = await this.resolvePiperExe();
    if (!exe) {
      return { ok: false, error: "Piper introuvable. Place `piper.exe` dans `app/resources/piper/`." };
    }

    const voice = await this.getVoiceById(voiceId);
    if (!voice) {
      const tried = this.getModelsDirCandidates(exe).join(" | ");
      return {
        ok: false,
        error: `Aucune voix Piper trouvee (.onnx). Dossiers verifies: ${tried}.`
      };
    }

    const safeRate = clamp(Number(rate) || 1, 0.5, 1.5);
    const lengthScale = clamp(1 / safeRate, 0.67, 2.0);

    const key = sha1(JSON.stringify({ v: voice.id, r: safeRate, t }));
    const cacheDir = await this.getCacheDir();
    const outFile = path.join(cacheDir, `${key}.wav`);

    try {
      await fs.access(outFile);
      return { ok: true, path: outFile, voiceId: voice.id, cached: true };
    } catch (_) {
      // synthesize
    }

    const args = [
      "--model", voice.modelPath,
      "--output_file", outFile,
      "--length_scale", String(lengthScale)
    ];
    if (Number.isFinite(Number(voice.speakerId))) {
      args.push("--speaker", String(Number(voice.speakerId)));
    }

    const result = await new Promise((resolve) => {
      let stderr = "";
      const childOpts = { stdio: ["pipe", "ignore", "pipe"] };
      if (exe && exe.includes(path.sep)) {
        childOpts.cwd = path.dirname(exe);
      }
      const child = spawn(exe, args, childOpts);
      child.stderr.on("data", (d) => { stderr += String(d || ""); });
      child.on("error", (err) => resolve({ ok: false, error: String(err?.message || err) }));
      child.on("close", (code) => {
        if (code === 0) resolve({ ok: true });
        else resolve({ ok: false, error: stderr || `Piper a quitte avec code ${code}` });
      });
      try {
        child.stdin.write(t);
        child.stdin.end();
      } catch (e) {
        resolve({ ok: false, error: String(e?.message || e) });
      }
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, path: outFile, voiceId: voice.id, cached: false };
  }
}

module.exports = {
  PiperNarrationService
};
