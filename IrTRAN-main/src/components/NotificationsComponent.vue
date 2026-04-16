<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { hasAnyRealmRole } from "@/helpers/keycloak";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationStudents,
  createNotifications,
  getNotificationsCatalog,
  getLearningDeadlines,
  saveLearningDeadline,
  deleteLearningDeadline,
  getNotificationGroups,
  saveLearningDeadlineForGroup
} from "@/helpers/API";

const loading = ref(false);
const error = ref(null);
const items = ref([]);
const unreadOnly = ref(false);
const saving = ref(false);
const saveError = ref(null);
const saveSuccess = ref(null);

const canManage = computed(() => hasAnyRealmRole(["teacher", "app-admin"]));
const students = ref([]);
const tests = ref([]);
const scenarios = ref([]);
const groups = ref([]);
const deadlines = ref([]);
const selectedStudentIds = ref([]);
const form = ref({
  title: "",
  message: "",
  type: "deadline",
  deadlineAt: "",
  link: ""
});

const unreadCount = computed(() => items.value.filter((x) => !x.is_read).length);
const deadlineForm = ref({
  userId: "",
  entityType: "test",
  entityId: "",
  deadlineAt: "",
  note: ""
});
const groupDeadlineForm = ref({
  groupId: "",
  entityType: "test",
  entityId: "",
  deadlineAt: "",
  note: ""
});
const groupDeadlineSaving = ref(false);
const groupDeadlineError = ref(null);
const groupDeadlineSuccess = ref(null);
const COMPACT_MODE_KEY = "irtran-notifications-compact-mode";
const compactMode = ref(true);
const deadlineError = ref(null);
const deadlineSuccess = ref(null);
const deadlineSaving = ref(false);
const selectedStudentDeadlines = computed(() => {
  if (!deadlineForm.value.userId) return [];
  return deadlines.value.filter((d) => String(d.user_id) === String(deadlineForm.value.userId));
});
const entityOptions = computed(() =>
  deadlineForm.value.entityType === "test" ? tests.value : scenarios.value
);
const groupEntityOptions = computed(() =>
  groupDeadlineForm.value.entityType === "test" ? tests.value : scenarios.value
);

function urgencyClass(item) {
  if (!item.deadline_at) return "text-muted";
  const d = new Date(item.deadline_at).getTime();
  if (Number.isNaN(d)) return "text-muted";
  const diff = d - Date.now();
  if (diff < 0) return "text-danger";
  if (diff < 1000 * 60 * 60 * 24 * 2) return "text-warning";
  return "text-muted";
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU");
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    items.value = await getNotifications({ unreadOnly: unreadOnly.value });
  } catch (e) {
    console.error(e);
    error.value = e.response?.data?.message || "Не удалось загрузить уведомления.";
  } finally {
    loading.value = false;
  }
}

async function readOne(item) {
  if (item.is_read) return;
  try {
    await markNotificationRead(item.id);
    await load();
  } catch (e) {
    console.error(e);
  }
}

async function readAll() {
  try {
    await markAllNotificationsRead();
    await load();
  } catch (e) {
    console.error(e);
  }
}

async function loadStudents() {
  if (!canManage.value) return;
  try {
    students.value = await getNotificationStudents();
  } catch (e) {
    console.error(e);
  }
}

async function loadGroups() {
  if (!canManage.value) return;
  try {
    groups.value = await getNotificationGroups();
  } catch (e) {
    console.error(e);
  }
}

async function loadCatalog() {
  if (!canManage.value) return;
  try {
    const c = await getNotificationsCatalog();
    tests.value = Array.isArray(c?.tests) ? c.tests : [];
    scenarios.value = Array.isArray(c?.scenarios) ? c.scenarios : [];
  } catch (e) {
    console.error(e);
  }
}

async function loadDeadlines() {
  if (!canManage.value) return;
  try {
    deadlines.value = await getLearningDeadlines();
  } catch (e) {
    console.error(e);
  }
}

async function submit() {
  saveError.value = null;
  saveSuccess.value = null;
  if (!selectedStudentIds.value.length) {
    saveError.value = "Выберите хотя бы одного студента.";
    return;
  }
  if (!form.value.title.trim()) {
    saveError.value = "Укажите заголовок уведомления.";
    return;
  }
  saving.value = true;
  try {
    const deadlineAt = form.value.deadlineAt ? new Date(form.value.deadlineAt).toISOString() : null;
    const response = await createNotifications({
      userIds: selectedStudentIds.value,
      title: form.value.title.trim(),
      message: form.value.message.trim() || null,
      type: form.value.type,
      deadlineAt,
      link: form.value.link.trim() || null
    });
    saveSuccess.value = `Создано уведомлений: ${response.created}.`;
    form.value = { title: "", message: "", type: "deadline", deadlineAt: "", link: "" };
    selectedStudentIds.value = [];
  } catch (e) {
    saveError.value = e.response?.data?.message || "Не удалось создать уведомления.";
  } finally {
    saving.value = false;
  }
}

async function submitDeadline() {
  deadlineError.value = null;
  deadlineSuccess.value = null;
  if (!deadlineForm.value.userId) {
    deadlineError.value = "Выберите студента.";
    return;
  }
  if (!deadlineForm.value.entityId) {
    deadlineError.value = "Выберите тест или сценарий.";
    return;
  }
  if (!deadlineForm.value.deadlineAt) {
    deadlineError.value = "Укажите дату и время дедлайна.";
    return;
  }
  deadlineSaving.value = true;
  try {
    await saveLearningDeadline({
      userId: deadlineForm.value.userId,
      entityType: deadlineForm.value.entityType,
      entityId: Number(deadlineForm.value.entityId),
      deadlineAt: new Date(deadlineForm.value.deadlineAt).toISOString(),
      note: deadlineForm.value.note || null
    });
    deadlineSuccess.value = "Дедлайн сохранён.";
    await loadDeadlines();
  } catch (e) {
    deadlineError.value = e.response?.data?.message || "Не удалось сохранить дедлайн.";
  } finally {
    deadlineSaving.value = false;
  }
}

function resolveEntityTitle(d) {
  if (d.entity_type === "test") {
    const t = tests.value.find((x) => Number(x.id) === Number(d.entity_id));
    return t?.title || `Тест #${d.entity_id}`;
  }
  const s = scenarios.value.find((x) => Number(x.id) === Number(d.entity_id));
  return s?.title || `Сценарий #${d.entity_id}`;
}

function getSlaStatus(deadlineAt) {
  if (!deadlineAt) return { label: "Без срока", cls: "text-muted" };
  const d = new Date(deadlineAt).getTime();
  if (Number.isNaN(d)) return { label: "Без срока", cls: "text-muted" };
  const diff = d - Date.now();
  if (diff < 0) return { label: "Просрочено", cls: "text-danger" };
  if (diff <= 24 * 60 * 60 * 1000) return { label: "Менее 24 ч", cls: "text-warning" };
  return { label: "В сроке", cls: "text-success" };
}

async function removeDeadline(id) {
  try {
    await deleteLearningDeadline(id);
    await loadDeadlines();
  } catch (e) {
    console.error(e);
  }
}

async function submitGroupDeadline() {
  groupDeadlineError.value = null;
  groupDeadlineSuccess.value = null;
  if (!groupDeadlineForm.value.groupId) {
    groupDeadlineError.value = "Выберите группу.";
    return;
  }
  if (!groupDeadlineForm.value.entityId) {
    groupDeadlineError.value = "Выберите тест или сценарий.";
    return;
  }
  if (!groupDeadlineForm.value.deadlineAt) {
    groupDeadlineError.value = "Укажите дату и время дедлайна.";
    return;
  }
  groupDeadlineSaving.value = true;
  try {
    const r = await saveLearningDeadlineForGroup({
      groupId: groupDeadlineForm.value.groupId,
      entityType: groupDeadlineForm.value.entityType,
      entityId: Number(groupDeadlineForm.value.entityId),
      deadlineAt: new Date(groupDeadlineForm.value.deadlineAt).toISOString(),
      note: groupDeadlineForm.value.note || null
    });
    groupDeadlineSuccess.value = `Готово: создано ${r.created}, обновлено ${r.updated}, студентов ${r.totalStudents}.`;
    await loadDeadlines();
  } catch (e) {
    groupDeadlineError.value = e.response?.data?.message || "Не удалось назначить дедлайн группе.";
  } finally {
    groupDeadlineSaving.value = false;
  }
}

onMounted(async () => {
  try {
    const raw = window.localStorage.getItem(COMPACT_MODE_KEY);
    if (raw != null) {
      compactMode.value = raw === "1";
    }
  } catch (_) {
    /* ignore storage issues */
  }
  await Promise.all([load(), loadStudents(), loadGroups(), loadCatalog(), loadDeadlines()]);
});

watch(compactMode, (v) => {
  try {
    window.localStorage.setItem(COMPACT_MODE_KEY, v ? "1" : "0");
  } catch (_) {
    /* ignore storage issues */
  }
});
</script>

<template>
  <div class="container mt-4 mb-5">
    <div class="d-flex justify-content-between align-items-center mb-3 notif-toolbar">
      <h4 class="mb-0">Уведомления и дедлайны</h4>
      <div class="d-flex gap-2 flex-wrap justify-content-end">
        <button type="button" class="btn btn-refresh" @click="load">Обновить</button>
        <button type="button" class="btn btn-mark-read" :disabled="unreadCount === 0" @click="readAll">
          <font-awesome-icon class="btn-ico" :icon="['fas', 'check-double']" />
          Отметить всё как прочитанное
        </button>
      </div>
    </div>

    <div v-if="canManage" class="card mb-4">
      <div class="card-header">Создать уведомление студентам</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Студенты</label>
            <select v-model="selectedStudentIds" class="form-select" multiple size="6">
              <option v-for="s in students" :key="s.id" :value="s.id">
                {{ (s.lastName || "") + " " + (s.firstName || "") }} ({{ s.email || s.username }})
              </option>
            </select>
            <div class="form-text">Можно выбрать несколько пользователей.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Тип</label>
            <select v-model="form.type" class="form-select">
              <option value="deadline">Дедлайн</option>
              <option value="warning">Предупреждение</option>
              <option value="info">Информация</option>
              <option value="success">Успех</option>
            </select>
            <label class="form-label mt-2">Дедлайн</label>
            <input v-model="form.deadlineAt" class="form-control" type="datetime-local" />
            <label class="form-label mt-2">Ссылка (опционально)</label>
            <input v-model="form.link" class="form-control" type="text" placeholder="/test-mode" />
          </div>
          <div class="col-12">
            <label class="form-label">Заголовок</label>
            <input v-model="form.title" class="form-control" type="text" />
          </div>
          <div class="col-12">
            <label class="form-label">Текст</label>
            <textarea v-model="form.message" class="form-control" rows="3" />
          </div>
        </div>
        <div class="mt-3">
          <button type="button" class="btn btn-main-action" :disabled="saving" @click="submit">
            <font-awesome-icon class="btn-ico" :icon="['fas', 'paper-plane']" />
            {{ saving ? "Сохранение..." : "Создать уведомления" }}
          </button>
          <span v-if="saveError" class="text-danger ms-3">{{ saveError }}</span>
          <span v-if="saveSuccess" class="text-success ms-3">{{ saveSuccess }}</span>
        </div>
      </div>
    </div>

    <div v-if="canManage" class="card mb-4">
      <div class="card-header">Назначить срок по тесту/сценарию</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Студент</label>
            <select v-model="deadlineForm.userId" class="form-select">
              <option value="">Выберите...</option>
              <option v-for="s in students" :key="s.id" :value="s.id">
                {{ (s.lastName || "") + " " + (s.firstName || "") }} ({{ s.email || s.username }})
              </option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Тип</label>
            <select v-model="deadlineForm.entityType" class="form-select">
              <option value="test">Тест</option>
              <option value="scenario">Сценарий</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Сущность</label>
            <select v-model="deadlineForm.entityId" class="form-select">
              <option value="">Выберите...</option>
              <option v-for="e in entityOptions" :key="e.id" :value="e.id">{{ e.title || "#" + e.id }}</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Дедлайн</label>
            <input v-model="deadlineForm.deadlineAt" class="form-control" type="datetime-local" />
          </div>
          <div class="col-md-8">
            <label class="form-label">Комментарий (опционально)</label>
            <input v-model="deadlineForm.note" class="form-control" type="text" />
          </div>
        </div>
        <div class="mt-3">
          <button type="button" class="btn btn-main-action" :disabled="deadlineSaving" @click="submitDeadline">
            <font-awesome-icon class="btn-ico" :icon="['fas', 'calendar-check']" />
            {{ deadlineSaving ? "Сохранение..." : "Сохранить дедлайн" }}
          </button>
          <span v-if="deadlineError" class="text-danger ms-3">{{ deadlineError }}</span>
          <span v-if="deadlineSuccess" class="text-success ms-3">{{ deadlineSuccess }}</span>
        </div>
        <div class="mt-3" v-if="selectedStudentDeadlines.length">
          <h6>Назначенные сроки выбранному студенту</h6>
          <div class="table-responsive">
            <table class="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Наименование</th>
                  <th>Срок</th>
                  <th>SLA</th>
                  <th>Комментарий</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in selectedStudentDeadlines" :key="d.id">
                  <td>{{ d.entity_type === "test" ? "Тест" : "Сценарий" }}</td>
                  <td>{{ resolveEntityTitle(d) }}</td>
                  <td>{{ formatDate(d.deadline_at) }}</td>
                  <td :class="getSlaStatus(d.deadline_at).cls">{{ getSlaStatus(d.deadline_at).label }}</td>
                  <td>{{ d.note || "—" }}</td>
                  <td class="text-end">
                    <button type="button" class="btn btn-sm btn-danger-action" @click="removeDeadline(d.id)">Удалить</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="canManage" class="card mb-4">
      <div class="card-header">Массово назначить срок группе</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Группа</label>
            <select v-model="groupDeadlineForm.groupId" class="form-select">
              <option value="">Выберите...</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Тип</label>
            <select v-model="groupDeadlineForm.entityType" class="form-select">
              <option value="test">Тест</option>
              <option value="scenario">Сценарий</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Сущность</label>
            <select v-model="groupDeadlineForm.entityId" class="form-select">
              <option value="">Выберите...</option>
              <option v-for="e in groupEntityOptions" :key="e.id" :value="e.id">{{ e.title || "#" + e.id }}</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Дедлайн</label>
            <input v-model="groupDeadlineForm.deadlineAt" class="form-control" type="datetime-local" />
          </div>
          <div class="col-md-8">
            <label class="form-label">Комментарий (опционально)</label>
            <input v-model="groupDeadlineForm.note" class="form-control" type="text" />
          </div>
        </div>
        <div class="mt-3">
          <button type="button" class="btn btn-main-action" :disabled="groupDeadlineSaving" @click="submitGroupDeadline">
            <font-awesome-icon class="btn-ico" :icon="['fas', 'users']" />
            {{ groupDeadlineSaving ? "Сохранение..." : "Назначить группе" }}
          </button>
          <span v-if="groupDeadlineError" class="text-danger ms-3">{{ groupDeadlineError }}</span>
          <span v-if="groupDeadlineSuccess" class="text-success ms-3">{{ groupDeadlineSuccess }}</span>
        </div>
      </div>
    </div>

    <div class="d-flex align-items-center gap-3 mb-2">
      <div class="form-check">
        <input id="unreadOnly" v-model="unreadOnly" class="form-check-input" type="checkbox" @change="load" />
        <label class="form-check-label" for="unreadOnly">Только непрочитанные</label>
      </div>
      <div class="form-check">
        <input id="compactMode" v-model="compactMode" class="form-check-input" type="checkbox" />
        <label class="form-check-label" for="compactMode">Плотный режим</label>
      </div>
      <span class="badge bg-primary">Непрочитанных: {{ unreadCount }}</span>
    </div>

    <div v-if="loading">Загрузка...</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="!items.length" class="text-muted">Уведомлений пока нет.</div>

    <div v-else class="list-group" :class="{ 'compact-list': compactMode }">
      <div
        v-for="item in items"
        :key="item.id"
        class="list-group-item list-group-item-action"
        :class="{ 'bg-light': !item.is_read }"
        @click="readOne(item)"
      >
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">{{ item.title }}</div>
            <div class="small text-muted mt-1">{{ item.message || "—" }}</div>
            <div class="small mt-1" :class="urgencyClass(item)">
              Дедлайн: {{ formatDate(item.deadline_at) }}
            </div>
            <div class="small text-muted">Создано: {{ formatDate(item.created_at) }}</div>
            <div v-if="item.link" class="small mt-1">
              <router-link :to="item.link">Перейти</router-link>
            </div>
          </div>
          <span v-if="!item.is_read" class="badge bg-warning text-dark">Новое</span>
          <span v-else class="badge bg-secondary">Прочитано</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif-toolbar h4 {
  font-size: 1.25rem;
  font-weight: 700;
}

.btn-refresh,
.btn-mark-read,
.btn-main-action {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.45rem 0.9rem;
  border-radius: 0.45rem;
  border-width: 1px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-refresh {
  color: #1f2937;
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-refresh:hover {
  background: #e5e7eb;
  border-color: #6b7280;
}

.btn-mark-read {
  color: #0b3aa8;
  background: #eaf1ff;
  border-color: #4f85eb;
}

.btn-mark-read:hover:enabled {
  color: #ffffff;
  background: #4f85eb;
  border-color: #4f85eb;
}

.btn-mark-read:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-main-action {
  color: #ffffff;
  background: #2563eb;
  border-color: #1d4ed8;
}

.btn-main-action:hover:enabled {
  color: #ffffff;
  background: #1d4ed8;
  border-color: #1e40af;
}

.btn-main-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger-action {
  color: #b91c1c;
  background: #fff5f5;
  border: 1px solid #fca5a5;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-danger-action:hover {
  color: #ffffff;
  background: #dc2626;
  border-color: #b91c1c;
}

.btn-ico {
  font-size: 0.8rem;
}

.compact-list .list-group-item {
  padding: 0.45rem 0.65rem;
}

.compact-list .fw-semibold {
  font-size: 0.93rem;
}

.compact-list .small {
  font-size: 0.77rem;
  line-height: 1.2;
}

:deep(.table.table-sm th),
:deep(.table.table-sm td) {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  vertical-align: middle;
}

:deep(.form-label) {
  margin-bottom: 0.2rem;
}

:deep(.card-header) {
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  font-weight: 600;
}

@media (max-width: 992px) {
  .notif-toolbar {
    flex-direction: column;
    align-items: stretch !important;
    gap: 0.6rem;
  }

  .notif-toolbar .d-flex {
    width: 100%;
  }

  .btn-refresh,
  .btn-mark-read,
  .btn-main-action {
    width: 100%;
  }
}
</style>
