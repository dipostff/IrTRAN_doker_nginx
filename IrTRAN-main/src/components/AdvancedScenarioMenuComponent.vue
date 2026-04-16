<script setup>
import { ref } from "vue";
import router from "../router";
import { authorization } from "../helpers/API.js";
</script>

<template>
    <div class="search-box">
        <div class="search-container">
            <p>Обучающий режим «Продвинутый» предназначен для тех, кто уже продолжительное время работает с программой для заполнения документов. Он помогает проверить свои навыки работы с интерфейсом программы и основными инструментами.</p>

            <p>В режиме «Продвинутый» пользователь получает доступ к полному интерфейсу, где представлены все инструменты. В этом режиме нет подсказок и заполнение каждого документа ограничено по времени.</p>

            <p>После завершения обучения пользователь может перейти в обычный режим работы с программой, где ему будут доступны все возможности и инструменты или пройти другой обучающий сценарий.</p>
        </div>
    </div>

    <div class="content-container">
        <div class="row mt-4 justify-content-center">
            <div class="col-md-2">
                <a class="card-square" style="border-radius: 10px" type="button" data-toggle="modal" data-target="#Instructii">
                    <img src="https://resell-rights-weekly.com/SP/7_2018/ModernVideoMrktngVids_mrrg/images/video-upgrade.png" alt="Инструкции" />
                    <span class="card-text" style="text-decoration: none">Инструкции</span>
                </a>
            </div>
            <div class="col-md-2">
                <router-link to="/advanced-simulator/menu" class="card-square" style="border-radius: 10px" href="">
                    <img src="https://cdn1.iconfinder.com/data/icons/web-design-and-development-1-2/512/48-1024.png" alt="Тренажер" />
                    <span class="card-text">Тренажер</span>
                </router-link>
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
    top: 50px; /* Положение вверху */
    left: 0; /* Положение слева */
    z-index: 1000; /* Установка уровня наложения */
    border-bottom: solid gray 1px;
}

.content-container {
    padding: auto;
}
.search-container {
    margin: 20px 0; /* Отступы сверху и снизу для контейнера поиска */
    padding: 50px 300px 0;
}

.card-square {
    width: 200px; /* Ширина квадрата */
    height: 200px; /* Высота квадрата */
    background-color: #efefef; /* Цвет фона */
    display: flex;
    flex-direction: column;
    align-items: center; /* Центрирование по вертикали */
    justify-content: center; /* Центрирование по горизонтали */
    position: relative;
    transition: background-color 0.3s; /* Плавный переход цвета */
    cursor: pointer; /* Изменение курсора при наведении */
    text-align: center; /* Центрирование текста */
    margin: 5px; /* Центрирование карточки в родительском элементе */
    padding: 8px;
    margin-bottom: 20px;
}
.card-square:hover {
    background-color: #4f85eb; /* Цвет при наведении */
}
.card-square img {
    max-width: 50%; /* Ограничение размера иконки */
    max-height: 50%; /* Ограничение размера иконки */
    margin-bottom: 5px; /* Отступ между иконкой и текстом */
}
.card-text {
    font-weight: bold;
    margin: 0; /* Убираем отступы у текста */
    font-size: 16px; /* Размер шрифта */
    color: #545556; /* Цвет текста */
}
.card-square:hover .card-text {
    color: white; /* Цвет текста при наведении */
}
</style>
