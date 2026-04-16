<script setup>
import HeaderComponent from '../components/HeaderComponent.vue';
import ReferenceComponent from '../components/ReferenceComponent.vue';
import { updateTitle } from '@/helpers/headerHelper';

updateTitle('Тренажёр ОТРЭД - Справочник');
</script>

<template>
  <HeaderComponent />
  <ReferenceComponent />
</template>

