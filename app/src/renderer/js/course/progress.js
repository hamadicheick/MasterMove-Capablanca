export function ensureChapterProgress(progress, chapterId){
  if (!progress.chapters) progress.chapters = {};
  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = {
      lastSequenceIndex: 0,
      quizState: {}
    };
  }
  return progress.chapters[chapterId];
}

export function getChapterLastIndex(progress, chapterId){
  try{
    return progress.chapters?.[chapterId]?.lastSequenceIndex ?? 0;
  }catch(_){
    return 0;
  }
}
