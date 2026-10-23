<script setup>
import { computed, nextTick, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { toPng } from 'html-to-image';
import mascotLis from '@/assets/mascot-lis.png';
import testData from '@/data/openDay/test.json';
import { calcResult, pickQuestions } from '@/helpers/openDayScoring.js';
import { trackOpenDayFinish, trackOpenDayStart } from '@/helpers/openDayAnalytics.js';
import QuizStep from './components/QuizStep.vue';
import ResultRadar from './components/ResultRadar.vue';
import ResultCard from './components/ResultCard.vue';

const route = useRoute();
const step = ref('intro'); // intro | quiz | result
const questionIndex = ref(0);
const picks = ref({});
const saving = ref(false);
const saveError = ref('');
const cardRef = ref(null);

const seed = computed(() => {
  const raw = route.query.seed;
  if (raw == null || raw === '') return null;
  return Array.isArray(raw) ? raw[0] : raw;
});

const questions = ref(pickQuestions(testData.questions, testData.topics, seed.value));

const currentQuestion = computed(() => questions.value[questionIndex.value]);
const selectedIdx = computed(() => {
  const id = currentQuestion.value?.id;
  return id != null && picks.value[id] != null ? picks.value[id] : null;
});

const result = computed(() =>
  calcResult(questions.value, picks.value, testData.scoring.close_threshold_percent),
);

const shortName = (key) => testData.directions[key] || key;

const headline = computed(() => {
  const r = result.value;
  const tpl = testData.result_templates;
  if (r.isClose) {
    return tpl.close
      .replace('{top_name}', shortName(r.top))
      .replace('{second_name}', shortName(r.second));
  }
  return tpl.single
    .replace('{top_name}', shortName(r.top))
    .replace('{top_text}', testData.results[r.top]?.top || '');
});

const growth = computed(() => {
  const r = result.value;
  return testData.result_templates.growth
    .replace('{low_name}', shortName(r.low))
    .replace('{low_grow}', testData.results[r.low]?.grow || '');
});

function startQuiz() {
  questions.value = pickQuestions(testData.questions, testData.topics, seed.value);
  picks.value = {};
  questionIndex.value = 0;
  saveError.value = '';
  step.value = 'quiz';
  trackOpenDayStart();
}

function selectAnswer(idx) {
  const id = currentQuestion.value.id;
  picks.value = { ...picks.value, [id]: idx };
}

function goBack() {
  if (questionIndex.value > 0) questionIndex.value -= 1;
}

function goNext() {
  if (selectedIdx.value == null) return;
  if (questionIndex.value >= questions.value.length - 1) {
    step.value = 'result';
    const r = result.value;
    trackOpenDayFinish({
      top: r.top,
      second: r.second,
      low: r.low,
      isClose: r.isClose,
      percent: r.percent,
      questionIds: questions.value.map((q) => q.id),
    });
    return;
  }
  questionIndex.value += 1;
}

function restart() {
  step.value = 'intro';
  picks.value = {};
  questionIndex.value = 0;
}

async function saveCard() {
  if (!cardRef.value || saving.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    await nextTick();
    const dataUrl = await toPng(cardRef.value, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#f4f7fb',
    });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'moe-napravlenie.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Моё направление' });
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'moe-napravlenie.png';
      a.click();
    }
  } catch (e) {
    console.error(e);
    saveError.value = 'Не удалось сохранить картинку. Попробуй ещё раз или сделай скриншот.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="open-day-page">
    <div class="bg-noise" aria-hidden="true" />

    <header class="od-header">
      <RouterLink class="brand" to="/flyer">
        <span class="brand-mark"><img :src="mascotLis" alt="Лис, маскот кафедры" /></span>
        <span class="brand-copy">
          <strong>Факультет УТИИТ - Кафедра ИСИЗИ</strong>
          <small>день открытых дверей</small>
        </span>
      </RouterLink>
      <span class="header-pill">9 вопросов · ~5 минут</span>
    </header>

    <section class="shell">
      <div v-if="step === 'intro'" class="panel intro">
        <div class="eyebrow"><span></span> Профориентационный тест</div>
        <h1>
          Какое направление<br />
          тебе <em>больше подойдёт</em>?
        </h1>
        <p class="lead">{{ testData.intro }}</p>

        <ul class="dir-chips">
          <li v-for="(label, key) in testData.directions" :key="key">{{ label }}</li>
        </ul>

        <div class="actions">
          <button type="button" class="primary-button" @click="startQuiz">
            <span>Начать тест</span><b>→</b>
          </button>
        </div>
        <p class="hint">Нет правильных и неправильных ответов — смотрим на интересы.</p>
      </div>

      <div v-else-if="step === 'quiz'" class="panel quiz">
        <QuizStep
          :question="currentQuestion"
          :index="questionIndex"
          :total="questions.length"
          :selected-idx="selectedIdx"
          :seed="seed ?? 'live'"
          @select="selectAnswer"
          @back="goBack"
          @next="goNext"
        />
      </div>

      <div v-else class="panel result">
        <div class="eyebrow"><span></span> Твой результат</div>
        <h2 class="result-title">{{ headline }}</h2>
        <p class="growth">{{ growth }}</p>
        <p class="disclaimer">{{ testData.result_templates.disclaimer }}</p>

        <div class="result-grid">
          <ResultRadar :percent="result.percent" :labels="testData.directions" />
          <div>
            <div ref="cardRef" class="export-target">
              <ResultCard
                :top-key="result.top"
                :second-key="result.second"
                :is-close="result.isClose"
                :percent="result.percent"
                :labels="testData.directions"
                :results="testData.results"
              />
            </div>
            <div class="actions result-actions">
              <button type="button" class="primary-button" :disabled="saving" @click="saveCard">
                <span>{{ saving ? 'Сохраняем…' : 'Сохранить картинкой' }}</span><b>↓</b>
              </button>
              <button type="button" class="secondary-button" @click="restart">
                <span>Пройти ещё раз</span>
              </button>
            </div>
            <p v-if="saveError" class="save-error">{{ saveError }}</p>
          </div>
        </div>

        <div class="next-block">
          <h3>Что дальше?</h3>
          <p>
            Хочешь узнать больше? Подойди к стенду кафедры — расскажем про учёбу, практики
            и будущую работу. Можно также заглянуть на лендинг тренажёра ОТРЭД.
          </p>
          <div class="actions">
            <RouterLink class="secondary-button" to="/flyer">Открыть ОТРЭД <b>↗</b></RouterLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.open-day-page {
  --ink: #071426;
  --muted: #5d6a7c;
  --blue: #1965ff;
  --cyan: #64e7ff;
  --lime: #c8ff57;
  --surface: #f4f7fb;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top, 0px);
  color: var(--ink);
  background:
    radial-gradient(circle at 12% 8%, rgba(25, 101, 255, 0.12), transparent 42%),
    radial-gradient(circle at 88% 0%, rgba(100, 231, 255, 0.16), transparent 36%),
    var(--surface);
  font-family: Inter, Manrope, 'Segoe UI', Arial, sans-serif;
}

/* Убираем белую полосу сверху на мобильных: html/body/#app иначе остаются белыми */
:global(html:has(.open-day-page)),
:global(body:has(.open-day-page)),
:global(#app:has(.open-day-page)) {
  margin: 0;
  background: #f4f7fb;
}

:global(body:has(.open-day-page)) {
  display: block;
  min-height: 100%;
}

:global(#app:has(.open-day-page)) {
  min-height: 100%;
}

.bg-noise {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.18;
  background-image: radial-gradient(#205dab 0.55px, transparent 0.55px);
  background-size: 18px 18px;
  mask-image: linear-gradient(#000, transparent 85%);
}

.od-header,
.shell {
  position: relative;
  z-index: 1;
}

.od-header {
  width: min(920px, calc(100% - 28px));
  margin: 0 auto;
  padding: 14px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 14px;
  background: #0b0b0b;
  box-shadow: inset 0 0 0 1px rgba(21, 80, 160, 0.1);
}

.brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.brand-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.brand-copy strong {
  font-size: clamp(12px, 3.4vw, 14px);
  font-weight: 780;
  line-height: 1.25;
}

.brand-copy small {
  color: #728096;
  font-size: 9px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.header-pill {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 999px;
  background: rgba(246, 249, 253, 0.78);
  box-shadow: 0 10px 28px rgba(12, 30, 60, 0.06);
  color: #435168;
  font-size: 12px;
  font-weight: 700;
}

.shell {
  width: min(920px, calc(100% - 28px));
  margin: 0 auto;
  padding: 10px 0 48px;
}

.panel {
  margin: 0;
  padding: clamp(22px, 4vw, 36px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(12, 30, 60, 0.08);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: #426184;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.eyebrow span {
  width: 28px;
  height: 2px;
  background: var(--blue);
  box-shadow: 0 0 12px var(--blue);
}

h1,
.result-title {
  margin: 0 0 14px;
  font-size: clamp(1.8rem, 5vw, 2.6rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 800;
}

h1 em,
.result-title em {
  color: var(--blue);
  font-family: Georgia, serif;
  font-weight: 400;
}

.lead,
.hint,
.growth,
.disclaimer,
.next-block p {
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.65;
}

.dir-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.dir-chips li {
  padding: 8px 12px;
  border-radius: 999px;
  background: #e8f0ff;
  color: #29486f;
  font-size: 12px;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hint {
  margin-top: 16px;
  font-size: 13px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  border: 0;
  border-radius: 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 760;
  text-decoration: none;
  cursor: pointer;
}

.primary-button {
  padding: 16px 18px 16px 22px;
  color: #fff;
  background: var(--blue);
  box-shadow: 0 16px 38px rgba(25, 101, 255, 0.28);
}

.primary-button b,
.secondary-button b {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
}

.primary-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.secondary-button {
  padding: 14px 16px 14px 18px;
  border: 1px solid #ccd7e5;
  color: #344258;
  background: rgba(255, 255, 255, 0.72);
}

.secondary-button b {
  color: var(--blue);
  background: #e8f0ff;
}

.growth {
  margin-bottom: 10px;
}

.disclaimer {
  margin-bottom: 22px;
  font-size: 13px;
}

.result-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 22px;
  align-items: start;
}

.export-target {
  padding: 4px;
  background: #f4f7fb;
}

.result-actions {
  margin-top: 14px;
}

.save-error {
  margin: 10px 0 0;
  color: #b42318;
  font-size: 13px;
}

.next-block {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid #e2e9f3;
}

.next-block h3 {
  margin: 0 0 8px;
  font-size: 1.15rem;
}

@media (max-width: 820px) {
  .result-grid {
    grid-template-columns: 1fr;
  }

  .header-pill {
    display: none;
  }
}
</style>
