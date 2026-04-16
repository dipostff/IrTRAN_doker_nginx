<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { getSpeedTypes } from "@/helpers/API";

const router = useRouter();
const listsStore = useListsStore();
const STORAGE_KEY = "commercial_act_documents";
const actList = ref([]);
const searchNumber = ref("");
const searchError = ref("");

function getStoredList() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function loadList() {
    actList.value = getStoredList();
}

function openDocument(id) {
    router.push("/act/commercial/create/" + id);
}

function findDocument() {
    searchError.value = "";
    const num = (searchNumber.value || "").trim();
    if (!num) {
        searchError.value = "Введите номер документа.";
        return;
    }
    const list = getStoredList();
    const doc = list.find((d) => d.id === num || String(d.id) === num);
    if (doc) {
        openDocument(doc.id);
    } else {
        searchError.value = "Документ с таким номером не найден.";
    }
}

onMounted(async () => {
    await getSpeedTypes();
    loadList();
});
</script>

<template>
    <div class="content-container">
        <router-link to="/act/commercial/create">
            <button type="button" class="btn btn-custom">Создать документ</button>
        </router-link>
        <button type="button" class="btn btn-custom" data-bs-toggle="modal" data-bs-target="#commercialActSearchBackdrop">Найти документ</button>
        <div class="modal fade" id="commercialActSearchBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="commercialActSearchLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #7DA5F0;">
                        <h1 class="modal-title fs-5" id="commercialActSearchLabel" style="color: white;">Поиск коммерческого акта</h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" style="color: white;"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-auto"><label class="form-label">Номер документа</label></div>
                                <div class="col-7"><input v-model="searchNumber" type="text" class="form-control" style="height: 25px; width: 270px;" placeholder="Введите ID акта" /></div>
                            </div>
                            <div class="row mt-2" v-if="searchError">
                                <div class="col"><div class="alert alert-danger py-1 px-2 mb-0 small">{{ searchError }}</div></div>
                            </div>
                        </div>
                        <div class="row justify-content-md-center mt-3">
                            <button type="button" class="btn btn-custom" style="width: 150px; margin: 0.5em;" @click="findDocument">Найти</button>
                            <button type="button" class="btn btn-custom" data-bs-dismiss="modal" style="width: 150px; margin: 0.5em;">Отмена</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="table-responsive" style="border: gray solid 1px">
            <table class="table table-hover table-bordered border-white">
                <thead style="background-color: #7DA5F0; color: white;">
                    <tr>
                        <th>ID документа</th>
                        <th>Состояние документа</th>
                        <th>Дата создания документа</th>
                        <th>Номер поезда</th>
                        <th>Номер накладной</th>
                    </tr>
                </thead>
                <tbody class="table-group-divider">
                    <tr v-if="actList.length === 0">
                        <td colspan="5" class="text-center text-muted py-4">Нет сохранённых коммерческих актов. Создайте документ или найдите по номеру.</td>
                    </tr>
                    <tr v-for="doc in actList" :key="doc.id" @dblclick="openDocument(doc.id)" style="cursor: pointer">
                        <td>{{ doc.id }}</td>
                        <td>{{ doc.signed ? 'Подписан' : 'Черновик' }}</td>
                        <td>{{ doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ru-RU') : '—' }}</td>
                        <td>{{ doc.train_number || '—' }}</td>
                        <td>{{ doc.invoice_number || '—' }}</td>
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
