<script setup>
import { onMounted, ref } from 'vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import OpenDayStatsComponent from '../components/OpenDayStatsComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const hasAccess = ref(false);

onMounted(() => {
  updateTitle('Тренажёр ОТРЭД - Статистика дня открытых дверей');
  hasAccess.value = hasAnyRealmRole(['teacher', 'app-admin']);
});
</script>

<template>
  <HeaderComponent />
  <div class="container mt-4 mb-5">
    <div v-if="!hasAccess" class="alert alert-danger" role="alert">
      Вкладка недоступна. Нужна роль преподавателя или администратора.
    </div>
    <OpenDayStatsComponent v-else />
  </div>
</template>
