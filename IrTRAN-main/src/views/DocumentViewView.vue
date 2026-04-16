<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HeaderComponent from "../components/HeaderComponent.vue";
import {
    getDocumentTransportation,
    getDocumentStudent,
    getDocumentExemplars,
    compareStudentDocument,
    patchStudentDocument,
} from "@/helpers/API";
import { updateTitle } from "@/helpers/headerHelper";
import { hasAnyRealmRole } from "@/helpers/keycloak";

const route = useRoute();
const router = useRouter();
const source = computed(() => route.params.source);
const id = computed(() => route.params.id);
const doc = ref(null);
const studentRow = ref(null);
const loading = ref(true);
const error = ref(null);
const typeLabel = ref("");

const exemplars = ref([]);
const exemplarsLoading = ref(false);
const exemplarsError = ref(null);
const selectedExemplarId = ref("");

const compareResult = ref(null);
const compareError = ref(null);
const compareLoading = ref(false);

const exemplarMarkTitle = ref("");
const metaBusy = ref(false);
const metaMessage = ref(null);

const isStudent = computed(() => source.value === "student");
const canTeacher = computed(() => hasAnyRealmRole(["teacher", "app-admin"]));

const exemplarOptions = computed(() => {
    const selfId = Number(id.value);
    return (exemplars.value || []).filter((e) => e.id !== selfId);
});

const kindLabel = (k) => {
    if (k === "missing") return "Нет у вас";
    if (k === "extra") return "Лишнее";
    if (k === "mismatch") return "Не совпадает";
    if (k === "length") return "Разная длина";
    return k || "—";
};

async function loadExemplars(documentType) {
    if (!documentType) return;
    exemplarsLoading.value = true;
    exemplarsError.value = null;
    try {
        const data = await getDocumentExemplars(documentType);
        exemplars.value = data.items || [];
    } catch (e) {
        console.error(e);
        exemplars.value = [];
        exemplarsError.value = e.response?.data?.message || "Не удалось загрузить список образцов.";
    } finally {
        exemplarsLoading.value = false;
    }
}

function syncSelectedExemplarFromRow() {
    const refId = studentRow.value?.reference_exemplar_id;
    if (refId != null && String(refId) !== "") {
        selectedExemplarId.value = String(refId);
        return;
    }
    const opts = exemplarOptions.value;
    if (opts.length === 1) {
        selectedExemplarId.value = String(opts[0].id);
        return;
    }
    selectedExemplarId.value = "";
}

async function load() {
    loading.value = true;
    error.value = null;
    doc.value = null;
    studentRow.value = null;
    compareResult.value = null;
    compareError.value = null;
    metaMessage.value = null;
    exemplars.value = [];
    selectedExemplarId.value = "";
    try {
        if (source.value === "transportation") {
            doc.value = await getDocumentTransportation(id.value);
            typeLabel.value = "Заявка на грузоперевозку";
        } else {
            const row = await getDocumentStudent(id.value);
            studentRow.value = row;
            doc.value = row.payload || {};
            typeLabel.value = row.document_type || "Документ";
            await loadExemplars(row.document_type);
            syncSelectedExemplarFromRow();
        }
        updateTitle(`Просмотр: ${typeLabel.value} № ${doc.value?.id || id.value}`);
    } catch (e) {
        console.error(e);
        error.value = e.response?.data?.message || "Документ не найден или доступ запрещён.";
    } finally {
        loading.value = false;
    }
}

watch(exemplarOptions, () => {
    if (!studentRow.value) return;
    if (selectedExemplarId.value && !exemplarOptions.value.some((e) => String(e.id) === selectedExemplarId.value)) {
        syncSelectedExemplarFromRow();
    }
});

async function runCompare() {
    if (!isStudent.value || !studentRow.value) return;
    compareLoading.value = true;
    compareError.value = null;
    compareResult.value = null;
    try {
        const exId = selectedExemplarId.value ? Number(selectedExemplarId.value) : undefined;
        const data = await compareStudentDocument(id.value, exId);
        compareResult.value = data;
    } catch (e) {
        console.error(e);
        compareError.value = e.response?.data?.message || "Сравнение не удалось.";
    } finally {
        compareLoading.value = false;
    }
}

async function saveReferenceExemplar() {
    if (!isStudent.value) return;
    metaBusy.value = true;
    metaMessage.value = null;
    try {
        const body = { action: "set_reference_exemplar", exemplar_id: Number(selectedExemplarId.value) };
        const row = await patchStudentDocument(id.value, body);
        studentRow.value = { ...studentRow.value, ...row };
        metaMessage.value = "Образец по умолчанию сохранён.";
    } catch (e) {
        metaMessage.value = e.response?.data?.message || "Не удалось сохранить.";
    } finally {
        metaBusy.value = false;
    }
}

async function clearReferenceExemplar() {
    if (!isStudent.value) return;
    metaBusy.value = true;
    metaMessage.value = null;
    try {
        const row = await patchStudentDocument(id.value, { action: "set_reference_exemplar", exemplar_id: null });
        studentRow.value = { ...studentRow.value, ...row };
        metaMessage.value = "Запомненный образец сброшен.";
    } catch (e) {
        metaMessage.value = e.response?.data?.message || "Не удалось сбросить.";
    } finally {
        metaBusy.value = false;
    }
}

async function markAsExemplar() {
    if (!canTeacher.value) return;
    metaBusy.value = true;
    metaMessage.value = null;
    try {
        const row = await patchStudentDocument(id.value, {
            action: "set_exemplar",
            exemplar_title: exemplarMarkTitle.value?.trim() || undefined,
        });
        studentRow.value = { ...studentRow.value, ...row };
        exemplarMarkTitle.value = "";
        metaMessage.value = "Документ помечен как образец.";
        await loadExemplars(studentRow.value.document_type);
    } catch (e) {
        metaMessage.value = e.response?.data?.message || "Не удалось пометить образец.";
    } finally {
        metaBusy.value = false;
    }
}

async function unmarkExemplar() {
    if (!canTeacher.value) return;
    if (!confirm("Снять метку «образец» с этого документа?")) return;
    metaBusy.value = true;
    metaMessage.value = null;
    try {
        const row = await patchStudentDocument(id.value, { action: "unset_exemplar" });
        studentRow.value = { ...studentRow.value, ...row };
        metaMessage.value = "Метка образца снята.";
        await loadExemplars(studentRow.value.document_type);
        syncSelectedExemplarFromRow();
    } catch (e) {
        metaMessage.value = e.response?.data?.message || "Не удалось снять метку.";
    } finally {
        metaBusy.value = false;
    }
}

function back() {
    router.push({ name: "documents-list" });
}

const isTransportation = computed(() => source.value === "transportation");

const displayFields = computed(() => {
    const d = doc.value;
    if (!d) return [];
    if (isTransportation.value) {
        return [
            ["ID", d.id],
            ["Дата регистрации", d.registration_date],
            ["Период перевозки с", d.transportation_date_from],
            ["Период перевозки по", d.transportation_date_to],
            ["Статус", d.document_status != null ? "Подписан" : "Черновик"],
        ];
    }
    const exclude = ["id", "createdAt", "signed", "backendId"];
    return Object.entries(d)
        .filter(([k]) => !exclude.includes(k))
        .map(([k, v]) => [k, typeof v === "object" && v !== null ? JSON.stringify(v) : v]);
});

onMounted(load);
</script>

<template>
    <HeaderComponent :title="'Просмотр: ' + (typeLabel || 'Документ')" />
    <div class="document-view">
        <div class="toolbar mb-3">
            <button type="button" class="btn btn-custom" @click="back">← К списку документов</button>
        </div>
        <div v-if="loading" class="text-muted">Загрузка...</div>
        <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else class="card">
            <div class="card-header" style="background-color: #7da5f0; color: white;">
                <h5 class="mb-0">{{ typeLabel }} № {{ doc?.id || id }}</h5>
            </div>
            <div class="card-body">
                <div v-if="isStudent && studentRow?.is_exemplar" class="alert alert-info py-2 mb-3">
                    Этот документ помечен как <strong>образец преподавателя</strong>.
                    <span v-if="studentRow.exemplar_title"> — {{ studentRow.exemplar_title }}</span>
                </div>

                <table class="table table-sm table-bordered">
                    <tbody>
                        <tr v-for="([label, value]) in displayFields" :key="label">
                            <td class="field-label">{{ label }}</td>
                            <td>{{ value != null && value !== "" ? value : "—" }}</td>
                        </tr>
                    </tbody>
                </table>

                <div v-if="isStudent && studentRow" class="compare-block mt-4">
                    <h6 class="mb-3">Сравнение с образцом</h6>
                    <p v-if="exemplarsLoading" class="text-muted small">Загрузка образцов…</p>
                    <p v-else-if="exemplarsError" class="text-danger small">{{ exemplarsError }}</p>
                    <p v-else-if="!exemplarOptions.length" class="text-muted small">
                        Для этого типа документа пока нет образцов. Преподаватель может пометить документ как образец.
                    </p>
                    <div v-else class="row g-2 align-items-end flex-wrap">
                        <div class="col-auto" style="min-width: 220px;">
                            <label class="form-label small mb-1">Образец для сравнения</label>
                            <select v-model="selectedExemplarId" class="form-select form-select-sm">
                                <option value="">По умолчанию (из документа)</option>
                                <option v-for="ex in exemplarOptions" :key="ex.id" :value="String(ex.id)">
                                    {{
                                        ex.exemplar_title
                                            ? `№ ${ex.id} — ${ex.exemplar_title}`
                                            : `№ ${ex.id}`
                                    }}
                                </option>
                            </select>
                        </div>
                        <div class="col-auto">
                            <button
                                type="button"
                                class="btn btn-sm btn-custom"
                                :disabled="compareLoading"
                                @click="runCompare"
                            >
                                {{ compareLoading ? "Сравнение…" : "Сравнить" }}
                            </button>
                        </div>
                        <div class="col-auto">
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-secondary"
                                :disabled="metaBusy || !selectedExemplarId"
                                @click="saveReferenceExemplar"
                            >
                                Запомнить выбранный образец
                            </button>
                        </div>
                        <div class="col-auto">
                            <button
                                type="button"
                                class="btn btn-sm btn-link text-secondary"
                                :disabled="metaBusy || studentRow?.reference_exemplar_id == null"
                                @click="clearReferenceExemplar"
                            >
                                Сбросить запомненный
                            </button>
                        </div>
                    </div>
                    <p v-if="compareError" class="text-danger small mt-2">{{ compareError }}</p>
                    <div v-if="compareResult" class="mt-3">
                        <p class="small mb-2">
                            <span :class="compareResult.match ? 'text-success' : 'text-warning'">
                                {{ compareResult.match ? "Совпадает с образцом." : "Есть отличия." }}
                            </span>
                            <span v-if="compareResult.exemplarTitle" class="text-muted">
                                ({{ compareResult.exemplarTitle }})
                            </span>
                        </p>
                        <div v-if="compareResult.differences?.length" class="table-responsive">
                            <table class="table table-sm table-bordered diff-table">
                                <thead>
                                    <tr>
                                        <th>Поле</th>
                                        <th>В образце</th>
                                        <th>У вас</th>
                                        <th>Тип</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(row, idx) in compareResult.differences" :key="idx">
                                        <td>{{ row.label || row.path }}</td>
                                        <td class="diff-cell">{{ row.expectedFormatted ?? "—" }}</td>
                                        <td class="diff-cell">{{ row.actualFormatted ?? "—" }}</td>
                                        <td>{{ kindLabel(row.kind) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div v-if="isStudent && canTeacher" class="teacher-meta mt-4 pt-3 border-top">
                    <h6 class="mb-2">Преподаватель</h6>
                    <div v-if="metaMessage" class="alert alert-secondary py-2 small">{{ metaMessage }}</div>
                    <template v-if="!studentRow?.is_exemplar">
                        <div class="row g-2 align-items-end">
                            <div class="col-md-6">
                                <label class="form-label small mb-1">Название образца (необязательно)</label>
                                <input
                                    v-model="exemplarMarkTitle"
                                    type="text"
                                    class="form-control form-control-sm"
                                    maxlength="255"
                                    placeholder="Например: Эталон накладной"
                                />
                            </div>
                            <div class="col-auto">
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary"
                                    :disabled="metaBusy"
                                    @click="markAsExemplar"
                                >
                                    Пометить как образец
                                </button>
                            </div>
                        </div>
                    </template>
                    <button
                        v-else
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        :disabled="metaBusy"
                        @click="unmarkExemplar"
                    >
                        Снять метку образца
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.document-view {
    padding: 1rem 2rem;
    max-width: 960px;
    margin: 0 auto;
}
.btn-custom {
    background-color: #7da5f0;
    color: white;
}
.btn-custom:hover {
    background-color: #3e6cb4;
    color: white;
}
.field-label {
    width: 220px;
    font-weight: 500;
    background-color: #f8f9fa;
}
.diff-cell {
    max-width: 280px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.875rem;
}
.compare-block h6,
.teacher-meta h6 {
    color: #3e6cb4;
}
</style>
