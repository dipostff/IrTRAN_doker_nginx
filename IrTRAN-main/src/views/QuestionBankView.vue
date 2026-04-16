<script setup>
import { ref, onMounted } from 'vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import QuestionBankComponent from '../components/QuestionBankComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const canAccess = ref(false);

onMounted(() => {
  canAccess.value = hasAnyRealmRole(['teacher', 'app-admin']);
  updateTitle('Тренажёр ОТРЭД - Банк заданий');
});
</script>

<template>
  <HeaderComponent />
  <div v-if="!canAccess" class="p-4 text-center text-danger">
    У вас нет доступа к банку заданий. Доступ только у преподавателей и администраторов.
  </div>
  <QuestionBankComponent v-else />
</template>
