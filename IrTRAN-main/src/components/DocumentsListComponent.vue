<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
    getDocumentsList,
    softDeleteDocument,
    restoreDocument,
    downloadDocumentPdf,
    submitDocumentForReview,
} from "@/helpers/API";

const router = useRouter();
const list = ref([]);
const loading = ref(true);
const error = ref(null);
const filterType = ref("");
const includeDeleted = ref(false);

const typeOptions = [
    { value: "", label: "Все типы" },
    { value: "transportation_request", label: "Заявка на грузоперевозку" },
    { value: "invoice", label: "Накладная" },
    { value: "common_act", label: "Акт общей формы (ГУ-23)" },
    { value: "commercial_act", label: "Коммерческий акт (ГУ-22)" },
    { value: "reminder", label: "Памятка приемосдатчика" },
    { value: "filling_statement", label: "Ведомость подачи и уборки" },
    { value: "cumulative_statement", label: "Накопительная ведомость" },
];

async function load() {
    loading.value = true;
    error.value = null;
    try {
        list.value = await getDocumentsList({
            type: filterType.value || undefined,
            include_deleted: includeDeleted.value,
        });
    } catch (e) {
        console.error(e);
        error.value = e.response?.data?.message || "Не удалось загрузить список документов.";
    } finally {
        loading.value = false;
    }
}

function viewDoc(item) {
    router.push({ name: "documents-view", params: { source: item.source, id: item.id } });
}

async function remove(item) {
    if (!confirm(`Удалить документ «${item.summary}» в архив?`)) return;
    try {
        await softDeleteDocument(item.source, item.id);
        await load();
    } catch (e) {
        alert(e.response?.data?.message || "Ошибка удаления.");
    }
}

async function restore(item) {
    try {
        await restoreDocument(item.source, item.id);
        await load();
    } catch (e) {
        alert(e.response?.data?.message || "Ошибка восстановления.");
    }
}

async function downloadPdf(item) {
    try {
        const blob = await downloadDocumentPdf(item.source, item.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `document-${item.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert(e.response?.data?.message || "Ошибка выгрузки PDF.");
    }
}

async function sendForReview(item) {
    try {
        await submitDocumentForReview(item.source, item.id);
        await load();
        alert("Документ отправлен на проверку преподавателю.");
    } catch (e) {
        alert(e.response?.data?.message || "Не удалось отправить документ на проверку.");
    }
}

function canSendForReview(item) {
    if (item.deletedAt) return false;
    if (item.reviewStatus === "submitted") return false;
    if (item.reviewStatus === "reviewed" && item.reviewAcceptance === "accepted") return false;
    if (item.reviewStatus === "reviewed" && item.reviewAcceptance === "rejected" && item.reviewCanRework === false) return false;
    return true;
}

function sendForReviewHint(item) {
    if (item.deletedAt) return "Документ в архиве: восстановите его для повторной отправки.";
    if (item.reviewStatus === "submitted") return "Документ уже отправлен и ожидает проверки преподавателем.";
    if (item.reviewStatus === "reviewed" && item.reviewAcceptance === "accepted") {
        return "Документ уже принят. Для новой попытки создайте новый документ.";
    }
    if (item.reviewStatus === "reviewed" && item.reviewAcceptance === "rejected" && item.reviewCanRework === false) {
        return "Переделка запрещена преподавателем. Нужно создать новый документ.";
    }
    if (item.reviewStatus === "reviewed" && item.reviewAcceptance === "rejected" && item.reviewCanRework === true) {
        return "Переделка разрешена: после исправлений отправьте документ повторно.";
    }
    return "Документ можно отправить на проверку.";
}

function reviewStatusText(item) {
    if (!item.reviewStatus) return "Не отправлен";
    if (item.reviewStatus === "submitted") return "Отправлено на проверку";
    if (item.reviewStatus === "reviewed") {
        const acceptance = item.reviewAcceptance === "accepted"
            ? "принято"
            : item.reviewAcceptance === "rejected"
                ? "не принято"
                : "без решения";
        const grade = item.reviewGrade ? `, оценка: ${item.reviewGrade}` : "";
        const rework = item.reviewAcceptance === "rejected"
            ? `, переделка: ${item.reviewCanRework ? "можно" : "нельзя"}`
            : "";
        return `Проверено (${acceptance}${grade}${rework})`;
    }
    return item.reviewStatus;
}

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("ru-RU");
}

onMounted(load);
</script>

<template>
    <div class="content-container">
        <div class="toolbar">
            <div class="filters">
                <label class="me-2">Тип:</label>
                <select v-model="filterType" @change="load" class="form-select form-select-sm" style="width: auto;">
                    <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <label class="ms-3 me-1">
                    <input type="checkbox" v-model="includeDeleted" @change="load" />
                    Показать удалённые
                </label>
            </div>
            <button type="button" class="btn btn-custom btn-sm" @click="load">Обновить</button>
        </div>

        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="loading" class="text-muted">Загрузка...</div>

        <div v-else class="table-wrap">
            <table class="table table-hover table-bordered">
                <thead style="background-color: #7DA5F0; color: white;">
                    <tr>
                        <th>Тип документа</th>
                        <th>Краткое описание</th>
                        <th>Образец</th>
                        <th>Дата создания</th>
                        <th>Подписан</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="list.length === 0">
                        <td colspan="7" class="text-center text-muted">Нет документов. Создавайте документы в разделах «Заявка на грузоперевозку», «Накладная», «Акты», «Памятка», «Ведомости» — они появятся здесь.</td>
                    </tr>
                    <tr v-for="item in list" :key="item.source + '-' + item.id">
                        <td>{{ item.typeLabel }}</td>
                        <td>{{ item.summary }}</td>
                        <td>
                            <span v-if="item.source === 'student' && item.isExemplar" class="badge bg-info text-dark">Образец</span>
                            <span v-else class="text-muted">—</span>
                        </td>
                        <td>{{ formatDate(item.createdAt) }}</td>
                        <td>{{ item.signed ? 'Да' : 'Нет' }}</td>
                        <td>
                            <div v-if="item.deletedAt" class="badge bg-secondary">В архиве</div>
                            <div v-else class="badge bg-success">Активный</div>
                            <div class="small text-muted mt-1">{{ reviewStatusText(item) }}</div>
                        </td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-primary me-1" @click="viewDoc(item)">Просмотр</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary me-1" @click="downloadPdf(item)">Скачать PDF</button>
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-warning me-1"
                                :disabled="!canSendForReview(item)"
                                @click="sendForReview(item)"
                            >
                                {{ item.reviewStatus === "reviewed" && item.reviewAcceptance === "rejected" && item.reviewCanRework ? "Отправить повторно" : "Отправить на проверку" }}
                            </button>
                            <div class="small text-muted mt-1">{{ sendForReviewHint(item) }}</div>
                            <template v-if="item.deletedAt">
                                <button type="button" class="btn btn-sm btn-outline-success" @click="restore(item)">Восстановить</button>
                            </template>
                            <template v-else>
                                <button type="button" class="btn btn-sm btn-outline-danger" @click="remove(item)">В архив</button>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.content-container {
    padding: 1rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
}
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}
.filters {
    display: flex;
    align-items: center;
}
.btn-custom {
    background-color: #7da5f0;
    color: white;
}
.btn-custom:hover {
    background-color: #3e6cb4;
    color: white;
}
.table-wrap {
    border: 1px solid #dee2e6;
    border-radius: 4px;
    overflow: hidden;
}
</style>
