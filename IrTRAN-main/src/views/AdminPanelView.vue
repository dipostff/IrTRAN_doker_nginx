<script setup>
import { onMounted, ref } from 'vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import AdminPanelComponent from '../components/AdminPanelComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { isAppAdmin } from '@/helpers/keycloak';

const hasAccess = ref(false);

onMounted(() => {
  updateTitle('Тренажёр ОТРЭД - Панель управления');
  hasAccess.value = isAppAdmin();
});
</script>

<template>
  <HeaderComponent />
  <div class="container mt-4">
    <div v-if="!hasAccess" class="alert alert-danger" role="alert">
      Вкладка недоступна для пользователя. Требуется роль администратора тренажёра.
    </div>
    <AdminPanelComponent v-else />
  </div>
</template>

