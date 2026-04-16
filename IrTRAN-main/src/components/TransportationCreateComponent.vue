<script setup>
import { onMounted, ref, watch, computed } from "vue";
import {
    saveTransporation,
    deleteTransporation,
    getTransportation,
    getCargoConstraints,
    saveSubmissionSchedule,
    saveSendNumber
} from "@/helpers/API";
import { updateTitle } from "@/helpers/headerHelper";
import router from "@/router";
import { useRoute } from "vue-router";
import { Transporation } from "@/models/transporation";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import SendingCompanent from "@/components/SendingCompanent.vue";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";

const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();

const route = useRoute();
const document = ref(Transporation.getDefaultDocument());
const selectedPayerId = ref(null);
const saveError = ref(null);
const selectedSendingIds = ref([]);
const selectedSubmissionScheduleIds = ref([]);
const selectedPayerIds = ref([]);
const activeSendingId = ref(null);
const sendingResetNonce = ref(0);
const selectedSubmissionSendNumberId = ref(null);
const isSubmissionModalOpen = ref(false);
const isPayerModalOpen = ref(false);
const submissionDraft = ref({
    id: null,
    submission_date: "",
    weight: "",
    count_wagon: ""
});

// Допустимые группы грузов по узлу/станции (когда в БД настроены ограничения)
const cargoConstraints = ref({
  hasGroupRestrictions: false,
  cargoGroupIds: []
});

const filteredCargoGroups = computed(() => {
  const groups = listsStore.cargo_groups || {};
  if (!cargoConstraints.value?.hasGroupRestrictions) return groups;
  const allowed = new Set((cargoConstraints.value.cargoGroupIds || []).map((x) => Number(x)));
  const out = {};
  for (const [id, item] of Object.entries(groups)) {
    if (allowed.has(Number(id))) out[id] = item;
  }
  return out;
});

const watchedComputed = computed(() => Object.assign({}, document.value));

// Первая отправка из заявки (для секции «Провозная плата»)
const firstSending = computed(() => {
    const ids = document.value?.Sendings;
    if (!Array.isArray(ids) || ids.length === 0) return null;
    return listsStore.sendings[ids[0]] ?? null;
});

const firstSendingDestinationStationName = computed(() => {
    const s = firstSending.value;
    return s && listsStore.stations[s.id_station_destination]?.name ? listsStore.stations[s.id_station_destination].name : "—";
});

const firstSendingCargoName = computed(() => {
    const s = firstSending.value;
    return s && listsStore.cargos[s.id_cargo]?.name ? listsStore.cargos[s.id_cargo].name : "—";
});

// Сумма вагонов по всем отправкам
const totalWagonsCount = computed(() => {
    const ids = document.value?.Sendings;
    if (!Array.isArray(ids)) return "—";
    const sendings = listsStore.sendings || {};
    const total = ids.reduce((sum, id) => {
        const s = sendings[id];
        return sum + (Number(s?.count_wagon) || 0);
    }, 0);
    return total || "—";
});

// Средняя загрузка вагона (тонн): по группе груза или 60 как норма
const avgLoadPerWagon = computed(() => {
    const g = listsStore.cargo_groups[document.value?.id_cargo_group];
    if (g && (g.min_load || g.max_load)) {
        const min = Number(g.min_load) || 0;
        const max = Number(g.max_load) || 0;
        return min && max ? `${min}–${max}` : (max || min || "—");
    }
    return "60";
});

// Расчёт провозной платы (упрощённый учебный): сумма по отправкам (вагоны × условная загрузка × тариф)
const freightCostFormatted = computed(() => {
    const ids = document.value?.Sendings;
    if (!Array.isArray(ids) || ids.length === 0) return "—";
    const distanceKm = Number(actualDistanceKm.value) || 500;
    const ratePerTonKm = 0.5; // условный тариф руб/(т·км) для обучения
    let total = 0;
    const sendings = listsStore.sendings || {};
    for (const id of ids) {
        const s = sendings[id];
        if (!s) continue;
        const wagons = Number(s.count_wagon) || 0;
        const weight = Number(s.weight) || wagons * 60; // тонн
        total += weight * distanceKm * ratePerTonKm;
    }
    return total ? total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "—";
});

function normalizeIdList(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            if (item == null) return null;
            if (typeof item === "object" && item.id != null) return Number(item.id);
            const n = Number(item);
            return Number.isFinite(n) ? n : null;
        })
        .filter((id) => id != null);
}

function normalizeEntityId(value) {
    if (value == null || value === "") return null;
    if (typeof value === "object" && value.id != null) {
        const n = Number(value.id);
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeDocument(data) {
    const base = Transporation.getDefaultDocument();
    const merged = Object.assign({}, base, data || {});
    merged.Sendings = normalizeIdList(merged.Sendings);
    merged.SubmissionSchedules = normalizeIdList(merged.SubmissionSchedules);
    merged.Payers = normalizeIdList(merged.Payers);
    return merged;
}

const sendingRows = computed(() => {
    const ids = Array.isArray(document.value?.Sendings) ? document.value.Sendings : [];
    return ids.map((id) => listsStore.sendings?.[id]).filter(Boolean);
});

const submissionScheduleRows = computed(() => {
    const ids = Array.isArray(document.value?.SubmissionSchedules) ? document.value.SubmissionSchedules : [];
    return ids.map((id) => listsStore.submission_schedules?.[id]).filter(Boolean);
});

const submissionSendNumberOptions = computed(() => {
    const fromDictionary = Object.values(listsStore.send_numbers || {}).map((row) => ({
        id: Number(row.id),
        name: row.name || `№${row.id}`,
        source: "dictionary"
    }));
    if (fromDictionary.length > 0) return fromDictionary;
    return sendingRows.value.map((row) => ({
        id: Number(row.id),
        name: row.id ? `Отправка №${row.id}` : "Отправка",
        source: "sending"
    }));
});

const payerRows = computed(() => {
    const ids = Array.isArray(document.value?.Payers) ? document.value.Payers : [];
    return ids.map((id) => listsStore.payers?.[id]).filter(Boolean);
});

const selectedPayerRow = computed(() => {
    const id = normalizeEntityId(selectedPayerId.value);
    if (!id) return null;
    return listsStore.payers?.[id] || null;
});

const totalSubmissionWagons = computed(() =>
    submissionScheduleRows.value.reduce((sum, row) => sum + (Number(row?.count_wagon) || 0), 0)
);

const totalSubmissionWeight = computed(() =>
    submissionScheduleRows.value.reduce((sum, row) => sum + (Number(row?.weight) || 0), 0)
);

const totalSendingWeight = computed(() =>
    sendingRows.value.reduce((sum, s) => sum + (Number(s?.weight) || 0), 0)
);

const staticLoadText = computed(() => {
    const wagons = sendingRows.value.reduce((sum, s) => sum + (Number(s?.count_wagon) || 0), 0);
    const weight = totalSendingWeight.value;
    if (!wagons || !weight) return "—";
    const avg = (weight / wagons).toFixed(1);
    return `${avg} т/ваг (${weight} т, ${wagons} ваг.)`;
});

const bankDetailsText = computed(() => {
    const payer = payerRows.value[0];
    if (payer) {
        const okpo = payer.OKPO ? `ОКПО ${payer.OKPO}` : null;
        const addr = payer.addr || null;
        return [okpo, addr].filter(Boolean).join(", ") || payer.name || "—";
    }
    const shipper = listsStore.legal_entities?.[document.value?.id_shipper];
    if (!shipper) return "—";
    return [shipper.OKPO ? `ОКПО ${shipper.OKPO}` : null, shipper.INN ? `ИНН ${shipper.INN}` : null]
        .filter(Boolean)
        .join(", ") || "—";
});

const actualDistanceKm = computed(() => {
    const explicit = Number(document.value?.freight_distance_km);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const fromCode = Number(listsStore.stations?.[document.value?.id_station_departure]?.code);
    const toCode = Number(listsStore.stations?.[firstSending.value?.id_station_destination]?.code);
    if (Number.isFinite(fromCode) && Number.isFinite(toCode)) {
        const pseudo = Math.max(1, Math.round(Math.abs(toCode - fromCode) / 10));
        return pseudo;
    }
    return null;
});

async function saveDocument() {
    saveError.value = null;
    if (trainingContext.value?.errorChecking) {
        const msg = Transporation.getBlockingMessage(document.value);
        if (msg) {
            saveError.value = msg;
            return;
        }
    }
    try {
        const payload = {
            ...document.value,
            Sendings: normalizeIdList(document.value.Sendings),
            SubmissionSchedules: normalizeIdList(document.value.SubmissionSchedules),
            Payers: (() => {
                const ids = normalizeIdList(document.value.Payers);
                if (ids.length > 0) return ids;
                const selected = normalizeEntityId(selectedPayerId.value);
                return selected ? [selected] : [];
            })()
        };
        let saveDoc = await saveTransporation(payload);
        if (!saveDoc || saveDoc.error || !saveDoc.id) {
            saveError.value = saveDoc?.message || "Не удалось сохранить заявку. Проверьте заполненные данные.";
            return;
        }
        document.value = normalizeDocument(saveDoc);
    updateTitle("Заявка на перевозку №" + document.value.id);
        router.push("/transporation/create/" + document.value.id);
    } catch (error) {
        console.error(error);
        saveError.value = error.message || "Произошла ошибка при сохранении.";
    }
}

function copyDocument() {
    document.value.id = null;
    saveDocument();
}

function signDocument() {
    Transporation.subscribe(document.value);
    saveDocument();
}

function deleteDocument() {
    deleteTransporation(document.value);
    router.push("/menu");
}

function updateSending(sendingValue) {
    const id = sendingValue && typeof sendingValue === "object"
        ? Number(sendingValue.id)
        : Number(sendingValue);
    if (!Number.isFinite(id)) return;
    if (sendingValue && typeof sendingValue === "object") {
        listsStore.sendings[id] = sendingValue;
    }
    if (!Array.isArray(document.value.Sendings)) {
        document.value.Sendings = [];
    }
    if (!document.value.Sendings.includes(id)) {
        document.value.Sendings.push(id);
    }
    selectedSendingIds.value = [];
}

function startCreateSending() {
    activeSendingId.value = null;
    sendingResetNonce.value += 1;
}

function startEditSending() {
    if ((selectedSendingIds.value || []).length !== 1) {
        saveError.value = "Для изменения отправки выберите ровно одну строку.";
        return;
    }
    const id = Number(selectedSendingIds.value?.[0]);
    if (!Number.isFinite(id)) return;
    activeSendingId.value = id;
}

function removeSelectedSendings() {
    if (!selectedSendingIds.value || selectedSendingIds.value.length === 0) {
        saveError.value = "Для удаления отправок выберите хотя бы одну строку.";
        return;
    }
    const selected = new Set((selectedSendingIds.value || []).map((x) => Number(x)));
    document.value.Sendings = (document.value.Sendings || []).filter((id) => !selected.has(Number(id)));
    selectedSendingIds.value = [];
}

function applySelectedPayer() {
    const id = normalizeEntityId(selectedPayerId.value);
    if (!id) {
        saveError.value = "Выберите плательщика/экспедитора.";
        return false;
    }
    if (!listsStore.payers?.[id]) {
        saveError.value = "Выбранный плательщик не найден в справочнике.";
        return false;
    }
    if (!Array.isArray(document.value.Payers)) {
        document.value.Payers = [];
    }
    if (document.value.Payers.some((x) => Number(x) === Number(id))) {
        saveError.value = "Этот плательщик уже добавлен.";
        return false;
    }
    document.value.Payers.push(id);
    selectedPayerId.value = id;
    selectedPayerIds.value = [];
    return true;
}

function closeModalSafely(modalId) {
    if (modalId === "staticGraficPodach") {
        isSubmissionModalOpen.value = false;
    }
    if (modalId === "staticPlatelshic") {
        isPayerModalOpen.value = false;
    }
    try {
        const dom = window.document;
        if (dom.activeElement && typeof dom.activeElement.blur === "function") {
            dom.activeElement.blur();
        }
        const modalEl = dom.getElementById(modalId);
        if (!modalEl) return;
        const bs = window.bootstrap;
        const jq = window.jQuery || window.$;

        if (bs?.Modal) {
            const instance = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
            instance.hide();
            window.setTimeout(() => {
                try {
                    const still = bs.Modal.getInstance(modalEl);
                    still?.dispose?.();
                } catch (_) {
                    // noop
                }
            }, 220);
        }
        if (jq && typeof jq(modalEl).modal === "function") {
            jq(modalEl).modal("hide");
            try {
                jq(modalEl).off("shown.bs.modal hidden.bs.modal");
            } catch (_) {
                // noop
            }
        }

        // Финальный fallback: принудительно чистим состояние модалки.
        const forceCleanup = () => {
            modalEl.classList.remove("show", "in");
            modalEl.style.display = "none";
            modalEl.setAttribute("aria-hidden", "true");
            modalEl.removeAttribute("aria-modal");
            dom.body.classList.remove("modal-open");
            dom.body.style.removeProperty("padding-right");
            dom.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
        };

        // Запускаем сразу и повторно после тикa/анимации.
        forceCleanup();
        window.requestAnimationFrame(forceCleanup);
        window.setTimeout(forceCleanup, 200);
    } catch (_) {
        // noop
    }
}

function openModalSafely(modalId) {
    const dom = window.document;
    const modalEl = dom.getElementById(modalId);
    if (!modalEl) return;
    const bs = window.bootstrap;
    const jq = window.jQuery || window.$;
    let opened = false;

    // Стратегия 1: Bootstrap 5 API.
    try {
        if (bs?.Modal) {
            const instance = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
            instance.show();
            opened = true;
        }
    } catch (_) {
        opened = false;
    }

    // Стратегия 2: Bootstrap 4 jQuery API.
    if (!opened) {
        try {
            if (jq && typeof jq(modalEl).modal === "function") {
                jq(modalEl).modal("show");
                opened = true;
            }
        } catch (_) {
            opened = false;
        }
    }

    // Стратегия 3: принудительный fallback (гарантия отображения).
    if (!opened) {
        try {
            modalEl.classList.add("show", "in");
            modalEl.style.display = "block";
            modalEl.setAttribute("aria-modal", "true");
            modalEl.setAttribute("role", "dialog");
            modalEl.removeAttribute("aria-hidden");
            dom.body.classList.add("modal-open");
            if (!dom.querySelector(".modal-backdrop")) {
                const backdrop = dom.createElement("div");
                backdrop.className = "modal-backdrop fade show";
                dom.body.appendChild(backdrop);
            }
        } catch (_) {
            // noop
        }
    }
}

function openSubmissionScheduleModalForCreate() {
    submissionDraft.value = { id: null, submission_date: "", weight: "", count_wagon: "" };
    selectedSubmissionSendNumberId.value = null;
    saveError.value = null;
    isSubmissionModalOpen.value = true;
}

function openSubmissionScheduleModalForEdit() {
    startEditSubmissionSchedule();
    if (!saveError.value) isSubmissionModalOpen.value = true;
}

function openPayerModalForCreate() {
    saveError.value = null;
    selectedPayerId.value = null;
    isPayerModalOpen.value = true;
}

function openPayerModalForEdit() {
    startEditPayer();
    if (!saveError.value) isPayerModalOpen.value = true;
}

function applySelectedPayerAndClose() {
    saveError.value = null;
    const ok = applySelectedPayer();
    if (ok) closeModalSafely("staticPlatelshic");
}

function startEditPayer() {
    if ((selectedPayerIds.value || []).length !== 1) {
        saveError.value = "Для изменения плательщика выберите ровно одну строку.";
        return;
    }
    const id = Number(selectedPayerIds.value?.[0]);
    if (!Number.isFinite(id)) return;
    selectedPayerId.value = id;
}

function removeSelectedPayers() {
    if (!selectedPayerIds.value || selectedPayerIds.value.length === 0) {
        saveError.value = "Для удаления плательщиков выберите хотя бы одну строку.";
        return;
    }
    const selected = new Set((selectedPayerIds.value || []).map((x) => Number(x)));
    document.value.Payers = (document.value.Payers || []).filter((id) => !selected.has(Number(id)));
    selectedPayerIds.value = [];
}

async function applySubmissionSchedule() {
    saveError.value = null;
    const selectedSendNumberId = selectedSubmissionSendNumberId.value ? Number(selectedSubmissionSendNumberId.value) : null;
    if (!selectedSendNumberId) {
        saveError.value = "Выберите номер отправки для графика подачи.";
        return;
    }
    const selectedOption = submissionSendNumberOptions.value.find((item) => Number(item.id) === selectedSendNumberId);
    if (!selectedOption) {
        saveError.value = "Выбранный номер отправки отсутствует в справочнике.";
        return;
    }
    let sendNumberIdForSave = selectedSendNumberId;
    if (selectedOption.source === "sending") {
        const created = await saveSendNumber({ name: selectedOption.name });
        if (!created || created.error || created.id == null) {
            saveError.value = created?.message || "Не удалось создать номер отправки для графика.";
            return;
        }
        sendNumberIdForSave = Number(created.id);
        listsStore.send_numbers[sendNumberIdForSave] = created;
    }
    const payload = {
        id: submissionDraft.value.id || undefined,
        id_send_number: sendNumberIdForSave,
        submission_date: submissionDraft.value.submission_date || null,
        weight: submissionDraft.value.weight !== "" ? Number(submissionDraft.value.weight) : null,
        count_wagon: submissionDraft.value.count_wagon !== "" ? Number(submissionDraft.value.count_wagon) : null
    };
    const created = await saveSubmissionSchedule(payload);
    if (!created || created.error || created.id == null) {
        saveError.value = created?.message || "Не удалось сохранить график подачи.";
        return;
    }
    const id = Number(created.id);
    listsStore.submission_schedules[id] = created;
    if (!Array.isArray(document.value.SubmissionSchedules)) {
        document.value.SubmissionSchedules = [];
    }
    if (!document.value.SubmissionSchedules.includes(id)) {
        document.value.SubmissionSchedules.push(id);
    }
    submissionDraft.value = { id: null, submission_date: "", weight: "", count_wagon: "" };
    selectedSubmissionSendNumberId.value = null;
    selectedSubmissionScheduleIds.value = [];
}

async function applySubmissionScheduleAndClose() {
    await applySubmissionSchedule();
    if (!saveError.value) closeModalSafely("staticGraficPodach");
}

function startEditSubmissionSchedule() {
    if ((selectedSubmissionScheduleIds.value || []).length !== 1) {
        saveError.value = "Для изменения графика подачи выберите ровно одну строку.";
        return;
    }
    const id = Number(selectedSubmissionScheduleIds.value?.[0]);
    if (!Number.isFinite(id)) return;
    const row = listsStore.submission_schedules?.[id];
    if (!row) return;
    submissionDraft.value = {
        id: row.id,
        submission_date: row.submission_date ? String(row.submission_date).slice(0, 10) : "",
        weight: row.weight ?? "",
        count_wagon: row.count_wagon ?? ""
    };
    selectedSubmissionSendNumberId.value = row.id_send_number ?? null;
}

function removeSelectedSubmissionSchedules() {
    if (!selectedSubmissionScheduleIds.value || selectedSubmissionScheduleIds.value.length === 0) {
        saveError.value = "Для удаления графиков подачи выберите хотя бы одну строку.";
        return;
    }
    const selected = new Set((selectedSubmissionScheduleIds.value || []).map((x) => Number(x)));
    document.value.SubmissionSchedules = (document.value.SubmissionSchedules || []).filter(
        (id) => !selected.has(Number(id))
    );
    selectedSubmissionScheduleIds.value = [];
}

async function fetchData() {
    if (route.params.id) {
        const response = await getTransportation(route.params.id);
        if (!response || response.error) {
            saveError.value = response?.message || "Не удалось загрузить заявку.";
            document.value = normalizeDocument();
            return;
        }
        document.value = normalizeDocument(response);
        if (Array.isArray(document.value.Payers) && document.value.Payers.length > 0) {
            selectedPayerId.value = document.value.Payers[0];
        } else {
            selectedPayerId.value = null;
        }
        updateTitle("Заявка на перевозку №" + (document.value.id ?? "")); 
    } else {
        document.value = normalizeDocument();
        updateTitle("Заявка на перевозку (Новый документ)");
        selectedPayerId.value = null;
    }
}

onMounted(async () => {
    try {
        await Transporation.loadEssentialLists();
        void Transporation.loadExtendedLists();
    } catch (e) {
        console.error("Ошибка загрузки справочников:", e);
    }
    fetchData();
});

watch(
  () => document.value?.id_station_departure,
  async (newStationId) => {
    try {
      if (!newStationId) {
        cargoConstraints.value = {
          hasGroupRestrictions: false,
          cargoGroupIds: []
        };
        return;
      }
      const c = await getCargoConstraints({ stationId: newStationId });
      cargoConstraints.value = {
        hasGroupRestrictions: !!c?.hasGroupRestrictions,
        cargoGroupIds: Array.isArray(c?.cargoGroupIds) ? c.cargoGroupIds : []
      };

      if (
        cargoConstraints.value.hasGroupRestrictions &&
        document.value?.id_cargo_group != null
      ) {
        const allowed = new Set(cargoConstraints.value.cargoGroupIds);
        if (!allowed.has(Number(document.value.id_cargo_group))) {
          document.value.id_cargo_group = null;
        }
      }
    } catch (e) {
      console.error('Failed to sync cargo constraints:', e);
    }
  },
  { immediate: true }
);

watch(
    watchedComputed,
    async (newVal, oldVal) => {
        Transporation.checkAutoFilledFields(newVal, oldVal);
        const tc = trainingContext.value;
        const runRequiredCheck = !tc || tc.errorChecking;
        if (runRequiredCheck) {
            Transporation.checkRequiredFields(newVal);
        }

        if (newVal.update) {
            delete newVal.update;
            document.value = Object.assign({}, newVal);
        }
    },
    { deep: true }
);
</script>

<template>
    <div class="search-box">
        <div class="row">
            <div class="col-auto">
                <simple-button @click="saveDocument" title="Сохранить"/>
                <simple-button  @click="copyDocument" v-if="document.id" title="Копировать"/>
                <simple-button @click="signDocument" v-if="document.id" title="Подписать" />
                <simple-button @click="deleteDocument" v-if="document.id" title="Испортить" />
            </div>
        </div>
        <div
            class="row mt-2"
            v-if="saveError && (!trainingContext || trainingContext.errorVisibility)"
        >
            <div class="col-auto">
                <div
                    class="alert alert-danger py-1 px-2 mb-0"
                    role="button"
                    tabindex="0"
                    style="cursor: pointer"
                    title="Скрыть сообщение"
                    @click="saveError = null"
                    @keydown.enter.prevent="saveError = null"
                    @keydown.space.prevent="saveError = null"
                >{{ saveError }}</div>
            </div>
        </div>
        <TrainingScenarioPanel doc-type="transportation" :document="document" />
    </div>
    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="home-tab" data-toggle="tab" data-target="#home-tab-pane" type="button" role="tab" aria-controls="home-tab-pane" aria-selected="true">Документ</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="profile-tab" data-toggle="tab" data-target="#profile-tab-pane" type="button" role="tab" aria-controls="profile-tab-pane" aria-selected="false">Учетная карточка</button>
            </li>
             <li class="nav-item" role="presentation">
                <button class="nav-link" id="profile-1-tab" data-toggle="tab" data-target="#profile-1-tab-pane" type="button" role="tab" aria-controls="profile-1-tab-pane" aria-selected="false">Провозная плата</button>
            </li>
        </ul>
        <div class="tab-content" id="myTabContent">
            <div class="tab-pane fade show active" style="margin-top: 1em" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabindex="0">
                <div class="row mb-1">
                    <disable-simple-input title="Тип документа" :dis="true" :value="listsStore.document_types[document.id_document_type]?.name" :req="true" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Дата регистрации" type="date" v-model="document.registration_date" :req="true" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Период перевозок с" type="date" v-model="document.transportation_date_from" :req="true" />
                    <simple-input title="по" type="date" v-model="document.transportation_date_to" :req="true" :fixWidth="false" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Вид сообщения" :values="listsStore.message_types" valueKey="id" name="name" v-model="document.id_message_type" :req="true" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Признак отправки" :values="listsStore.signs_sending" valueKey="id" name="name" v-model="document.id_sign_sending" :req="true" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Страна отправления" :values="listsStore.countries" valueKey="id" name="name" v-model="document.id_country_departure" :req="true" modalName="CountryDeparture" :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование страны': 'name', 'Краткое наименование': 'short_name' }" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Станция отправления/входа в СНГ" :values="listsStore.stations" valueKey="id" name="name" v-model="document.id_station_departure" :req="true" modalName="StationDeparture" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', 'Параграфы': 'paragraph' }" />
                    <disable-simple-input title="Код дороги" :dis="true" :value="listsStore.stations[document.id_station_departure]?.railway" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="Код станции" :dis="true" :value="listsStore.stations[document.id_station_departure]?.code" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="Параграфы" :dis="true" :value="listsStore.stations[document.id_station_departure]?.paragraph" :fixWidth="false" styleInput="width: auto" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Грузоотправитель" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_shipper" :req="true" modalName="Shipper" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование грузоотправителя': 'name', 'ИД бизнеса': 'id_business', 'ИД холдинга': 'id_holding', 'Наименование холдинга': 'name_holding' }" />
                    <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.OKPO" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="Код ТГНЛ" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.TGNL_code" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="ИНН" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.INN" :fixWidth="false" styleInput="width: auto" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Среди организаций при станции отправления" type="checkbox" v-model="document.is_departure_station" styleLabel="width: auto;" styleInput="width: 20px; height: 20px;"/>
                </div>

                <div class="row mb-1">
                    <disable-simple-input title="Наименование организации грузоотправителя" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.name" styleInput="width: 500px" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Адрес" v-model="document.addr" styleInput="width: 500px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Принадлежность вагонов/контейнеров" :values="listsStore.ownerships" valueKey="id" name="name" v-model="document.id_carriage_ownership" :req="true" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Номер договора" v-model="document.contract_number" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Владелец жд. пути необщего пользования" :values="listsStore.owners_non_public_railway" valueKey="id" name="name" v-model="document.id_owner_non_public_railway" modalName="OwnerNonPublicRailway" :fields="{ 'Код ОКПО': 'code', 'Наименование владельца пути': 'name' }" />
                </div>

                <!-- Появляются при выборе владельца жд пути необщ пользования -->
                <div class="row mb-1" v-if="document.contract_number && document.id_owner_non_public_railway">
                    <simple-select
                        title="Отметка о согласовании владельцем пути"
                        :values="[
                            { id: true, name: 'Согласовано' },
                            { id: false, name: 'Согласовано по доверенности' },
                        ]"
                        valueKey="id"
                        name="name"
                        v-model="document.is_owner_approval"
                    />
                </div>

                <div class="row mb-1" v-if="document.contract_number && document.id_owner_non_public_railway">
                    <simple-input title="Дата согласования с владельцем пути" type="date" v-model="document.owner_approval_date" />
                </div>
                <!-- ------------------------------------------------------ -->

                <div class="row mb-1">
                    <select-with-search title="Группа груза" :req="true" :values="filteredCargoGroups" valueKey="id" name="name" v-model="document.id_cargo_group" modalName="CargoGroup" :fields="{ 'Код группы груза': 'code', 'Наименование группы груза': 'name', 'Минимальная нагрузка': 'min_load', 'Максимальная нагрузка': 'max_load' }" />
                    <disable-simple-input title="Код группы груза" :dis="true" :value="listsStore.cargo_groups[document.id_cargo_group]?.code" :fixWidth="false" styleInput="width: 100px" />
                    <disable-simple-input title="Мин. норма загр. т" :dis="true" :value="listsStore.cargo_groups[document.id_cargo_group]?.min_load" :fixWidth="false" styleInput="width: 100px" />
                    <disable-simple-input title="Макс. норма загр. т" :dis="true" :value="listsStore.cargo_groups[document.id_cargo_group]?.max_load" :fixWidth="false" styleInput="width: 100px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Способ подачи" :values="listsStore.methods_submission" valueKey="id" name="name" v-model="document.id_method_submission" :req="true" />
                </div>

                <!-- Отправки -->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Отправки</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <simple-button data-toggle="modal" data-target="#DobavitOtpravka" title="Добавить" @click="startCreateSending"/>
                        <simple-button data-toggle="modal" data-target="#DobavitOtpravka" title="Изменить" @click="startEditSending"/>
                        <simple-button title="Удалить" @click="removeSelectedSendings"/>
                        <simple-button title="Копировать"/>
                        <simple-button title="Вставить"/>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№</th>
                                        <th>Код груза</th>
                                        <th>Груз</th>
                                        <th>Род подвижного состава</th>
                                        <th>Кол-во ваг/конт</th>
                                        <th>Вес (тонн)</th>
                                        <th>Станция отправления</th>
                                        <th>Дорога</th>
                                        <th>Страна назначения</th>
                                        <th>Плата</th>
                                        <th>Валюта</th>
                                        <th>Сумма НДС</th>
                                        <th>Примечание</th>
                                        <th>Собственник вагонов</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(sending, index) in sendingRows" :key="sending.id">
                                        <td><input type="checkbox" class="row-checkbox" :value="sending.id" v-model="selectedSendingIds" /></td>
                                        <td>{{ sending.id ?? index + 1 }}</td>
                                        <td>{{ listsStore.cargos[sending.id_cargo]?.code_ETSNG ?? "" }}</td>
                                        <td>{{ listsStore.cargos[sending.id_cargo]?.name ?? "" }}</td>
                                        <td>{{ listsStore.rolling_stock_types[sending.id_rolling_stock_type]?.name ?? "" }}</td>
                                        <td>{{ sending.count_wagon ?? "" }}</td>
                                        <td>{{ sending.weight ?? "" }}</td>
                                        <td>{{ listsStore.stations[sending.id_station_departure]?.name ?? "" }}</td>
                                        <td>{{ listsStore.stations[sending.id_station_departure]?.railway ?? "" }}</td>
                                        <td>{{ listsStore.countries[sending.id_country_destination]?.name ?? "" }}</td>
                                        <td>{{ sending.payment ?? "" }}</td>
                                        <td>{{ sending.currency ?? "" }}</td>
                                        <td>{{ sending.VAT_amount ?? "" }}</td>
                                        <td>{{ sending.note ?? "" }}</td>
                                        <td>{{ sending.owner_wagon_name ?? "" }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Создание новой Отправки модальное окно -->
                <SendingCompanent :object="document" :sending-id="activeSendingId" :reset-nonce="sendingResetNonce" @saveSending="updateSending"/>
                <!------------------------------->

                <!-- Стат нагрузка появляется после заполнения отправки -->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Стат. нагрузка</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled="disabled" :value="staticLoadText" />
                    </div>
                </div>

                

                <!-- График подач -->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">График подач</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom">Рассчитать график подач</button>
                        <button type="button" class="btn btn-custom" @click="openSubmissionScheduleModalForCreate">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openSubmissionScheduleModalForEdit">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedSubmissionSchedules">Удалить</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№</th>
                                        <th>№ отправки</th>
                                        <th>Дата подачи</th>
                                        <th>Кол-во вагонов/контейнеров</th>
                                        <th>Вес (тонн)</th>
                                        <th>Срок доставки</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(schedule, index) in submissionScheduleRows" :key="schedule.id">
                                        <td><input type="checkbox" class="row-checkbox" :value="schedule.id" v-model="selectedSubmissionScheduleIds" /></td>
                                        <td>{{ schedule.id ?? index + 1 }}</td>
                                        <td>{{ listsStore.send_numbers[schedule.id_send_number]?.name ?? schedule.id_send_number ?? "—" }}</td>
                                        <td>{{ schedule.submission_date ? String(schedule.submission_date).slice(0, 10) : "—" }}</td>
                                        <td>{{ schedule.count_wagon ?? "—" }}</td>
                                        <td>{{ schedule.weight ?? "—" }}</td>
                                        <td>—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить График подач модальное окно -->
                <div v-if="isSubmissionModalOpen" class="modal show d-block" id="staticGraficPodach" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticGraficPodachLabel" aria-hidden="false">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">График подачи</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white" @click="closeModalSafely('staticGraficPodach')"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applySubmissionScheduleAndClose">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal" @click="closeModalSafely('staticGraficPodach')">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Отправка</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input" v-model="selectedSubmissionSendNumberId">
                                            <option :value="null">Выберите элемент списка</option>
                                            <option v-for="sendNumber in submissionSendNumberOptions" :key="sendNumber.id" :value="sendNumber.id">
                                                {{ sendNumber.name || `№${sendNumber.id}` }}
                                            </option>
                                        </select>
                                    </div>
                                    <div v-if="submissionSendNumberOptions.length === 0" class="col-12 mt-2 text-danger small">
                                        Нет доступных отправок для графика подачи.
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата подачи</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="submissionDraft.submission_date" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Вес (тонн)</label>
                                    <div class="col-auto">
                                        <input type="number" class="form-control mt-0 custom-input" placeholder="" v-model="submissionDraft.weight" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Кол-во вагонов (конт)</label>
                                    <div class="col-auto">
                                        <input type="number" class="form-control mt-0 custom-input" placeholder="" v-model="submissionDraft.count_wagon" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="isSubmissionModalOpen" class="modal-backdrop fade show"></div>
                <!----------------------------- -->

                <!-- ------------------------------------------------------- -->

                <!-- Плательщики/Экспедиторы -->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Плательщики/Экспедиторы</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openPayerModalForCreate">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openPayerModalForEdit">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedPayers">Удалить</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№</th>
                                        <th>Код плательщика</th>
                                        <th>ОКПО</th>
                                        <th>Наименование</th>
                                        <th>Страна</th>
                                        <th>Плат/Экспед</th>
                                        <th>№ отправки</th>
                                        <th>Код перевозчика</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(payer, index) in payerRows" :key="payer.id">
                                        <td><input type="checkbox" class="row-checkbox" :value="payer.id" v-model="selectedPayerIds" /></td>
                                        <td>{{ payer.id ?? index + 1 }}</td>
                                        <td>{{ payer.id_payer ?? "—" }}</td>
                                        <td>{{ payer.OKPO ?? "—" }}</td>
                                        <td>{{ payer.name ?? "—" }}</td>
                                        <td>{{ listsStore.countries[payer.id_country_transportation]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.payer_types[payer.id_payer_type]?.name ?? "—" }}</td>
                                        <td>{{ document.Sendings?.[0] ?? "—" }}</td>
                                        <td>{{ payer.id_payer ?? "—" }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Плательщики/Экспедиторы модальное окно -->
                <div v-if="isPayerModalOpen" class="modal show d-block" id="staticPlatelshic" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticPlatelshicLabel" aria-hidden="false">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Плательщики/Экспедиторы</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 20%">Не указано, кто платит по заявке</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white" @click="closeModalSafely('staticPlatelshic')"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applySelectedPayerAndClose">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal" @click="closeModalSafely('staticPlatelshic')">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Кто платит по заявке</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value="">Грузоотправитель</option>
                                            <option value="">Плательщик</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Страна, за перевозку по которой, платят</label>
                                    <div class="col-auto">
                                        <select-with-search
                                            title=""
                                            :values="listsStore.countries"
                                            valueKey="id"
                                            name="name"
                                            v-model="document.id_country_departure_point"
                                            :req="false"
                                            modalName="CountryPay"
                                            :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование страны': 'name', 'Краткое наименование': 'short_name' }"
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Плательщик/Экспедитор</label>
                                    <div class="col-auto">
                                        <select-with-search
                                            title=""
                                            :values="listsStore.payers"
                                            valueKey="id"
                                            name="name"
                                            v-model="selectedPayerId"
                                            :req="false"
                                            modalName="PayerExpeditor"
                                            :fields="{ 'Код ОКПО': 'OKPO', 'Наименование плательщика': 'name', 'Адрес': 'addr' }"
                                        />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Код ОКПО</label>
                                    <div class="col-auto">
                                        <input
                                            type="text"
                                            class="form-control mt-0 custom-input"
                                            :value="selectedPayerRow?.OKPO || ''"
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование</label>
                                    <div class="col-9">
                                        <input
                                            type="text"
                                            class="form-control mt-0 custom-input"
                                            :value="selectedPayerRow?.name || ''"
                                            placeholder=""
                                            style="min-width: 100%"
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Адрес</label>
                                    <div class="col-9">
                                        <input
                                            type="text"
                                            class="form-control mt-0 custom-input"
                                            :value="selectedPayerRow?.addr || ''"
                                            placeholder=""
                                            style="min-width: 100%"
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Примечание</label>

                                    <div class="col-9">
                                        <input
                                            type="text"
                                            class="form-control mt-0 custom-input"
                                            :value="selectedPayerRow?.note || ''"
                                            style="height: 100px; min-width: 100%"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="isPayerModalOpen" class="modal-backdrop fade show"></div>
                <!----------------------------- -->

                <!--Найти Плательщик/Экспедитор модальное окно -->
                <div class="modal fade" id="staticPlatelshicNaity" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Плательщик/Экспедитор</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>ИД холдинга</th>
                                                <th>Наименование холдинга</th>
                                                <th>ОКПО</th>
                                                <th>Наименование грузополучателя</th>
                                                <th>ИД бизнеса</th>
                                                <th>Наименование бизнеса</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Страна, за перевозку по которой, платят модальное окно -->
                <div class="modal fade" id="staticStranaPlatel" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Страна, за перевозку по которой, платят</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Код</th>
                                                <th>Наименование</th>
                                                <th>Краткое наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!-- ------------------------------------------------------- -->
                <div class="row mb-1">
                    <div class="col-12">
                        <input type="text" class="form-control mt-0 custom-input" style="height: 100px; min-width: 100%" />
                    </div>
                </div>
            </div>

            <!------------------------------------------------------------------Учетная карточка------------------------------------------------------------------------------------------------------------------------------------------->

            <div class="tab-pane fade" style="margin-top: 1em" id="profile-tab-pane" role="tabpanel" aria-labelledby="profile-tab" tabindex="0">
                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Подписать</button>
                    </div>
                </div>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Грузоотправитель</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.legal_entities[document.id_shipper]?.name ?? ''"/>
                        </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Банковские реквизиты</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="bankDetailsText"/>
                        </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Станция отправления</label>
                    <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.stations[document.id_station_departure]?.name ?? ''"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Группа груза</label>
                    <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.cargo_groups[document.id_cargo_group]?.name ?? ''"/>
                        </div>
                </div>

                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                    <table class="table table-hover table-bordered border-white">
                        <thead style="background-color: #7da5f0; color: white">
                            <tr>
                                <th rowspan="2"></th>
                                <th rowspan="2">Дата погрузки</th>
                                <th rowspan="2">Станция</th>
                                <th colspan="2">Заявлено</th>
                                <th>Подано</th>
                                <th colspan="2">Погружено</th>
                                <th colspan="3">Причины невыполнения заявки</th>
                                <th colspan="2">Подпись</th>
                            </tr>
                            <tr>
                                <td>Вагонов(конт.)</td>
                                <td>Тонн</td>
                                <td>Вагонов(конт.)</td>
                                <td>Вагонов(конт.)</td>
                                <td>Тонн</td>
                                <td>Общий недогруз в вагонах (конт.)</td>
                                <td>Ж.Д.</td>
                                <td>Отправитель</td>
                                <td>Станции</td>
                                <td>Грузоотправителя</td>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr v-for="schedule in submissionScheduleRows" :key="`account-${schedule.id}`">
                                <td><input type="checkbox" class="row-checkbox" /></td>
                                <td>{{ schedule.submission_date ? String(schedule.submission_date).slice(0, 10) : "—" }}</td>
                                <td>{{ listsStore.stations[document.id_station_departure]?.name ?? "—" }}</td>
                                <td>{{ schedule.count_wagon ?? "—" }}</td>
                                <td>{{ schedule.weight ?? "—" }}</td>
                                <td><input style="width: 100%; height: 100%; background-color: transparent; border-color: transparent;"/></td>
                                <td><input style="width: 100%; height: 100%; background-color: transparent; border-color: transparent;"/></td>
                                <td><input style="width: 100%; height: 100%; background-color: transparent; border-color: transparent;"/></td>
                                <td data-toggle="modal" data-target="#NaityPrichiny"></td>
                                <td data-toggle="modal" data-target="#NaityPrichiny"></td>
                                <td data-toggle="modal" data-target="#NaityPrichiny"></td>
                                <td data-toggle="modal" data-target="#PodpisatSutky"></td>
                                <td data-toggle="modal" data-target="#PodpisatSutky"></td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>ИТОГО</td>
                                <td></td>
                                <td>{{ totalSubmissionWagons || "—" }}</td>
                                <td>{{ totalSubmissionWeight || "—" }}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!--Найти Причины не выполнения модальное окно -->
                <div class="modal fade" id="NaityPrichiny" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Причины</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Группа причин</th>
                                                <th>№</th>
                                                <th>Причина не выполнения</th>
                                                <th>Кол-во вагонов (конт.)</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="#DobavitDatuPogr" disabled>Добавить дату погр.</button>
                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="#UdalitDatuPodachy" disabled>Удалить дату погр.</button>
                    </div>
                </div>

                <!--Добавить дату погрузки модальное окно -->
                <div class="modal fade" id="DobavitDatuPogr" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Добавление даты погрузки</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата погрузки</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Станция назначения</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value="">Станция №1</option>
                                            <option value="">Станция №2</option>
                                            <option value="">Станция №3</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Подвижной состав</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value="">КО</option>
                                            <option value="">КО</option>
                                            <option value="">КО</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row justify-content-md-start">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">ОК</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 80px; margin: 10px">Отмена</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Подписать учетные сутки модальное окно -->
                <div class="modal fade" id="PodpisatSutky" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Подтверждение</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <label class="col-12 col-form-label mb-0 label-custom">Вы хотите подписать отчётные сутки?</label>
                                </div>
                                <div class="row justify-content-md-start">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">ОК</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 80px; margin: 10px">Отмена</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Подтвердить удаление даты погрузки модальное окно -->
                <div class="modal fade" id="UdalitDatuPodachy" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Подтверждение</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <label class="col-12 col-form-label mb-0 label-custom">Вы хотите удалить дату погрузки?</label>
                                </div>
                                <div class="row justify-content-md-start">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">ОК</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 80px; margin: 10px">Отмена</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                    <table class="table table-hover table-bordered border-white">
                        <thead style="background-color: #7da5f0; color: white">
                            <tr>
                                <th colspan="13">Ответственность за невыполнение принятой заявки, начисленная на:</th>
                                <th rowspan="4">Сальдо по штрафам</th>
                                <th rowspan="4">№НК / №Ув</th>
                            </tr>
                            <tr>
                                <td colspan="10">Грузоотправителя</td>
                                <td colspan="3">Железную дорогу</td>
                            </tr>
                            <tr>
                                <td colspan="3">Невыполненные заявки</td>
                                <td colspan="3">По дор.(ст.) назначения</td>
                                <td colspan="4">Сбор за изменение заявки</td>
                                <td colspan="3">Невыполненные заявки</td>
                            </tr>
                            <tr>
                                <td>В ваг.(конт.)</td>
                                <td>В тоннах</td>
                                <td>Сумма штрафа</td>
                                <td>В тоннах</td>
                                <td>Сумма сбора</td>
                                <td>В ваг.(конт.)</td>
                                <td>Кол-во изм.</td>
                                <td>В ваг.(конт.)</td>
                                <td>Тонн</td>
                                <td>Сумма сбора</td>
                                <td>В ваг.(конт.)</td>
                                <td>В тоннах</td>
                                <td>Сумма штрафа</td>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <!-------------------------------------------------------------Конец учетной карточки------------------------------------------------------------------------->

            <!--------------------------------------------------------------Провозная плата---------------------------------------------------------------------------------------->
            <div class="tab-pane fade" style="margin-top: 1em" id="profile-1-tab-pane" role="tabpanel" aria-labelledby="profile-tab" tabindex="0">
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Станция отправления из заявки</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.stations[document.id_station_departure]?.name ?? ''"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Станция назначения из заявки</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="firstSendingDestinationStationName"/>
                        </div>
                </div>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Фактическое расстояние между станциями, км</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="actualDistanceKm ?? '—'"/>
                        </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Наименование перевозимого груза из заявки</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="firstSendingCargoName"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Тарифный класс груза</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.cargo_groups[document.id_cargo_group]?.code ?? '—'"/>
                        </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Вид отправки из заявки</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.send_types[firstSending?.id_send_type]?.name ?? '—'"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Род вагонов из заявки</label>
                    <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="listsStore.rolling_stock_types[firstSending?.id_rolling_stock_type]?.name ?? '—'"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Количество вагонов из заявки</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="totalWagonsCount"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">Загрузка одного вагона, тонн</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="avgLoadPerWagon"/>
                        </div>
                </div>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Используется тарифная схема</label>
                     <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled value="Упрощённый расчёт (обучение)" />
                        </div>
                    <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled/>
                        </div>
                </div>
                  <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Провозная плата составляет</label>
                        <div class="col-auto">
                             <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled :value="freightCostFormatted"/>
                        </div>
                    <label class="col-auto col-form-label mb-0 label-custom">руб.</label>
                </div>

            </div>
            <!---------------------------------------------------------------Конец провозной платы---------------------------------------------------------------------------------->
        </div>
    </div>
</template>

<style scoped>
li {
    margin-left: -10px;
}

.search-box {
    padding-top: 10px;
    padding-bottom: 10px;
    background-color: white;
    height: 70px;
    width: 100%;
    position: fixed;
    top: 50px;
    left: 15px;
    z-index: 1000;
}

.content-container {
    padding: 120px 15px;
    top: 100px;
    font-size: 14px;
}
.span-custom {
    background-color: #ffffde;
    border: solid #a8a8a8 1px;
    color: black;
    height: 30px;
    padding: 3px 50px;
}

.form-check-input-checked-bg-color {
    background-color: #7da5f0;
}

.btn-box {
    width: 90%;
    position: fixed; 
}

.selected {
    background-color: #2165b6; 
    color: white;
}

.btn-custom {
    width: auto;
    background-color: #7da5f0;
    color: white;
    margin: 3px;
}

.btn-custom:hover {
    background-color: #3e6cb4;
    color: white;
}

.disabled-input {
            background-color: #FFFFDE; 
            opacity: 1;
            height: 30px;
            width: 270px;
            font-family: "Open Sans", sans-serif;
            font-size: 14px;
            border: 1px solid #C1C1C1;
            
        }
        .custom-input {
            background-color: #E3E2FF; 
            height: 30px;
            font-family: "Open Sans", sans-serif;
            font-size: 14px;
            width: 270px;
            border: 1px solid #C1C1C1;
            
        }
        .input-group .form-control {
            background-color: #E3E2FF; 
            border: 1px solid #C1C1C1; 
            height: 30px;
            font-family: "Open Sans", sans-serif;
            font-size: 14px;
            
        }
        .input-group .btn {
            background-color: #E3E2FF;
            border: 1px solid #C1C1C1; 
            height: 30px;
            font-family: "Open Sans", sans-serif;
            font-size: 14px;
        }
        .input-group .btn:hover {
            background-color: #D1D0FF; 
        }
        .label-custom{
            width: 180px;
        }
        .form-check-input-checked-bg-color{
            background-color:  #7DA5F0;;
        }
</style>
