<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { getToken, hasAnyRealmRole } from '@/helpers/keycloak';

const loading = ref(false);
const items = ref([]);
const total = ref(0);
const query = ref('');
const page = ref(1);
const pageSize = ref(20);

const title = ref('');
const description = ref('');
const file = ref(null);
const uploadError = ref('');
const listError = ref('');

const canEdit = ref(false);

onMounted(() => {
  canEdit.value = hasAnyRealmRole(['teacher', 'app-admin']);
  loadData();
});

function onFileChange(event) {
  const target = event.target;
  if (target && target.files && target.files.length > 0) {
    file.value = target.files[0];
  } else {
    file.value = null;
  }
}

async function loadData() {
  try {
    loading.value = true;
    listError.value = '';

    const token = getToken();
    const params = {
      q: query.value || '',
      limit: pageSize.value,
      offset: (page.value - 1) * pageSize.value
    };

    const response = await axios.get(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scenarios`,
      {
        params,
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      }
    );

    items.value = response.data.items || [];
    total.value = response.data.total || 0;
  } catch (error) {
    console.error('Error loading scenarios:', error);
    listError.value = 'Не удалось загрузить список сценариев.';
  } finally {
    loading.value = false;
  }
}

async function createScenario() {
  try {
    uploadError.value = '';

    if (!title.value.trim()) {
      uploadError.value = 'Укажите название сценария.';
      return;
    }

    if (!file.value) {
      uploadError.value = 'Выберите файл сценария.';
      return;
    }

    const formData = new FormData();
    formData.append('title', title.value.trim());
    formData.append('description', description.value || '');
    formData.append('file', file.value);

    const token = getToken();

    await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scenarios`,
      formData,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    title.value = '';
    description.value = '';
    file.value = null;
    const input = document.getElementById('scenario-file-input');
    if (input) {
      input.value = '';
    }

    await loadData();
  } catch (error) {
    console.error('Error creating scenario:', error);
    if (
      error.response &&
      error.response.data &&
      error.response.data.message
    ) {
      uploadError.value = error.response.data.message;
    } else {
      uploadError.value = 'Не удалось создать сценарий.';
    }
  }
}

async function downloadScenario(item) {
  try {
    const token = getToken();
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scenarios/${item.id}/file`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      }
    );

    const blob = new Blob([response.data], { type: item.mime_type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', item.title || 'scenario');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    // Фиксируем ознакомление со сценарием для панели преподавателя
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scenarios/${item.id}/view`,
        {},
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        }
      );
    } catch (e) {
      console.warn('Failed to record scenario view:', e);
    }
  } catch (error) {
    console.error('Error downloading scenario:', error);
  }
}
</script>

<template>
  <div class="container mt-4">
    <div class="row mb-4">
      <div class="col-md-8 d-flex align-items-end">
        <div class="w-100">
          <label class="form-label">Поиск сценариев</label>
          <div class="input-group">
            <input
              v-model="query"
              type="text"
              class="form-control"
              placeholder="Введите часть названия или описания сценария..."
            />
            <button class="btn btn-primary" type="button" @click="loadData">
              Найти
            </button>
          </div>
          <div v-if="listError" class="text-danger mt-1">
            {{ listError }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="canEdit" class="row mb-4">
      <div class="col-md-8">
        <h5>Создание/загрузка сценария (для преподавателей)</h5>
        <div class="mb-3">
          <label class="form-label">Название сценария</label>
          <input
            v-model="title"
            type="text"
            class="form-control"
            placeholder="Например, Оформление заявки на экспортный груз"
          />
        </div>
        <div class="mb-3">
          <label class="form-label">Краткое описание</label>
          <textarea
            v-model="description"
            class="form-control"
            rows="3"
            placeholder="Опишите, что студент будет отрабатывать по этому сценарию"
          />
        </div>
        <div class="mb-3">
          <label class="form-label"
            >Файл сценария (видео, изображение, документ и т.п.)</label
          >
          <input
            id="scenario-file-input"
            type="file"
            class="form-control"
            @change="onFileChange"
          />
        </div>
        <button class="btn btn-success" type="button" @click="createScenario">
          Сохранить сценарий
        </button>
        <div v-if="uploadError" class="text-danger mt-2">
          {{ uploadError }}
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h5>Доступные сценарии</h5>
        <div v-if="loading">Загрузка...</div>
        <table v-else class="table table-striped align-middle">
          <thead>
            <tr>
              <th scope="col">Название</th>
              <th scope="col">Описание</th>
              <th scope="col">Тип</th>
              <th scope="col">Размер</th>
              <th scope="col">Дата добавления</th>
              <th scope="col">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!items.length">
              <td colspan="6" class="text-center">
                Сценарии пока не добавлены.
              </td>
            </tr>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.title }}</td>
              <td style="max-width: 300px">
                <span class="text-truncate d-inline-block w-100">
                  {{ item.description }}
                </span>
              </td>
              <td>{{ item.mime_type }}</td>
              <td>
                <span v-if="item.size != null">
                  {{ (item.size / 1024 / 1024).toFixed(2) }} МБ
                </span>
              </td>
              <td>
                <span v-if="item.created_at">
                  {{ new Date(item.created_at).toLocaleString() }}
                </span>
              </td>
              <td>
                <button
                  class="btn btn-sm btn-outline-primary"
                  type="button"
                  @click="downloadScenario(item)"
                >
                  Скачать
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1000px;
}
</style>

