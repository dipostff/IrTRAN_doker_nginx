import { computed } from "vue";
import { useBeginnerSimulatorStore } from "@/stores/beginnerSimulatorSettings";
import { useAdvancedSimulatorStore } from "@/stores/advancedSimulatorSettings";

/**
 * Контекст тренажёра: активен после перехода из меню «Новичок»/«Продвинутый»
 * (флаг sessionStorage `irtran-training-profile`), сбрасывается на главном меню.
 */
export function useTrainingSimulatorContext() {
  const beginnerSimulator = useBeginnerSimulatorStore();
  const advancedSimulator = useAdvancedSimulatorStore();

  const trainingContext = computed(() => {
    if (typeof sessionStorage === "undefined") return null;
    const p = sessionStorage.getItem("irtran-training-profile");
    if (p === "beginner") {
      return {
        profile: "beginner",
        theoryAccess: beginnerSimulator.theoryAccess,
        hints: beginnerSimulator.hints,
        extraFieldTips: beginnerSimulator.extraFieldTips,
        errorVisibility: beginnerSimulator.errorVisibility,
        errorChecking: beginnerSimulator.errorChecking,
        timeLimit: false,
        strictDeadlines: false,
      };
    }
    if (p === "advanced") {
      return {
        profile: "advanced",
        theoryAccess: false,
        hints: advancedSimulator.hints,
        extraFieldTips: advancedSimulator.strictDeadlines,
        errorVisibility: advancedSimulator.errorVisibility,
        errorChecking: advancedSimulator.errorChecking,
        timeLimit: advancedSimulator.timeLimit,
        strictDeadlines: advancedSimulator.strictDeadlines,
      };
    }
    return null;
  });

  return { trainingContext };
}
