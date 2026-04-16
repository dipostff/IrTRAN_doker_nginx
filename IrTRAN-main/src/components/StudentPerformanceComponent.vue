<script setup>
import { ref, onMounted, computed } from "vue";
import {
  getStudentPerformance,
  postStudentProfileChangeRequest
} from "@/helpers/API";
import { isPureStudentAccount } from "@/helpers/keycloak";

const loading = ref(true);
const error = ref("");
const data = ref(null);

const editProfile = ref(false);
const form = ref({
  phone: "",
  patronymic: "",
  academic_group: "",
  student_book_id: ""
});
const submitMsg = ref("");
const submitErr = ref("");

const beginnerSessionsCompleted = computed(() => {
  const list = data.value?.beginnerScenarioSessions || [];
  return list.filter((x) => x.endedAt);
});

const identityLines = computed(() => {
  const id = data.value?.identity;
  if (!id) return [];
  return [
    { label: "Логин", value: id.username || "—" },
    { label: "E-mail (Keycloak)", value: id.email || "—" },
    { label: "Имя", value: id.firstName || "—" },
    { label: "Фамилия", value: id.lastName || "—" }
  ];
});

async function load() {
  loading.value = true;
  error.value = "";
  if (!isPureStudentAccount()) {
    error.value =
      "Этот раздел предназначен для учебного аккаунта студента без ролей «преподаватель» и «администратор тренажёра». " +
      "Если у вас в Keycloak назначены эти роли, данные успеваемости здесь недоступны — войдите под отдельным студенческим пользователем или снимите лишние роли.";
    data.value = null;
    loading.value = false;
    return;
  }
  try {
    data.value = await getStudentPerformance();
    const p = data.value?.profile;
    form.value = {
      phone: p?.phone || "",
      patronymic: p?.patronymic || "",
      academic_group: p?.academic_group || "",
      student_book_id: p?.studentBookId || ""
    };
  } catch (e) {
    console.error(e);
    error.value =
      e.response?.data?.message ||
      "Не удалось загрузить данные. Убедитесь, что у вас роль студента без ролей преподавателя и администратора.";
  } finally {
    loading.value = false;
  }
}

function openEdit() {
  submitMsg.value = "";
  submitErr.value = "";
  const p = data.value?.profile;
  form.value = {
    phone: p?.phone || "",
    patronymic: p?.patronymic || "",
    academic_group: p?.academic_group || "",
    student_book_id: p?.studentBookId || ""
  };
  editProfile.value = true;
}

async function submitProfileChange() {
  submitMsg.value = "";
  submitErr.value = "";
  try {
    await postStudentProfileChangeRequest({
      phone: form.value.phone || null,
      patronymic: form.value.patronymic || null,
      academic_group: form.value.academic_group || null,
      student_book_id: form.value.student_book_id || null
    });
    submitMsg.value =
      "Заявка отправлена. После проверки администратором данные обновятся.";
    editProfile.value = false;
    await load();
  } catch (e) {
    submitErr.value =
      e.response?.data?.message || "Не удалось отправить заявку.";
  }
}

onMounted(load);

function formatTotalTime(sec) {
  const s = Number(sec) || 0;
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} ч ${rm} мин`;
}
</script>

<template>
  <div class="container mt-3 mb-5">
    <p v-if="isPureStudentAccount()" class="text-muted small">
      Данные входа (логин, e-mail, имя и фамилия в Keycloak) отображаются для сверки; изменить их может только
      администратор в системе авторизации. Дополнительные поля ниже можно менять через заявку — после модерации
      администратором тренажёра.
    </p>

    <div v-if="loading" class="py-4">Загрузка…</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else-if="data">
      <section class="card mb-4">
        <div class="card-header fw-semibold">Регистрационные данные (Keycloak)</div>
        <div class="card-body">
          <table class="table table-sm mb-0">
            <tbody>
              <tr v-for="row in identityLines" :key="row.label">
                <th class="w-25">{{ row.label }}</th>
                <td>{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Дополнительные данные профиля</span>
          <button
            v-if="!data.pendingProfileChange"
            type="button"
            class="btn btn-sm btn-outline-primary"
            @click="openEdit"
          >
            Изменить (через модерацию)
          </button>
        </div>
        <div class="card-body">
          <div v-if="data.pendingProfileChange" class="alert alert-warning mb-0">
            Заявка на изменение данных на рассмотрении у администратора (отправлена
            {{ new Date(data.pendingProfileChange.createdAt).toLocaleString() }}).
          </div>
          <template v-else>
            <table class="table table-sm mb-3">
              <tbody>
                <tr>
                  <th class="w-25">Отчество</th>
                  <td>{{ data.profile?.patronymic || "—" }}</td>
                </tr>
                <tr>
                  <th>Телефон</th>
                  <td>{{ data.profile?.phone || "—" }}</td>
                </tr>
                <tr>
                  <th>Учебная группа</th>
                  <td>{{ data.profile?.academicGroup || "—" }}</td>
                </tr>
                <tr>
                  <th>№ зачётной книжки</th>
                  <td>{{ data.profile?.studentBookId || "—" }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!data.profile" class="text-muted small mb-0">
              Дополнительные поля ещё не заполнялись. Нажмите «Изменить», чтобы отправить первую заявку.
            </p>
          </template>
        </div>
      </section>

      <div
        v-if="editProfile"
        class="modal d-block"
        tabindex="-1"
        style="background: rgba(0, 0, 0, 0.4)"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Заявка на изменение данных</h5>
              <button type="button" class="btn-close" aria-label="Закрыть" @click="editProfile = false" />
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label">Отчество</label>
                <input v-model="form.patronymic" class="form-control" type="text" />
              </div>
              <div class="mb-2">
                <label class="form-label">Телефон</label>
                <input v-model="form.phone" class="form-control" type="text" />
              </div>
              <div class="mb-2">
                <label class="form-label">Учебная группа</label>
                <input v-model="form.academic_group" class="form-control" type="text" />
              </div>
              <div class="mb-2">
                <label class="form-label">№ зачётной книжки</label>
                <input v-model="form.student_book_id" class="form-control" type="text" />
              </div>
              <div v-if="submitErr" class="text-danger small">{{ submitErr }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="editProfile = false">Отмена</button>
              <button type="button" class="btn btn-primary" @click="submitProfileChange">Отправить на модерацию</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="submitMsg" class="alert alert-success">{{ submitMsg }}</div>

      <section class="card mb-4">
        <div class="card-header fw-semibold">Тесты</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>Тест</th>
                  <th>Прохождение</th>
                  <th>Лучший %</th>
                  <th>Попыток использовано</th>
                  <th>Осталось попыток</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in data.tests" :key="t.testId">
                  <td>{{ t.title || "Тест #" + t.testId }}</td>
                  <td>
                    <span v-if="t.attemptsUsed === 0" class="text-muted">Не начат</span>
                    <span v-else-if="t.passed" class="text-success">Зачтён</span>
                    <span v-else class="text-warning">Не зачтён</span>
                  </td>
                  <td>{{ t.bestPercent != null ? t.bestPercent + "%" : "—" }}</td>
                  <td>{{ t.attemptsUsed }}</td>
                  <td>{{ t.attemptsRemaining != null ? t.attemptsRemaining : "∞" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header fw-semibold">Сценарии (ознакомление)</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>Сценарий</th>
                  <th>Статус</th>
                  <th>Первый просмотр</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in data.scenarios" :key="s.scenarioId">
                  <td>{{ s.title }}</td>
                  <td>
                    <span :class="s.familiarized ? 'text-success' : 'text-muted'">
                      {{ s.familiarized ? "Ознакомлен" : "Не ознакомлен" }}
                    </span>
                  </td>
                  <td>
                    {{
                      s.firstViewedAt
                        ? new Date(s.firstViewedAt).toLocaleString()
                        : "—"
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header fw-semibold">Справочные материалы</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>Материал</th>
                  <th>Статус</th>
                  <th>Просмотров</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.referenceMaterials" :key="r.documentId">
                  <td>{{ r.title || r.filename }}</td>
                  <td>
                    <span :class="r.familiarized ? 'text-success' : 'text-muted'">
                      {{ r.familiarized ? "Просматривал" : "Не отмечен" }}
                    </span>
                  </td>
                  <td>{{ r.viewCount || 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="small text-muted mb-0 px-3 py-2">
            Фиксация просмотра — при скачивании файла из раздела «Справочник» (для учебного аккаунта студента).
          </p>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-header fw-semibold">Сценарий «Новичок» — сессии</div>
        <div class="card-body">
          <p class="small">
            Сессия начинается при входе в разделы «Новичок» (меню сценария, тренажёр, инструкции) и завершается при
            уходе в главное меню или в разделы вне учебных форм документов. Время и число сохранённых документов
            подсчитываются за интервал сессии.
          </p>
          <p>
            Всего завершённых запусков:
            <strong>{{ data.beginnerScenarioStats?.totalSessions ?? 0 }}</strong>
            · Суммарное время:
            <strong>{{ formatTotalTime(data.beginnerScenarioStats?.totalTimeSeconds ?? 0) }}</strong>
          </p>
          <div class="table-responsive">
            <table class="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>Начало</th>
                  <th>Окончание</th>
                  <th>Длительность</th>
                  <th>Документов сохранено</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in beginnerSessionsCompleted" :key="s.id">
                  <td>{{ new Date(s.startedAt).toLocaleString() }}</td>
                  <td>{{ new Date(s.endedAt).toLocaleString() }}</td>
                  <td>{{ s.durationFormatted || "—" }}</td>
                  <td>{{ s.documentsCount }}</td>
                </tr>
                <tr v-if="beginnerSessionsCompleted.length === 0">
                  <td colspan="4" class="text-muted">Завершённых сессий пока нет.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <button type="button" class="btn btn-outline-secondary btn-sm" @click="load">Обновить</button>
    </template>
  </div>
</template>
