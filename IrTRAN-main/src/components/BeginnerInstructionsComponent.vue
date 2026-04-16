<script setup>
import { ref } from "vue";
import router from "../router";
import { authorization } from "../helpers/API.js";
</script>

<template>
    <div class="search-box">
        <div class="search-container">
            <p>
                Здесь собраны <strong>скринкасты</strong> (видео): выберите документ, чтобы посмотреть пошаговые записи экрана.
                Текстовые <strong>правила заполнения</strong> по каждому модулю открываются из меню сценария «Новичок» → Инструкции → «Правила заполнения».
            </p>
        </div>
    </div>

    <div class="content-container">
        <div class="row mt-4 justify-content-center">
            <div class="col-md-3">
                <router-link to="/beginner-instructions/transporation" class="card-square" style="border-radius: 10px" data-dismiss="modal">
                    <img src="@/assets/IMAGES/AppID_2.png" alt="Заявка на грузоперевозку" />
                    <span class="card-text" style="text-decoration: none">Заявка на грузоперевозку</span>
                </router-link>
            </div>
            <div class="col-md-3">
                <a class="card-square" style="border-radius: 10px" href="">
                    <img src="@/assets/IMAGES/AppID_1.png" alt="Накладная" />
                    <span class="card-text">Накладная</span>
                </a>
            </div>
            <div class="col-md-3">
                <a class="card-square" style="border-radius: 10px" href="">
                    <img src="@/assets/IMAGES/AppID_19.png" alt="Акты" />
                    <span class="card-text">Акты</span>
                </a>
            </div>
            <div class="col-md-3">
                <a class="card-square" style="border-radius: 10px" href="">
                    <img src="@/assets/IMAGES/AppID_19.png" alt="Памятка приемосдатчика" />
                    <span class="card-text">Памятка приемосдатчика</span>
                </a>
            </div>
            <div class="col-md-3">
                <a class="card-square" style="border-radius: 10px" href="">
                    <img src="@/assets/IMAGES/AppID_19.png" alt="Ведомости подачи и уборки" />
                    <span class="card-text">Ведомости подачи и уборки</span>
                </a>
            </div>
            <div class="col-md-3">
                <a class="card-square" style="border-radius: 10px" href="">
                    <img src="@/assets/IMAGES/AppID_11809.png" alt="Накопительная ведомость" />
                    <span class="card-text">Накопительная ведомость</span>
                </a>
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
    height: 100px;
    width: 100%; /* Ширина на всю страницу */
    position: fixed; /* Закрепление шапки в верхней части страницы */
    top: 50px; /* Положение вверху */
    left: 0; /* Положение слева */
    z-index: 1000; /* Установка уровня наложения */
    border-bottom: solid gray 1px;
}

.content-container {
    padding: 150px 300px;
}
.search-container {
    margin: 20px 0; /* Отступы сверху и снизу для контейнера поиска */
    padding: 0 300px;
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
