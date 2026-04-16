<script setup>
import { updateTitle } from '@/helpers/headerHelper';
import HeaderComponent from '../components/HeaderComponent.vue';
import MenuComponent from '../components/MenuComponent.vue';
updateTitle('Тренажёр ОТРЭД');
</script>

<template>
    <HeaderComponent/>
    <MenuComponent/>
</template>