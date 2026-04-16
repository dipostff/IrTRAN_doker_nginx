<script setup>
import { ref } from "vue";
import router from "../router";
import { authorization } from "../helpers/API.js";
</script>

<template>
    <div class="search-box">
        <div class="search-container">
            <p>Обучающий режим «Новичок» предназначен для тех, кто только начинает работать с программой для заполнения документов. Он помогает освоить базовые навыки работы с интерфейсом программы и основными инструментами.</p>

            <p>В режиме «Новичок» пользователь получает доступ к упрощённому интерфейсу, где представлены только самые необходимые инструменты. Кроме того, программа предоставляет подсказки и советы по использованию каждого инструмента, без ограничения по времени.</p>

            <p>В процессе обучения пользователь выполняет ряд простых задач, таких как создание нового документа, выбор шаблона, ввод текста и редактирование его форматирования. По мере выполнения задач сложность постепенно увеличивается.</p>

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
                <router-link to="/beginner-simulator/menu" class="card-square" style="border-radius: 10px" href="">
                    <img src="https://cdn1.iconfinder.com/data/icons/web-design-and-development-1-2/512/48-1024.png" alt="Тренажер" />
                    <span class="card-text">Тренажер</span>
                </router-link>
            </div>
        </div>
    </div>

    <!--Открыть Инструкции модальное окно -->
    <div class="modal fade" id="Instructii" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header" style="background-color: #7da5f0">
                    <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Инструкции</span>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                </div>
                <div class="modal-body">
                    <div class="row mt-3 justify-content-center">
                        <div class="col-md-6">
                            <router-link to="/beginner-instructions/menu" class="card-square" style="border-radius: 10px" data-dismiss="modal">
                                <img src="https://resell-rights-weekly.com/SP/7_2018/ModernVideoMrktngVids_mrrg/images/video-upgrade.png" alt="Скринкаст" />
                                <span class="card-text" style="text-decoration: none">Скринкаст</span>
                            </router-link>
                        </div>
                        <div class="col-md-6">
                            <router-link
                                to="/beginner-instructions/filling-rules"
                                class="card-square"
                                style="border-radius: 10px"
                                data-dismiss="modal"
                            >
                                <img src="https://sh-poperechenskaya-r81.gosweb.gosuslugi.ru/netcat_files/114/1883/ikonka_pravila_priema.png" alt="Правила заполнения" />
                                <span class="card-text" style="text-decoration: none">Правила заполнения</span>
                            </router-link>
                        </div>
                    </div>
                </div>
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
