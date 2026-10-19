<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AiAssistant from '@/components/ai/AiAssistant.vue'

const route = useRoute()
const showAssistant = computed(() => route.name && !['authotrization', 'flyer'].includes(route.name))
</script>

<template>
    <router-view v-slot="{ Component }">
        <component v-if="Component" :is="Component" />
    </router-view>
    <AiAssistant v-if="showAssistant" />
</template>

<style scoped>

</style>
