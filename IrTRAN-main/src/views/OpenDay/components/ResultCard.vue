<script setup>
import { DIRS } from '@/helpers/openDayScoring.js';

defineProps({
  topKey: { type: String, required: true },
  secondKey: { type: String, default: null },
  isClose: { type: Boolean, default: false },
  percent: { type: Object, required: true },
  labels: { type: Object, required: true },
  results: { type: Object, required: true },
});

const short = { pi: 'ПИ', is: 'ИС', bas: 'БАС', bi: 'БИ' };
</script>

<template>
  <article class="result-card">
    <header class="card-head">
      <span class="eyebrow"><span></span> День открытых дверей · кафедра ИСЗИ</span>
      <h3>
        <template v-if="isClose && secondKey">
          {{ short[topKey] }} <em>и</em> {{ short[secondKey] }}
        </template>
        <template v-else>
          {{ short[topKey] }}: <em>{{ labels[topKey]?.split(':')[1]?.trim() || labels[topKey] }}</em>
        </template>
      </h3>
    </header>

    <p class="lead">{{ results[topKey]?.top }}</p>

    <div v-if="isClose && secondKey" class="close-note">
      Рядом также {{ labels[secondKey] }}. В IT навыки часто пересекаются.
    </div>

    <div class="block">
      <small>Где работают выпускники</small>
      <p>{{ results[topKey]?.works }}</p>
    </div>

    <div class="path">
      <small>Дальше</small>
      <strong>Бакалавриат → магистратура</strong>
      <p>Можно углубить выбранное направление или смежные навыки на следующем уровне.</p>
    </div>

    <ul class="mini-scores">
      <li v-for="d in DIRS" :key="d">
        <span>{{ short[d] }}</span>
        <b>{{ percent[d] }}%</b>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.result-card {
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 22px;
  background: linear-gradient(165deg, #ffffff, #eef4ff 55%, #f7fbff);
  box-shadow: 0 24px 50px rgba(22, 60, 115, 0.12);
  color: #071426;
}

.card-head {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #426184;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.eyebrow span {
  width: 24px;
  height: 2px;
  background: #1965ff;
}

h3 {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h3 em {
  color: #1965ff;
  font-family: Georgia, serif;
  font-weight: 400;
}

.lead,
.block p,
.path p,
.close-note {
  margin: 0;
  color: #5d6a7c;
  font-size: 14px;
  line-height: 1.55;
}

.close-note {
  margin: 12px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #e8f0ff;
  color: #29486f;
}

.block,
.path {
  display: grid;
  gap: 6px;
  margin-top: 16px;
}

.block small,
.path small {
  color: #426184;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.path {
  padding: 14px;
  border-radius: 16px;
  background: #071426;
  color: #fff;
}

.path small {
  color: #64e7ff;
}

.path strong {
  color: #c8ff57;
  font-size: 15px;
}

.path p {
  color: rgba(255, 255, 255, 0.72);
}

.mini-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.mini-scores li {
  display: grid;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e2e9f3;
  text-align: center;
}

.mini-scores span {
  color: #728096;
  font-size: 11px;
  font-weight: 700;
}

.mini-scores b {
  font-size: 15px;
}

@media (max-width: 520px) {
  .mini-scores {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
