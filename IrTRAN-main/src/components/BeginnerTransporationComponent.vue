<script setup>
import { ref } from "vue";
import router from "../router";
import { authorization } from "../helpers/API.js";
</script>

<template>
    <div class="content-container">
        <div class="mt-4 justify-content-center">
            <div style="border: 2px solid #8a898969; padding: 10px; margin: 10px; border-radius: 10px">
                <label style="margin-left: 20%">Шаг 1. Заполнение полей до "Отправки". Выбор дат перевозок.</label>
                <video src="@/assets/IMAGES/video1.mp4" style="height: 500px; width: 800px; margin: auto 20px" autoplay loop></video>
            </div>
            <div style="border: 2px solid #8a898969; padding: 10px; margin: 10px; border-radius: 10px">
                <label style="margin-left: 20%">Шаг 2. Заполнение полей до "Отправки". Выбор станции отправления.</label>
                <video src="@/assets/IMAGES/video2.mp4" style="height: 500px; width: 800px; margin: auto 20px" autoplay loop></video>
            </div>
            <div style="border: 2px solid #8a898969; padding: 10px; margin: 10px; border-radius: 10px">
                <label style="margin-left: 15%">Шаг 3. Заполнение полей до "Отправки". Выбор группы груза и способа подачи.</label>
                <video src="@/assets/IMAGES/video3.mp4" style="height: 500px; width: 800px; margin: auto 20px" autoplay loop></video>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
.header .logo {
    display: flex;
    align-items: center;
    margin-left: 30px;
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

.search-box {
    background-color: white;
    height: auto;
    width: 100%; /* Ширина на всю страницу */
    top: 50; /* Положение вверху */
    left: 0; /* Положение слева */
    z-index: 1000; /* Установка уровня наложения */
    border-bottom: solid gray 1px;
}

.content-container {
    padding: 60px 300px;
}
.search-container {
    margin: 20px 0; /* Отступы сверху и снизу для контейнера поиска */
    padding: 0 300px;
}
</style>
