<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { getToken } from '@/helpers/keycloak';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const loading = ref(false);
const items = ref([]);
const total = ref(0);
const query = ref('');
const queryId = ref('');
const page = ref(1);
const pageSize = ref(20);
const listError = ref('');

const lastSearchMode = ref(null); // 'id' | 'text' | null
let autoSearchTimer = null;
const isAutoClearing = ref(false);

const showForm = ref(false);
const editId = ref(null);
const formText = ref('');
const formType = ref('radiogroup');
const formOptions = ref(['', '']);
const formCorrectSingle = ref('');
const formCorrectMultiple = ref([]);
const formCorrectFree = ref('');
const formCorrectFreeList = ref('');
const formImage = ref(null);
const formError = ref('');
const formSaving = ref(false);

const QUESTION_TYPES = [
  { value: 'radiogroup', label: 'Один вариант ответа' },
  { value: 'checkbox', label: 'Несколько вариантов ответа' },
  { value: 'text', label: 'Свободный ответ (строка)' }
];

function capitalizeFirst(str) {
  if (str == null) return '';
  const s = String(str);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

onMounted(() => {
  loadData();
});

watch(
  () => queryId.value,
  (v) => {
    if (String(v || '').trim()) {
      if (query.value) {
        isAutoClearing.value = true;
        query.value = '';
        isAutoClearing.value = false;
      }
      lastSearchMode.value = 'id';
      page.value = 1;

      if (autoSearchTimer) clearTimeout(autoSearchTimer);
      autoSearchTimer = setTimeout(() => {
        const n = parseInt(queryId.value, 10);
        if (n && !Number.isNaN(n)) loadData();
      }, 300);
      return;
    }

    if (autoSearchTimer) clearTimeout(autoSearchTimer);
  }
);

watch(
  () => query.value,
  (v) => {
    if (String(v || '').trim()) {
      if (isAutoClearing.value) return;
      if (queryId.value) {
        isAutoClearing.value = true;
        queryId.value = '';
        isAutoClearing.value = false;
      }
      lastSearchMode.value = 'text';
      page.value = 1;
    }
  }
);

const idNumber = computed(() => {
  const n = queryId.value ? parseInt(queryId.value, 10) : null;
  return n && !Number.isNaN(n) ? n : null;
});

const searchStatus = computed(() => {
  if (loading.value) return '';
  if (listError.value) return '';
  if (lastSearchMode.value === 'id' && idNumber.value) {
    if (items.value.length === 0) return `По ID ${idNumber.value} ничего не найдено.`;
    return `Найден вопрос по ID ${idNumber.value}.`;
  }
  if (lastSearchMode.value === 'text' && (query.value || '').trim()) {
    return `Найдено: ${total.value} (страница ${page.value}).`;
  }
  return '';
});

function getAuthHeaders() {
  const token = getToken();
  return { Authorization: token ? `Bearer ${token}` : '' };
}

async function loadData() {
  try {
    loading.value = true;
    listError.value = '';
    const id = queryId.value ? parseInt(queryId.value, 10) : null;
    const res = await axios.get(`${apiBase}/api/questions`, {
      params: {
        id: id && !Number.isNaN(id) ? id : undefined,
        q: query.value || '',
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value
      },
      headers: getAuthHeaders()
    });
    items.value = res.data.items || [];
    total.value = res.data.total || 0;
  } catch (e) {
    console.error(e);
    listError.value = 'Не удалось загрузить список вопросов.';
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  editId.value = null;
  formText.value = '';
  formType.value = 'radiogroup';
  formOptions.value = ['', ''];
  formCorrectSingle.value = '';
  formCorrectMultiple.value = [];
  formCorrectFree.value = '';
  formCorrectFreeList.value = '';
  formImage.value = null;
  formError.value = '';
  showForm.value = true;
}

async function openEdit(q) {
  try {
    const res = await axios.get(`${apiBase}/api/questions/${q.id}`, { headers: getAuthHeaders() });
    const d = res.data;
    editId.value = d.id;
    formText.value = d.text || '';
    formType.value = d.type || 'radiogroup';
    const opts = d.options;
    formOptions.value = Array.isArray(opts) && opts.length ? opts.map((o) => (typeof o === 'object' ? o.value || o.text : o)) : ['', ''];
    if (d.type === 'checkbox') {
      formCorrectMultiple.value = Array.isArray(d.correct_answer) ? d.correct_answer : [];
    } else if (d.type === 'text') {
      formCorrectFree.value = Array.isArray(d.correct_answer) ? d.correct_answer[0] : (d.correct_answer || '');
      formCorrectFreeList.value = Array.isArray(d.correct_answer) ? d.correct_answer.join('\n') : (d.correct_answer || '');
    } else {
      formCorrectSingle.value = Array.isArray(d.correct_answer) ? d.correct_answer[0] : (d.correct_answer || '');
    }
    formImage.value = null;
    formError.value = '';
    showForm.value = true;
  } catch (e) {
    console.error(e);
    formError.value = 'Не удалось загрузить вопрос.';
  }
}

function addOptionRow() {
  formOptions.value = [...formOptions.value, ''];
}

function removeOptionRow(index) {
  formOptions.value = formOptions.value.filter((_, i) => i !== index);
}

function onFormImageChange(event) {
  const f = event.target && event.target.files && event.target.files[0];
  formImage.value = f || null;
}

function buildCorrectAnswer() {
  if (formType.value === 'checkbox') {
    return formCorrectMultiple.value;
  }
  if (formType.value === 'text') {
    const list = formCorrectFreeList.value
      .split('\n')
      .map((s) => capitalizeFirst(s.trim()))
      .filter(Boolean);
    return list.length
      ? list
      : (formCorrectFree.value ? [capitalizeFirst(formCorrectFree.value)] : null);
  }
  return formCorrectSingle.value || null;
}

async function saveQuestion() {
  formError.value = '';
  if (!formText.value.trim()) {
    formError.value = 'Введите текст вопроса.';
    return;
  }
  const options = formOptions.value.filter((s) => String(s).trim());
  if ((formType.value === 'radiogroup' || formType.value === 'checkbox') && options.length < 2) {
    formError.value = 'Добавьте хотя бы два варианта ответа.';
    return;
  }
  const correctAnswer = buildCorrectAnswer();
  if (correctAnswer === null || (formType.value !== 'text' && (Array.isArray(correctAnswer) ? correctAnswer.length === 0 : !correctAnswer))) {
    formError.value = 'Укажите правильный ответ.';
    return;
  }

  formSaving.value = true;
  try {
    const formData = new FormData();
    formData.append('text', formText.value.trim());
    formData.append('type', formType.value);
    formData.append('options', JSON.stringify(options));
    formData.append('correctAnswer', JSON.stringify(correctAnswer));
    if (formImage.value) {
      formData.append('image', formImage.value);
    }

    if (editId.value) {
      await axios.put(`${apiBase}/api/questions/${editId.value}`, formData, {
        headers: getAuthHeaders()
      });
    } else {
      await axios.post(`${apiBase}/api/questions`, formData, {
        headers: getAuthHeaders()
      });
    }
    showForm.value = false;
    await loadData();
  } catch (e) {
    console.error(e);
    formError.value = (e.response && e.response.data && e.response.data.message) || 'Не удалось сохранить вопрос.';
  } finally {
    formSaving.value = false;
  }
}

function cancelForm() {
  showForm.value = false;
}

async function deleteQuestion(q) {
  if (!confirm(`Удалить вопрос #${q.id}? Это действие нельзя отменить.`)) return;
  try {
    await axios.delete(`${apiBase}/api/questions/${q.id}`, { headers: getAuthHeaders() });
    await loadData();
  } catch (e) {
    console.error(e);
    listError.value = (e.response && e.response.data && e.response.data.message) || 'Не удалось удалить вопрос.';
  }
}

function typeLabel(type) {
  const t = QUESTION_TYPES.find((x) => x.value === type);
  return t ? t.label : type;
}
</script>

<template>
  <div class="container mt-4">
    <h5 class="mb-3">Банк заданий</h5>
    <p class="text-muted small">Вопросы собираются в общий список. Текст условия можно дополнить картинкой. Типы: один вариант, несколько вариантов, свободный ответ (учёт регистра, е/ё, с/сс, н/нн).</p>

    <div class="row mb-4">
      <div class="col-md-8">
        <label class="form-label">Поиск по тексту или тегам</label>
        <div class="input-group">
          <input v-model="query" type="text" class="form-control" placeholder="Введите запрос..." @keyup.enter="loadData" />
          <button class="btn btn-primary" type="button" @click="loadData">Найти</button>
        </div>
      </div>
      <div class="col-md-2">
        <label class="form-label">Поиск по ID</label>
        <input v-model="queryId" type="number" min="1" class="form-control" placeholder="Напр. 123" @keyup.enter="loadData" />
      </div>
      <div class="col-md-4 d-flex align-items-end">
        <button class="btn btn-success" type="button" @click="openAdd">Добавить вопрос</button>
      </div>
    </div>

    <div v-if="searchStatus" class="alert alert-info py-2">{{ searchStatus }}</div>
    <div v-if="listError" class="alert alert-danger">{{ listError }}</div>
    <div v-if="loading" class="mb-3">Загрузка...</div>

    <div v-else class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>ID</th>
            <th>Текст (начало)</th>
            <th>Тип</th>
            <th>Картинка</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in items" :key="q.id">
            <td>{{ q.id }}</td>
            <td>{{ (q.text || '').slice(0, 80) }}{{ (q.text && q.text.length > 80) ? '…' : '' }}</td>
            <td>{{ typeLabel(q.type) }}</td>
            <td>{{ q.image_path ? 'Да' : '—' }}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary me-1" type="button" @click="openEdit(q)">Изменить</button>
              <button class="btn btn-sm btn-outline-danger" type="button" @click="deleteQuestion(q)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!loading && items.length === 0" class="text-muted">В банке пока нет вопросов. Добавьте первый вопрос.</p>

    <!-- Форма добавления/редактирования -->
    <div v-if="showForm" class="card mt-4 p-4">
      <h6>{{ editId ? 'Редактирование вопроса' : 'Новый вопрос' }}</h6>
      <div v-if="formError" class="alert alert-danger">{{ formError }}</div>

      <div class="mb-3">
        <label class="form-label">Текст вопроса *</label>
        <textarea v-model="formText" class="form-control" rows="3" placeholder="Условие задания"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label">Картинка (необязательно)</label>
        <input type="file" accept="image/*" class="form-control" @change="onFormImageChange" />
      </div>

      <div class="mb-3">
        <label class="form-label">Тип ответа</label>
        <select v-model="formType" class="form-select">
          <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <template v-if="formType === 'radiogroup' || formType === 'checkbox'">
        <div class="mb-3">
          <label class="form-label">Варианты ответов</label>
          <div v-for="(opt, idx) in formOptions" :key="idx" class="input-group mb-2">
            <input v-model="formOptions[idx]" type="text" class="form-control" :placeholder="'Вариант ' + (idx + 1)" />
            <button class="btn btn-outline-secondary" type="button" @click="removeOptionRow(idx)">Удалить</button>
          </div>
          <button class="btn btn-sm btn-outline-primary" type="button" @click="addOptionRow">Добавить вариант</button>
        </div>
        <div v-if="formType === 'radiogroup'" class="mb-3">
          <label class="form-label">Правильный ответ (один)</label>
          <select v-model="formCorrectSingle" class="form-select">
            <option value="">— выберите —</option>
            <option v-for="(opt, idx) in formOptions.filter((s) => s.trim())" :key="idx" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div v-if="formType === 'checkbox'" class="mb-3">
          <label class="form-label">Правильные ответы (отметьте несколько)</label>
          <div v-for="(opt, idx) in formOptions.filter((s) => s.trim())" :key="idx" class="form-check">
            <input :id="'cb-' + idx" v-model="formCorrectMultiple" type="checkbox" class="form-check-input" :value="opt" />
            <label class="form-check-label" :for="'cb-' + idx">{{ opt }}</label>
          </div>
        </div>
      </template>

      <template v-if="formType === 'text'">
        <div class="mb-3">
          <label class="form-label">Правильный ответ (или несколько через новую строку — все засчитаются)</label>
          <textarea v-model="formCorrectFreeList" class="form-control" rows="3" placeholder="Один или несколько допустимых ответов"></textarea>
          <small class="text-muted">Учитываются: регистр, е/ё, с/сс, н/нн</small>
        </div>
      </template>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" type="button" :disabled="formSaving" @click="saveQuestion">{{ formSaving ? 'Сохранение…' : 'Сохранить' }}</button>
        <button class="btn btn-secondary" type="button" @click="cancelForm">Отмена</button>
      </div>
    </div>
  </div>
</template>
