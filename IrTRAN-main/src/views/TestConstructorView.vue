<script setup>
import { ref, onMounted } from 'vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import TestConstructorComponent from '../components/TestConstructorComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const canAccess = ref(false);

onMounted(() => {
  canAccess.value = hasAnyRealmRole(['teacher', 'app-admin']);
  updateTitle('Тренажёр ОТРЭД - Конструктор тестов');
});
</script>

<template>
  <HeaderComponent />
  <div v-if="!canAccess" class="p-4 text-center text-danger">
    У вас нет доступа к конструктору тестов. Доступ только у преподавателей и администраторов.
  </div>
  <TestConstructorComponent v-else />
</template>
