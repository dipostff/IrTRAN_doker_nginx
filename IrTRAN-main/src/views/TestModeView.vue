<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import HeaderComponent from '../components/HeaderComponent.vue';
import TestModeComponent from '../components/TestModeComponent.vue';
import QuestionBankComponent from '../components/QuestionBankComponent.vue';
import TestConstructorComponent from '../components/TestConstructorComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const route = useRoute();
const router = useRouter();

const tab = ref(route.query.tab || 'run');

const showTeacherTabs = computed(() => hasAnyRealmRole(['teacher', 'app-admin']));

const tabs = computed(() => {
  const t = [
    { id: 'run', label: 'Пройти тест' }
  ];
  if (showTeacherTabs.value) {
    t.push({ id: 'bank', label: 'Банк заданий' });
    t.push({ id: 'constructor', label: 'Конструктор тестов' });
  }
  return t;
});

function setTab(id) {
  tab.value = id;
  router.replace({ query: { ...route.query, tab: id === 'run' ? undefined : id } }).catch(() => {});
}

watch(() => route.query.tab, (q) => {
  if (q && ['bank', 'constructor'].includes(q) && showTeacherTabs.value) tab.value = q;
  else if (!q) tab.value = 'run';
});

onMounted(() => {
  updateTitle('Тренажёр ОТРЭД - Режим теста');
  if (route.query.tab && ['bank', 'constructor'].includes(route.query.tab) && showTeacherTabs.value) {
    tab.value = route.query.tab;
  }
});
</script>

<template>
  <HeaderComponent />
  <div class="test-mode-page">
    <p class="test-mode-intro px-3">
      На этой странице можно <strong>пройти тест</strong> (доступные тесты ниже).
      <template v-if="showTeacherTabs">
        Для преподавателей и администраторов доступны также вкладки <strong>Банк заданий</strong> (создание и редактирование вопросов) и <strong>Конструктор тестов</strong> (сборка тестов из банка).
      </template>
    </p>
    <ul v-if="showTeacherTabs && tabs.length > 1" class="nav nav-tabs mb-3 px-3">
      <li v-for="t in tabs" :key="t.id" class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: tab === t.id }"
          @click="setTab(t.id)"
        >
          {{ t.label }}
        </button>
      </li>
    </ul>
    <div class="tab-content px-3">
      <div v-show="tab === 'run'">
        <TestModeComponent />
      </div>
      <div v-if="showTeacherTabs && tab === 'bank'">
        <QuestionBankComponent />
      </div>
      <div v-if="showTeacherTabs && tab === 'constructor'">
        <TestConstructorComponent />
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-mode-page {
  min-height: 50vh;
}
.test-mode-intro {
  margin: 1rem 0;
  color: #333;
  font-size: 0.95rem;
}
.nav-tabs .nav-link {
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 0.25rem 0.25rem 0 0;
  padding: 0.5rem 1rem;
  color: #0d6efd;
  background: none;
}
.nav-tabs .nav-link:hover {
  border-color: #dee2e6;
}
.nav-tabs .nav-link.active {
  color: #495057;
  background: #fff;
  border-color: #dee2e6 #dee2e6 #fff;
}
</style>