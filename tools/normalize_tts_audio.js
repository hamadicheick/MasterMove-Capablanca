#!/usr/bin/env node

/**
 * Normalize only `texte_audio` fields to ASCII in app/content JSON files.
 *
 * Usage:
 *   node tools/normalize_tts_audio.js
 *   node tools/normalize_tts_audio.js --check
 */

const fs = require("fs");
const path = require("path");

const isCheck = process.argv.includes("--check");
const contentDir = path.join(__dirname, "..", "app", "content");

function normalizeAudioText(value) {
  if (typeof value !== "string") return value;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019\u2018\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(node) {
  if (Array.isArray(node)) {
    return node.map(walk);
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [key, val] of Object.entries(node)) {
      if (key === "texte_audio" && typeof val === "string") {
        out[key] = normalizeAudioText(val);
      } else {
        out[key] = walk(val);
      }
    }
    return out;
  }
  return node;
}

function main() {
  if (!fs.existsSync(contentDir)) {
    console.error("Content directory not found:", contentDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(contentDir)
    .filter((f) => f.toLowerCase().endsWith(".json"));

  let changed = 0;
  for (const file of files) {
    const full = path.join(contentDir, file);
    const raw = fs.readFileSync(full, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      continue;
    }

    const nextObj = walk(parsed);
    const nextRaw = JSON.stringify(nextObj, null, 2);
    if (nextRaw !== raw) {
      changed += 1;
      if (!isCheck) fs.writeFileSync(full, nextRaw, "utf8");
      console.log(`${isCheck ? "WOULD_UPDATE" : "UPDATED"} ${file}`);
    }
  }

  if (changed === 0) {
    console.log("No texte_audio changes needed.");
  } else {
    console.log(`${isCheck ? "Would update" : "Updated"} ${changed} file(s).`);
  }
}

main();

