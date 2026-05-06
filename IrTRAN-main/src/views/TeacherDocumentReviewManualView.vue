<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import HeaderComponent from "../components/HeaderComponent.vue";
import DocumentLikeEditor from "@/components/document-review/DocumentLikeEditor.vue";
import {
  getTeacherDocumentReviewSubmission,
  getStations,
  getLegalEntities,
  getCargoGroups,
  getMethodsSubmission,
  getSendings,
  getSubmissionSchedules,
  getPayers,
  getSendNumbers,
} from "@/helpers/API";
import { updateTitle } from "@/helpers/headerHelper";
import {
  REVIEW_DOCUMENT_TYPE_LABELS,
} from "@/config/documentReviewForms";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();

const loading = ref(true);
const error = ref("");
const submission = ref(null);

const payload = computed(() => submission.value?.payload_snapshot || {});
const documentType = computed(() => submission.value?.document_type || "");
const documentTypeLabel = computed(
  () => REVIEW_DOCUMENT_TYPE_LABELS[documentType.value] || documentType.value || "—"
);
const isTransportation = computed(() => documentType.value === "transportation_request");
const isReminder = computed(() => documentType.value === "reminder");
const isCommonAct = computed(() => documentType.value === "common_act");
const isInvoice = computed(() => documentType.value === "invoice");
const isCommercialAct = computed(() => documentType.value === "commercial_act");
const isFillingStatement = computed(() => documentType.value === "filling_statement");
const isCumulativeStatement = computed(() => documentType.value === "cumulative_statement");

const transportationFieldLabels = {
  registration_date: "Дата регистрации",
  transportation_date_from: "Период перевозок с",
  transportation_date_to: "Период перевозок по",
  contract_number: "Номер договора",
  id_station_departure: "Станция отправления (id)",
  id_shipper: "Грузоотправитель (id)",
  id_cargo_group: "Группа груза (id)",
  id_method_submission: "Способ подачи (id)",
  addr: "Адрес",
  signed: "Подписан",
};

const transportationRequiredFieldLabels = {
  registration_date: "Дата регистрации",
  transportation_date_from: "Период перевозок с",
  transportation_date_to: "Период перевозок по",
  id_station_departure: "Станция отправления",
  id_shipper: "Грузоотправитель",
  id_cargo_group: "Группа груза",
  id_method_submission: "Способ подачи",
};

const reminderRequiredFieldLabels = {
  reminder_type: "Тип памятки",
  id_station: "Станция",
  id_owner: "Владелец п/пути",
  locomotive_by: "Подача производилась локомотивом",
};

const commonActRequiredFieldLabels = {
  id_station: "Станция составления акта",
  act_date: "Дата акта",
  downtime_type: "Тип простоя",
  description: "Описание обстоятельств",
};

const transportationPreviewRows = computed(() => {
  const out = [];
  for (const [key, label] of Object.entries(transportationFieldLabels)) {
    const raw = payload.value?.[key];
    let value = raw;
    if (key === "id_station_departure") {
      value = listsStore.stations?.[raw]?.name || raw;
    }
    if (key === "id_shipper") {
      value = listsStore.legal_entities?.[raw]?.name || raw;
    }
    if (key === "id_cargo_group") {
      value = listsStore.cargo_groups?.[raw]?.name || raw;
    }
    if (key === "id_method_submission") {
      value = listsStore.methods_submission?.[raw]?.name || raw;
    }
    if (key === "registration_date" || key === "transportation_date_from" || key === "transportation_date_to") {
      value = formatDate(raw);
    }
    if (key === "signed") {
      value = raw ? "Да" : "Нет";
    }
    out.push([label, value]);
  }
  return out;
});

const transportationSendingRows = computed(() =>
  Array.isArray(payload.value?.Sendings)
    ? payload.value.Sendings.map((id, index) => {
        const row = listsStore.sendings?.[id];
        return {
          index: index + 1,
          id,
          cargoName: row ? listsStore.cargos?.[row.id_cargo]?.name || "—" : "—",
          stationName: row ? listsStore.stations?.[row.id_station_departure]?.name || "—" : "—",
          countWagon: formatNumber(row?.count_wagon, 0),
          weight: row?.weight != null ? `${formatNumber(row?.weight, 0)} т` : "—",
        };
      })
    : []
);

const transportationScheduleRows = computed(() =>
  Array.isArray(payload.value?.SubmissionSchedules)
    ? payload.value.SubmissionSchedules.map((id, index) => {
        const row = listsStore.submission_schedules?.[id];
        return {
          index: index + 1,
          id,
          sendNumber: row ? listsStore.send_numbers?.[row.id_send_number]?.name || row.id_send_number || "—" : "—",
          submissionDate: row?.submission_date ? formatDate(row?.submission_date) : "—",
          countWagon: formatNumber(row?.count_wagon, 0),
          weight: row?.weight != null ? `${formatNumber(row?.weight, 0)} т` : "—",
        };
      })
    : []
);

const transportationPayerRows = computed(() =>
  Array.isArray(payload.value?.Payers)
    ? payload.value.Payers.map((id, index) => {
        const row = listsStore.payers?.[id];
        return {
          index: index + 1,
          id,
          name: row?.name || "—",
          okpo: row?.OKPO || "—",
          note: row?.note || "—",
        };
      })
    : []
);

const reminderWagonLines = computed(() =>
  Array.isArray(payload.value?.wagon_lines) ? payload.value.wagon_lines : []
);

const commonActPersons = computed(() =>
  Array.isArray(payload.value?.persons) ? payload.value.persons : []
);

const commonActWagons = computed(() =>
  Array.isArray(payload.value?.wagons) ? payload.value.wagons : []
);

function isFilled(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const transportationCompleteness = computed(() => {
  const required = Object.keys(transportationRequiredFieldLabels);
  const filled = required.filter((k) => isFilled(payload.value?.[k])).length;
  const missing = required.filter((k) => !isFilled(payload.value?.[k]));
  return {
    filled,
    total: required.length,
    ok: filled === required.length,
    missingLabels: missing.map((k) => transportationRequiredFieldLabels[k] || k),
  };
});

const reminderCompleteness = computed(() => {
  const required = Object.keys(reminderRequiredFieldLabels);
  const filled = required.filter((k) => isFilled(payload.value?.[k])).length;
  const missing = required.filter((k) => !isFilled(payload.value?.[k]));
  return {
    filled,
    total: required.length,
    ok: filled === required.length,
    missingLabels: missing.map((k) => reminderRequiredFieldLabels[k] || k),
  };
});

const commonActCompleteness = computed(() => {
  const required = Object.keys(commonActRequiredFieldLabels);
  const filled = required.filter((k) => isFilled(payload.value?.[k])).length;
  const missing = required.filter((k) => !isFilled(payload.value?.[k]));
  return {
    filled,
    total: required.length,
    ok: filled === required.length,
    missingLabels: missing.map((k) => commonActRequiredFieldLabels[k] || k),
  };
});

const isSigned = computed(() => !!payload.value?.signed);
const copyMessage = ref("");

const scalarSummaryRows = computed(() => {
  if (!payload.value || typeof payload.value !== "object") return [];
  return Object.entries(payload.value)
    .filter(([, v]) => !Array.isArray(v) && (v == null || typeof v !== "object"))
    .sort(([a], [b]) => String(a).localeCompare(String(b), "ru"));
});

const collectionSummaryRows = computed(() => {
  if (!payload.value || typeof payload.value !== "object") return [];
  return Object.entries(payload.value)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]);
});

function formatValue(value) {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return `Строк: ${value.length}`;
  return "Структурированный объект";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ru-RU");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ru-RU");
}

function formatNumber(value, fractionDigits = 0) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function currentMissingLabels() {
  if (isTransportation.value) return transportationCompleteness.value.missingLabels || [];
  if (isReminder.value) return reminderCompleteness.value.missingLabels || [];
  if (isCommonAct.value) return commonActCompleteness.value.missingLabels || [];
  return [];
}

function buildTeacherRemark() {
  const missing = currentMissingLabels();
  if (!missing.length) {
    return "Ключевые поля документа заполнены. Проверьте корректность содержимого и соответствие шаблону.";
  }
  return `Требуется доработать документ. Не заполнены ключевые поля: ${missing.join(", ")}.`;
}

function currentCompletenessSummary() {
  if (isTransportation.value) return transportationCompleteness.value;
  if (isReminder.value) return reminderCompleteness.value;
  if (isCommonAct.value) return commonActCompleteness.value;
  return { filled: 0, total: 0, missingLabels: [] };
}

function buildExtendedTeacherRemark() {
  const now = new Date().toLocaleString("ru-RU");
  const docType = submission.value?.document_type || "—";
  const version = submission.value?.version_no ?? "—";
  const status = submission.value?.status === "submitted" ? "Отправлено" : "Проверено";
  const signedLabel = isSigned.value ? "Да" : "Нет";
  const completeness = currentCompletenessSummary();
  const missing = completeness.missingLabels || [];
  const resultLine = missing.length
    ? `Замечание: Требуется доработка. Не заполнены ключевые поля: ${missing.join(", ")}.`
    : "Замечание: Ключевые поля заполнены. Требуется проверка корректности данных и соответствия шаблону.";

  return [
    "Результат ручной проверки документа",
    `Дата проверки: ${now}`,
    `Тип документа: ${docType}`,
    `Версия: ${version}`,
    `Статус отправки: ${status}`,
    `Подписан: ${signedLabel}`,
    `Ключевые поля: ${completeness.filled}/${completeness.total}`,
    resultLine,
  ].join("\n");
}

async function copyTeacherRemark() {
  try {
    const text = buildTeacherRemark();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = window.document.createElement("textarea");
      area.value = text;
      window.document.body.appendChild(area);
      area.select();
      window.document.execCommand("copy");
      window.document.body.removeChild(area);
    }
    copyMessage.value = "Замечание скопировано в буфер.";
  } catch (_) {
    copyMessage.value = "Не удалось скопировать автоматически. Скопируйте текст вручную.";
  }
  window.setTimeout(() => {
    copyMessage.value = "";
  }, 2500);
}

async function copyExtendedTeacherRemark() {
  try {
    const text = buildExtendedTeacherRemark();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = window.document.createElement("textarea");
      area.value = text;
      window.document.body.appendChild(area);
      area.select();
      window.document.execCommand("copy");
      window.document.body.removeChild(area);
    }
    copyMessage.value = "Расширенное замечание скопировано в буфер.";
  } catch (_) {
    copyMessage.value = "Не удалось скопировать автоматически. Скопируйте текст вручную.";
  }
  window.setTimeout(() => {
    copyMessage.value = "";
  }, 2500);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const id = Number(route.params.id);
    if (!Number.isFinite(id)) {
      error.value = "Некорректный идентификатор отправки.";
      return;
    }
    submission.value = await getTeacherDocumentReviewSubmission(id);
    updateTitle(`Ручная проверка документа #${id}`);
  } catch (e) {
    console.error(e);
    error.value = e.response?.data?.message || "Не удалось открыть документ для ручной проверки.";
  } finally {
    loading.value = false;
  }
}

async function loadReferenceData() {
  try {
    await Promise.all([
      getStations(),
      getLegalEntities(),
      getCargoGroups(),
      getMethodsSubmission(),
      getSendings(),
      getSubmissionSchedules(),
      getPayers(),
      getSendNumbers(),
    ]);
  } catch (e) {
    console.warn("Не удалось загрузить часть справочников для readonly-представления:", e);
  }
}

function goBack() {
  router.push({ name: "document-review" });
}

onMounted(async () => {
  await Promise.all([loadReferenceData(), load()]);
});
</script>

<template>
  <HeaderComponent :title="'Ручная проверка документа'" />
  <div class="manual-review-page">
    <div class="mb-3">
      <button type="button" class="btn btn-custom" @click="goBack">← К модулю проверки</button>
    </div>

    <div v-if="loading" class="text-muted">Загрузка...</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="submission" class="card">
      <div class="card-header">
        <div class="fw-semibold">Документ для ручной проверки</div>
        <div class="small mt-1">
          Тип: <b>{{ documentTypeLabel }}</b> · Версия: <b>{{ submission.version_no }}</b> · Статус:
          <b>{{ submission.status === "submitted" ? "Отправлено" : "Проверено" }}</b>
        </div>
        <div class="mt-2 d-flex flex-wrap gap-2">
          <span :class="['badge', isSigned ? 'bg-success' : 'bg-secondary']">
            {{ isSigned ? "Подписан" : "Не подписан" }}
          </span>
          <span v-if="isTransportation" :class="['badge', transportationCompleteness.ok ? 'bg-success' : 'bg-warning text-dark']">
            Ключевые поля: {{ transportationCompleteness.filled }}/{{ transportationCompleteness.total }}
          </span>
          <span v-if="isReminder" :class="['badge', reminderCompleteness.ok ? 'bg-success' : 'bg-warning text-dark']">
            Ключевые поля: {{ reminderCompleteness.filled }}/{{ reminderCompleteness.total }}
          </span>
          <span v-if="isCommonAct" :class="['badge', commonActCompleteness.ok ? 'bg-success' : 'bg-warning text-dark']">
            Ключевые поля: {{ commonActCompleteness.filled }}/{{ commonActCompleteness.total }}
          </span>
        </div>
        <div v-if="isTransportation && transportationCompleteness.missingLabels.length" class="small text-danger mt-1">
          Не заполнено: {{ transportationCompleteness.missingLabels.join(", ") }}
        </div>
        <div v-if="isReminder && reminderCompleteness.missingLabels.length" class="small text-danger mt-1">
          Не заполнено: {{ reminderCompleteness.missingLabels.join(", ") }}
        </div>
        <div v-if="isCommonAct && commonActCompleteness.missingLabels.length" class="small text-danger mt-1">
          Не заполнено: {{ commonActCompleteness.missingLabels.join(", ") }}
        </div>
      </div>
      <div class="card-body">
        <div class="alert alert-light border py-2 small">
          Это визуальное readonly-представление документа для проверки. Интерфейс повторяет форму документа, изменения недоступны.
        </div>
        <div class="mb-2">
          <button type="button" class="btn btn-sm btn-outline-primary" @click="copyTeacherRemark">
            Скопировать замечание преподавателя
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="copyExtendedTeacherRemark">
            Скопировать расширенное замечание
          </button>
          <span v-if="copyMessage" class="small text-muted ms-2">{{ copyMessage }}</span>
        </div>

        <DocumentLikeEditor
          :document-type="documentType"
          :model-value="payload"
          :editable="false"
          class="mb-3"
        />

        <div v-if="false && isTransportation" class="mb-3">
          <h6 class="mb-2">Заявка на грузоперевозку (форма проверки)</h6>

          <div class="section-title">Раздел: Документ</div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <tbody>
                <tr v-for="([label, value]) in transportationPreviewRows" :key="label">
                  <td class="field-key" style="width: 320px">{{ label }}</td>
                  <td><pre class="value-pre mb-0">{{ formatValue(value) }}</pre></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section-title">Раздел: Отправки</div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th style="width: 90px">№</th>
                  <th>ID отправки</th>
                  <th>Груз</th>
                  <th>Станция отправления</th>
                  <th>Вагонов</th>
                  <th>Вес</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in transportationSendingRows" :key="`sending-${row.index}-${row.id}`">
                  <td>{{ row.index }}</td>
                  <td>{{ row.id }}</td>
                  <td>{{ row.cargoName }}</td>
                  <td>{{ row.stationName }}</td>
                  <td>{{ row.countWagon }}</td>
                  <td>{{ row.weight }}</td>
                </tr>
                <tr v-if="!transportationSendingRows.length">
                  <td colspan="6" class="text-muted">Отправки не заполнены.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section-title">Раздел: График подач</div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th style="width: 90px">№</th>
                  <th>ID графика подачи</th>
                  <th>Номер отправки</th>
                  <th>Дата подачи</th>
                  <th>Вагонов</th>
                  <th>Вес</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in transportationScheduleRows" :key="`schedule-${row.index}-${row.id}`">
                  <td>{{ row.index }}</td>
                  <td>{{ row.id }}</td>
                  <td>{{ row.sendNumber }}</td>
                  <td>{{ row.submissionDate }}</td>
                  <td>{{ row.countWagon }}</td>
                  <td>{{ row.weight }}</td>
                </tr>
                <tr v-if="!transportationScheduleRows.length">
                  <td colspan="6" class="text-muted">Графики подач не заполнены.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section-title">Раздел: Плательщики/Экспедиторы</div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th style="width: 90px">№</th>
                  <th>ID плательщика</th>
                  <th>Наименование</th>
                  <th>ОКПО</th>
                  <th>Примечание</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in transportationPayerRows" :key="`payer-${row.index}-${row.id}`">
                  <td>{{ row.index }}</td>
                  <td>{{ row.id }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.okpo }}</td>
                  <td>{{ row.note }}</td>
                </tr>
                <tr v-if="!transportationPayerRows.length">
                  <td colspan="5" class="text-muted">Плательщики не заполнены.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="small text-muted">
            Всего: отправки <b>{{ transportationSendingRows.length }}</b> ·
            графики <b>{{ transportationScheduleRows.length }}</b> ·
            плательщики <b>{{ transportationPayerRows.length }}</b>
          </div>
        </div>

        <div v-if="false && isReminder" class="mb-3">
          <h6 class="mb-2">Памятка приемосдатчика (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Тип памятки:</b> {{ formatValue(payload.reminder_type) }}</div>
            <div class="col-md-4"><b>Станция (id):</b> {{ formatValue(payload.id_station) }}</div>
            <div class="col-md-4"><b>Индекс поезда:</b> {{ formatValue(payload.train_index) }}</div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>№ вагона</th>
                  <th>Груз</th>
                  <th>Операция</th>
                  <th>Подача</th>
                  <th>Уборка</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in reminderWagonLines" :key="`r-${idx}`">
                  <td>{{ row.wagon_number || "—" }}</td>
                  <td>{{ row.cargo_name || "—" }}</td>
                  <td>{{ row.cargo_operation || "—" }}</td>
                  <td>{{ row.op_delivery ? formatDateTime(row.op_delivery) : "—" }}</td>
                  <td>{{ row.op_removal ? formatDateTime(row.op_removal) : "—" }}</td>
                </tr>
                <tr v-if="!reminderWagonLines.length">
                  <td colspan="5" class="text-muted">Нет строк вагонов.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false && isCommonAct" class="mb-3">
          <h6 class="mb-2">Акт общей формы (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Дата акта:</b> {{ formatDate(payload.act_date) }}</div>
            <div class="col-md-4"><b>Станция (id):</b> {{ formatValue(payload.id_station) }}</div>
            <div class="col-md-4"><b>Тип простоя:</b> {{ formatValue(payload.downtime_type) }}</div>
          </div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Должность</th>
                  <th>ФИО</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in commonActPersons" :key="`p-${idx}`">
                  <td>{{ row.position || "—" }}</td>
                  <td>{{ row.full_name || "—" }}</td>
                </tr>
                <tr v-if="!commonActPersons.length">
                  <td colspan="2" class="text-muted">Участники не заполнены.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Вагон/контейнер</th>
                  <th>Отправка</th>
                  <th>Начало простоя</th>
                  <th>Окончание простоя</th>
                  <th>Сутки</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in commonActWagons" :key="`w-${idx}`">
                  <td>{{ row.vehicle_number || "—" }}</td>
                  <td>{{ row.shipment_label || "—" }}</td>
                  <td>{{ row.downtime_start ? formatDateTime(row.downtime_start) : "—" }}</td>
                  <td>{{ row.downtime_end ? formatDateTime(row.downtime_end) : "—" }}</td>
                  <td>{{ formatNumber(row.downtime_days, 0) }}</td>
                </tr>
                <tr v-if="!commonActWagons.length">
                  <td colspan="5" class="text-muted">Строки по вагонам не заполнены.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false && isInvoice" class="mb-3">
          <h6 class="mb-2">Накладная (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Тип накладной:</b> {{ formatValue(payload.invoice_type) }}</div>
            <div class="col-md-4"><b>Станция отправления (id):</b> {{ formatValue(payload.id_station_departure) }}</div>
            <div class="col-md-4"><b>Станция назначения (id):</b> {{ formatValue(payload.id_station_destination) }}</div>
          </div>
          <div class="table-responsive mb-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Секция</th>
                  <th>Количество строк</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Грузы</td><td>{{ Array.isArray(payload.goods) ? payload.goods.length : 0 }}</td></tr>
                <tr><td>Маршрут</td><td>{{ Array.isArray(payload.route_rows) ? payload.route_rows.length : 0 }}</td></tr>
                <tr><td>Спец. отметки</td><td>{{ Array.isArray(payload.special_marks) ? payload.special_marks.length : 0 }}</td></tr>
                <tr><td>Документы</td><td>{{ Array.isArray(payload.attached_documents) ? payload.attached_documents.length : 0 }}</td></tr>
                <tr><td>Контейнеры</td><td>{{ Array.isArray(payload.containers) ? payload.containers.length : 0 }}</td></tr>
                <tr><td>Вагоны</td><td>{{ Array.isArray(payload.wagons) ? payload.wagons.length : 0 }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false && isCommercialAct" class="mb-3">
          <h6 class="mb-2">Коммерческий акт (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Поезд №:</b> {{ formatValue(payload.train_number) }}</div>
            <div class="col-md-4"><b>Дата прибытия:</b> {{ formatDate(payload.arrival_date) }}</div>
            <div class="col-md-4"><b>Станция (id):</b> {{ formatValue(payload.id_station) }}</div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead><tr><th>Секция</th><th>Количество строк</th></tr></thead>
              <tbody>
                <tr><td>Вагоны</td><td>{{ Array.isArray(payload.wagons) ? payload.wagons.length : 0 }}</td></tr>
                <tr><td>Контейнеры</td><td>{{ Array.isArray(payload.containers) ? payload.containers.length : 0 }}</td></tr>
                <tr><td>ЗПУ</td><td>{{ Array.isArray(payload.zpu_rows) ? payload.zpu_rows.length : 0 }}</td></tr>
                <tr><td>Документы по грузу</td><td>{{ Array.isArray(payload.cargo_docs) ? payload.cargo_docs.length : 0 }}</td></tr>
                <tr><td>Факт по грузу</td><td>{{ Array.isArray(payload.cargo_actual_rows) ? payload.cargo_actual_rows.length : 0 }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false && isFillingStatement" class="mb-3">
          <h6 class="mb-2">Ведомость подачи и уборки (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Станция (id):</b> {{ formatValue(payload.id_station) }}</div>
            <div class="col-md-4"><b>Период с:</b> {{ formatDate(payload.period_from) }}</div>
            <div class="col-md-4"><b>Период по:</b> {{ formatDate(payload.period_to) }}</div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead><tr><th>Секция</th><th>Количество строк</th></tr></thead>
              <tbody>
                <tr><td>Памятки уборки</td><td>{{ Array.isArray(payload.cleaning_reminders) ? payload.cleaning_reminders.length : 0 }}</td></tr>
                <tr><td>Вагоны по памяткам</td><td>{{ Array.isArray(payload.wagons_by_reminders) ? payload.wagons_by_reminders.length : 0 }}</td></tr>
                <tr><td>Начисления</td><td>{{ Array.isArray(payload.fee_delivery_rows) ? payload.fee_delivery_rows.length : 0 }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false && isCumulativeStatement" class="mb-3">
          <h6 class="mb-2">Накопительная ведомость (форма проверки)</h6>
          <div class="row g-2 mb-2 small">
            <div class="col-md-4"><b>Номер:</b> {{ formatValue(payload.document_number) }}</div>
            <div class="col-md-4"><b>Период с:</b> {{ formatDate(payload.period_from) }}</div>
            <div class="col-md-4"><b>Период по:</b> {{ formatDate(payload.period_to) }}</div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead><tr><th>Секция</th><th>Количество строк</th></tr></thead>
              <tbody>
                <tr><td>Строки начислений</td><td>{{ Array.isArray(payload.fee_rows) ? payload.fee_rows.length : 0 }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="false" class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th style="width: 320px;">Сводка (скалярные поля)</th>
                <th>Значение</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="([key, value]) in scalarSummaryRows" :key="key">
                <td class="field-key">{{ key }}</td>
                <td>{{ formatValue(value) }}</td>
              </tr>
              <tr v-if="!scalarSummaryRows.length">
                <td colspan="2" class="text-muted">В отправке нет данных payload_snapshot.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="false" class="table-responsive mt-2">
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th style="width: 320px;">Табличная секция</th>
                <th>Количество строк</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="([key, cnt]) in collectionSummaryRows" :key="`arr-${key}`">
                <td class="field-key">{{ key }}</td>
                <td>{{ cnt }}</td>
              </tr>
              <tr v-if="!collectionSummaryRows.length">
                <td colspan="2" class="text-muted">Табличные секции отсутствуют.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.manual-review-page {
  padding: 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.btn-custom {
  background-color: #7da5f0;
  color: #fff;
}

.btn-custom:hover {
  background-color: #3e6cb4;
  color: #fff;
}

.field-key {
  font-weight: 600;
  background-color: #f8f9fa;
}

.value-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  font-family: inherit;
}

.section-title {
  font-weight: 600;
  color: #3e6cb4;
  margin-bottom: 0.35rem;
}
</style>
