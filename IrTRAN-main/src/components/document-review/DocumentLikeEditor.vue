<script setup>
import { computed, onMounted, watch } from "vue";
import { useListsStore } from "@/stores/main";
import {
  REVIEW_TEMPLATE_FORM_SCHEMAS,
  REVIEW_DOCUMENT_TYPE_LABELS,
} from "@/config/documentReviewForms";
import {
  getMessageTypes,
  getSignsSending,
  getCountries,
  getLegalEntities,
  getOwnerships,
  getOwnersNonPublicRailway,
  getCargoGroups,
  getMethodsSubmission,
  getStations,
  getSendings,
  getContracts,
  getSubmissionSchedules,
  getSendNumbers,
  getPayers,
  getRollingStockTypes,
  getSendTypes,
  getSpeedTypes,
} from "@/helpers/API";

const props = defineProps({
  documentType: { type: String, required: true },
  modelValue: { type: Object, required: true },
  editable: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);
const listsStore = useListsStore();

const schema = computed(
  () => REVIEW_TEMPLATE_FORM_SCHEMAS[props.documentType] || { sections: [] }
);

const title = computed(
  () => REVIEW_DOCUMENT_TYPE_LABELS[props.documentType] || props.documentType || "Документ"
);

function commit(next) {
  emit("update:modelValue", next);
}

function updateField(key, value) {
  commit({ ...props.modelValue, [key]: value });
}

function ensureArray(key) {
  const arr = Array.isArray(props.modelValue?.[key]) ? props.modelValue[key] : [];
  if (arr === props.modelValue?.[key]) return arr;
  commit({ ...props.modelValue, [key]: arr });
  return arr;
}

function addArrayRow(arrSchema) {
  const arr = [...ensureArray(arrSchema.key)];
  if (arrSchema.itemType === "number") {
    arr.push(null);
  } else {
    const row = {};
    for (const f of arrSchema.fields || []) {
      row[f.key] = f.type === "number" ? null : "";
    }
    arr.push(row);
  }
  commit({ ...props.modelValue, [arrSchema.key]: arr });
}

function removeArrayRow(arrSchema, idx) {
  const arr = [...ensureArray(arrSchema.key)];
  arr.splice(idx, 1);
  commit({ ...props.modelValue, [arrSchema.key]: arr });
}

function setArrayNumber(arrSchema, idx, value) {
  const arr = [...ensureArray(arrSchema.key)];
  arr[idx] = value === "" ? null : Number(value);
  commit({ ...props.modelValue, [arrSchema.key]: arr });
}

function setArrayObjectField(arrSchema, idx, key, value, type) {
  const arr = [...ensureArray(arrSchema.key)];
  const row = { ...(arr[idx] || {}) };
  row[key] = type === "number" ? (value === "" ? null : Number(value)) : value;
  arr[idx] = row;
  commit({ ...props.modelValue, [arrSchema.key]: arr });
}

function displayValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
}

function headerText(field) {
  return field.header || field.label || "";
}

function arrayValueHeader(arrSchema) {
  return arrSchema?.valueHeader || arrSchema?.label || "Значение";
}

const REFERENCE_DEFS = {
  message_types: { storeKey: "message_types", load: getMessageTypes },
  signs_sending: { storeKey: "signs_sending", load: getSignsSending },
  countries: { storeKey: "countries", load: getCountries, labelKeys: ["name", "short_name"] },
  legal_entities: { storeKey: "legal_entities", load: getLegalEntities, labelKeys: ["name"] },
  ownerships: { storeKey: "ownerships", load: getOwnerships },
  owners_non_public_railway: {
    storeKey: "owners_non_public_railway",
    load: getOwnersNonPublicRailway,
  },
  cargo_groups: { storeKey: "cargo_groups", load: getCargoGroups },
  methods_submission: { storeKey: "methods_submission", load: getMethodsSubmission },
  stations: { storeKey: "stations", load: getStations },
  sendings: { storeKey: "sendings", load: getSendings, labelKeys: ["name", "number"] },
  contracts: { storeKey: "contracts", load: getContracts },
  submission_schedules: {
    storeKey: "submission_schedules",
    load: getSubmissionSchedules,
    labelKeys: ["name", "number"],
  },
  send_numbers: { storeKey: "send_numbers", load: getSendNumbers },
  payers: { storeKey: "payers", load: getPayers, labelKeys: ["name", "OKPO"] },
  rolling_stock_types: { storeKey: "rolling_stock_types", load: getRollingStockTypes },
  send_types: { storeKey: "send_types", load: getSendTypes },
  speed_types: { storeKey: "speed_types", load: getSpeedTypes },
};

const DEFAULT_LABEL_KEYS = [
  "name",
  "short_name",
  "full_name",
  "number",
  "title",
  "code",
  "OKPO",
];

function inferRefKeyByField(key) {
  if (!key) return null;
  if (key.includes("message_type")) return "message_types";
  if (key.includes("sign_sending")) return "signs_sending";
  if (key.includes("country")) return "countries";
  if (key.includes("station")) return "stations";
  if (key.includes("shipper") || key.includes("receiver") || key.includes("carrier_org")) {
    return "legal_entities";
  }
  if (key.includes("cargo_group")) return "cargo_groups";
  if (key.includes("method_submission")) return "methods_submission";
  if (key.includes("send_type")) return "send_types";
  if (key.includes("speed_type")) return "speed_types";
  if (key.includes("ownership")) return "ownerships";
  if (key === "id_owner") return "owners_non_public_railway";
  if (key.includes("contract")) return "contracts";
  if (key.includes("rolling_type")) return "rolling_stock_types";
  if (key === "id_payer" || key.endsWith("_payer")) return "payers";
  return null;
}

function inferRefKeyByArray(arrSchema) {
  const key = arrSchema?.key || "";
  if (key === "Sendings") return "sendings";
  if (key === "SubmissionSchedules") return "submission_schedules";
  if (key === "Payers") return "payers";
  return null;
}

function resolveFieldRefKey(field) {
  return field?.refKey || inferRefKeyByField(field?.key || "");
}

function resolveArrayItemRefKey(arrSchema) {
  return arrSchema?.itemRefKey || inferRefKeyByArray(arrSchema);
}

function refRecordMap(refKey) {
  const def = REFERENCE_DEFS[refKey];
  if (!def) return {};
  return listsStore[def.storeKey] || {};
}

function recordLabel(record, refKey, fallbackValue) {
  if (!record || typeof record !== "object") return displayValue(fallbackValue);
  const custom = formatRecordLabel(refKey, record);
  if (custom) return custom;

  const def = REFERENCE_DEFS[refKey] || {};
  const keys = def.labelKeys || DEFAULT_LABEL_KEYS;
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return String(record.id ?? fallbackValue ?? "—");
}

function pickText(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function formatRecordLabel(refKey, record) {
  if (!record || typeof record !== "object") return "";
  const idText = record.id != null && record.id !== "" ? String(record.id) : "";

  if (refKey === "stations") {
    const code = pickText(record, ["code"]);
    const name = pickText(record, ["name", "short_name"]);
    if (code && name) return `${code} — ${name}`;
    if (name && idText) return `${idText} — ${name}`;
    return name || code || "";
  }

  if (refKey === "countries") {
    const code = pickText(record, ["OSCM_code"]);
    const name = pickText(record, ["name", "short_name"]);
    if (code && name) return `${code} — ${name}`;
    if (name && idText) return `${idText} — ${name}`;
    return name || code || "";
  }

  if (refKey === "legal_entities") {
    const okpo = pickText(record, ["OKPO"]);
    const name = pickText(record, ["name", "short_name", "full_name"]);
    if (okpo && name) return `${okpo} — ${name}`;
    if (name && idText) return `${idText} — ${name}`;
    return name || okpo || "";
  }

  if (refKey === "cargo_groups") {
    const code = pickText(record, ["code"]);
    const name = pickText(record, ["name"]);
    if (code && name) return `${code} — ${name}`;
    if (name && idText) return `${idText} — ${name}`;
    return name || code || "";
  }

  if (refKey === "payers") {
    const okpo = pickText(record, ["OKPO"]);
    const name = pickText(record, ["name"]);
    if (okpo && name) return `${okpo} — ${name}`;
    if (name && idText) return `${idText} — ${name}`;
    return name || okpo || "";
  }

  if (refKey === "send_numbers") {
    const name = pickText(record, ["name", "number"]);
    if (name) return name;
    return name || "";
  }

  if (refKey === "sendings") {
    const number = pickText(record, ["number", "name"]);
    if (number) return number;
    return number || "";
  }

  if (refKey === "submission_schedules") {
    const name = pickText(record, ["name", "id_send_number"]);
    if (name) return name;
    return name || "";
  }

  return "";
}

function displayReferenceValue(refKey, value) {
  if (value == null || value === "") return "—";
  const record = refRecordMap(refKey)[value];
  if (!record) return "—";
  return recordLabel(record, refKey, value);
}

function referenceMetaRows(refKey, value) {
  if (value == null || value === "") return [];
  const record = refRecordMap(refKey)[value];
  if (!record || typeof record !== "object") return [];
  const rows = [];
  const pushMeta = (label, raw) => {
    if (raw == null || raw === "") return;
    rows.push({ label, value: String(raw) });
  };

  if (refKey === "stations") {
    pushMeta("Код станции", record.code);
    pushMeta("Код дороги", record.railway);
    pushMeta("Параграфы", record.paragraph);
    return rows;
  }

  if (refKey === "countries") {
    pushMeta("ОКСМ", record.OSCM_code);
    pushMeta("Краткое", record.short_name);
    return rows;
  }

  if (refKey === "legal_entities") {
    pushMeta("ОКПО", record.OKPO);
    pushMeta("ИНН", record.INN);
    pushMeta("Код ТГНЛ", record.TGNL_code);
    return rows;
  }

  if (refKey === "cargo_groups") {
    pushMeta("Код группы", record.code);
    pushMeta("Мин. норма", record.min_load);
    pushMeta("Макс. норма", record.max_load);
    return rows;
  }

  if (refKey === "payers") {
    pushMeta("ОКПО", record.OKPO);
    pushMeta("Адрес", record.addr);
    return rows;
  }

  return rows;
}

function formatDateValue(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ru-RU");
}

function displayFieldValue(field, value) {
  const refKey = resolveFieldRefKey(field);
  if (refKey) return displayReferenceValue(refKey, value);
  if (field?.type === "date") return formatDateValue(value);
  return displayValue(value);
}

function displayArrayCellValue(field, value) {
  const refKey = resolveFieldRefKey(field);
  if (refKey) return displayReferenceValue(refKey, value);
  if (field?.type === "date") return formatDateValue(value);
  return displayValue(value);
}

const loadedReferenceKeys = new Set();

async function ensureReferenceLoaded(refKey) {
  if (!refKey || loadedReferenceKeys.has(refKey)) return;
  const def = REFERENCE_DEFS[refKey];
  if (!def?.load) return;
  const existing = listsStore[def.storeKey];
  if (existing && Object.keys(existing).length > 0) {
    loadedReferenceKeys.add(refKey);
    return;
  }
  try {
    await def.load();
    loadedReferenceKeys.add(refKey);
  } catch (e) {
    console.warn(`Не удалось загрузить справочник ${refKey}`, e);
  }
}

async function loadSchemaReferences() {
  const toLoad = new Set();
  for (const section of schema.value?.sections || []) {
    for (const field of section.fields || []) {
      const refKey = resolveFieldRefKey(field);
      if (refKey) toLoad.add(refKey);
    }
    for (const arr of section.arrays || []) {
      if (arr.itemType === "number") {
        const refKey = resolveArrayItemRefKey(arr);
        if (refKey) toLoad.add(refKey);
      } else {
        for (const field of arr.fields || []) {
          const refKey = resolveFieldRefKey(field);
          if (refKey) toLoad.add(refKey);
        }
      }
    }
  }
  await Promise.all(Array.from(toLoad).map((key) => ensureReferenceLoaded(key)));
}

const referenceOptionsCache = computed(() => {
  const out = {};
  for (const [refKey, def] of Object.entries(REFERENCE_DEFS)) {
    const map = listsStore[def.storeKey] || {};
    out[refKey] = Object.values(map)
      .map((item) => ({ value: item.id, label: recordLabel(item, refKey, item.id) }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }
  return out;
});

function referenceOptions(refKey) {
  return referenceOptionsCache.value[refKey] || [];
}

onMounted(loadSchemaReferences);
watch(
  () => props.documentType,
  () => {
    loadSchemaReferences();
  }
);
</script>

<template>
  <div class="doc-like">
    <div class="doc-like-header">
      <span class="fw-semibold">{{ title }}</span>
      <span class="badge bg-light text-dark border">
        {{ editable ? "Режим заполнения шаблона" : "Режим просмотра отправки" }}
      </span>
    </div>

    <div
      v-for="section in schema.sections || []"
      :key="section.title"
      class="doc-like-section"
    >
      <div class="doc-like-section-title">{{ section.title }}</div>

      <div v-if="section.fields?.length" class="doc-field-list">
        <div v-for="field in section.fields" :key="field.key" class="doc-field-row">
          <label class="doc-field-label">{{ field.label }}</label>
          <div class="doc-field-value">
            <template v-if="editable">
              <input
                v-if="field.type !== 'boolean' && !resolveFieldRefKey(field)"
                :type="
                  field.type === 'date'
                    ? 'date'
                    : field.type === 'number'
                    ? 'number'
                    : 'text'
                "
                class="form-control form-control-sm"
                :value="modelValue[field.key]"
                @input="updateField(field.key, $event.target.value)"
              />
              <select
                v-else-if="field.type !== 'boolean' && resolveFieldRefKey(field)"
                class="form-select form-select-sm"
                :value="modelValue[field.key] ?? ''"
                @change="
                  updateField(
                    field.key,
                    $event.target.value === '' ? null : Number($event.target.value)
                  )
                "
              >
                <option value="">— выбрать —</option>
                <option
                  v-for="opt in referenceOptions(resolveFieldRefKey(field))"
                  :key="`f-opt-${field.key}-${opt.value}`"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <div
                v-if="resolveFieldRefKey(field) && referenceMetaRows(resolveFieldRefKey(field), modelValue[field.key]).length"
                class="doc-meta-grid mt-1"
              >
                <div
                  v-for="meta in referenceMetaRows(resolveFieldRefKey(field), modelValue[field.key])"
                  :key="`meta-${field.key}-${meta.label}-${meta.value}`"
                  class="doc-meta-item"
                >
                  <label class="doc-meta-label">{{ meta.label }}</label>
                  <input class="form-control form-control-sm doc-meta-input" :value="meta.value" disabled />
                </div>
              </div>
              <div v-else class="form-check mt-1">
                <input
                  :id="`doc-like-${field.key}`"
                  class="form-check-input"
                  type="checkbox"
                  :checked="!!modelValue[field.key]"
                  @change="updateField(field.key, $event.target.checked)"
                />
                <label class="form-check-label" :for="`doc-like-${field.key}`">Да</label>
              </div>
            </template>
            <template v-else>
              <div>
                <span>{{ displayFieldValue(field, modelValue[field.key]) }}</span>
                <div
                  v-if="resolveFieldRefKey(field) && referenceMetaRows(resolveFieldRefKey(field), modelValue[field.key]).length"
                  class="doc-meta-grid"
                >
                  <div
                    v-for="meta in referenceMetaRows(resolveFieldRefKey(field), modelValue[field.key])"
                    :key="`meta-ro-${field.key}-${meta.label}-${meta.value}`"
                    class="doc-meta-item"
                  >
                    <label class="doc-meta-label">{{ meta.label }}</label>
                    <input class="form-control form-control-sm doc-meta-input" :value="meta.value" disabled />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-if="section.arrays?.length">
        <div v-for="arr in section.arrays" :key="arr.key" class="doc-table-wrap">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="doc-like-subtitle">{{ arr.label }}</span>
            <button
              v-if="editable"
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="addArrayRow(arr)"
            >
              Добавить строку
            </button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-2">
              <thead>
                <tr>
                  <th style="width: 60px" class="doc-header">{{ arr.indexLabel || "№" }}</th>
                  <th v-if="arr.itemType === 'number'" class="doc-header">
                    {{ arrayValueHeader(arr) }}
                  </th>
                  <th
                    v-else
                    v-for="f in arr.fields || []"
                    :key="`${arr.key}-${f.key}`"
                    class="doc-header"
                    :style="f.width ? `width:${f.width}` : null"
                  >
                    <span class="doc-header-text">{{ headerText(f) }}</span>
                  </th>
                  <th v-if="editable" style="width: 90px" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in (Array.isArray(modelValue[arr.key]) ? modelValue[arr.key] : [])"
                  :key="`${arr.key}-${idx}`"
                >
                  <td>{{ idx + 1 }}</td>
                  <td v-if="arr.itemType === 'number'">
                    <input
                      v-if="editable && !resolveArrayItemRefKey(arr)"
                      type="number"
                      class="form-control form-control-sm"
                      :value="row"
                      @input="setArrayNumber(arr, idx, $event.target.value)"
                    />
                    <select
                      v-else-if="editable && resolveArrayItemRefKey(arr)"
                      class="form-select form-select-sm"
                      :value="row ?? ''"
                      @change="
                        setArrayNumber(
                          arr,
                          idx,
                          $event.target.value === '' ? '' : Number($event.target.value)
                        )
                      "
                    >
                      <option value="">— выбрать —</option>
                      <option
                        v-for="opt in referenceOptions(resolveArrayItemRefKey(arr))"
                        :key="`arr-opt-${arr.key}-${idx}-${opt.value}`"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                    <span v-else>{{ displayReferenceValue(resolveArrayItemRefKey(arr), row) }}</span>
                    <div
                      v-if="resolveArrayItemRefKey(arr) && referenceMetaRows(resolveArrayItemRefKey(arr), row).length"
                      class="doc-meta-grid mt-1"
                    >
                      <div
                        v-for="meta in referenceMetaRows(resolveArrayItemRefKey(arr), row)"
                        :key="`arr-meta-${arr.key}-${idx}-${meta.label}-${meta.value}`"
                        class="doc-meta-item"
                      >
                        <label class="doc-meta-label">{{ meta.label }}</label>
                        <input class="form-control form-control-sm doc-meta-input" :value="meta.value" disabled />
                      </div>
                    </div>
                  </td>
                  <td v-else v-for="f in arr.fields || []" :key="`${arr.key}-${idx}-${f.key}`">
                    <input
                      v-if="editable && !resolveFieldRefKey(f)"
                      :type="
                        f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'
                      "
                      class="form-control form-control-sm"
                      :value="row?.[f.key]"
                      @input="setArrayObjectField(arr, idx, f.key, $event.target.value, f.type)"
                    />
                    <select
                      v-else-if="editable && resolveFieldRefKey(f)"
                      class="form-select form-select-sm"
                      :value="row?.[f.key] ?? ''"
                      @change="
                        setArrayObjectField(
                          arr,
                          idx,
                          f.key,
                          $event.target.value === '' ? '' : Number($event.target.value),
                          'number'
                        )
                      "
                    >
                      <option value="">— выбрать —</option>
                      <option
                        v-for="opt in referenceOptions(resolveFieldRefKey(f))"
                        :key="`obj-opt-${arr.key}-${idx}-${f.key}-${opt.value}`"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                    <div v-else>
                      <span>{{ displayArrayCellValue(f, row?.[f.key]) }}</span>
                      <div
                        v-if="resolveFieldRefKey(f) && referenceMetaRows(resolveFieldRefKey(f), row?.[f.key]).length"
                        class="doc-meta-grid mt-1"
                      >
                        <div
                          v-for="meta in referenceMetaRows(resolveFieldRefKey(f), row?.[f.key])"
                          :key="`obj-meta-${arr.key}-${idx}-${f.key}-${meta.label}-${meta.value}`"
                          class="doc-meta-item"
                        >
                          <label class="doc-meta-label">{{ meta.label }}</label>
                          <input class="form-control form-control-sm doc-meta-input" :value="meta.value" disabled />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td v-if="editable">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click="removeArrayRow(arr, idx)"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
                <tr v-if="!Array.isArray(modelValue[arr.key]) || modelValue[arr.key].length === 0">
                  <td :colspan="(arr.itemType === 'number' ? 2 : (arr.fields || []).length + 1) + (editable ? 1 : 0)" class="text-muted">
                    Нет строк.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-like {
  border: 1px solid #c1c1c1;
  border-radius: 6px;
  background: #fff;
}

.doc-like-header {
  background: #7da5f0;
  color: #fff;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-like-section {
  padding: 10px 12px;
  border-top: 1px solid #ececec;
}

.doc-like-section-title {
  font-weight: 600;
  color: #2d4f8f;
  margin-bottom: 8px;
}

.doc-like-subtitle {
  font-weight: 600;
}

.doc-field-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.doc-field-row {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.doc-field-label {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.doc-field-value {
  min-height: 30px;
  display: flex;
  align-items: center;
}

.doc-header {
  vertical-align: middle;
}

.doc-header-text {
  white-space: pre-line;
  line-height: 1.05;
}

.doc-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 6px;
}

.doc-meta-item {
  min-width: 0;
}

.doc-meta-label {
  display: block;
  color: #5f6b7a;
  font-size: 0.72rem;
  line-height: 1.1;
  margin-bottom: 2px;
}

.doc-meta-input {
  background-color: #f8f9fa;
  color: #495057;
  cursor: default;
}
</style>

