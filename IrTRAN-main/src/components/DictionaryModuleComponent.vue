<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { getToken, updateToken } from '@/helpers/keycloak';
import {
  aggregateImportBatchStats,
  chunkRows,
  DICTIONARY_IMPORT_CHUNK_SIZE,
  parseDictionaryJsonFromText,
  parseDictionaryXlsxFile,
} from '@/helpers/dictionaryImportClient';

const activeSection = ref('intro'); // intro | update | delete | view
const dictionaries = ref([]);
const selectedForUpdate = ref('');
const selectedForDelete = ref('');
const selectedForView = ref('');

const meta = ref({ columns: {}, fieldLabels: {}, fieldOrder: null });
const metaLoadedForKey = ref('');
const rows = ref([]);
const rowsTotal = ref(0);
const currentPage = ref(1);
const pageSize = ref(100);
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
const loading = ref(false);
/** Отметки для массового удаления (только активная страница; при смене страницы сбрасываются) */
const selectedDeleteIds = ref({});
const error = ref('');
const importInfo = ref('');
const selectedImportFile = ref(null);

const apiBase = computed(
  () => `${(import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')}`
);

const hasDictionaries = computed(() => dictionaries.value.length > 0);

const activeDictKey = computed(() => {
  switch (activeSection.value) {
    case 'update':
      return selectedForUpdate.value;
    case 'delete':
      return selectedForDelete.value;
    case 'view':
      return selectedForView.value;
    default:
      return selectedForView.value;
  }
});

const totalPages = computed(() => {
  if (!rowsTotal.value) return 1;
  return Math.max(1, Math.ceil(rowsTotal.value / pageSize.value));
});

const rowsRangeLabel = computed(() => {
  if (!rowsTotal.value) return 'Нет записей';
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = Math.min(currentPage.value * pageSize.value, rowsTotal.value);
  return `${start}–${end} из ${rowsTotal.value}`;
});

function clearDeleteSelection() {
  selectedDeleteIds.value = {};
}

function setDeleteSelected(id, on) {
  const next = { ...selectedDeleteIds.value };
  if (on) next[id] = true;
  else delete next[id];
  selectedDeleteIds.value = next;
}

function selectAllRowsOnPage() {
  const next = { ...selectedDeleteIds.value };
  for (const row of rows.value) {
    if (row && row.id != null) next[row.id] = true;
  }
  selectedDeleteIds.value = next;
}

function deselectAllRowsOnPage() {
  const next = { ...selectedDeleteIds.value };
  for (const row of rows.value) {
    if (row && row.id != null) delete next[row.id];
  }
  selectedDeleteIds.value = next;
}

const selectedDeleteCount = computed(
  () => Object.keys(selectedDeleteIds.value).length
);

async function reloadDictionaryPage(key) {
  if (!key) return;
  await loadDictionary(key);
  const tp = totalPages.value;
  if (currentPage.value > tp) {
    currentPage.value = tp;
    await loadDictionary(key);
  }
}

async function reloadDictionaryPageAndClearSelection(key) {
  await reloadDictionaryPage(key);
  clearDeleteSelection();
}

async function postDeleteBatch(key, body) {
  await updateToken(30).catch(() => {});
  return axios.post(
    `${apiBase.value}/api/dictionaries/${key}/rows/delete-batch`,
    body,
    {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      timeout: 0
    }
  );
}

const DICTIONARY_DELETE_CLIENT_CHUNK = 2000;

async function deleteSelectedBulk() {
  const key = selectedForDelete.value;
  if (!key) return;
  const ids = Object.keys(selectedDeleteIds.value)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) {
    error.value = 'Отметьте хотя бы одну запись на текущей странице.';
    return;
  }
  // eslint-disable-next-line no-alert
  if (
    !window.confirm(
      `Удалить выбранные записи (${ids.length} шт.) из справочника? Операция необратима.`
    )
  ) {
    return;
  }
  try {
    loading.value = true;
    error.value = '';
    for (let i = 0; i < ids.length; i += DICTIONARY_DELETE_CLIENT_CHUNK) {
      const slice = ids.slice(i, i + DICTIONARY_DELETE_CLIENT_CHUNK);
      await postDeleteBatch(key, { ids: slice });
    }
    await reloadDictionaryPageAndClearSelection(key);
  } catch (e) {
    console.error('Bulk delete error:', e);
    error.value =
      e?.response?.data?.message || 'Не удалось удалить выбранные записи.';
  } finally {
    loading.value = false;
  }
}

async function deleteAllInDictionary() {
  const key = selectedForDelete.value;
  if (!key) return;
  const d = dictionaries.value.find((x) => x.key === key);
  const label = d?.label || key;
  // eslint-disable-next-line no-alert
  if (
    !window.confirm(
      `Удалить ВСЕ записи справочника «${label}»? Операция необратима.`
    )
  ) {
    return;
  }
  // eslint-disable-next-line no-alert
  if (!window.confirm('Подтвердите полное удаление ещё раз.')) {
    return;
  }
  try {
    loading.value = true;
    error.value = '';
    await postDeleteBatch(key, { deleteAll: true });
    currentPage.value = 1;
    await reloadDictionaryPageAndClearSelection(key);
  } catch (e) {
    console.error('Delete all error:', e);
    error.value =
      e?.response?.data?.message || 'Не удалось удалить все записи справочника.';
  } finally {
    loading.value = false;
  }
}

function goToPage(p) {
  const next = Math.min(Math.max(1, p), totalPages.value);
  if (next === currentPage.value) return;
  currentPage.value = next;
  clearDeleteSelection();
  const key = activeDictKey.value;
  if (key) loadDictionary(key);
}

watch(pageSize, (n, o) => {
  if (n === o) return;
  currentPage.value = 1;
  const key = activeDictKey.value;
  if (key && activeSection.value !== 'intro') loadDictionary(key);
});

watch(activeSection, (s) => {
  clearDeleteSelection();
  if (s === 'intro') return;
  currentPage.value = 1;
  const key = activeDictKey.value;
  if (key) loadDictionary(key);
});

function getAuthHeaders() {
  const token = getToken();
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
}

async function loadDictionaries() {
  try {
    loading.value = true;
    error.value = '';
    const { data } = await axios.get(`${apiBase.value}/api/dictionaries`, {
      headers: getAuthHeaders()
    });
    dictionaries.value = Array.isArray(data) ? data : [];
    if (!selectedForUpdate.value && dictionaries.value.length) {
      selectedForUpdate.value = dictionaries.value[0].key;
      selectedForDelete.value = dictionaries.value[0].key;
      selectedForView.value = dictionaries.value[0].key;
      await loadDictionary(selectedForView.value);
    }
  } catch (e) {
    console.error('Error loading dictionaries:', e);
    error.value = 'Не удалось загрузить список справочников.';
  } finally {
    loading.value = false;
  }
}

async function loadDictionary(key, opts = {}) {
  const resetPage = opts.resetPage === true;
  if (!key) return;
  if (resetPage) currentPage.value = 1;
  try {
    loading.value = true;
    error.value = '';
    const offset = Math.max(0, (currentPage.value - 1) * pageSize.value);
    const needMeta = metaLoadedForKey.value !== key;

    let metaResp = null;
    let rowsResp;
    if (needMeta) {
      [metaResp, rowsResp] = await Promise.all([
        axios.get(`${apiBase.value}/api/dictionaries/${key}/meta`, {
          headers: getAuthHeaders()
        }),
        axios.get(`${apiBase.value}/api/dictionaries/${key}/rows`, {
          headers: getAuthHeaders(),
          params: {
            limit: pageSize.value,
            offset
          }
        })
      ]);
      meta.value = metaResp.data || {};
      metaLoadedForKey.value = key;
    } else {
      rowsResp = await axios.get(`${apiBase.value}/api/dictionaries/${key}/rows`, {
        headers: getAuthHeaders(),
        params: {
          limit: pageSize.value,
          offset
        }
      });
    }

    rows.value = (rowsResp.data && rowsResp.data.items) || [];
    const t = rowsResp.data && rowsResp.data.total;
    rowsTotal.value = Number.isFinite(Number(t)) ? Number(t) : rows.value.length;
  } catch (e) {
    console.error('Error loading dictionary:', e);
    error.value = 'Не удалось загрузить данные выбранного справочника.';
  } finally {
    loading.value = false;
  }
}

function onImportFileChange(event) {
  const [file] = (event?.target?.files || []);
  selectedImportFile.value = file || null;
}

async function postDictionaryBatch(key, rows, batchMeta = null) {
  await updateToken(30).catch(() => {});
  const { data } = await axios.post(
    `${apiBase.value}/api/dictionaries/${key}/import-batch`,
    { rows, ...(batchMeta ? { batchMeta } : {}) },
    {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      timeout: 0
    }
  );
  return data?.stats;
}

async function importFromFileMultipartFallback(key, file) {
  await updateToken(30).catch(() => {});
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post(`${apiBase.value}/api/dictionaries/${key}/import`, formData, {
    headers: {
      ...getAuthHeaders()
    },
    timeout: 0
  });
  return data?.stats;
}

async function importFromFile() {
  const key = selectedForUpdate.value;
  if (!key) return;
  if (!selectedImportFile.value) {
    error.value = 'Выберите файл для импорта (.json или .xlsx).';
    return;
  }

  const fileName = selectedImportFile.value.name || '';
  const lower = fileName.toLowerCase();
  if (!lower.endsWith('.json') && !lower.endsWith('.xlsx')) {
    error.value = 'Поддерживаются только файлы формата .json и .xlsx.';
    return;
  }

  const isXlsx = lower.endsWith('.xlsx');

  try {
    loading.value = true;
    error.value = '';
    importInfo.value = '';
    await updateToken(30).catch(() => {});

    let rawRows = null;

    if (isXlsx) {
      try {
        rawRows = await parseDictionaryXlsxFile(selectedImportFile.value);
      } catch (parseErr) {
        console.error('Dictionary XLSX parse error:', parseErr);
        error.value =
          'Не удалось прочитать Excel (.xlsx): проверьте, что файл сохранён как .xlsx и не повреждён. ' +
          String(parseErr?.message || parseErr || '');
        return;
      }
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        error.value =
          'В Excel не найдено строк с данными (проверьте листы: данные не на скрытом листе и первая строка — заголовки колонок). ' +
          'Импорт больших файлов выполняется только пакетным способом — старая загрузка одним файлом отключена для .xlsx, чтобы не было таймаута 504.';
        return;
      }
    } else {
      try {
        const text = await selectedImportFile.value.text();
        rawRows = parseDictionaryJsonFromText(text, key);
      } catch (parseErr) {
        rawRows = null;
      }
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        rawRows = null;
      }
    }

    if (Array.isArray(rawRows) && rawRows.length > 0) {
      const parts = chunkRows(rawRows, DICTIONARY_IMPORT_CHUNK_SIZE);
      const totalRows = rawRows.length;
      let aggregated = {
        total: 0,
        inserted: 0,
        updated: 0,
        skipped: 0
      };

      let rowsDoneVisually = 0;
      importInfo.value = `Импорт пакетами по ${DICTIONARY_IMPORT_CHUNK_SIZE} строк (всего ${totalRows}). Ожидание…`;

      for (let pi = 0; pi < parts.length; pi += 1) {
        const slice = parts[pi];
        const statsPart = await postDictionaryBatch(key, slice, {
          index: pi + 1,
          sliceCount: parts.length,
          fileName,
          declaredTotalRows: totalRows
        });
        aggregated = aggregateImportBatchStats(aggregated, statsPart);
        rowsDoneVisually += slice.length;
        importInfo.value = `Обработано примерно ${rowsDoneVisually} из ${totalRows} строк (запрос ${
          pi + 1
        }/${parts.length})…`;
      }

      importInfo.value = `Импорт завершён: строк в файле ${totalRows}; по пакетам — записей всего ${
        aggregated.total || 0
      }, добавлено ${aggregated.inserted || 0}, обновлено ${aggregated.updated || 0}, пропущено ${
        aggregated.skipped || 0
      }.`;
      await loadDictionary(key, { resetPage: true });
      selectedImportFile.value = null;
      return;
    }

    if (!isXlsx) {
      const stats = await importFromFileMultipartFallback(key, selectedImportFile.value);
      importInfo.value = `Импорт завершён: всего ${stats?.total ?? 0}, добавлено ${
        stats?.inserted ?? 0
      }, обновлено ${stats?.updated ?? 0}, пропущено ${stats?.skipped ?? 0}.`;
      await loadDictionary(key, { resetPage: true });
      selectedImportFile.value = null;
      return;
    }
  } catch (e) {
    console.error('Error importing dictionary file:', e);
    error.value =
      e?.response?.data?.message || 'Не удалось импортировать данные из файла.';
  } finally {
    loading.value = false;
  }
}

async function downloadTemplate(format) {
  const key = selectedForUpdate.value;
  if (!key) return;
  try {
    loading.value = true;
    error.value = '';
    const ext = format === 'xlsx' ? 'xlsx' : 'json';
    const response = await axios.get(`${apiBase.value}/api/dictionaries/${key}/template`, {
      headers: getAuthHeaders(),
      params: { format: ext },
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dictionary-template-${key}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error downloading dictionary template:', e);
    error.value = 'Не удалось скачать шаблон файла.';
  } finally {
    loading.value = false;
  }
}

const visibleColumns = computed(() => {
  const m = meta.value || {};
  const cols = m.columns || {};
  let names = Object.keys(cols).filter((col) => col !== 'id');
  if (Array.isArray(m.fieldOrder) && m.fieldOrder.length) {
    const orderSet = new Set(m.fieldOrder);
    const ordered = m.fieldOrder.filter((c) => names.includes(c));
    const rest = names.filter((c) => !orderSet.has(c));
    names = [...ordered, ...rest];
  }
  return names;
});

const newRow = ref({});
const editRowId = ref(null);
const editRowData = ref({});

function startCreate() {
  newRow.value = {};
}

async function createRow() {
  const key = selectedForUpdate.value;
  if (!key) return;
  try {
    loading.value = true;
    error.value = '';
    await axios.post(
      `${apiBase.value}/api/dictionaries/${key}/rows`,
      newRow.value,
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );
    await loadDictionary(key);
    newRow.value = {};
  } catch (e) {
    console.error('Error creating dictionary row:', e);
    error.value = 'Не удалось создать запись в справочнике.';
  } finally {
    loading.value = false;
  }
}

function startEdit(row) {
  editRowId.value = row.id;
  editRowData.value = { ...row };
}

async function saveEdit() {
  const key = selectedForUpdate.value;
  const id = editRowId.value;
  if (!key || !id) return;
  const payload = { ...editRowData.value };
  delete payload.id;
  try {
    loading.value = true;
    error.value = '';
    await axios.patch(
      `${apiBase.value}/api/dictionaries/${key}/rows/${id}`,
      payload,
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      }
    );
    await loadDictionary(key);
    editRowId.value = null;
    editRowData.value = {};
  } catch (e) {
    console.error('Error updating dictionary row:', e);
    error.value = 'Не удалось обновить запись справочника.';
  } finally {
    loading.value = false;
  }
}

async function deleteRow(row) {
  const key = selectedForDelete.value;
  if (!key || !row || !row.id) return;
  // eslint-disable-next-line no-alert
  if (!window.confirm('Вы уверены, что хотите удалить запись справочника?')) {
    return;
  }
  try {
    loading.value = true;
    error.value = '';
    await axios.delete(
      `${apiBase.value}/api/dictionaries/${key}/rows/${row.id}`,
      {
        headers: getAuthHeaders()
      }
    );
    await reloadDictionaryPageAndClearSelection(key);
  } catch (e) {
    console.error('Error deleting dictionary row:', e);
    error.value = 'Не удалось удалить запись справочника.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDictionaries();
});
</script>

<template>
  <div>
    <h3 class="mb-3">Заполнение справочников по работе с транспортной документацией</h3>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeSection === 'intro' }"
          @click="activeSection = 'intro'"
        >
          Вступление
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeSection === 'update' }"
          @click="activeSection = 'update'"
        >
          Обновление справочников
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeSection === 'delete' }"
          @click="activeSection = 'delete'"
        >
          Удаление данных
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeSection === 'view' }"
          @click="activeSection = 'view'"
        >
          Просмотр данных
        </button>
      </li>
    </ul>

    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <div v-if="activeSection === 'intro'">
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">
            Добро пожаловать в модуль «Заполнение справочников по работе с транспортной
            документацией»
          </h5>
          <p class="card-text">
            Этот модуль предназначен для администраторов справочников тренажёра ОТРЭД. Здесь
            вы можете дополнять, актуализировать и просматривать нормативно-справочную
            информацию, которая используется в документах: заявках на перевозку, накладных и
            других формах.
          </p>
          <p class="card-text">
            <strong>Краткая инструкция по работе:</strong>
          </p>
          <ul>
            <li>
              В разделе <strong>«Обновление справочников»</strong> выберите нужный
              справочник и добавьте новые записи или отредактируйте существующие.
            </li>
            <li>
              В разделе <strong>«Удаление данных»</strong> можно удалить ошибочные записи —
              по одной, несколько отмеченных на странице или все записи справочника (с двойным
              подтверждением).
            </li>
            <li>
              В разделах с таблицами данные показываются <strong>постранично</strong> (можно выбрать
              число строк на страницу). В блоке «Просмотр» слева — справочники, справа — страница
              таблицы.
            </li>
          </ul>
          <p class="card-text">
            Все операции доступны только пользователям с особыми правами. Перед внесением
            изменений убедитесь, что вы понимаете, как они отразятся на работе модулей
            тренажёра.
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="activeSection === 'update'">
      <h5 class="mb-3">Обновление справочников</h5>
      <div class="row mb-3">
        <div class="col-md-6">
          <label class="form-label">Выберите справочник для редактирования</label>
          <select
            v-model="selectedForUpdate"
            class="form-select"
            @change="loadDictionary(selectedForUpdate, { resetPage: true })"
          >
            <option v-if="!hasDictionaries" disabled value="">
              Справочники не найдены
            </option>
            <option v-for="d in dictionaries" :key="d.key" :value="d.key">
              {{ d.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="meta.importGuide" class="alert alert-info">
        <div class="fw-semibold mb-2">Инструкция по загрузке</div>
        <div class="mb-1">Поддерживаемые форматы: {{ meta.importGuide.acceptedFormats?.join(', ') }}</div>
        <div class="mb-1">{{ meta.importGuide.requiredLanguageHint }}</div>
        <div class="mb-1">{{ meta.importGuide.matchingRules }}</div>
        <div v-if="meta.importGuide.requiredFields?.length" class="mb-1">
          Обязательные поля: <strong>{{ meta.importGuide.requiredFields.join(', ') }}</strong>
        </div>
        <div v-if="meta.importGuide.xlsxTemplate?.headerRow?.length" class="mb-1">
          Шаблон XLSX (строка заголовков):
          <code>{{ meta.importGuide.xlsxTemplate.headerRow.join(', ') }}</code>
        </div>
        <div v-if="meta.importGuide.jsonTemplate?.example" class="mb-1">
          Шаблон JSON (пример объекта):
          <code>{{ meta.importGuide.jsonTemplate.example }}</code>
        </div>
        <ul class="mb-0">
          <li v-for="tip in meta.importGuide.uploadTips || []" :key="tip">{{ tip }}</li>
        </ul>
        <div v-if="meta.importGuide.exportTips?.length" class="mt-2 fw-semibold">
          Инструкция для подготовки/выгрузки файла
        </div>
        <ul v-if="meta.importGuide.exportTips?.length" class="mb-0">
          <li v-for="tip in meta.importGuide.exportTips" :key="`exp-${tip}`">{{ tip }}</li>
        </ul>
        <div v-if="meta.importGuide.dictionaryNotes?.length" class="mt-2 fw-semibold">
          Примечания для выбранного справочника
        </div>
        <ul v-if="meta.importGuide.dictionaryNotes?.length" class="mb-0">
          <li v-for="note in meta.importGuide.dictionaryNotes" :key="`note-${note}`">
            {{ note }}
          </li>
        </ul>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">Загрузить из файла</h6>
          <p class="text-muted mb-2">
            Загрузите .json или .xlsx файл, чтобы автоматически добавить/обновить записи
            выбранного справочника.
          </p>
          <div class="row g-2 align-items-end">
            <div class="col-md-6">
              <label class="form-label">Файл</label>
              <input
                type="file"
                class="form-control"
                accept=".json,.xlsx"
                @change="onImportFileChange"
              />
            </div>
            <div class="col-md-3">
              <button
                type="button"
                class="btn btn-primary w-100"
                :disabled="loading || !selectedImportFile"
                @click="importFromFile"
              >
                Загрузить из файла
              </button>
            </div>
            <div class="col-md-3">
              <div class="d-grid gap-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading"
                  @click="downloadTemplate('json')"
                >
                  Скачать шаблон JSON
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading"
                  @click="downloadTemplate('xlsx')"
                >
                  Скачать шаблон XLSX
                </button>
              </div>
            </div>
          </div>
          <div v-if="importInfo" class="alert alert-success mt-3 mb-0">
            {{ importInfo }}
          </div>
        </div>
      </div>

      <div v-if="loading">Загрузка данных...</div>

      <div v-if="!loading && visibleColumns.length">
        <h6>Текущие данные</h6>
        <div
          class="dictionary-pager d-flex flex-wrap align-items-center gap-2 mb-2 text-muted small"
        >
          <span>{{ rowsRangeLabel }}</span>
          <label class="mb-0"
            >На странице
            <select
              v-model.number="pageSize"
              class="form-select form-select-sm d-inline-block w-auto ms-1"
              style="min-width: 5rem"
            >
              <option v-for="ps in PAGE_SIZE_OPTIONS" :key="ps" :value="ps">
                {{ ps }}
              </option>
            </select>
          </label>
          <div class="btn-group btn-group-sm ms-1" role="group">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage <= 1"
              title="В начало"
              @click="goToPage(1)"
            >
              ««
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage <= 1"
              title="Назад"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            <button type="button" class="btn btn-outline-secondary" disabled>
              {{ currentPage }} / {{ totalPages }}
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage >= totalPages"
              title="Вперёд"
              @click="goToPage(currentPage + 1)"
            >
              ›
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage >= totalPages"
              title="В конец"
              @click="goToPage(totalPages)"
            >
              »»
            </button>
          </div>
        </div>
        <div class="table-responsive mb-3">
          <table class="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th v-for="col in visibleColumns" :key="col">
                  {{ meta.fieldLabels?.[col] || col }}
                </th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>{{ row.id }}</td>
                <td v-for="col in visibleColumns" :key="col">
                  {{ row[col] }}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="startEdit(row)"
                  >
                    Редактировать
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td :colspan="visibleColumns.length + 2" class="text-center">
                  Записей в справочнике пока нет.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h6>Добавление новой записи</h6>
        <div class="row g-2 mb-3">
            <div v-for="col in visibleColumns" :key="col" class="col-md-4">
            <label class="form-label">{{ meta.fieldLabels?.[col] || col }}</label>
            <input v-model="newRow[col]" type="text" class="form-control" />
          </div>
        </div>
        <button type="button" class="btn btn-success" @click="createRow">
          Добавить запись
        </button>

        <div v-if="editRowId" class="mt-4">
          <h6>Редактирование записи #{{ editRowId }}</h6>
          <div class="row g-2 mb-3">
            <div v-for="col in visibleColumns" :key="col" class="col-md-4">
              <label class="form-label">{{ meta.fieldLabels?.[col] || col }}</label>
              <input v-model="editRowData[col]" type="text" class="form-control" />
            </div>
          </div>
          <button type="button" class="btn btn-primary me-2" @click="saveEdit">
            Сохранить изменения
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="(editRowId = null), (editRowData = {})"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="activeSection === 'delete'">
      <h5 class="mb-3">Удаление данных</h5>
      <div class="row mb-3">
        <div class="col-md-6">
          <label class="form-label">Выберите справочник для удаления записей</label>
          <select
            v-model="selectedForDelete"
            class="form-select"
            @change="loadDictionary(selectedForDelete, { resetPage: true })"
          >
            <option v-if="!hasDictionaries" disabled value="">
              Справочники не найдены
            </option>
            <option v-for="d in dictionaries" :key="d.key" :value="d.key">
              {{ d.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="loading">Загрузка данных...</div>

      <div v-if="!loading && visibleColumns.length">
        <div class="alert alert-warning">
          Внимание: удаление записей из справочников может повлиять на работу модулей
          тренажёра и сохранённых документов. Используйте эту функцию осторожно.
          Отметки чекбоксов действуют на <strong>текущую страницу</strong>; перейдите по страницам,
          чтобы отметить строки подряд несколькими шагами.
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-danger"
            :disabled="loading || selectedDeleteCount < 1"
            @click="deleteSelectedBulk"
          >
            Удалить выбранные{{ selectedDeleteCount ? ` (${selectedDeleteCount})` : '' }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loading || !rows.length"
            @click="selectAllRowsOnPage"
          >
            На странице: выбрать все
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loading || selectedDeleteCount < 1"
            @click="deselectAllRowsOnPage"
          >
            Снять выбор на странице
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger ms-md-auto"
            :disabled="loading"
            @click="deleteAllInDictionary"
          >
            Удалить все записи справочника
          </button>
        </div>
        <div
          class="dictionary-pager d-flex flex-wrap align-items-center gap-2 mb-2 text-muted small"
        >
          <span>{{ rowsRangeLabel }}</span>
          <label class="mb-0"
            >На странице
            <select
              v-model.number="pageSize"
              class="form-select form-select-sm d-inline-block w-auto ms-1"
              style="min-width: 5rem"
            >
              <option v-for="ps in PAGE_SIZE_OPTIONS" :key="ps" :value="ps">
                {{ ps }}
              </option>
            </select>
          </label>
          <div class="btn-group btn-group-sm ms-1" role="group">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage <= 1"
              title="В начало"
              @click="goToPage(1)"
            >
              ««
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage <= 1"
              title="Назад"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            <button type="button" class="btn btn-outline-secondary" disabled>
              {{ currentPage }} / {{ totalPages }}
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage >= totalPages"
              title="Вперёд"
              @click="goToPage(currentPage + 1)"
            >
              ›
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading || currentPage >= totalPages"
              title="В конец"
              @click="goToPage(totalPages)"
            >
              »»
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th scope="col" class="border-0" style="width: 2.25rem" />
                <th>ID</th>
                <th v-for="col in visibleColumns" :key="col">
                  {{ meta.fieldLabels?.[col] || col }}
                </th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input mt-0"
                    :checked="!!selectedDeleteIds[row.id]"
                    @change="
                      setDeleteSelected(row.id, $event.target && $event.target.checked === true)
                    "
                  />
                </td>
                <td>{{ row.id }}</td>
                <td v-for="col in visibleColumns" :key="col">
                  {{ row[col] }}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteRow(row)"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td :colspan="visibleColumns.length + 3" class="text-center">
                  Записей для удаления нет.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="activeSection === 'view'">
      <h5 class="mb-3">Просмотр данных</h5>
      <div class="row">
        <div class="col-md-4">
          <div class="list-group">
            <button
              v-for="d in dictionaries"
              :key="d.key"
              type="button"
              class="list-group-item list-group-item-action"
              :class="{ active: selectedForView === d.key }"
              @click="
                selectedForView = d.key;
                loadDictionary(d.key, { resetPage: true });
              "
            >
              {{ d.label }}
            </button>
            <div v-if="!dictionaries.length" class="list-group-item text-muted">
              Справочники не найдены.
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div v-if="loading">Загрузка данных...</div>
          <div v-else-if="!visibleColumns.length" class="text-muted small">
            Выберите справочник слева.
          </div>
          <div v-else>
            <div
              class="dictionary-pager d-flex flex-wrap align-items-center gap-2 mb-2 text-muted small"
            >
              <span>{{ rowsRangeLabel }}</span>
              <label class="mb-0"
                >На странице
                <select
                  v-model.number="pageSize"
                  class="form-select form-select-sm d-inline-block w-auto ms-1"
                  style="min-width: 5rem"
                >
                  <option v-for="ps in PAGE_SIZE_OPTIONS" :key="ps" :value="ps">
                    {{ ps }}
                  </option>
                </select>
              </label>
              <div class="btn-group btn-group-sm ms-1" role="group">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading || currentPage <= 1"
                  title="В начало"
                  @click="goToPage(1)"
                >
                  ««
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading || currentPage <= 1"
                  title="Назад"
                  @click="goToPage(currentPage - 1)"
                >
                  ‹
                </button>
                <button type="button" class="btn btn-outline-secondary" disabled>
                  {{ currentPage }} / {{ totalPages }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading || currentPage >= totalPages"
                  title="Вперёд"
                  @click="goToPage(currentPage + 1)"
                >
                  ›
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="loading || currentPage >= totalPages"
                  title="В конец"
                  @click="goToPage(totalPages)"
                >
                  »»
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-striped align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th v-for="col in visibleColumns" :key="col">
                      {{ meta.fieldLabels?.[col] || col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.id">
                    <td>{{ row.id }}</td>
                    <td v-for="col in visibleColumns" :key="col">
                      {{ row[col] }}
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td :colspan="visibleColumns.length + 1" class="text-center">
                      Данные для выбранного справочника не найдены.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

