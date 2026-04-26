<script setup>
import { ref, onMounted } from "vue";
import { Model } from "survey-core";
import { SurveyComponent } from "survey-vue3-ui";
import "survey-core/survey-core.min.css";
import "survey-core/i18n/russian";
import axios from "axios";
import { updateTitle } from "@/helpers/headerHelper";
import { getToken } from "@/helpers/keycloak";
import { isFreeTextAnswerCorrect } from "@/helpers/answerNormalizer";

const activeTestId = ref(null);
const surveyModel = ref(null);
const showBackButton = ref(false);
/** Журнал неправильных ответов: { index, questionTitle, userAnswer, correctAnswer } */
const wrongAnswersJournal = ref([]);

const tests = ref([]);
const loadingTests = ref(false);
const testsError = ref("");
const currentPassPercent = ref(null);
const currentMaxAttempts = ref(null);
const currentUserAttemptCount = ref(0);
const currentAttemptId = ref(null);
const lastPercent = ref(null);
const lastEarnedPoints = ref(null);
const lastMaxPoints = ref(null);
const lastPassed = ref(null);

function capitalizeFirst(str) {
  if (str == null) return "";
  const s = String(str);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isAnswerCorrect(q, userValue, correctValue) {
  if (correctValue === undefined) return false;
  const type = (q.type || "").toLowerCase();
  if (type === "comment" || type === "text") {
    return isFreeTextAnswerCorrect(String(userValue ?? ""), correctValue);
  }
  if (type === "checkbox") {
    const u = Array.isArray(userValue) ? userValue.slice().sort() : [];
    const c = Array.isArray(correctValue) ? correctValue.slice().sort() : [];
    return u.length === c.length && u.every((v, i) => String(v) === String(c[i]));
  }
  return String(userValue) === String(correctValue);
}

function buildWrongAnswersJournal(model) {
  const journal = [];
  const questions = typeof model.getAllQuestions === "function" ? model.getAllQuestions() : (model.questions || []);
  questions.forEach((q, i) => {
    const userValue = model.data[q.name];
    const correct = q.correctAnswer;
    const isCorrect = isAnswerCorrect(q, userValue, correct);
    if (!isCorrect && (userValue !== undefined || correct !== undefined)) {
      const correctDisplay = Array.isArray(correct) ? correct.join(", ") : (correct !== undefined ? String(correct) : "—");
      journal.push({
        index: i + 1,
        questionTitle: q.title || `Вопрос ${i + 1}`,
        userAnswer: userValue !== undefined && userValue !== null ? (Array.isArray(userValue) ? userValue.join(", ") : String(userValue)) : "— (нет ответа)",
        correctAnswer: correctDisplay
      });
    }
  });
  return journal;
}

async function loadTests() {
  try {
    loadingTests.value = true;
    testsError.value = "";
    const token = getToken();
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const [testsResp, summaryResp] = await Promise.all([
      axios.get(`${apiBase}/api/tests`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      }),
      axios.get(`${apiBase}/api/tests/attempts/summary`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      }),
    ]);

    const attemptsByTestId = summaryResp.data?.attemptsByTestId || {};
    tests.value =
      (testsResp.data || []).map((t) => {
        const used = Number(attemptsByTestId?.[String(t.id)] || 0);
        const maxAttempts = t.max_attempts ?? null;
        const limited = typeof maxAttempts === "number" && maxAttempts > 0;
        const remaining = limited ? Math.max(0, maxAttempts - used) : null;
        return {
          id: t.id,
          name: t.title,
          description: t.description,
          maxAttempts,
          usedAttempts: used,
          remainingAttempts: remaining,
        };
      }) || [];
  } catch (error) {
    console.error("Error loading tests:", error);
    testsError.value = "Не удалось загрузить список тестов.";
  } finally {
    loadingTests.value = false;
  }
}

async function startTest(id) {
  const test = tests.value.find((t) => t.id === id);
  if (!test) return;
  const limited =
    typeof test.maxAttempts === "number" && test.maxAttempts > 0;
  if (limited && Number(test.remainingAttempts ?? 0) <= 0) {
    testsError.value = "Для этого теста у вас больше нет попыток.";
    return;
  }

  try {
    activeTestId.value = id;
    showBackButton.value = false;
    wrongAnswersJournal.value = [];
    surveyModel.value = null;
    currentAttemptId.value = null;

    updateTitle(`Тренажёр ОТРЭД - Тест: ${test.name}`);

    const token = getToken();
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/tests/${id}/run`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );

    const data = response.data || {};
    currentPassPercent.value = data.passPercent ?? null;
    currentMaxAttempts.value = data.maxAttempts ?? null;
    currentUserAttemptCount.value = data.userAttemptCount ?? 0;

    // Списываем попытку при открытии теста
    try {
      const startResp = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/tests/${id}/attempts/start`,
        {},
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      currentAttemptId.value = startResp.data?.attemptId ?? null;
      currentUserAttemptCount.value = startResp.data?.userAttemptCount ?? currentUserAttemptCount.value;
      const idx = tests.value.findIndex((t) => t.id === id);
      if (idx >= 0) {
        const t = tests.value[idx];
        const used = Number(startResp.data?.userAttemptCount ?? (Number(t.usedAttempts || 0) + 1));
        const maxAttempts = t.maxAttempts ?? null;
        const limited = typeof maxAttempts === "number" && maxAttempts > 0;
        tests.value[idx] = {
          ...t,
          usedAttempts: used,
          remainingAttempts: limited ? Math.max(0, maxAttempts - used) : null,
        };
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "Вы исчерпали максимальное количество попыток для этого теста.";
      testsError.value = msg;
      activeTestId.value = null;
      return;
    }

    let schema = data.schema;
    if (!schema) {
      testsError.value = "Не удалось получить структуру теста.";
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    if (schema.pages && schema.pages[0] && schema.pages[0].elements) {
      const newElements = [];
      for (const el of schema.pages[0].elements) {
        if (el.imagePath) {
          const imageUrl = apiBase + el.imagePath;
          newElements.push({
            type: "html",
            name: `${el.name || "q"}_image`,
            html: `<img src="${imageUrl}" alt="" style="max-width:100%; border-radius:8px;" />`,
          });
          delete el.imagePath;
        }
        newElements.push(el);
      }
      schema.pages[0].elements = newElements;
    }

    const model = new Model(schema);
    model.locale = "ru";
    // Автоматическое приведение первой буквы ответа к верхнему регистру для открытых вопросов
    model.onValueChanging.add((sender, options) => {
      if (typeof options.value === "string" && options.value) {
        const newVal = capitalizeFirst(options.value);
        if (newVal !== options.value) {
          options.value = newVal;
        }
      }
    });
    model.onComplete.add(async () => {
      wrongAnswersJournal.value = buildWrongAnswersJournal(model);
      showBackButton.value = true;

      // Отправляем результаты попытки для панели преподавателя
      try {
        const questions =
          typeof model.getAllQuestions === 'function'
            ? model.getAllQuestions()
            : model.questions || [];
        let correct = 0;
        const total = questions.length;
        let earnedPoints = 0;
        let maxPoints = 0;
        questions.forEach((q) => {
          const userValue = model.data[q.name];
          const correctValue = q.correctAnswer;
          const pts = Number(q.points) > 0 ? Number(q.points) : 1;
          maxPoints += pts;
          if (isAnswerCorrect(q, userValue, correctValue)) {
            correct += 1;
            earnedPoints += pts;
          }
        });
        const percentByPoints =
          maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : (total > 0 ? (correct / total) * 100 : 0);
        lastPercent.value = percentByPoints;
        lastEarnedPoints.value = earnedPoints;
        lastMaxPoints.value = maxPoints;
        if (currentPassPercent.value != null) {
          lastPassed.value = percentByPoints >= currentPassPercent.value;
        } else {
          lastPassed.value = percentByPoints > 0;
        }
        const token = getToken();
        if (currentAttemptId.value) {
          await axios.patch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tests/${id}/attempts/${currentAttemptId.value}/finish`,
            {
              correctAnswers: correct,
              questionCount: total,
              earnedPoints,
              maxPoints
            },
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : ''
              }
            }
          );
        } else {
          // fallback на старый endpoint (если по какой-то причине start не отработал)
          await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tests/${id}/attempts`,
            {
              correctAnswers: correct,
              questionCount: total,
              earnedPoints,
              maxPoints
            },
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : ''
              }
            }
          );
        }
      } catch (e) {
        console.warn('Failed to record test attempt:', e);
      }
    });
    surveyModel.value = model;
  } catch (error) {
    console.error("Error starting test:", error);
    testsError.value = "Не удалось запустить тест.";
  }
}

function backToList() {
  activeTestId.value = null;
  surveyModel.value = null;
  showBackButton.value = false;
  wrongAnswersJournal.value = [];
  updateTitle("Тренажёр ОТРЭД - Режим теста");
}

onMounted(() => {
  loadTests();
});
</script>

<template>
  <div class="search-box">
    <div class="search-container">
      <p>Режим теста предназначен для проверки теоретических знаний по транспортной документации (заявка на грузоперевозку, накладная, акты). Выберите уровень сложности и пройдите тест.</p>
      <p>После завершения теста вы увидите количество правильных ответов и сможете вернуться к выбору теста или в меню.</p>
    </div>
  </div>

  <!-- Выбор теста -->
  <div v-if="!activeTestId" class="content-container">
    <h6 class="mb-3">Доступные тесты</h6>
    <div v-if="loadingTests" class="mb-3">
      Загрузка списка тестов...
    </div>
    <div v-if="testsError" class="alert alert-danger mb-3">
      {{ testsError }}
    </div>
    <div v-if="!loadingTests && !testsError && tests.length === 0" class="alert alert-info">
      Пока нет доступных тестов. Преподаватель может создать тесты во вкладках «Банк заданий» и «Конструктор тестов» (они видны при входе под ролью преподавателя или администратора).
    </div>
    <div v-else-if="!loadingTests && !testsError" class="row mt-4 justify-content-center">
      <div
        v-for="test in tests"
        :key="test.id"
        class="col-md-3"
      >
        <button
          type="button"
          class="card-square"
          style="border-radius: 10px; border: none"
          :disabled="test.maxAttempts && test.maxAttempts > 0 && test.remainingAttempts === 0"
          :class="{ 'card-square-disabled': test.maxAttempts && test.maxAttempts > 0 && test.remainingAttempts === 0 }"
          @click="startTest(test.id)"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/1508/1508866.png"
            :alt="test.name"
            style="max-width: 60px; max-height: 60px"
          />
          <span class="card-text">{{ test.name }}</span>
          <span class="card-desc">{{ test.description }}</span>
          <span v-if="test.maxAttempts && test.maxAttempts > 0" class="attempts-badges">
            <span
              class="attempts-badge"
              :class="{
                'attempts-badge-danger': test.remainingAttempts === 0,
                'attempts-badge-warn': test.remainingAttempts > 0 && test.remainingAttempts <= 2,
                'attempts-badge-ok': test.remainingAttempts > 2
              }"
            >
              Осталось: {{ test.remainingAttempts }}
            </span>
            <span class="attempts-badge attempts-badge-muted">
              Лимит: {{ test.maxAttempts }}, использовано: {{ test.usedAttempts }}
            </span>
          </span>
          <span v-else class="attempts-badges">
            <span class="attempts-badge attempts-badge-infinite">Безлимит</span>
          </span>
          <span class="card-attempts" v-if="test.maxAttempts && test.maxAttempts > 0">
            Попытки: {{ test.remainingAttempts }} из {{ test.maxAttempts }}
            <span class="card-attempts-muted">(использовано: {{ test.usedAttempts }})</span>
          </span>
          <span class="card-attempts" v-else>
            Попытки: без ограничений
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- Прохождение теста -->
  <div v-else class="survey-container">
    <SurveyComponent v-if="surveyModel" :model="surveyModel" />
    <div v-if="showBackButton" class="results-block">
      <div v-if="lastPercent !== null" class="mb-3 text-center">
        <div
          class="alert"
          :class="lastPassed ? 'alert-success' : 'alert-danger'"
        >
          <p class="mb-1 fw-bold">
            {{ lastPassed ? 'Тест сдан' : 'Тест не сдан' }}
          </p>
          <p class="mb-1">
            Ваш результат:
            <strong>{{ lastPercent.toFixed(1) }}%</strong>
            <span v-if="lastMaxPoints !== null && lastMaxPoints > 0">
              ({{ lastEarnedPoints }} из {{ lastMaxPoints }} баллов)
            </span>
          </p>
          <p v-if="currentPassPercent !== null" class="mb-0 small text-muted">
            Порог прохождения: {{ currentPassPercent }}%.
          </p>
        </div>
      </div>
      <h5 class="journal-title">Журнал неправильных ответов</h5>
      <div v-if="wrongAnswersJournal.length === 0" class="journal-empty">
        Все ответы верные. Журнал пуст.
      </div>
      <div v-else class="journal-table-wrap">
        <table class="journal-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Ваш ответ</th>
              <th>Правильный ответ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in wrongAnswersJournal" :key="row.index">
              <td>{{ row.index }}</td>
              <td>{{ row.userAnswer }}</td>
              <td>{{ row.correctAnswer }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-3 text-center">
        <button type="button" class="btn btn-primary" @click="backToList">
          Вернуться к списку тестов
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  background-color: white;
  width: 100%;
  border-bottom: solid gray 1px;
}

.search-container {
  margin: 70px 0 20px;
  padding: 0 300px;
}

.content-container {
  padding: 40px 20px;
}

.survey-container {
  margin: 70px 20px 40px;
  padding: 0 80px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.results-block {
  margin-top: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.journal-title {
  margin-bottom: 12px;
  font-weight: bold;
}

.journal-empty {
  color: #198754;
  margin-bottom: 16px;
}

.journal-table-wrap {
  overflow-x: auto;
  margin-bottom: 16px;
}

.journal-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.journal-table th,
.journal-table td {
  border: 1px solid #dee2e6;
  padding: 8px 12px;
  text-align: left;
}

.journal-table th {
  background: #7da5f0;
  color: white;
}

.journal-table td:first-child {
  font-weight: bold;
  width: 50px;
}

.card-square {
  width: 200px;
  min-height: 200px;
  background-color: #efefef;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
  cursor: pointer;
  text-align: center;
  margin: 5px;
  padding: 16px;
  margin-bottom: 20px;
}

.card-square-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-square:disabled:hover {
  background-color: #efefef;
}

.attempts-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 10px;
}

.attempts-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  background: #e7eefc;
  color: #1e3a8a;
}

.attempts-badge-muted {
  background: #eef2f7;
  color: #344054;
  font-weight: 500;
}

.attempts-badge-danger {
  background: #fde2e2;
  color: #b42318;
}

.attempts-badge-warn {
  background: #fff4cc;
  color: #7a5c00;
}

.attempts-badge-ok {
  background: #dcfce7;
  color: #166534;
}

.attempts-badge-infinite {
  background: #e0f2fe;
  color: #075985;
}

.card-square:hover {
  background-color: #4f85eb;
}

.card-square img {
  margin-bottom: 8px;
}

.card-text {
  font-weight: bold;
  font-size: 16px;
  color: #545556;
}

.card-desc {
  font-size: 12px;
  color: #777;
  margin-top: 4px;
}

.card-attempts {
  margin-top: 8px;
  font-size: 12px;
  color: #2d3748;
}

.card-attempts-muted {
  color: #667085;
}

.card-square:hover .card-text,
.card-square:hover .card-desc {
  color: white;
}

.card-square:hover .card-attempts,
.card-square:hover .card-attempts-muted {
  color: white;
}

.card-square:hover .attempts-badge {
  filter: brightness(1.05);
}
</style>
