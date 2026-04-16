<script setup>
import HeaderComponent from "../components/HeaderComponent.vue";
import StudentPerformanceComponent from "../components/StudentPerformanceComponent.vue";
import { updateTitle } from "@/helpers/headerHelper";

updateTitle("Тренажёр ОТРЭД - Успеваемость");
</script>

<template>
  <HeaderComponent title="Тренажёр ОТРЭД — Успеваемость" />
  <StudentPerformanceComponent />
</template>
