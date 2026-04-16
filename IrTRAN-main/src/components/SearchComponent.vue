<script setup>
import { ref } from "vue";
</script>

<template>
    <div class="search-box">
        <div class="search-container">
            <input type="text" class="form-control" placeholder="Поиск" />
        </div>
    </div>
</template>

<style scoped>
.search-box {
    background-color: white;
    height: 100px;
    width: 100%; /* Ширина на всю страницу */
    position: fixed; /* Закрепление шапки в верхней части страницы */
    top: 50; /* Положение вверху */
    left: 0; /* Положение слева */
    z-index: 1000; /* Установка уровня наложения */
    border-bottom: solid gray 1px;
}

.search-container {
    margin: 20px 0; /* Отступы сверху и снизу для контейнера поиска */
    padding: 0 300px;
}
</style>
