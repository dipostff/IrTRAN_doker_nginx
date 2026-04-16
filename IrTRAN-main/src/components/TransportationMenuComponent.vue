<script setup>
import { onMounted, ref } from "vue";
import { getTransportations } from "@/helpers/API";
import ModalSearchDocumentLarge from "./ModalSearchDocumentLarge.vue";
import { Transporation } from "@/models/transporation";
import { useListsStore } from "@/stores/main";

const listsStore = useListsStore();
const loadError = ref(null);

onMounted(async () => {
  loadError.value = null;
  try {
    await getTransportations();
    await Transporation.loadLists();
  } catch (e) {
    console.error("Ошибка загрузки данных заявок:", e);
    const status = e.response?.status;
    loadError.value = status === 401
      ? "Сессия истекла. Нажмите «Выйти» в шапке для повторного входа."
      : "Не удалось загрузить данные. Проверьте подключение к серверу.";
  }
});
</script>

<template>
    <div v-if="loadError" class="alert alert-danger m-3">{{ loadError }}</div>
    <div class="content-container">
        <router-link to="/transporation/create">
            <button type="button" class="btn btn-custom">Создать документ</button>
        </router-link>
        <button type="button" class="btn btn-custom" data-bs-toggle="modal" data-bs-target="#staticBackdrop">Найти документ</button>
        <ModalSearchDocumentLarge />
    </div>
    <div class="container">
        <div class="table-responsive" style="border: gray solid 1px">
            <table class="table table-hover table-bordered border-white">
                <thead style="background-color: #7da5f0; color: white">
                    <tr>
                        <th>ID документа</th>
                        <th>Состояние документа</th>
                        <th>Дата создания документа</th>
                        <th>Признак отправки</th>
                        <th>Вид сообщения</th>
                        <th>Наим. грузоотправителя</th>
                        <th>Наим. грузополучателя</th>
                        <th>Страна отправления</th>
                        <th>Наим. станции отправления</th>
                        <th>Страна назначения</th>
                        <th>Наим. станции назначения</th>
                        <th>Плательщик</th>
                    </tr>
                </thead>
                <tbody class="table-group-divider">
                    <tr v-for="transportation in listsStore.transportations" @dblclick="$router.push('/transporation/create/' + transportation.id)">
                        <td>{{ transportation.id }}</td>
                        <td>{{ transportation.document_status }}</td>
                        <td>{{ transportation.created_at }}</td>
                        <td>{{ listsStore.signs_sending[transportation.id_sign_sending]?.name }}</td>
                        <td>{{ listsStore.message_types[transportation.id_message_type]?.name }}</td>
                        <td>{{ listsStore.legal_entities[transportation.id_shipper]?.name }}</td>
                        <td>{{ listsStore.legal_entities[transportation.id_loading_organizer]?.name }}</td>
                        <td>{{ listsStore.countries[transportation.id_country_departure]?.name }}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.content-container {
    padding: 100px 300px;
    display: flex;
    flex-flow: row nowrap;
    box-sizing: border-box;
    width: 100%;
    justify-content: space-around;
    align-items: center;
}
.btn-custom {
    width: 300px;
    background-color: #7da5f0; /* Цвет кнопки */
    color: white; /* Цвет текста кнопки */
}
.btn-custom:hover {
    background-color: #3e6cb4; /* Цвет кнопки */
    color: white; /* Цвет текста кнопки */
}
body {
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}
</style>
