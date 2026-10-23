<script setup>
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { getToken } from '@/helpers/keycloak';

const DIR_LABELS = {
  pi: 'ПИ — Программная инженерия',
  is: 'ИС — Информационные системы',
  bas: 'БАС — техническая защита',
  bi: 'БИ — организация защиты',
};

const PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: 'all', label: 'Всё время' },
];

const loading = ref(false);
const error = ref('');
const stats = ref(null);
const fromDate = ref('');
const toDate = ref('');
const activePreset = ref('all');

const apiBase = computed(
  () => (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, ''),
);

const topEntries = computed(() => {
  const s = stats.value;
  if (!s?.by_top) return [];
  return Object.keys(DIR_LABELS).map((key) => ({
    key,
    label: DIR_LABELS[key],
    count: s.by_top[key] || 0,
    percent: s.by_top_percent?.[key] ?? 0,
  }));
});

const avgEntries = computed(() => {
  const avg = stats.value?.avg_percent;
  if (!avg) return [];
  return Object.keys(DIR_LABELS).map((key) => ({
    key,
    label: DIR_LABELS[key],
    value: avg[key] == null ? '—' : `${avg[key]}%`,
  }));
});

const dropped = computed(() => stats.value?.dropped ?? Math.max(0, (stats.value?.started || 0) - (stats.value?.finished || 0)));
const dropoffRate = computed(() => stats.value?.dropoff_rate ?? 0);

function localYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyPreset(id) {
  activePreset.value = id;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (id === 'all') {
    fromDate.value = '';
    toDate.value = '';
  } else if (id === 'today') {
    const ymd = localYmd(today);
    fromDate.value = ymd;
    toDate.value = ymd;
  } else if (id === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const ymd = localYmd(y);
    fromDate.value = ymd;
    toDate.value = ymd;
  } else if (id === '7d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    fromDate.value = localYmd(from);
    toDate.value = localYmd(today);
  } else if (id === '30d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    fromDate.value = localYmd(from);
    toDate.value = localYmd(today);
  }
  loadStats();
}

function onManualDateChange() {
  activePreset.value = 'custom';
}

async function loadStats() {
  loading.value = true;
  error.value = '';
  try {
    const token = getToken();
    const params = {};
    if (fromDate.value) params.from = fromDate.value;
    if (toDate.value) params.to = toDate.value;
    const { data } = await axios.get(`${apiBase.value}/api/open-day/stats`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      params,
    });
    stats.value = data;
  } catch (e) {
    console.error(e);
    error.value = 'Не удалось загрузить статистику. Нужна роль преподавателя или администратора.';
    stats.value = null;
  } finally {
    loading.value = false;
  }
}

function formatDuration(sec) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec} сек`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} мин ${s} сек`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv() {
  const s = stats.value;
  if (!s) return;

  const lines = [];
  const push = (cols) => lines.push(cols.map(csvEscape).join(';'));

  push(['Раздел', 'Показатель', 'Значение']);
  push(['Сводка', 'Период с', fromDate.value || '—']);
  push(['Сводка', 'Период по', toDate.value || '—']);
  push(['Сводка', 'Начали тест', s.started]);
  push(['Сводка', 'Завершили', s.finished]);
  push(['Сводка', 'Не дошли до конца (drop-off)', dropped.value]);
  push(['Сводка', 'Доля завершивших, %', s.completion_rate]);
  push(['Сводка', 'Доля drop-off, %', dropoffRate.value]);
  push(['Сводка', 'Близкие результаты, чел.', s.close_count]);
  push(['Сводка', 'Близкие результаты, %', s.close_percent]);
  push(['Сводка', 'Среднее время, сек', s.avg_duration_sec ?? '']);

  for (const row of topEntries.value) {
    push(['Лидеры направлений', row.label, `${row.count} (${row.percent}%)`]);
  }
  for (const row of avgEntries.value) {
    push(['Средний % радара', row.label, row.value]);
  }
  for (const day of s.by_day || []) {
    push([
      'По дням',
      day.date,
      `начали ${day.started}; завершили ${day.finished}; drop-off ${day.dropped ?? Math.max(0, day.started - day.finished)} (${day.dropoff_rate ?? ''}%)`,
    ]);
  }

  // BOM для корректного открытия в Excel
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = localYmd(new Date());
  a.href = url;
  a.download = `open-day-stats_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => applyPreset('all'));
</script>

<template>
  <div class="open-day-stats">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
      <div>
        <h4 class="mb-1">Статистика дня открытых дверей</h4>
        <p class="text-muted small mb-0">
          Анонимные агрегаты по публичному тесту
          <code>/open-day</code>. Имена и контакты не собираются.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-outline-success btn-sm"
          :disabled="loading || !stats"
          @click="downloadCsv"
        >
          Скачать CSV
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadStats">
          Обновить
        </button>
      </div>
    </div>

    <div class="preset-row mb-3">
      <button
        v-for="p in PRESETS"
        :key="p.id"
        type="button"
        class="btn btn-sm"
        :class="activePreset === p.id ? 'btn-primary' : 'btn-outline-primary'"
        :disabled="loading"
        @click="applyPreset(p.id)"
      >
        {{ p.label }}
      </button>
      <span v-if="activePreset === 'custom'" class="badge text-bg-light border align-self-center">Свой период</span>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <label class="form-label">С даты</label>
        <input v-model="fromDate" type="date" class="form-control" @change="onManualDateChange" />
      </div>
      <div class="col-md-3">
        <label class="form-label">По дату</label>
        <input v-model="toDate" type="date" class="form-control" @change="onManualDateChange" />
      </div>
      <div class="col-md-3 d-flex align-items-end">
        <button type="button" class="btn btn-primary" :disabled="loading" @click="loadStats">
          Применить фильтр
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-muted">Загрузка…</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-if="!loading && stats">
      <div class="row g-3 mb-3">
        <div class="col-md-3 col-6">
          <div class="stat-card">
            <small>Начали тест</small>
            <strong>{{ stats.started }}</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="stat-card">
            <small>Завершили</small>
            <strong>{{ stats.finished }}</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="stat-card">
            <small>Дошли до конца</small>
            <strong>{{ stats.completion_rate }}%</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="stat-card">
            <small>Среднее время</small>
            <strong>{{ formatDuration(stats.avg_duration_sec) }}</strong>
          </div>
        </div>
      </div>

      <div class="dropoff-card mb-4">
        <div class="dropoff-head">
          <div>
            <h5 class="mb-1">Не дошли до конца (drop-off)</h5>
            <p class="text-muted small mb-0">
              Нажали «Начать», но не получили результат. Полезно смотреть нагрузку Wi‑Fi и понятность вопросов.
            </p>
          </div>
          <div class="dropoff-numbers">
            <strong>{{ dropped }}</strong>
            <span>{{ dropoffRate }}% от начавших</span>
          </div>
        </div>
        <div class="funnel" aria-hidden="true">
          <div class="funnel-started" :style="{ width: '100%' }">
            <span>Начали {{ stats.started }}</span>
          </div>
          <div
            class="funnel-finished"
            :style="{ width: `${stats.started ? Math.max(8, stats.completion_rate) : 0}%` }"
          >
            <span>Завершили {{ stats.finished }}</span>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-6">
          <h5 class="mb-3">Сильные стороны (лидеры)</h5>
          <p class="text-muted small">
            Доля завершённых прохождений, где направление вышло на первое место.
            «Близкие» результаты: {{ stats.close_count }} ({{ stats.close_percent }}%).
          </p>
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Направление</th>
                <th class="text-end">Человек</th>
                <th class="text-end">Доля</th>
                <th style="width: 40%"> </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in topEntries" :key="row.key">
                <td>{{ row.label }}</td>
                <td class="text-end">{{ row.count }}</td>
                <td class="text-end">{{ row.percent }}%</td>
                <td>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: `${Math.min(row.percent, 100)}%` }" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="col-lg-6">
          <h5 class="mb-3">Средний процент по направлениям</h5>
          <p class="text-muted small">
            Среднее значение радара среди тех, кто завершил тест.
          </p>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Направление</th>
                <th class="text-end">Средний %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in avgEntries" :key="row.key">
                <td>{{ row.label }}</td>
                <td class="text-end">{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4">
        <h5 class="mb-3">По дням</h5>
        <table v-if="stats.by_day?.length" class="table table-sm table-striped">
          <thead>
            <tr>
              <th>Дата</th>
              <th class="text-end">Начали</th>
              <th class="text-end">Завершили</th>
              <th class="text-end">Drop-off</th>
              <th class="text-end">Drop-off %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in stats.by_day" :key="day.date">
              <td>{{ day.date }}</td>
              <td class="text-end">{{ day.started }}</td>
              <td class="text-end">{{ day.finished }}</td>
              <td class="text-end">{{ day.dropped ?? Math.max(0, day.started - day.finished) }}</td>
              <td class="text-end">{{ day.dropoff_rate ?? '—' }}%</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-muted">Пока нет данных за выбранный период.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-card {
  padding: 16px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  display: grid;
  gap: 6px;
  height: 100%;
}

.stat-card small {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-card strong {
  font-size: 1.6rem;
  line-height: 1.1;
}

.dropoff-card {
  padding: 18px 20px;
  border: 1px solid #f0d2b8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff8f1, #fff);
}

.dropoff-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.dropoff-numbers {
  display: grid;
  justify-items: end;
  gap: 2px;
}

.dropoff-numbers strong {
  font-size: 1.8rem;
  line-height: 1;
  color: #b45309;
}

.dropoff-numbers span {
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
}

.funnel {
  display: grid;
  gap: 8px;
}

.funnel-started,
.funnel-finished {
  min-height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.funnel-started {
  background: #1965ff;
}

.funnel-finished {
  background: #0f9f6e;
  min-width: 0;
}

.bar-track {
  height: 8px;
  border-radius: 999px;
  background: #e8eef7;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1965ff, #64e7ff);
}
</style>
