
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mm", {
  profiles: {
    list: () => ipcRenderer.invoke("profiles:list"),
    create: (name) => ipcRenderer.invoke("profiles:create", name),
    delete: (id) => ipcRenderer.invoke("profiles:delete", id),
  },
  progress: {
    load: (profileId) => ipcRenderer.invoke("progress:load", profileId),
    save: (profileId, progress) => ipcRenderer.invoke("progress:save", profileId, progress),
  },
  content: {
    listChapters: () => ipcRenderer.invoke("content:listChapters"),
    listBookChapters: () => ipcRenderer.invoke("content:listBookChapters"),
    loadChapter: (chapterId) => ipcRenderer.invoke("content:loadChapter", chapterId),
    listPieceSets: () => ipcRenderer.invoke("content:listPieceSets"),
    openPieceSetFolder: (rootName, setId) => ipcRenderer.invoke("content:openPieceSetFolder", rootName, setId),
  },
  narration: {
    listProviders: () => ipcRenderer.invoke("narration:listProviders"),
    listPiperVoices: () => ipcRenderer.invoke("narration:piper:listVoices"),
    piperSpeak: (payload) => ipcRenderer.invoke("narration:piper:speak", payload),
  }
});
