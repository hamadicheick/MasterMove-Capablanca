
const fs = require("fs/promises");
const path = require("path");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return fallbackValue;
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = filePath + ".tmp";
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, payload, "utf-8");
  try{
    await fs.rename(tmp, filePath);
  }catch(e){
    // Windows can sporadically fail atomic rename (AV scan / file lock).
    // Fallback to direct overwrite to keep the app usable.
    try{
      await fs.writeFile(filePath, payload, "utf-8");
    }finally{
      try{ await fs.unlink(tmp); }catch(_){ }
    }
    // Re-throw only if the fallback also failed.
    // If direct write succeeded, swallow the rename error.
    try{
      await fs.access(filePath);
    }catch(_){
      throw e;
    }
  }
}

module.exports = {
  ensureDir,
  readJson,
  writeJsonAtomic
};
