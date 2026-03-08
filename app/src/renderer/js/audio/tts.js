import { Store } from "../infra/store.js";
import { EDGE_FR_VOICES, synthesizeEdge } from "./tts_edge.js";

function listVoicesSafe() {
  try { return window.speechSynthesis?.getVoices?.() || []; } catch { return []; }
}

function toFileUrl(p) {
  const s = String(p || "");
  if (!s) return "";
  if (/^file:\/\//i.test(s)) return s;
  const norm = s.replace(/\\/g, "/");
  return encodeURI("file:///" + norm.replace(/^\/+/, ""));
}

export class TTS {
  constructor() {
    this.enabled = Store.get("tts.enabled", true);
    this.provider = Store.get("tts.provider", "webspeech");
    this.providerManual = Store.get("tts.providerManual", false);
    this.voiceURI = Store.get("tts.voiceURI", null);
    this.piperVoiceId = Store.get("tts.piperVoiceId", null);
    this.edgeVoiceId = Store.get("tts.edgeVoiceId", "fr-FR-DeniseNeural");
    this.rate = Store.get("tts.rate", 1.0);
    this.volume = Store.get("tts.volume", 1.0);

    this._voices = [];
    this._piperVoices = [];
    this._providers = [{ id: "webspeech", label: "Web Speech (systeme)", available: true }];

    this._onState = () => {};
    this._speakTimer = null;
    this._audio = null;
    this._edgeBlobUrl = null;
    this._lastText = "";
    this._lastAt = 0;
    this._token = 0;
  }

  async init(onStateChanged){
    this._onState = onStateChanged || (()=>{});

    const refreshWebVoices = () => {
      this._voices = listVoicesSafe();
      this._emit();
    };
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshWebVoices;
    }
    refreshWebVoices();

    await this.refreshProviders();
  }

  _emit() {
    this._onState({
      voices: this._voices,
      piperVoices: this._piperVoices,
      edgeVoices: EDGE_FR_VOICES,
      providers: this._providers,
      provider: this.provider
    });
  }

  async refreshProviders() {
    try {
      const list = await window.mm?.narration?.listProviders?.();
      if (Array.isArray(list) && list.length) this._providers = list;
    } catch (_) {}

    // Edge TTS est toujours disponible (internet requis) — on l'ajoute s'il n'est pas déjà là
    if (!this._providers.find(p => p.id === "edge")) {
      this._providers.push({ id: "edge", label: "Edge TTS (en ligne, Neural)", available: true });
    }

    try {
      const voices = await window.mm?.narration?.listPiperVoices?.();
      if (Array.isArray(voices)) this._piperVoices = voices;
      if (!this.piperVoiceId && this._piperVoices.length) {
        this.piperVoiceId = this._piperVoices[0].id;
        Store.set("tts.piperVoiceId", this.piperVoiceId);
      }
    } catch (_) {
      this._piperVoices = [];
    }

    const piperProvider = this._providers.find((p) => p.id === "piper");
    const piperReady = !!piperProvider && (piperProvider.available || this._piperVoices.length > 0);
    if (!this.providerManual && this.provider === "webspeech" && piperReady) {
      this.setProvider("piper", false);
    }

    this._emit();
  }

  setEnabled(v){
    this.enabled = !!v;
    Store.set("tts.enabled", this.enabled);
    if (!this.enabled) this.stop();
  }

  setProvider(id, manual = true) {
    const want = String(id || "webspeech");
    const known = this._providers.find(p => p.id === want);
    this.provider = known ? want : "webspeech";
    if (manual) {
      this.providerManual = true;
      Store.set("tts.providerManual", true);
    }
    Store.set("tts.provider", this.provider);
  }

  setVoiceURI(uri){
    this.voiceURI = uri || null;
    Store.set("tts.voiceURI", this.voiceURI);
  }

  setPiperVoiceId(id){
    this.piperVoiceId = id || null;
    Store.set("tts.piperVoiceId", this.piperVoiceId);
  }

  setEdgeVoiceId(id){
    this.edgeVoiceId = id || "fr-FR-DeniseNeural";
    Store.set("tts.edgeVoiceId", this.edgeVoiceId);
  }

  setRate(rate){
    const r = Math.max(0.5, Math.min(1.5, Number(rate) || 1.0));
    this.rate = r;
    Store.set("tts.rate", this.rate);
  }

  setVolume(vol){
    const v = Math.max(0.0, Math.min(1.0, Number(vol) || 1.0));
    this.volume = v;
    Store.set("tts.volume", this.volume);
  }

  stop(){
    this._token += 1;
    if (this._speakTimer) {
      clearTimeout(this._speakTimer);
      this._speakTimer = null;
    }
    try { window.speechSynthesis?.cancel?.(); } catch(_){}
    try {
      if (this._audio) {
        this._audio.pause();
        this._audio.currentTime = 0;
      }
    } catch (_) {}
    this._audio = null;
    if (this._edgeBlobUrl) {
      URL.revokeObjectURL(this._edgeBlobUrl);
      this._edgeBlobUrl = null;
    }
  }

  estimateSpeakMs(text){
    const t = String(text || "").trim();
    if (!t) return 0;
    const words = t.split(/\s+/).filter(Boolean).length;
    const perWord = this.provider === "piper"
      ? 800 / Math.max(0.5, Number(this.rate) || 1)
      : 650 / Math.max(0.5, Number(this.rate) || 1);
    // Edge TTS : latence réseau + synthèse + lecture (~3000ms de base)
    const base = this.provider === "piper" ? 2600 : (this.provider === "edge" ? 3000 : 2200);
    const ms = base + (words * perWord);
    return Math.max(1800, Math.min(20000, Math.round(ms)));
  }

  _speakWebSpeech(text){
    const t = String(text || "").trim();
    if (!t) return;
    this._speakTimer = setTimeout(() => {
      const u = new SpeechSynthesisUtterance(t);
      u.rate = this.rate;
      u.volume = this.volume;
      const voices = listVoicesSafe();
      if (this.voiceURI) {
        const v = voices.find(vv => vv.voiceURI === this.voiceURI);
        if (v) u.voice = v;
      }
      try { window.speechSynthesis?.speak?.(u); } catch(_){}
      this._speakTimer = null;
    }, 80);
  }

  async _speakPiper(text, tokenAtStart){
    const fn = window.mm?.narration?.piperSpeak;
    if (!fn) {
      this._speakWebSpeech(text);
      return;
    }
    const res = await fn({
      text: String(text || ""),
      voiceId: this.piperVoiceId,
      rate: this.rate
    });
    if (tokenAtStart !== this._token) return;
    if (!res?.ok || !res?.path) {
      console.warn("Piper indisponible:", res?.error || "unknown");
      this.setProvider("webspeech");
      this._speakWebSpeech(text);
      return;
    }
    const audio = new Audio(toFileUrl(res.path));
    audio.volume = this.volume;
    this._audio = audio;
    try {
      await audio.play();
    } catch (e) {
      console.warn("Lecture Piper impossible, fallback WebSpeech:", e?.message || e);
      this.setProvider("webspeech");
      this._speakWebSpeech(text);
    }
  }

  async _speakEdge(text, tokenAtStart){
    let blobUrl = null;
    try {
      blobUrl = await synthesizeEdge({
        text,
        voiceId: this.edgeVoiceId || "fr-FR-DeniseNeural",
        rate: this.rate
      });
    } catch (e) {
      console.warn("Edge TTS échoué, fallback WebSpeech:", e?.message || e);
      if (tokenAtStart === this._token) this._speakWebSpeech(text);
      return;
    }
    if (tokenAtStart !== this._token) {
      URL.revokeObjectURL(blobUrl);
      return;
    }
    const audio = new Audio(blobUrl);
    audio.volume = this.volume;
    this._audio = audio;
    this._edgeBlobUrl = blobUrl;
    audio.onended = () => {
      if (this._edgeBlobUrl === blobUrl) {
        URL.revokeObjectURL(blobUrl);
        this._edgeBlobUrl = null;
      }
    };
    try {
      await audio.play();
    } catch (e) {
      console.warn("Lecture Edge TTS impossible, fallback WebSpeech:", e?.message || e);
      URL.revokeObjectURL(blobUrl);
      this._edgeBlobUrl = null;
      if (tokenAtStart === this._token) this._speakWebSpeech(text);
    }
  }

  speak(text){
    if (!this.enabled) return;
    const t = String(text || "").trim();
    if (!t) return;

    const now = Date.now();
    if (t === this._lastText && (now - this._lastAt) < 700) return;
    this._lastText = t;
    this._lastAt = now;

    this.stop();
    const tokenAtStart = this._token;
    if (this.provider === "piper") {
      this._speakPiper(t, tokenAtStart).catch((e) => {
        console.warn("Erreur Piper:", e?.message || e);
        this.setProvider("webspeech");
        this._speakWebSpeech(t);
      });
      return;
    }
    if (this.provider === "edge") {
      this._speakEdge(t, tokenAtStart).catch((e) => {
        console.warn("Erreur Edge TTS:", e?.message || e);
      });
      return;
    }
    this._speakWebSpeech(t);
  }

  get voices(){ return this._voices; }
  get piperVoices(){ return this._piperVoices; }
  get edgeVoices(){ return EDGE_FR_VOICES; }
  get providers(){ return this._providers; }
}
