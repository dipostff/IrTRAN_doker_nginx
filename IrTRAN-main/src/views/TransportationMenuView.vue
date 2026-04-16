<script setup>
import { updateTitle } from '@/helpers/headerHelper';
import HeaderComponent from '../components/HeaderComponent.vue';
import TransportationMenuComponent from '../components/TransportationMenuComponent.vue';
updateTitle('Тренажёр ОТРЭД - Заявка на грузоперевозку');
</script>

<template>
    <HeaderComponent/>
    <TransportationMenuComponent/>
</template>