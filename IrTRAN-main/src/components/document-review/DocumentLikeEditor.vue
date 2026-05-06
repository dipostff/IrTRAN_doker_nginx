<script setup>
import { computed } from "vue";
import {
  REVIEW_TEMPLATE_FORM_SCHEMAS,
  REVIEW_DOCUMENT_TYPE_LABELS,
} from "@/config/documentReviewForms";

const props = defineProps({
  documentType: { type: String, required: true },
  modelValue: { type: Object, required: true },
  editable: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

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
                v-if="field.type !== 'boolean'"
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
              <span>{{ displayValue(modelValue[field.key]) }}</span>
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
                  <th v-if="arr.itemType === 'number'" class="doc-header">ID</th>
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
                      v-if="editable"
                      type="number"
                      class="form-control form-control-sm"
                      :value="row"
                      @input="setArrayNumber(arr, idx, $event.target.value)"
                    />
                    <span v-else>{{ displayValue(row) }}</span>
                  </td>
                  <td v-else v-for="f in arr.fields || []" :key="`${arr.key}-${idx}-${f.key}`">
                    <input
                      v-if="editable"
                      :type="
                        f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'
                      "
                      class="form-control form-control-sm"
                      :value="row?.[f.key]"
                      @input="setArrayObjectField(arr, idx, f.key, $event.target.value, f.type)"
                    />
                    <span v-else>{{ displayValue(row?.[f.key]) }}</span>
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
</style>

