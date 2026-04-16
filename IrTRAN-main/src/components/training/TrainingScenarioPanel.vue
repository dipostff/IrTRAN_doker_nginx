<script setup>
import { computed, unref, watch, onUnmounted, onMounted, ref } from "vue";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import { useTrainingScenarioSteps } from "@/composables/useTrainingScenarioSteps";
import { TRAINING_TAB_BUTTON_IDS } from "@/config/trainingScenarioSteps";
import {
  saveLocalScenarioProgress,
  migrateLocalScenarioDraftToId,
} from "@/helpers/trainingScenarioPersistence";
import { postTrainingScenarioProgress } from "@/helpers/API";

const COLLAPSE_KEY = "irtran-training-dock-collapsed";

const props = defineProps({
  docType: { type: String, required: true },
  document: { type: Object, required: true },
});

const { trainingContext } = useTrainingSimulatorContext();
const documentForSteps = computed(() => unref(props.document));
const { stepsWithStatus, scenarioTitle, progressLabel, hints } = useTrainingScenarioSteps(
  props.docType,
  documentForSteps
);

function readCollapsed() {
  try {
    return sessionStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(v) {
  try {
    sessionStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Свернуто: компактная вкладка справа; состояние в sessionStorage */
const collapsed = ref(
  typeof sessionStorage !== "undefined" ? readCollapsed() : false
);

onMounted(() => {
  syncBodyPadding();
});

const tabMap = computed(() => TRAINING_TAB_BUTTON_IDS[props.docType] || {});

function tabButtonIdForStep(s) {
  const id = tabMap.value[s.tab];
  return id || null;
}

function goToTab(s) {
  const bid = tabButtonIdForStep(s);
  if (bid && typeof window !== "undefined") {
    window.document.getElementById(bid)?.click();
  }
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  writeCollapsed(collapsed.value);
  syncBodyPadding();
}

function syncBodyPadding() {
  if (typeof document === "undefined") return;
  const open = !!trainingContext.value && !collapsed.value;
  document.body.classList.toggle("training-scenario-dock-expanded", open);
}

watch(trainingContext, () => syncBodyPadding(), { flush: "post" });
watch(collapsed, () => syncBodyPadding(), { flush: "post" });

let syncTimer = null;

function flushProgress(list) {
  const doc = unref(props.document);
  const docRef = doc?.id != null && doc.id !== "" ? String(doc.id) : "draft";
  const doneIds = list.filter((x) => x.done).map((x) => x.id);
  saveLocalScenarioProgress(props.docType, docRef, {
    doneIds,
    doneCount: doneIds.length,
    totalCount: list.length,
  });
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    postTrainingScenarioProgress({
      docType: props.docType,
      docRef,
      doneCount: doneIds.length,
      totalCount: list.length,
      doneStepIds: doneIds,
    }).catch(() => {});
  }, 2000);
}

watch(
  stepsWithStatus,
  (list) => {
    if (!trainingContext.value) return;
    flushProgress(list);
  },
  { deep: true }
);

watch(
  () => unref(props.document)?.id,
  (newId, oldId) => {
    if (!trainingContext.value) return;
    if (newId != null && newId !== "" && (oldId == null || oldId === "")) {
      migrateLocalScenarioDraftToId(props.docType, newId);
    }
  }
);

onUnmounted(() => {
  clearTimeout(syncTimer);
  if (typeof document !== "undefined") {
    document.body.classList.remove("training-scenario-dock-expanded");
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="trainingContext" class="training-dock-root">
      <!-- Свернутая вкладка -->
      <button
        v-if="collapsed"
        type="button"
        class="training-dock-tab"
        title="Развернуть учебный сценарий"
        @click="toggleCollapsed"
      >
        <span class="training-dock-tab__label">Сценарий</span>
        <span class="training-dock-tab__badge">{{ progressLabel }}</span>
      </button>

      <!-- Развёрнутая панель -->
      <div v-else class="training-dock-panel">
        <div class="training-dock-panel__toolbar">
          <span class="training-dock-panel__title text-truncate">Сценарий: {{ scenarioTitle }}</span>
          <span class="badge bg-primary flex-shrink-0">{{ progressLabel }}</span>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary flex-shrink-0"
            title="Свернуть панель (форма на весь экран)"
            @click="toggleCollapsed"
          >
            Свернуть
          </button>
        </div>

        <div class="training-dock-panel__scroll">
          <div v-if="trainingContext.timeLimit" class="alert alert-warning py-1 px-2 mb-2 small">
            Режим «Продвинутый»: ограничение по времени — следите за сроками.
          </div>
          <div v-if="trainingContext.strictDeadlines" class="alert alert-secondary py-1 px-2 mb-2 small">
            Строгий контроль сроков — сверяйте даты с заданием.
          </div>
          <div v-if="trainingContext.theoryAccess" class="mb-2">
            <router-link class="btn btn-outline-primary btn-sm me-1 mb-1" to="/beginner-instructions/menu">
              Скринкасты «Новичок»
            </router-link>
            <router-link class="btn btn-outline-secondary btn-sm mb-1" to="/beginner-instructions/filling-rules">
              Правила заполнения
            </router-link>
          </div>
          <div v-if="trainingContext.hints && hints.primary" class="alert alert-info py-2 px-3 mb-2 small">
            {{ hints.primary }}
          </div>
          <div
            v-if="trainingContext.hints && trainingContext.extraFieldTips && hints.extra"
            class="alert alert-light border py-2 px-3 mb-2 small text-muted"
          >
            {{ hints.extra }}
          </div>

          <div v-if="stepsWithStatus.length" class="card border-primary mb-0">
            <div class="card-header py-2 small fw-semibold">Шаги</div>
            <ul class="list-group list-group-flush small">
              <li
                v-for="s in stepsWithStatus"
                :key="s.id"
                class="list-group-item py-2 training-step-row"
                :class="{ 'list-group-item-success': s.done }"
              >
                <div class="d-flex align-items-start gap-2 w-100">
                  <span class="flex-shrink-0" aria-hidden="true">{{ s.done ? "✓" : "○" }}</span>
                  <span class="flex-grow-1">{{ s.label }}</span>
                  <button
                    v-if="tabButtonIdForStep(s)"
                    type="button"
                    class="btn btn-outline-secondary btn-sm flex-shrink-0 py-0 px-2"
                    @click="goToTab(s)"
                  >
                    К вкладке
                  </button>
                </div>
              </li>
            </ul>
            <div class="card-footer py-1 text-muted small">
              Прогресс в браузере и на сервере (для отчёта преподавателя).
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.training-dock-root {
  position: fixed;
  z-index: 1040;
  top: 56px;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
}

.training-dock-tab,
.training-dock-panel {
  pointer-events: auto;
}

.training-dock-tab {
  align-self: flex-start;
  margin-top: 12px;
  width: 44px;
  min-height: 120px;
  padding: 10px 6px;
  border: 1px solid var(--bs-primary, #0d6efd);
  border-right: none;
  border-radius: 8px 0 0 8px;
  background: #f8f9ff;
  box-shadow: -2px 2px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #1a1a1a;
  font-size: 12px;
  font-weight: 600;
}

.training-dock-tab:hover {
  background: #e8edff;
}

.training-dock-tab__label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.training-dock-tab__badge {
  writing-mode: horizontal-tb;
  background: var(--bs-primary, #0d6efd);
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
}

.training-dock-panel {
  width: min(400px, calc(100vw - 12px));
  max-height: calc(100vh - 56px);
  margin: 8px 8px 8px 0;
  background: #fff;
  border: 1px solid var(--bs-primary, #0d6efd);
  border-radius: 10px 0 0 10px;
  box-shadow: -4px 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.training-dock-panel__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(180deg, #eef3ff 0%, #e2e9fb 100%);
  border-bottom: 1px solid #c5d4f0;
  flex-shrink: 0;
}

.training-dock-panel__title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 13px;
}

.training-dock-panel__scroll {
  overflow-y: auto;
  padding: 10px 12px 14px;
  flex: 1;
  min-height: 0;
}

.training-step-row {
  border-left: 3px solid transparent;
}

.training-step-row.list-group-item-success {
  border-left-color: var(--bs-success, #198754);
}

@media (max-width: 575px) {
  .training-dock-panel {
    width: calc(100vw - 8px);
    margin-right: 4px;
    border-radius: 10px;
  }
}
</style>

<style>
/* глобально: форма не уходит под фиксированную панель на широких экранах */
@media (min-width: 992px) {
  body.training-scenario-dock-expanded {
    padding-right: min(408px, 36vw);
    box-sizing: border-box;
  }
}
</style>
