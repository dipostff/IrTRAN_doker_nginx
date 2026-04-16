<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { getStations, getContracts, getOwnersNonPublicRailway, getLegalEntities } from "@/helpers/API";

const router = useRouter();
const listsStore = useListsStore();
const STORAGE_KEY = "filling_statement_documents";
const statementList = ref([]);
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
    statementList.value = getStoredList();
}

function openDocument(id) {
    router.push("/filling-statement/create/" + id);
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
    try {
        await Promise.all([
            getStations(),
            getContracts(),
            getOwnersNonPublicRailway(),
            getLegalEntities(),
        ]);
    } catch (e) {
        console.error("Ошибка загрузки справочников:", e);
    }
    loadList();
});
</script>

<template>
    <div class="content-container">
        <router-link to="/filling-statement/create">
            <button type="button" class="btn btn-custom">Создать документ</button>
        </router-link>
        <button type="button" class="btn btn-custom" data-bs-toggle="modal" data-bs-target="#fillingStatementSearchBackdrop">Найти документ</button>
        <div class="modal fade" id="fillingStatementSearchBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="fillingStatementSearchLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #7DA5F0;">
                        <h1 class="modal-title fs-5" id="fillingStatementSearchLabel" style="color: white;">Поиск ведомости подачи и уборки</h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" style="color: white;"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-auto">
                                    <label class="form-label">Номер документа</label>
                                </div>
                                <div class="col-7">
                                    <input v-model="searchNumber" type="text" class="form-control" style="height: 25px; width: 270px;" placeholder="Введите ID ведомости" />
                                </div>
                            </div>
                            <div class="row mt-2" v-if="searchError">
                                <div class="col">
                                    <div class="alert alert-danger py-1 px-2 mb-0 small">{{ searchError }}</div>
                                </div>
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
                        <th>Станция</th>
                        <th>Владелец/пользователь п.п.</th>
                        <th>Место расчета</th>
                        <th>Плательщик</th>
                        <th>Место передачи вагона</th>
                        <th>Итоговая сумма</th>
                    </tr>
                </thead>
                <tbody class="table-group-divider">
                    <tr v-if="statementList.length === 0">
                        <td colspan="9" class="text-center text-muted">Нет сохранённых ведомостей. Создайте документ по кнопке «Создать документ» или найдите по номеру.</td>
                    </tr>
                    <tr v-for="doc in statementList" :key="doc.id" @dblclick="openDocument(doc.id)" style="cursor: pointer;">
                        <td>{{ doc.id }}</td>
                        <td>{{ doc.signed ? 'Подписан' : 'Черновик' }}</td>
                        <td>{{ doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—' }}</td>
                        <td>{{ listsStore.stations[doc.id_station]?.name ?? '—' }}</td>
                        <td>{{ listsStore.owners_non_public_railway[doc.id_owner]?.name ?? listsStore.legal_entities[doc.id_owner]?.name ?? '—' }}</td>
                        <td>{{ doc.place_of_calculation || '—' }}</td>
                        <td>{{ listsStore.legal_entities[doc.id_payer]?.name ?? '—' }}</td>
                        <td>{{ doc.place_of_transfer || '—' }}</td>
                        <td>{{ doc.total_sum != null ? doc.total_sum : '—' }}</td>
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
    background-color: #7da5f0;
    color: white;
}
.btn-custom:hover {
    background-color: #3e6cb4;
    color: white;
}
body {
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}
</style>
