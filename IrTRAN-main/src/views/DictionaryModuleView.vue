<script setup>
import { ref, onMounted } from 'vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import DictionaryModuleComponent from '@/components/DictionaryModuleComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';
import { hasAnyRealmRole } from '@/helpers/keycloak';

const hasAccess = ref(false);

onMounted(() => {
  updateTitle('Тренажёр ОТРЭД - Заполнение справочников');
  hasAccess.value = hasAnyRealmRole(['dictionary-admin', 'app-admin']);
});
</script>

<template>
  <HeaderComponent />
  <div class="container mt-4">
    <div v-if="!hasAccess" class="alert alert-danger" role="alert">
      Вкладка недоступна для пользователя. Требуется роль администратора справочников
      или администратора тренажёра.
    </div>
    <DictionaryModuleComponent v-else />
  </div>
</template>

