<script setup>
import { computed } from 'vue';
import { Radar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { DIRS } from '@/helpers/openDayScoring.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const props = defineProps({
  percent: { type: Object, required: true },
  labels: { type: Object, required: true },
});

const shortLabels = {
  pi: 'ПИ',
  is: 'ИС',
  bas: 'БАС',
  bi: 'БИ',
};

const data = computed(() => ({
  labels: DIRS.map((d) => shortLabels[d]),
  datasets: [
    {
      data: DIRS.map((d) => props.percent[d] ?? 0),
      fill: true,
      backgroundColor: 'rgba(25, 101, 255, 0.18)',
      borderColor: '#1965ff',
      pointBackgroundColor: '#1965ff',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#64e7ff',
      borderWidth: 2,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 25,
        backdropColor: 'transparent',
        color: '#728096',
        font: { size: 10 },
      },
      grid: { color: 'rgba(93, 106, 124, 0.22)' },
      angleLines: { color: 'rgba(93, 106, 124, 0.18)' },
      pointLabels: {
        color: '#071426',
        font: { size: 13, weight: '700' },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label(ctx) {
          return `${ctx.label}: ${ctx.raw}%`;
        },
      },
    },
  },
};
</script>

<template>
  <div class="radar-wrap">
    <Radar :data="data" :options="options" />
    <ul class="radar-legend">
      <li v-for="d in DIRS" :key="d">
        <strong>{{ shortLabels[d] }}</strong>
        <span>{{ labels[d] }}</span>
        <em>{{ percent[d] }}%</em>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.radar-wrap {
  display: grid;
  gap: 18px;
}

.radar-legend {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.radar-legend li {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  align-items: baseline;
  padding: 10px 12px;
  border: 1px solid #e2e9f3;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: #5d6a7c;
  font-size: 13px;
}

.radar-legend strong {
  color: #1965ff;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.radar-legend em {
  color: #071426;
  font-style: normal;
  font-weight: 780;
}
</style>
