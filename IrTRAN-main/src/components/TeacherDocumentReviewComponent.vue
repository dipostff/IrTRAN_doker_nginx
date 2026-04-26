<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import {
  getTeacherDocumentReviewSubmissions,
  getTeacherDocumentReviewSubmission,
  getTeacherDocumentReviewAuditTrail,
  getTeacherDocumentReviewMetrics,
  analyzeDocumentReviewSubmission,
  finalizeDocumentReviewSubmission,
  getDocumentReviewTemplates,
  saveDocumentReviewTemplate,
} from "@/helpers/API";

const router = useRouter();
const loading = ref(false);
const error = ref("");
const statusFilter = ref("submitted");
const submissions = ref([]);

const selectedId = ref(null);
const selected = ref(null);
const detailLoading = ref(false);
const detailError = ref("");
const auditTrail = ref([]);
const metrics = ref({
  pendingCount: 0,
  reviewedCount: 0,
  acceptedCount: 0,
  rejectedCount: 0,
  avgReviewHours: 0,
});

const reviewForm = ref({
  checkMode: "manual",
  acceptance: "accepted",
  grade: "5",
  comment: "",
  canRework: true,
});

const algorithmResult = ref(null);
const templates = ref([]);
const templateType = ref("");
const templatePayloadText = ref("");
const templateMsg = ref("");
const instructionExpanded = ref(true);
const INSTRUCTION_STATE_KEY = "docReviewInstructionExpanded";

const payloadSnapshot = computed(() => selected.value?.payload_snapshot || {});

function hasValue(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const sectionChecklist = computed(() => {
  const p = payloadSnapshot.value;
  if (!p || typeof p !== "object") return [];

  if (selected.value?.document_type === "transportation_request") {
    const sections = [
      {
        title: "Документ",
        fields: ["registration_date", "transportation_date_from", "transportation_date_to", "id_station_departure", "id_shipper", "id_cargo_group"],
      },
      {
        title: "Отправки",
        fields: ["Sendings"],
      },
      {
        title: "График подач",
        fields: ["SubmissionSchedules"],
      },
      {
        title: "Плательщики/Экспедиторы",
        fields: ["Payers"],
      },
    ];
    return sections.map((s) => {
      const filled = s.fields.filter((f) => hasValue(p[f])).length;
      return { ...s, filled, total: s.fields.length, ok: filled === s.fields.length };
    });
  }

  const genericFields = Object.keys(p);
  const filled = genericFields.filter((f) => hasValue(p[f])).length;
  return [
    {
      title: "Общий чек-лист",
      filled,
      total: genericFields.length,
      ok: filled === genericFields.length,
    },
  ];
});

const tableProblems = computed(() => {
  if (selected.value?.document_type !== "transportation_request") return [];
  const p = payloadSnapshot.value;
  const problems = [];
  if (!Array.isArray(p.Sendings) || !p.Sendings.length) {
    problems.push({ section: "Отправки", issue: "Нет ни одной отправки.", level: "critical" });
  } else {
    const uniq = new Set();
    p.Sendings.forEach((id, idx) => {
      const num = Number(id);
      if (!Number.isFinite(num) || num <= 0) {
        problems.push({ section: "Отправки", issue: `Строка ${idx + 1}: некорректный ID отправки (${id}).`, level: "critical" });
      }
      if (uniq.has(String(id))) {
        problems.push({ section: "Отправки", issue: `Строка ${idx + 1}: дублирующийся ID отправки (${id}).`, level: "warning" });
      }
      uniq.add(String(id));
    });
  }
  if (!Array.isArray(p.SubmissionSchedules) || !p.SubmissionSchedules.length) {
    problems.push({ section: "График подач", issue: "Не заполнен график подач.", level: "critical" });
  } else {
    const uniq = new Set();
    p.SubmissionSchedules.forEach((id, idx) => {
      const num = Number(id);
      if (!Number.isFinite(num) || num <= 0) {
        problems.push({ section: "График подач", issue: `Строка ${idx + 1}: некорректный ID графика (${id}).`, level: "critical" });
      }
      if (uniq.has(String(id))) {
        problems.push({ section: "График подач", issue: `Строка ${idx + 1}: дублирующийся ID графика (${id}).`, level: "warning" });
      }
      uniq.add(String(id));
    });
  }
  if (!Array.isArray(p.Payers) || !p.Payers.length) {
    problems.push({ section: "Плательщики/Экспедиторы", issue: "Не указан ни один плательщик/экспедитор.", level: "critical" });
  } else {
    const uniq = new Set();
    p.Payers.forEach((id, idx) => {
      const num = Number(id);
      if (!Number.isFinite(num) || num <= 0) {
        problems.push({ section: "Плательщики/Экспедиторы", issue: `Строка ${idx + 1}: некорректный ID плательщика (${id}).`, level: "critical" });
      }
      if (uniq.has(String(id))) {
        problems.push({ section: "Плательщики/Экспедиторы", issue: `Строка ${idx + 1}: дублирующийся ID плательщика (${id}).`, level: "warning" });
      }
      uniq.add(String(id));
    });
  }

  const dateFrom = p.transportation_date_from ? new Date(p.transportation_date_from).getTime() : null;
  const dateTo = p.transportation_date_to ? new Date(p.transportation_date_to).getTime() : null;
  if (dateFrom && dateTo && dateTo < dateFrom) {
    problems.push({ section: "Документ", issue: "Период перевозок: дата окончания раньше даты начала.", level: "critical" });
  }

  // Snapshot-level deep checks for known nested rows (if they are embedded in payload)
  if (Array.isArray(p.sendings)) {
    p.sendings.forEach((row, idx) => {
      const wagons = Number(row?.count_wagon);
      const weight = Number(row?.weight);
      if (!Number.isFinite(wagons) || wagons <= 0) {
        problems.push({ section: "Отправки", issue: `Строка ${idx + 1}: количество вагонов должно быть > 0.`, level: "critical" });
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        problems.push({ section: "Отправки", issue: `Строка ${idx + 1}: вес должен быть > 0.`, level: "critical" });
      }
      if (Number.isFinite(wagons) && Number.isFinite(weight) && wagons > 0 && weight > 0 && weight / wagons > 130) {
        problems.push({ section: "Отправки", issue: `Строка ${idx + 1}: подозрительно большой вес на вагон (${(weight / wagons).toFixed(1)} т).`, level: "info" });
      }
    });
  }

  if (Array.isArray(p.submission_schedules)) {
    p.submission_schedules.forEach((row, idx) => {
      const wagons = Number(row?.count_wagon);
      const weight = Number(row?.weight);
      if (!row?.submission_date) {
        problems.push({ section: "График подач", issue: `Строка ${idx + 1}: не указана дата подачи.`, level: "critical" });
      }
      if (!Number.isFinite(wagons) || wagons <= 0) {
        problems.push({ section: "График подач", issue: `Строка ${idx + 1}: количество вагонов должно быть > 0.`, level: "critical" });
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        problems.push({ section: "График подач", issue: `Строка ${idx + 1}: вес должен быть > 0.`, level: "critical" });
      }
    });
  }
  return problems;
});

const sortedTableProblems = computed(() => {
  const order = { critical: 0, warning: 1, info: 2 };
  return [...tableProblems.value].sort((a, b) => {
    const oa = order[a.level] ?? 99;
    const ob = order[b.level] ?? 99;
    if (oa !== ob) return oa - ob;
    return String(a.section || "").localeCompare(String(b.section || ""), "ru");
  });
});

const problemCounts = computed(() => {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const p of tableProblems.value) {
    if (p?.level === "critical") counts.critical += 1;
    else if (p?.level === "warning") counts.warning += 1;
    else counts.info += 1;
  }
  return counts;
});

function problemRowClass(level) {
  if (level === "critical") return "table-danger";
  if (level === "warning") return "table-warning";
  return "table-info";
}

function problemLevelLabel(level) {
  if (level === "critical") return "Критично";
  if (level === "warning") return "Предупреждение";
  return "Информация";
}

const combinedVerdict = computed(() => {
  const algo = selected.value?.algorithm_recommendation || algorithmResult.value?.recommendation || null;
  const teacher = reviewForm.value.acceptance || selected.value?.acceptance || null;
  if (!algo || !teacher) return { available: false };
  const match = algo === teacher;
  return {
    available: true,
    match,
    algo,
    teacher,
    text: match
      ? "Рекомендация алгоритма совпадает с решением преподавателя."
      : "Рекомендация алгоритма не совпадает с решением преподавателя.",
  };
});

const documentTypes = computed(() => {
  const set = new Set((submissions.value || []).map((x) => x.document_type).filter(Boolean));
  return Array.from(set);
});

async function loadSubmissions() {
  loading.value = true;
  error.value = "";
  try {
    submissions.value = await getTeacherDocumentReviewSubmissions({
      status: statusFilter.value || undefined,
    });
  } catch (e) {
    console.error(e);
    error.value = e.response?.data?.message || "Не удалось загрузить документы на проверку.";
  } finally {
    loading.value = false;
  }
}

async function loadMetrics() {
  try {
    metrics.value = await getTeacherDocumentReviewMetrics();
  } catch (e) {
    console.error(e);
  }
}

async function openSubmission(id) {
  selectedId.value = id;
  detailLoading.value = true;
  detailError.value = "";
  algorithmResult.value = null;
  try {
    const [detail, trail] = await Promise.all([
      getTeacherDocumentReviewSubmission(id),
      getTeacherDocumentReviewAuditTrail(id),
    ]);
    selected.value = detail;
    auditTrail.value = trail || [];
    reviewForm.value = {
      checkMode: selected.value?.check_mode || "manual",
      acceptance: selected.value?.acceptance || "accepted",
      grade: selected.value?.grade || "5",
      comment: selected.value?.teacher_comment || "",
      canRework: selected.value?.can_rework ?? true,
    };
  } catch (e) {
    console.error(e);
    detailError.value = e.response?.data?.message || "Не удалось загрузить отправку.";
  } finally {
    detailLoading.value = false;
  }
}

function openManualReviewPage() {
  if (!selectedId.value) return;
  const url = router.resolve({
    name: "document-review-manual",
    params: { id: selectedId.value },
  }).href;
  window.open(url, "_blank", "noopener");
}

async function runAlgorithm() {
  if (!selectedId.value) return;
  try {
    const result = await analyzeDocumentReviewSubmission(selectedId.value);
    algorithmResult.value = result;
    reviewForm.value.checkMode = "algorithm";
    if (result?.recommendation === "rejected") {
      reviewForm.value.acceptance = "rejected";
      if (["4", "5"].includes(reviewForm.value.grade)) {
        reviewForm.value.grade = "3";
      }
    }
  } catch (e) {
    alert(e.response?.data?.message || "Не удалось выполнить алгоритмическую проверку.");
  }
}

async function finalizeReview() {
  if (!selectedId.value) return;
  try {
    await finalizeDocumentReviewSubmission(selectedId.value, {
      checkMode: reviewForm.value.checkMode,
      acceptance: reviewForm.value.acceptance,
      grade: reviewForm.value.grade,
      comment: reviewForm.value.comment,
      canRework: reviewForm.value.canRework,
    });
    await openSubmission(selectedId.value);
    await Promise.all([loadSubmissions(), loadMetrics()]);
  } catch (e) {
    alert(e.response?.data?.message || "Не удалось сохранить результат проверки.");
  }
}

async function loadTemplates() {
  try {
    templates.value = await getDocumentReviewTemplates();
    if (!templateType.value && templates.value.length) {
      templateType.value = templates.value[0].document_type;
      templatePayloadText.value = JSON.stringify(templates.value[0].payload || {}, null, 2);
    }
  } catch (e) {
    console.error(e);
  }
}

function onTemplateTypeChange() {
  templateMsg.value = "";
  const found = (templates.value || []).find((t) => t.document_type === templateType.value);
  templatePayloadText.value = JSON.stringify(found?.payload || {}, null, 2);
}

async function saveTemplate() {
  templateMsg.value = "";
  try {
    if (!templateType.value) {
      templateMsg.value = "Выберите тип документа.";
      return;
    }
    const payload = JSON.parse(templatePayloadText.value || "{}");
    await saveDocumentReviewTemplate(templateType.value, payload);
    templateMsg.value = "Шаблон сохранен.";
    await loadTemplates();
  } catch (e) {
    templateMsg.value = e.response?.data?.message || "Не удалось сохранить шаблон.";
  }
}

onMounted(async () => {
  try {
    const saved = localStorage.getItem(INSTRUCTION_STATE_KEY);
    if (saved === "0") instructionExpanded.value = false;
    if (saved === "1") instructionExpanded.value = true;
  } catch (_) {
    // ignore localStorage errors
  }
  await Promise.all([loadSubmissions(), loadTemplates(), loadMetrics()]);
});

watch(instructionExpanded, (value) => {
  try {
    localStorage.setItem(INSTRUCTION_STATE_KEY, value ? "1" : "0");
  } catch (_) {
    // ignore localStorage errors
  }
});
</script>

<template>
  <div>
    <h4 class="mb-3">Проверка документов</h4>
    <div class="card mb-3 border-primary">
      <div class="card-header bg-light fw-semibold d-flex justify-content-between align-items-center">
        <span>Инструкция преподавателю: как работать с модулем</span>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="instructionExpanded = !instructionExpanded"
        >
          {{ instructionExpanded ? "Свернуть" : "Развернуть" }}
        </button>
      </div>
      <div v-if="instructionExpanded" class="card-body py-2">
        <ol class="mb-2 small">
          <li>Выберите отправку студента в таблице слева и нажмите <b>«Открыть»</b>.</li>
          <li>При необходимости откройте документ как страницу: <b>«Открыть как страницу документа»</b>.</li>
          <li>Проверьте чек-лист секций и блок <b>«Подсветка проблем в таблицах»</b> (приоритеты: критично/предупреждение/инфо).</li>
          <li>Для автоматической подсказки нажмите <b>«Проверить алгоритмом»</b> и сопоставьте с ручной оценкой (блок комбинированного вердикта).</li>
          <li>Заполните решение: режим проверки, <b>Принято/Не принято</b>, оценка, комментарий и флаг возможности переделки.</li>
          <li>Нажмите <b>«Выставить результат»</b> (или <b>«Переоценить результат»</b>, если документ уже был проверен).</li>
        </ol>
        <div class="small text-muted">
          Вверху страницы доступны мини-метрики по вашим проверкам, а внизу карточки — <b>Audit trail</b> по версиям документа.
        </div>
      </div>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-md-2">
        <div class="card"><div class="card-body py-2"><div class="small text-muted">Ожидают</div><div class="fw-semibold">{{ metrics.pendingCount }}</div></div></div>
      </div>
      <div class="col-md-2">
        <div class="card"><div class="card-body py-2"><div class="small text-muted">Проверено</div><div class="fw-semibold">{{ metrics.reviewedCount }}</div></div></div>
      </div>
      <div class="col-md-2">
        <div class="card"><div class="card-body py-2"><div class="small text-muted">Принято</div><div class="fw-semibold text-success">{{ metrics.acceptedCount }}</div></div></div>
      </div>
      <div class="col-md-2">
        <div class="card"><div class="card-body py-2"><div class="small text-muted">Не принято</div><div class="fw-semibold text-danger">{{ metrics.rejectedCount }}</div></div></div>
      </div>
      <div class="col-md-4">
        <div class="card"><div class="card-body py-2"><div class="small text-muted">Среднее время проверки</div><div class="fw-semibold">{{ metrics.avgReviewHours }} ч</div></div></div>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Отправки студентов</span>
            <div class="d-flex gap-2 align-items-center">
              <select v-model="statusFilter" class="form-select form-select-sm" style="width: 180px" @change="loadSubmissions">
                <option value="">Все</option>
                <option value="submitted">Отправлено на проверку</option>
                <option value="reviewed">Проверено</option>
              </select>
              <button type="button" class="btn btn-sm btn-outline-primary" @click="loadSubmissions">Обновить</button>
            </div>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="p-3 text-muted">Загрузка...</div>
            <div v-else-if="error" class="p-3 text-danger">{{ error }}</div>
            <div class="table-responsive" v-else>
              <table class="table table-sm table-striped mb-0">
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Документ</th>
                    <th>Версия</th>
                    <th>Статус</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in submissions" :key="item.id">
                    <td>{{ item.student_name || item.student_username || item.student_user_id }}</td>
                    <td>{{ item.document_type }}</td>
                    <td>{{ item.version_no }}</td>
                    <td>{{ item.status === 'submitted' ? 'Отправлено' : 'Проверено' }}</td>
                    <td>
                      <button type="button" class="btn btn-sm btn-outline-primary" @click="openSubmission(item.id)">
                        Открыть
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!submissions.length">
                    <td colspan="5" class="text-muted text-center">Нет отправок.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card mb-3">
          <div class="card-header">Проверка выбранного документа</div>
          <div class="card-body">
            <div v-if="detailLoading" class="text-muted">Загрузка отправки...</div>
            <div v-else-if="detailError" class="text-danger">{{ detailError }}</div>
            <div v-else-if="selected">
              <div class="mb-2 small text-muted">
                Документ: {{ selected.document_type }} · версия {{ selected.version_no }} · статус:
                <b>{{ selected.status }}</b>
              </div>
              <div class="mb-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary me-2"
                  @click="openManualReviewPage"
                >
                  Открыть как страницу документа
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="runAlgorithm">
                  Проверить алгоритмом
                </button>
              </div>
              <div v-if="algorithmResult" class="alert alert-info py-2">
                <div>{{ algorithmResult.summary }}</div>
                <div class="small">Рекомендация: {{ algorithmResult.recommendation === 'accepted' ? 'Принять' : 'Не принимать' }}</div>
              </div>
              <div v-if="combinedVerdict.available" :class="['alert py-2', combinedVerdict.match ? 'alert-success' : 'alert-warning']">
                <div><b>Комбинированный вердикт:</b> {{ combinedVerdict.text }}</div>
                <div class="small">
                  Алгоритм: {{ combinedVerdict.algo === 'accepted' ? 'Принять' : 'Не принимать' }} ·
                  Преподаватель: {{ combinedVerdict.teacher === 'accepted' ? 'Принять' : 'Не принимать' }}
                </div>
              </div>

              <div class="card mb-2">
                <div class="card-header py-2">Чек-лист качества по секциям</div>
                <div class="card-body py-2">
                  <div class="table-responsive">
                    <table class="table table-sm mb-0">
                      <thead><tr><th>Секция</th><th>Заполнено</th><th>Статус</th></tr></thead>
                      <tbody>
                        <tr v-for="row in sectionChecklist" :key="row.title" :class="row.ok ? '' : 'table-warning'">
                          <td>{{ row.title }}</td>
                          <td>{{ row.filled }}/{{ row.total }}</td>
                          <td>{{ row.ok ? 'ОК' : 'Есть пропуски' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="card mb-2">
                <div class="card-header py-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span>Подсветка проблем в таблицах</span>
                  <div class="small">
                    <span class="badge bg-danger me-1">Критично: {{ problemCounts.critical }}</span>
                    <span class="badge bg-warning text-dark me-1">Предупреждение: {{ problemCounts.warning }}</span>
                    <span class="badge bg-info text-dark">Инфо: {{ problemCounts.info }}</span>
                  </div>
                </div>
                <div class="card-body py-2">
                  <div v-if="!tableProblems.length" class="small text-muted">Критичных пропусков не найдено.</div>
                  <div v-else class="table-responsive">
                    <table class="table table-sm mb-0">
                      <thead><tr><th>Секция</th><th>Проблема</th><th>Приоритет</th></tr></thead>
                      <tbody>
                        <tr v-for="(p, idx) in sortedTableProblems" :key="idx" :class="problemRowClass(p.level)">
                          <td>{{ p.section }}</td>
                          <td>{{ p.issue }}</td>
                          <td>{{ problemLevelLabel(p.level) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label">Режим</label>
                  <select v-model="reviewForm.checkMode" class="form-select">
                    <option value="manual">Вручную</option>
                    <option value="algorithm">Алгоритм</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Решение</label>
                  <select v-model="reviewForm.acceptance" class="form-select">
                    <option value="accepted">Принято</option>
                    <option value="rejected">Не принято</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Оценка</label>
                  <select v-model="reviewForm.grade" class="form-select">
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                  </select>
                </div>
                <div class="col-md-8 d-flex align-items-end">
                  <div class="form-check">
                    <input id="reworkFlag" v-model="reviewForm.canRework" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="reworkFlag">Можно переделать отправленный документ</label>
                  </div>
                </div>
                <div class="col-12">
                  <label class="form-label">Комментарий преподавателя</label>
                  <textarea v-model="reviewForm.comment" class="form-control" rows="3" />
                </div>
              </div>

              <div class="mt-3">
                <button type="button" class="btn btn-primary" @click="finalizeReview">
                  {{ selected.status === 'reviewed' ? 'Переоценить результат' : 'Выставить результат' }}
                </button>
              </div>

              <div class="card mt-3">
                <div class="card-header py-2">Audit trail</div>
                <div class="card-body py-2">
                  <div class="table-responsive">
                    <table class="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Версия</th>
                          <th>Статус</th>
                          <th>Решение</th>
                          <th>Оценка</th>
                          <th>Проверено</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in auditTrail" :key="`audit-${item.id}`">
                          <td>{{ item.version_no }}</td>
                          <td>{{ item.status }}</td>
                          <td>{{ item.acceptance || '—' }}</td>
                          <td>{{ item.grade || '—' }}</td>
                          <td>{{ item.reviewed_at ? new Date(item.reviewed_at).toLocaleString('ru-RU') : '—' }}</td>
                        </tr>
                        <tr v-if="!auditTrail.length">
                          <td colspan="5" class="text-muted">История пока отсутствует.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-muted">Выберите отправку слева.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">Эталонные шаблоны (для алгоритма)</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Тип документа</label>
                <select v-model="templateType" class="form-select" @change="onTemplateTypeChange">
                  <option value="">— выбрать —</option>
                  <option v-for="dt in documentTypes" :key="dt" :value="dt">{{ dt }}</option>
                </select>
              </div>
            </div>
            <label class="form-label mt-2">Payload эталона (JSON)</label>
            <textarea v-model="templatePayloadText" class="form-control" rows="8" />
            <div class="mt-2 d-flex gap-2 align-items-center">
              <button type="button" class="btn btn-sm btn-outline-primary" @click="saveTemplate">Сохранить шаблон</button>
              <span class="small text-muted">{{ templateMsg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
