<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { isAppAdmin } from "@/helpers/keycloak";
import { getBugReports, createBugReport, updateBugReport, getBugReportScreenshot } from "@/helpers/API";

const activeTab = ref("report");
const tickets = ref([]);
const loading = ref(false);
const error = ref(null);
const form = ref({
    reporter_name: "",
    module_name: "",
    description: "",
    devtools_error: "",
});
const submitError = ref(null);
const submitSuccess = ref(null);
const screenshotFiles = ref([]);
const screenshotDraftPreviews = ref([]);
const isDragOver = ref(false);
const screenshotHint = ref("");

const moduleOptions = [
    "Заявка на грузоперевозку",
    "Накладная",
    "Акты (ГУ-23, ГУ-22)",
    "Памятка приемосдатчика",
    "Ведомости подачи и уборки",
    "Накопительная ведомость",
    "Загрузка и выгрузка документов",
    "Режим теста",
    "Справочник",
    "Сценарии",
    "Другое",
];

const statusLabels = {
    "отправлено": "Отправлено",
    "на рассмотрении": "На рассмотрении",
    "работаем над ошибкой": "Работаем над ошибкой",
    "ошибка исправлена": "Ошибка исправлена",
};

const statusOptions = [
    { value: "отправлено", label: "Отправлено" },
    { value: "на рассмотрении", label: "На рассмотрении" },
    { value: "работаем над ошибкой", label: "Работаем над ошибкой" },
    { value: "ошибка исправлена", label: "Ошибка исправлена" },
];

const isAdmin = computed(() => isAppAdmin());

const adminDetail = ref(null);
const adminDetailVisible = ref(false);
const adminEdit = ref({ status: "", admin_response: "" });
const adminSaving = ref(false);
const adminSaveError = ref(null);
const adminScreenshotPreviews = ref([]);
const zoomedScreenshot = ref(null);

async function loadTickets() {
    loading.value = true;
    error.value = null;
    try {
        tickets.value = await getBugReports();
    } catch (e) {
        console.error(e);
        error.value = "Не удалось загрузить тикеты.";
    } finally {
        loading.value = false;
    }
}

async function submitReport() {
    submitError.value = null;
    submitSuccess.value = null;
    const { reporter_name, module_name, description, devtools_error } = form.value;
    if (!reporter_name || !reporter_name.trim()) {
        submitError.value = "Укажите имя того, кто нашёл ошибку.";
        return;
    }
    if (!module_name || !module_name.trim()) {
        submitError.value = "Укажите название модуля.";
        return;
    }
    const devtoolsText = devtools_error != null && String(devtools_error).trim() !== ""
        ? String(devtools_error).trim()
        : "ошибки в DevTools нет";
    try {
        const payload = new FormData();
        payload.append("reporter_name", reporter_name.trim());
        payload.append("module_name", module_name.trim());
        payload.append("description", description ? description.trim() : "");
        payload.append("devtools_error", devtoolsText);
        screenshotFiles.value.forEach((file) => payload.append("screenshots", file));
        await createBugReport(payload);
        submitSuccess.value = "Сообщение об ошибке отправлено.";
        form.value = { reporter_name: "", module_name: "", description: "", devtools_error: "" };
        screenshotDraftPreviews.value.forEach((i) => {
            if (i.url) URL.revokeObjectURL(i.url);
        });
        screenshotDraftPreviews.value = [];
        screenshotFiles.value = [];
        screenshotHint.value = "";
        setTimeout(() => { submitSuccess.value = null; }, 4000);
        await loadTickets();
    } catch (e) {
        submitError.value = e.response?.data?.message || "Не удалось отправить.";
    }
}

function onScreenshotsChange(event) {
    const inputFiles = Array.from(event?.target?.files || []);
    appendScreenshotFiles(inputFiles);
    if (event?.target) {
        event.target.value = "";
    }
}

function rebuildScreenshotPreviews() {
    screenshotDraftPreviews.value.forEach((i) => {
        if (i.url) URL.revokeObjectURL(i.url);
    });
    screenshotDraftPreviews.value = screenshotFiles.value.map((file, idx) => {
        try {
            return { key: `${file.name}-${idx}`, name: file.name, url: URL.createObjectURL(file) };
        } catch (e) {
            return { key: `${file.name}-${idx}`, name: file.name, url: "" };
        }
    });
}

function appendScreenshotFiles(files) {
    const input = files || [];
    const onlyImages = input.filter((f) => (f?.type || "").startsWith("image/"));
    const nonImageSkipped = input.length - onlyImages.length;
    if (!onlyImages.length && nonImageSkipped === 0) return;
    const before = screenshotFiles.value.length;
    const merged = [...screenshotFiles.value, ...onlyImages].slice(0, 5);
    const added = merged.length - before;
    const limitSkipped = Math.max(0, onlyImages.length - added);
    const msgParts = [];
    if (nonImageSkipped > 0) msgParts.push(`Пропущено не-изображений: ${nonImageSkipped}`);
    if (limitSkipped > 0) msgParts.push(`Не добавлено из-за лимита 5: ${limitSkipped}`);
    screenshotHint.value = msgParts.join(". ");
    screenshotFiles.value = merged;
    rebuildScreenshotPreviews();
}

function onDragOverScreenshots(event) {
    event.preventDefault();
    isDragOver.value = true;
}

function onDragLeaveScreenshots(event) {
    event.preventDefault();
    isDragOver.value = false;
}

function onDropScreenshots(event) {
    event.preventDefault();
    isDragOver.value = false;
    const dropped = Array.from(event?.dataTransfer?.files || []);
    appendScreenshotFiles(dropped);
}

function removeDraftScreenshot(index) {
    const item = screenshotDraftPreviews.value[index];
    if (item && item.url) {
        URL.revokeObjectURL(item.url);
    }
    screenshotFiles.value.splice(index, 1);
    screenshotDraftPreviews.value.splice(index, 1);
    rebuildScreenshotPreviews();
}

async function loadAdminScreenshotPreviews(ticket) {
    adminScreenshotPreviews.value.forEach((i) => {
        if (i.url) URL.revokeObjectURL(i.url);
    });
    adminScreenshotPreviews.value = [];
    const paths = Array.isArray(ticket?.screenshot_paths) ? ticket.screenshot_paths : [];
    if (!paths.length) return;
    const loaded = [];
    for (const fileName of paths) {
        try {
            const blob = await getBugReportScreenshot(ticket.id, fileName);
            loaded.push({ fileName, url: URL.createObjectURL(blob) });
        } catch (e) {
            loaded.push({ fileName, url: "" });
        }
    }
    adminScreenshotPreviews.value = loaded;
}

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("ru-RU");
}

function openAdminDetail(ticket) {
    if (!isAdmin.value) return;
    adminDetail.value = ticket;
    adminEdit.value = { status: ticket.status, admin_response: ticket.admin_response || "" };
    adminSaveError.value = null;
    adminDetailVisible.value = true;
    loadAdminScreenshotPreviews(ticket);
}

function closeAdminDetail() {
    adminScreenshotPreviews.value.forEach((i) => {
        if (i.url) URL.revokeObjectURL(i.url);
    });
    adminScreenshotPreviews.value = [];
    zoomedScreenshot.value = null;
    adminDetailVisible.value = false;
    adminDetail.value = null;
}

function openScreenshotZoom(img) {
    if (!img?.url) return;
    zoomedScreenshot.value = img;
}

function closeScreenshotZoom() {
    zoomedScreenshot.value = null;
}

async function saveAdminTicket() {
    if (!adminDetail.value) return;
    adminSaving.value = true;
    adminSaveError.value = null;
    try {
        await updateBugReport(adminDetail.value.id, {
            status: adminEdit.value.status,
            admin_response: adminEdit.value.admin_response,
        });
        await loadTickets();
        adminDetail.value = { ...adminDetail.value, ...adminEdit.value };
        closeAdminDetail();
    } catch (e) {
        adminSaveError.value = e.response?.data?.message || "Не удалось сохранить.";
    } finally {
        adminSaving.value = false;
    }
}

onMounted(loadTickets);

onBeforeUnmount(() => {
    screenshotDraftPreviews.value.forEach((i) => {
        if (i.url) URL.revokeObjectURL(i.url);
    });
    adminScreenshotPreviews.value.forEach((i) => {
        if (i.url) URL.revokeObjectURL(i.url);
    });
});
</script>

<template>
    <div class="report-error-page">
        <ul class="nav nav-tabs mb-3">
            <li class="nav-item">
                <button
                    class="nav-link"
                    :class="{ active: activeTab === 'report' }"
                    type="button"
                    @click="activeTab = 'report'"
                >
                    Сообщить об ошибке
                </button>
            </li>
            <li class="nav-item" v-if="isAdmin">
                <button
                    class="nav-link"
                    :class="{ active: activeTab === 'messages' }"
                    type="button"
                    @click="activeTab = 'messages'; loadTickets()"
                >
                    Сообщения об ошибках
                </button>
            </li>
        </ul>

        <!-- Секция: Сообщить об ошибке -->
        <div v-show="activeTab === 'report'" class="section">
            <div class="card mb-4">
                <div class="card-header" style="background-color: #7DA5F0; color: white;">
                    <h5 class="mb-0">Новое сообщение об ошибке</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Имя того, кто нашёл ошибку <span class="text-danger">*</span></label>
                        <input v-model="form.reporter_name" type="text" class="form-control" placeholder="ФИО или псевдоним" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Название модуля, где обнаружена ошибка <span class="text-danger">*</span></label>
                        <select v-model="form.module_name" class="form-select">
                            <option value="">— Выберите модуль —</option>
                            <option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Описание ошибки</label>
                        <textarea v-model="form.description" class="form-control" rows="3" placeholder="Опишите, что произошло"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ошибка из DevTools <span class="text-danger">*</span></label>
                        <textarea v-model="form.devtools_error" class="form-control font-monospace small" rows="4" placeholder="Скопируйте текст ошибки из консоли браузера (F12). Если ошибки в DevTools нет — оставьте пустым или напишите: ошибки в DevTools нет"></textarea>
                        <small class="text-muted">Если ошибки в DevTools нет — оставьте пустым или введите: ошибки в DevTools нет</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Скриншоты (до 5 файлов, до 10 МБ каждый)</label>
                        <div
                            class="report-dropzone mb-2"
                            :class="{ 'report-dropzone--active': isDragOver }"
                            @dragover="onDragOverScreenshots"
                            @dragleave="onDragLeaveScreenshots"
                            @drop="onDropScreenshots"
                        >
                            Перетащите изображения сюда или выберите через кнопку ниже
                        </div>
                        <input type="file" class="form-control" accept="image/*" multiple @change="onScreenshotsChange" />
                        <div v-if="screenshotFiles.length" class="mt-2">
                            <div class="small text-muted mb-1">Выбрано: {{ screenshotFiles.length }}/5</div>
                            <div class="d-flex flex-wrap gap-2">
                                <div
                                    v-for="(img, idx) in screenshotDraftPreviews"
                                    :key="img.key"
                                    class="report-image-item"
                                >
                                    <img
                                        :src="img.url"
                                        :alt="img.name"
                                        class="report-image-preview border rounded"
                                    />
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-danger report-image-remove-btn"
                                        title="Удалить скриншот"
                                        @click="removeDraftScreenshot(idx)"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div v-if="screenshotHint" class="small text-warning mt-1">{{ screenshotHint }}</div>
                    </div>
                    <div v-if="submitError" class="alert alert-danger py-2">{{ submitError }}</div>
                    <div v-if="submitSuccess" class="alert alert-success py-2">{{ submitSuccess }}</div>
                    <button type="button" class="btn btn-primary" @click="submitReport">Отправить</button>
                </div>
            </div>

            <h6 class="mb-2">Ваши сообщения об ошибках</h6>
            <div v-if="loading" class="text-muted">Загрузка...</div>
            <div v-else-if="error" class="alert alert-warning">{{ error }}</div>
            <div v-else-if="tickets.length === 0" class="text-muted">Пока нет отправленных сообщений.</div>
            <div v-else class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead style="background-color: #e9ecef;">
                        <tr>
                            <th>Дата и время</th>
                            <th>Модуль</th>
                            <th>Статус</th>
                            <th>Ответ админа</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="t in tickets" :key="t.id">
                            <td>{{ formatDate(t.created_at) }}</td>
                            <td>{{ t.module_name }}</td>
                            <td>{{ statusLabels[t.status] || t.status }}</td>
                            <td>{{ t.admin_response || '—' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Секция: Сообщения об ошибках (только админ) -->
        <div v-show="activeTab === 'messages' && isAdmin" class="section">
            <div v-if="loading" class="text-muted">Загрузка...</div>
            <div v-else-if="error" class="alert alert-warning">{{ error }}</div>
            <div v-else class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead style="background-color: #7DA5F0; color: white;">
                        <tr>
                            <th>ID</th>
                            <th>Дата и время</th>
                            <th>Кто сообщил</th>
                            <th>Модуль</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="t in tickets" :key="t.id" class="clickable" @click="openAdminDetail(t)">
                            <td>{{ t.id }}</td>
                            <td>{{ formatDate(t.created_at) }}</td>
                            <td>{{ t.reporter_name }}</td>
                            <td>{{ t.module_name }}</td>
                            <td>{{ statusLabels[t.status] || t.status }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Модальное окно детального просмотра и редактирования (админ) -->
        <div v-if="adminDetailVisible && adminDetail" class="modal show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #7DA5F0; color: white;">
                        <h5 class="modal-title">Тикет #{{ adminDetail.id }}</h5>
                        <button type="button" class="btn-close btn-close-white" aria-label="Закрыть" @click="closeAdminDetail"></button>
                    </div>
                    <div class="modal-body">
                        <dl class="row mb-2">
                            <dt class="col-sm-3">Дата и время</dt>
                            <dd class="col-sm-9">{{ formatDate(adminDetail.created_at) }}</dd>
                            <dt class="col-sm-3">Кто сообщил</dt>
                            <dd class="col-sm-9">{{ adminDetail.reporter_name }}</dd>
                            <dt class="col-sm-3">Модуль</dt>
                            <dd class="col-sm-9">{{ adminDetail.module_name }}</dd>
                            <dt class="col-sm-3">Описание ошибки</dt>
                            <dd class="col-sm-9">{{ adminDetail.description || '—' }}</dd>
                            <dt class="col-sm-3">Ошибка из DevTools</dt>
                            <dd class="col-sm-9"><pre class="mb-0 small bg-light p-2 rounded">{{ adminDetail.devtools_error || '—' }}</pre></dd>
                            <dt class="col-sm-3">Скриншоты</dt>
                            <dd class="col-sm-9">
                                <div v-if="adminScreenshotPreviews.length" class="d-flex flex-wrap gap-2">
                                    <template v-for="img in adminScreenshotPreviews" :key="img.fileName">
                                        <img
                                            v-if="img.url"
                                            :src="img.url"
                                            :alt="img.fileName"
                                            class="report-image-preview border rounded report-image-clickable"
                                            title="Нажмите, чтобы увеличить"
                                            @click="openScreenshotZoom(img)"
                                        />
                                        <div v-else class="small text-muted">Не удалось загрузить: {{ img.fileName }}</div>
                                    </template>
                                </div>
                                <span v-else>—</span>
                            </dd>
                        </dl>
                        <hr />
                        <div class="mb-3">
                            <label class="form-label fw-bold">Статус</label>
                            <select v-model="adminEdit.status" class="form-select">
                                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Ответ админа</label>
                            <textarea v-model="adminEdit.admin_response" class="form-control" rows="4" placeholder="Ответ пользователю"></textarea>
                        </div>
                        <div v-if="adminSaveError" class="alert alert-danger py-2">{{ adminSaveError }}</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="closeAdminDetail">Закрыть</button>
                        <button type="button" class="btn btn-primary" :disabled="adminSaving" @click="saveAdminTicket">
                            {{ adminSaving ? 'Сохранение...' : 'Сохранить' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div
            v-if="zoomedScreenshot"
            class="modal show d-block"
            tabindex="-1"
            style="background: rgba(0,0,0,0.75);"
            @click.self="closeScreenshotZoom"
        >
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Просмотр изображения</h5>
                        <button type="button" class="btn-close" aria-label="Закрыть" @click="closeScreenshotZoom"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img :src="zoomedScreenshot.url" :alt="zoomedScreenshot.fileName" class="report-image-zoomed" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.report-error-page {
    padding: 4rem 2rem 1rem 2rem;
    max-width: 1000px;
    margin: 0 auto;
}
.nav-tabs .nav-link {
    cursor: pointer;
    border: 1px solid #dee2e6;
    border-bottom: none;
    border-radius: 0.25rem 0.25rem 0 0;
}
.nav-tabs .nav-link.active {
    background-color: #7DA5F0;
    color: white;
    border-color: #7DA5F0;
}
.clickable {
    cursor: pointer;
}
.clickable:hover {
    background-color: #f0f4ff;
}
.report-image-preview {
    width: 120px;
    height: 90px;
    object-fit: cover;
}
.report-image-item {
    position: relative;
}
.report-image-remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    line-height: 1;
    border-radius: 999px;
    width: 22px;
    height: 22px;
    padding: 0;
}
.report-image-clickable {
    cursor: zoom-in;
}
.report-image-zoomed {
    max-width: 100%;
    max-height: 75vh;
    object-fit: contain;
}
.report-dropzone {
    border: 2px dashed #b8c7e8;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    color: #5d6a7f;
    background: #fafcff;
}
.report-dropzone--active {
    border-color: #4e87ff;
    background: #eef4ff;
    color: #2f5fbe;
}
</style>
