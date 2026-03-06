
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");

const { ensureDir, readJson, writeJsonAtomic } = require("./storage");
const { listChapters, loadChapter, listPieceSets } = require("./content");
const { PiperNarrationService } = require("./narration_piper");

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

let dataRootDir = null;

async function resolveDataRoot() {
  if (dataRootDir) return dataRootDir;
  const candidates = [
    app.getPath("userData"),
    path.join(app.getAppPath(), ".localdata")
  ];
  const errors = [];
  for (const dir of candidates) {
    try {
      await ensureDir(dir);
      const test = path.join(dir, ".write-test.tmp");
      await fs.writeFile(test, "ok", "utf-8");
      await fs.unlink(test);
      dataRootDir = dir;
      return dataRootDir;
    } catch (e) {
      errors.push(`${dir}: ${String(e?.message || e)}`);
    }
  }
  throw new Error("Aucun dossier de donnees inscriptible: " + errors.join(" | "));
}

function userDataPath(...parts) {
  const base = dataRootDir || app.getPath("userData");
  return path.join(base, ...parts);
}

async function getProfilesFile() {
  const fp = userDataPath("profiles.json");
  await ensureDir(path.dirname(fp));
  return fp;
}

async function listProfiles() {
  const fp = await getProfilesFile();
  const data = await readJson(fp, { profiles: [] });
  return Array.isArray(data?.profiles) ? data.profiles : [];
}

async function saveProfiles(profiles) {
  const fp = await getProfilesFile();
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  await writeJsonAtomic(fp, { profiles: safeProfiles });
}

function progressFile(profileId) {
  return userDataPath("progress", `${profileId}.json`);
}

async function loadProgress(profileId) {
  const fp = progressFile(profileId);
  return await readJson(fp, { profileId, chapters: {} });
}

async function saveProgress(profileId, progress) {
  const fp = progressFile(profileId);
  await writeJsonAtomic(fp, progress);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#121212",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "bridge.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // NOTE: Electron 30+ sandbox mode can break preload `require()` usage on some setups.
      // We keep a secure baseline (contextIsolation + nodeIntegration=false) and disable
      // the Chromium sandbox to ensure the preload bridge always loads (profiles/progress).
      sandbox: false
    }
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(async () => {
  await resolveDataRoot();
  console.info("[storage] dataRoot:", dataRootDir);
  const piper = new PiperNarrationService(app);

  // IPC: profiles
  ipcMain.handle("profiles:list", async () => {
    return await listProfiles();
  });

  ipcMain.handle("profiles:create", async (_evt, name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) throw new Error("Nom de profil vide.");
    try{
      const profiles = await listProfiles();
      const p = { id: createId(), name: trimmed, createdAt: Date.now() };
      profiles.push(p);
      await saveProfiles(profiles);
      return p;
    }catch(e){
      const fp = await getProfilesFile();
      throw new Error(`Impossible de créer le profil (écriture): ${String(e?.message || e)} • ${fp}`);
    }
  });

  ipcMain.handle("profiles:delete", async (_evt, id) => {
    try{
      const profiles = await listProfiles();
      const next = profiles.filter(p => p.id !== id);
      await saveProfiles(next);
    }catch(e){
      const fp = await getProfilesFile();
      throw new Error(`Impossible de supprimer le profil (écriture): ${String(e?.message || e)} • ${fp}`);
    }
    // also delete progress file (best effort)
    try {
      const fs = require("fs/promises");
      await fs.unlink(progressFile(id));
    } catch (_) {}
    return true;
  });

  // IPC: progress
  ipcMain.handle("progress:load", async (_evt, profileId) => {
    return await loadProgress(profileId);
  });

  ipcMain.handle("progress:save", async (_evt, profileId, progress) => {
    // minimal guard
    if (!progress || progress.profileId !== profileId) {
      throw new Error("Progress payload invalide.");
    }
    try{
      await saveProgress(profileId, progress);
    }catch(e){
      throw new Error(`Impossible de sauvegarder la progression: ${String(e?.message || e)} • ${progressFile(profileId)}`);
    }
    return true;
  });

  // IPC: content
  ipcMain.handle("content:listChapters", async () => {
    return await listChapters();
  });

  ipcMain.handle("content:loadChapter", async (_evt, chapterId) => {
    return await loadChapter(chapterId);
  });

  ipcMain.handle("content:listPieceSets", async () => {
    return await listPieceSets();
  });

  ipcMain.handle("content:openPieceSetFolder", async (_evt, rootName, setId) => {
    try{
      const base = path.join(app.getAppPath(), "src", "renderer", "assets");
      const root = String(rootName || "piecesets");
      const id = String(setId || "");
      const dir = path.join(base, root, id);
      return await shell.openPath(dir);
    }catch(e){
      console.error(e);
      return String(e?.message || e);
    }
  });

  // IPC: narration
  ipcMain.handle("narration:listProviders", async () => {
    const providers = [{ id: "webspeech", label: "Web Speech (systeme)", available: true }];
    const piperAvailable = await piper.isAvailable();
    providers.push({ id: "piper", label: "Piper (local)", available: piperAvailable });
    return providers;
  });

  ipcMain.handle("narration:piper:listVoices", async () => {
    return await piper.listVoices();
  });

  ipcMain.handle("narration:piper:speak", async (_evt, payload) => {
    const text = String(payload?.text || "");
    const voiceId = payload?.voiceId ? String(payload.voiceId) : null;
    const rate = Number(payload?.rate || 1);
    return await piper.synthesize({ text, voiceId, rate });
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
