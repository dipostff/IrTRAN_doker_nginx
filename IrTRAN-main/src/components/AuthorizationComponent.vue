<script setup>
import { ref, onMounted } from "vue";
import router from "../router";
import { login, isAuthenticated, initKeycloak } from "../helpers/keycloak.js";

const auth_err = ref(false);

onMounted(async () => {
    // Check if already authenticated (Keycloak should be initialized in main.js)
    // Don't try to initialize again, just check status
    try {
        // Wait a bit for initialization from main.js to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (isAuthenticated()) {
            // User is already authenticated, redirect to menu
            router.push("/menu");
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
    }
});

async function logIn() {
    auth_err.value = false;
    try {
        // Use Keycloak login (redirects to Keycloak login page)
        await login();
    } catch (error) {
        console.error('Login error:', error);
        auth_err.value = true;
    }
}
</script>

<template>
    <div class="welcome-screen">
        <div class="welcome-overlay">
            <div class="welcome-card">
                <div class="welcome-badge">Тренажёр ОТРЭД</div>
                <h1 class="welcome-title">Тренажёр по оформлению транспортной документации</h1>
                <p class="welcome-text">
                    Платформа помогает безопасно и последовательно отрабатывать работу с документами,
                    обучающими сценариями и тестами в формате, приближенном к реальной практике.
                    Здесь можно тренироваться в удобном темпе, исправлять ошибки и закреплять навыки.
                </p>
                <p class="welcome-text">
                    Для начала работы нажмите <strong>"Войти"</strong>. После авторизации откроется главный экран
                    с категориями модулей: документы, обучение, тестирование и сервисные разделы.
                </p>
                <div v-if="auth_err" class="alert alert-danger mt-3 mb-0" role="alert">
                    Ошибка авторизации. Попробуйте снова.
                </div>
                <div class="welcome-actions">
                    <button @click="logIn()" class="btn btn-enter">Войти</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.welcome-screen {
    min-height: 100vh;
    width: 100%;
    background-image: url("@/assets/back_2.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}
.welcome-overlay {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: linear-gradient(180deg, rgba(17, 34, 64, 0.52), rgba(17, 34, 64, 0.62));
}
.welcome-card {
    width: min(880px, 100%);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.45);
    box-shadow: 0 22px 64px rgba(0, 0, 0, 0.28);
    border-radius: 20px;
    padding: 26px 28px;
}
.welcome-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(125, 165, 240, 0.24);
    border: 1px solid rgba(125, 165, 240, 0.5);
    color: #214f99;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 12px;
}
.welcome-title {
    margin: 0 0 12px;
    color: #1f2937;
    font-weight: 800;
    font-size: clamp(24px, 2.8vw, 34px);
    line-height: 1.2;
}
.welcome-text {
    margin: 0 0 10px;
    color: #3f4c63;
    font-size: 16px;
    line-height: 1.55;
}
.welcome-actions {
    margin-top: 20px;
}
.btn-enter {
    width: 100%;
    min-height: 50px;
    border-radius: 12px;
    border: 1px solid #3f7fe8;
    background: linear-gradient(180deg, #5f96f2, #3f7fe8);
    color: #fff;
    font-weight: 700;
    font-size: 18px;
}
.btn-enter:hover {
    background: linear-gradient(180deg, #6ca0f6, #4b88eb);
}
@media (max-width: 640px) {
    .welcome-card {
        padding: 20px;
        border-radius: 16px;
    }
    .welcome-text {
        font-size: 15px;
    }
}
</style>
