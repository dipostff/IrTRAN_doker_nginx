<script setup>
import { onMounted, ref } from "vue";
import HeaderComponent from "../components/HeaderComponent.vue";
import TeacherDocumentReviewComponent from "../components/TeacherDocumentReviewComponent.vue";
import { updateTitle } from "@/helpers/headerHelper";
import { hasAnyRealmRole } from "@/helpers/keycloak";

const hasAccess = ref(false);

onMounted(() => {
  updateTitle("Тренажёр ОТРЭД - Проверка документов");
  hasAccess.value = hasAnyRealmRole(["teacher", "app-admin"]);
});
</script>

<template>
  <HeaderComponent />
  <div class="container mt-4">
    <div v-if="!hasAccess" class="alert alert-danger" role="alert">
      Вкладка недоступна для пользователя. Требуется роль преподавателя или администратора.
    </div>
    <TeacherDocumentReviewComponent v-else />
  </div>
</template>
