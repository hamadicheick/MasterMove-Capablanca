/**
 * Microsoft Edge TTS — client WebSocket non officiel (aucune clé API requise).
 * Utilise la même API interne que le navigateur Edge pour les voix Neural.
 * Connexion internet requise.
 */

const EDGE_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_WS    = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TOKEN}`;
const OUTPUT_FMT = "audio-24khz-48kbitrate-mono-mp3";

/** Voix françaises Neural disponibles via Edge TTS. */
export const EDGE_FR_VOICES = [
  { id: "fr-FR-DeniseNeural",   label: "Denise — fr-FR (féminin)" },
  { id: "fr-FR-HenriNeural",    label: "Henri — fr-FR (masculin)" },
  { id: "fr-BE-CharlineNeural", label: "Charline — fr-BE (féminin)" },
  { id: "fr-BE-GerardNeural",   label: "Gérard — fr-BE (masculin)" },
  { id: "fr-CA-SylvieNeural",   label: "Sylvie — fr-CA (féminin)" },
  { id: "fr-CH-ArianeNeural",   label: "Ariane — fr-CH (féminin)" },
];

function genId() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

function rateToPercent(rate) {
  const pct = Math.round((Number(rate) || 1) * 100 - 100);
  return (pct >= 0 ? "+" : "") + pct + "%";
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Synthétise du texte via Edge TTS.
 * @param {object} opts
 * @param {string} opts.text      - Texte à lire
 * @param {string} opts.voiceId   - ID de la voix (ex. "fr-FR-DeniseNeural")
 * @param {number} opts.rate      - Vitesse (0.5–1.5, défaut 1.0)
 * @returns {Promise<string>}     - Blob URL (audio/mpeg) — libérer avec URL.revokeObjectURL()
 */
export function synthesizeEdge({ text, voiceId = "fr-FR-DeniseNeural", rate = 1.0 }) {
  return new Promise((resolve, reject) => {
    const connId = genId();
    const reqId  = genId().toUpperCase();
    const url    = `${EDGE_WS}&ConnectionId=${connId}`;

    let ws;
    try { ws = new WebSocket(url); }
    catch (e) { reject(new Error("Edge TTS: impossible d'ouvrir le WebSocket — " + (e?.message || e))); return; }

    ws.binaryType = "arraybuffer";
    const chunks = [];
    let settled  = false;

    const fail = (msg) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch (_) {}
      reject(new Error(msg));
    };

    const done = () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch (_) {}
      if (!chunks.length) { reject(new Error("Edge TTS: aucune donnée audio reçue")); return; }
      const blob = new Blob(chunks, { type: "audio/mpeg" });
      resolve(URL.createObjectURL(blob));
    };

    ws.onopen = () => {
      // Message 1 : configuration du format de sortie
      ws.send(
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":` +
        `{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},` +
        `"outputFormat":"${OUTPUT_FMT}"}}}}`
      );

      // Message 2 : SSML avec la voix et la vitesse choisies
      const rateStr = rateToPercent(rate);
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'>` +
        `<voice name='${voiceId}'>` +
        `<prosody rate='${rateStr}'>${escapeXml(text)}</prosody>` +
        `</voice></speak>`;
      ws.send(
        `X-RequestId:${reqId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml
      );
    };

    ws.onmessage = ({ data }) => {
      if (typeof data === "string") {
        // Le message "Path:turn.end" signale la fin de la synthèse
        if (data.includes("Path:turn.end")) done();
      } else {
        // Messages binaires : 2 octets (longueur header big-endian) + header JSON + audio MP3
        if (data.byteLength < 2) return;
        const headerLen = new DataView(data).getUint16(0);
        const audioStart = 2 + headerLen;
        if (audioStart < data.byteLength) {
          chunks.push(data.slice(audioStart));
        }
      }
    };

    ws.onerror = () => fail("Edge TTS: erreur WebSocket (vérifier la connexion internet)");
    ws.onclose = () => { if (!settled) fail("Edge TTS: connexion fermée prématurément"); };
  });
}
