import { computed, unref } from "vue";
import { TRAINING_SCENARIOS } from "@/config/trainingScenarioSteps";

/**
 * @param {string} docType — ключ из TRAINING_SCENARIOS
 * @param {import('vue').Ref|import('vue').ComputedRef|object} documentRef — ref на объект документа
 */
export function useTrainingScenarioSteps(docType, documentRef) {
  const scenario = TRAINING_SCENARIOS[docType] || null;

  const stepsWithStatus = computed(() => {
    if (!scenario?.steps?.length) return [];
    const doc = unref(documentRef);
    return scenario.steps.map((s) => ({
      id: s.id,
      label: s.label,
      tab: s.tab || "document",
      done: typeof s.check === "function" ? !!s.check(doc) : false,
    }));
  });

  const scenarioTitle = computed(() => scenario?.title ?? "");

  const hints = computed(() => scenario?.hints ?? { primary: "", extra: "" });

  const progressLabel = computed(() => {
    const list = stepsWithStatus.value;
    if (!list.length) return "";
    const n = list.filter((x) => x.done).length;
    return `${n} / ${list.length}`;
  });

  return { stepsWithStatus, scenarioTitle, progressLabel, hints };
}
