<script setup>
import { computed, ref, watch } from 'vue';
import { makeRng, prepareAnswers } from '@/helpers/openDayScoring.js';

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  selectedIdx: { type: Number, default: null },
  seed: { type: [String, Number], default: null },
});

const emit = defineEmits(['select', 'back', 'next']);

const answers = ref([]);

watch(
  () => props.question?.id,
  (id) => {
    if (!id) return;
    const rng = makeRng(`${props.seed ?? 'x'}:${id}`);
    answers.value = prepareAnswers(props.question, rng);
  },
  { immediate: true },
);

const progress = computed(() => Math.round(((props.index + 1) / props.total) * 100));
const canNext = computed(() => props.selectedIdx != null);
</script>

<template>
  <section class="quiz-step">
    <div class="quiz-meta">
      <span class="section-index">Вопрос {{ index + 1 }} из {{ total }}</span>
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <h2 class="quiz-question">{{ question.q }}</h2>

    <div class="answer-list" role="listbox" :aria-label="question.q">
      <button
        v-for="answer in answers"
        :key="`${question.id}-${answer.idx}`"
        type="button"
        class="answer-btn"
        role="option"
        :aria-selected="selectedIdx === answer.idx"
        :class="{ selected: selectedIdx === answer.idx }"
        @click="emit('select', answer.idx)"
      >
        <span class="answer-mark" aria-hidden="true" />
        <span>{{ answer.text }}</span>
      </button>
    </div>

    <div class="quiz-nav">
      <button
        type="button"
        class="secondary-button"
        :disabled="index === 0"
        @click="emit('back')"
      >
        <b>←</b><span>Назад</span>
      </button>
      <button
        type="button"
        class="primary-button"
        :disabled="!canNext"
        @click="emit('next')"
      >
        <span>{{ index + 1 === total ? 'Показать результат' : 'Дальше' }}</span><b>→</b>
      </button>
    </div>
  </section>
</template>

<style scoped>
.quiz-step {
  display: grid;
  gap: 22px;
}

.quiz-meta {
  display: grid;
  gap: 10px;
}

.section-index {
  color: #426184;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfe7f3;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1965ff, #64e7ff);
  transition: width 0.25s ease;
}

.quiz-question {
  margin: 0;
  color: #071426;
  font-size: clamp(1.35rem, 3.4vw, 1.85rem);
  line-height: 1.25;
  font-weight: 780;
  letter-spacing: -0.02em;
}

.answer-list {
  display: grid;
  gap: 12px;
}

.answer-btn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid #d5deea;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 28px rgba(21, 49, 87, 0.06);
  color: #243247;
  text-align: left;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.answer-btn:hover {
  transform: translateY(-2px);
  border-color: #9db9ed;
  box-shadow: 0 14px 30px rgba(21, 49, 87, 0.1);
}

.answer-btn.selected {
  border-color: #1965ff;
  background: linear-gradient(180deg, #f4f8ff, #eaf1ff);
  box-shadow: 0 14px 32px rgba(25, 101, 255, 0.16);
}

.answer-mark {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 2px solid #9aadc8;
  border-radius: 50%;
}

.answer-btn.selected .answer-mark {
  border-color: #1965ff;
  background: radial-gradient(circle at center, #1965ff 0 45%, transparent 48%);
}

.quiz-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-top: 8px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.primary-button {
  padding: 15px 16px 15px 20px;
  border-radius: 16px;
  color: #fff;
  background: #1965ff;
  box-shadow: 0 16px 38px rgba(25, 101, 255, 0.28);
  font-size: 14px;
  font-weight: 760;
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.secondary-button {
  padding: 13px 16px;
  border: 1px solid #ccd7e5;
  border-radius: 16px;
  color: #344258;
  background: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 700;
}

.secondary-button b {
  color: #1965ff;
  background: #e8f0ff;
}
</style>
