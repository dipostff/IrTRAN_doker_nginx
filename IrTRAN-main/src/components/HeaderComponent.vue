<script setup>
import { useMainStore } from '../stores/main';
import { logout } from '@/helpers/keycloak';

const mainStore = useMainStore();

function handleLogout() {
  try {
    logout();
  } catch (e) {
    console.error('Logout error:', e);
    window.location.href = '/';
  }
}
</script>

<template>
    <div class="header">
        <router-link to="/menu">
            <font-awesome-icon icon="fa-solid fa-house" title="На главный экран" style="height: 20px; width: 20px; color: white" />
        </router-link>
        <router-link to="/menu" class="logo">
            <img src="@/assets/syspanellogo_2.png" alt="Логотип" height="30px" />
        </router-link>
        <div class="title">
            <h5 class="mb-0" style="color: white">
                <b>{{ mainStore.title ?? "Тренажёр ОТРЭД" }}</b>
            </h5>
            <span style="background-color: red; color: white;">{{ mainStore.subtitle }}</span>
        </div>
        <div class="dropdown">
            <span style="color: white"><b>Обучающийся</b></span
            ><br />
            <span style="color: white">ИрГУПС</span>
        </div>
        <button type="button" class="btn-logout logo" @click="handleLogout" title="Выйти">
            <img src="@/assets/icons8-выход-50.png" alt="Выйти" style="height: 30px; width: 30px" />
        </button>
    </div>
</template>

<style scoped>
a {
    cursor: pointer;
}
.logo {
    cursor: pointer;
}
.header {
    background-color: #7da5f0;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between; /* Распределение пространства между элементами */
    padding: 0 15px; /* Отступы слева и справа */
    width: 100%; /* Ширина на всю страницу */
    position: fixed; /* Закрепление шапки в верхней части страницы */
    top: 0; /* Положение вверху */
    left: 0; /* Положение слева */
    z-index: 1000; /* Установка уровня наложения */
}
.header .logo,
.header .btn-logout {
    display: flex;
    align-items: center;
    margin-left: 30px;
}
.header .btn-logout {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
}
.header .title {
    flex-grow: 1; /* Занять все доступное пространство */
    text-align: center; /* Центрирование текста */
}
.dropdown-toggle::after {
    margin-left: 0.255em;
    vertical-align: 0.255em;
    content: "";
    border: solid transparent;
    border-width: 0.2em 0.2em 0 0.2em;
    border-top-color: #000;
    display: inline-block;
    width: 0;
    height: 0;
    overflow: hidden;
}
.dropdown {
    margin-left: 5px; /* Отступ между текстом и кнопкой */
    margin-right: 30px;
}
body {
    padding-top: 50px; /* Отступ сверху для контента, чтобы не перекрывался шапкой */
}
</style>
