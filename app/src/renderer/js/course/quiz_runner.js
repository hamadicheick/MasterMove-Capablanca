// QuizRunner: validates user moves against a scripted list of expected moves.
// Supports:
// - single-step quiz via validation.coups_acceptes
// - multi-step quiz via validation.steps / validation.etapes
// - auto-reply (scripted opponent) after correct move
// - hint after 1 error, solution (auto-play) after 2 errors
// - undo by step (rewind to previous decision point)

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.slice() : [v];
}

function normalizeSteps(validation) {
  const v = validation || {};
  const steps = asArray(v.steps || v.etapes || v.sequence || null);

  if (steps.length) {
    return steps.map((s, i) => {
      const accept = asArray(s.coups_acceptes || s.accept || s.coups || s.moves || s.joueur || null).filter(Boolean);
      const replies = asArray(s.reponse || s.reply || s.reponses || s.opponent || null).filter(Boolean);
      const hint = String(s.indice || s.hint || v.indice || v.feedback_erreur || "");
      const solution = asArray(s.solution || s.solutions || null).filter(Boolean);
      return {
        id: s.id ?? (i + 1),
        accept,
        replies,
        hint,
        solution
      };
    });
  }

  // Backward compatible: one move (or several alternatives)
  const accept = asArray(v.coups_acceptes || v.accept || v.coups || v.moves || null).filter(Boolean);
  return [
    {
      id: 1,
      accept,
      replies: [],
      hint: String(v.indice || v.feedback_erreur || ""),
      solution: []
    }
  ];
}

function moveMatches(accepted, played) {
  if (!accepted) return false;
  const a = String(accepted).trim().toLowerCase();
  const p = String(played).trim().toLowerCase();
  if (!a || !p) return false;
  if (a === p) return true;
  // allow accepting "e7e8" when user plays "e7e8q"
  if (a.length === 4 && p.length >= 4 && p.slice(0,4) === a) return true;
  return false;
}

function firstSolutionMove(step) {
  if (step.solution?.length) return String(step.solution[0]);
  if (step.accept?.length) return String(step.accept[0]);
  return "";
}

export class QuizRunner {
  constructor({ board, toast, onStatusChange } = {}) {
    this.board = board;
    this.toast = toast || (()=>{});
    this.onStatusChange = onStatusChange || (()=>{});

    this.active = false;
    this.seq = null;
    this.steps = [];
    this.stepIndex = 0;
    this.errors = 0;
    this.completed = []; // stack of {plies}
    this.attempts = 0;
    this._timer = null;
    this._busy = false;
  }

  stop() {
    this.active = false;
    this.seq = null;
    this.steps = [];
    this.stepIndex = 0;
    this.errors = 0;
    this.completed = [];
    this.attempts = 0;
    this._busy = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._emit();
  }

  start(seq) {
    this.seq = seq;
    this.steps = normalizeSteps(seq?.validation);
    this.active = true;
    this.stepIndex = 0;
    this.errors = 0;
    this.completed = [];
    this.attempts = 0;
    this._busy = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._emit();
  }

  _emit(extra = {}) {
    const total = this.steps.length || 0;
    const solved = this.active && total > 0 && this.stepIndex >= total;
    const msg = solved
      ? (this.seq?.validation?.feedback_succes || "Bravo !")
      : (this.seq?.validation?.feedback_erreur || "A toi de jouer.");
    this.onStatusChange({
      active: this.active,
      solved,
      stepIndex: this.stepIndex,
      totalSteps: total,
      errors: this.errors,
      attempts: this.attempts,
      message: msg,
      ...extra
    });
  }

  showHint() {
    if (!this.active) return;
    const step = this.steps[this.stepIndex];
    const hint = String(step?.hint || "").trim();
    if (hint) this.toast(hint, 5000);
  }

  undoStep() {
    if (!this.active || !this.board) return false;
    if (this._busy) return false;

    if (this.completed.length) {
      const last = this.completed.pop();
      const plies = Math.max(1, Number(last.plies || 1));
      for (let i=0; i<plies; i++) this.board.undo();
      this.stepIndex = Math.max(0, this.stepIndex - 1);
      this.errors = 0;
      this._emit({ message: "Revenu au coup precedent." });
      return true;
    }

    // If no completed step yet, undo last ply if any
    if (this.board.canUndo?.()) {
      const ok = this.board.undo();
      if (ok) {
        this.errors = 0;
        this._emit({ message: "Coup annule." });
      }
      return ok;
    }
    return false;
  }

  async handleMove({ uci, source } = {}) {
    if (!this.active) return;
    if (this._busy) return;
    if (source !== "user") return;

    this.attempts += 1;

    const step = this.steps[this.stepIndex];
    if (!step) return;

    const ok = (step.accept || []).some(a => moveMatches(a, uci));
    if (!ok) {
      this.errors += 1;
      // revert the user's move immediately
      this.board.undo();

      if (this.errors === 1) {
        const hint = String(step.hint || "").trim();
        if (hint) this.toast(hint, 5000);
        this._emit({ message: hint || (this.seq?.validation?.feedback_erreur || "Essaie encore.") });
        return;
      }

      // After 2 errors: show solution + auto-play it
      const sol = firstSolutionMove(step);
      if (sol) this.toast("Solution: " + sol, 6000);
      this.errors = 0;

      if (sol) {
        this._busy = true;
        // play solution as script so it doesn't re-trigger validation
        this.board.applyUci(sol, { silent:true, source:"script" });
        await this._playReplies(step.replies);
        this._completeStep(step);
        this._busy = false;
      }
      return;
    }

    // Correct move
    this.errors = 0;
    this._busy = true;
    await this._playReplies(step.replies);
    this._completeStep(step);
    this._busy = false;
  }

  _completeStep(step) {
    const replyCount = (step.replies || []).length;
    this.completed.push({ plies: 1 + replyCount });
    this.stepIndex += 1;

    if (this.stepIndex >= this.steps.length) {
      const msg = this.seq?.validation?.feedback_succes || "Bravo !";
      this.toast(msg, 4000);
      this._emit({ solved:true, message: msg });
      return;
    }

    this._emit({ message: "Bien joue. Continue !" });
  }

  _playReplies(replies) {
    const seq = asArray(replies).filter(Boolean);
    if (!seq.length) return Promise.resolve();

    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (i >= seq.length) return resolve();
        const u = String(seq[i++]);
        // small delay for pedagogy
        this._timer = setTimeout(() => {
          this.board.applyUci(u, { silent:true, source:"script" });
          step();
        }, 350);
      };
      step();
    });
  }
}
