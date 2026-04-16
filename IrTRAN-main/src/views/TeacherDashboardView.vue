<script setup>
import { onMounted, ref } from 'vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import TeacherDashboardComponent from '../components/TeacherDashboardComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const hasAccess = ref(false);

onMounted(() => {
  updateTitle('Тренажёр ОТРЭД - Панель преподавателя');
  hasAccess.value = hasAnyRealmRole(['teacher', 'app-admin']);
});
</script>

<template>
  <HeaderComponent />
  <div class="container mt-4">
    <div v-if="!hasAccess" class="alert alert-danger" role="alert">
      Вкладка недоступна для пользователя. Требуется роль преподавателя или администратора.
    </div>
    <TeacherDashboardComponent v-else />
  </div>
</template>

