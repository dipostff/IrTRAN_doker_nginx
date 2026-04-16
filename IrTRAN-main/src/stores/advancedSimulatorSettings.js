import { defineStore } from "pinia";

const STORAGE_KEY = "irtran-advanced-simulator-settings";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timeLimit: state.timeLimit,
        errorChecking: state.errorChecking,
        errorVisibility: state.errorVisibility,
        hints: state.hints,
        strictDeadlines: state.strictDeadlines,
      })
    );
  } catch {
    /* ignore */
  }
}

export const useAdvancedSimulatorStore = defineStore("advancedSimulator", {
  state: () => {
    const s = loadSaved();
    return {
      timeLimit: s?.timeLimit === true,
      errorChecking: s?.errorChecking !== false,
      errorVisibility: s?.errorVisibility !== false,
      hints: s?.hints !== false,
      /** Строгий контроль сроков (подсказки в модулях) */
      strictDeadlines: s?.strictDeadlines === true,
    };
  },
  actions: {
    applyDraft(draft) {
      this.timeLimit = !!draft.timeLimit;
      this.errorChecking = !!draft.errorChecking;
      this.errorVisibility = !!draft.errorVisibility;
      this.hints = !!draft.hints;
      this.strictDeadlines = !!draft.strictDeadlines;
      persist(this.$state);
    },
    draftFromStore() {
      return {
        timeLimit: this.timeLimit,
        errorChecking: this.errorChecking,
        errorVisibility: this.errorVisibility,
        hints: this.hints,
        strictDeadlines: this.strictDeadlines,
      };
    },
  },
});
