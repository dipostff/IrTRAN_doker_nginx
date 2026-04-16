<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
    <router-view v-slot="{ Component }">
        <component v-if="Component" :is="Component" />
    </router-view>
</template>

<style scoped>

</style>
