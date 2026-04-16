<script setup>
</script>

<template>
    <div class="content-container">
        <div class="row mt-4 justify-content-center">
            <div class="col-md-3">
                <router-link to="/act/common" class="card-square" style="border-radius: 10px">
                    <img src="https://cdn-icons-png.freepik.com/512/3566/3566009.png" alt="Акт общей формы" />
                    <span class="card-text">Акт (общей формы) ГУ-23</span>
                </router-link>
            </div>
            <div class="col-md-3">
                <router-link to="/act/commercial" class="card-square" style="border-radius: 10px">
                    <img src="https://cdn-icons-png.freepik.com/512/3566/3566009.png" alt="Коммерческий акт" />
                    <span class="card-text">Акт (коммерческий) ГУ-22</span>
                </router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
body {
    padding-top: 50px; /* Отступ сверху для контента, чтобы не перекрывался шапкой */
}

.content-container {
    padding: 100px 300px;
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
