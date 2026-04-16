import { defineStore } from "pinia";

const STORAGE_KEY = "irtran-beginner-simulator-settings";

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
        theoryAccess: state.theoryAccess,
        errorChecking: state.errorChecking,
        errorVisibility: state.errorVisibility,
        hints: state.hints,
        extraFieldTips: state.extraFieldTips,
      })
    );
  } catch {
    /* ignore */
  }
}

export const useBeginnerSimulatorStore = defineStore("beginnerSimulator", {
  state: () => {
    const s = loadSaved();
    return {
      theoryAccess: s?.theoryAccess !== false,
      errorChecking: s?.errorChecking !== false,
      errorVisibility: s?.errorVisibility !== false,
      hints: s?.hints !== false,
      /** Доп. пояснения к полям (второй уровень подсказок в модулях) */
      extraFieldTips: s?.extraFieldTips !== false,
    };
  },
  actions: {
    applyDraft(draft) {
      this.theoryAccess = !!draft.theoryAccess;
      this.errorChecking = !!draft.errorChecking;
      this.errorVisibility = !!draft.errorVisibility;
      this.hints = !!draft.hints;
      this.extraFieldTips = !!draft.extraFieldTips;
      persist(this.$state);
    },
    draftFromStore() {
      return {
        theoryAccess: this.theoryAccess,
        errorChecking: this.errorChecking,
        errorVisibility: this.errorVisibility,
        hints: this.hints,
        extraFieldTips: this.extraFieldTips,
      };
    },
  },
});
