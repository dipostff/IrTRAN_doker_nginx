<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import { getStations, getSpeedTypes, saveStudentDocument, updateStudentDocument } from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";
import { commercialActDefaultDocument, useCommercialActForm } from "@/composables/useCommercialActForm";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();
const STORAGE_KEY = "commercial_act_documents";
const saveError = ref(null);
const saveSuccess = ref(null);

function getDefaultDocument() {
    return commercialActDefaultDocument();
}

const document = ref(getDefaultDocument());

const {
    senderMarkSearch,
    actNumberSearch,
    demoWagonSearch,
    demoContainerSearch,
    filteredSenderMarks,
    filteredActNumbers,
    filteredDemoWagons,
    filteredDemoContainers,
    selectedWagons,
    selectedContainers,
    selectedZpu,
    selectedCargoDocs,
    selectedCargoActual,
    wagonDraft,
    containerDraft,
    zpuDraft,
    cargoDocDraft,
    cargoActDraft,
    ZPU_TYPE_OPTIONS,
    ZPU_OWNERSHIP_OPTIONS,
    openSenderMarkModal,
    pickSenderMark,
    openActNumberModal,
    pickActNumber,
    openWagonModal,
    applyWagonModal,
    removeWagons,
    openDemoWagonPicker,
    pickDemoWagon,
    openContainerModal,
    applyContainerModal,
    removeContainers,
    openDemoContainerPicker,
    pickDemoContainer,
    openZpuModal,
    applyZpuModal,
    removeZpuRows,
    openCargoDocModal,
    applyCargoDocModal,
    removeCargoDocs,
    openCargoActModal,
    applyCargoActModal,
    removeCargoActual,
} = useCommercialActForm(document, saveError);

function getStoredList() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function saveDocument() {
    saveError.value = null;
    saveSuccess.value = null;
    if (trainingContext.value) {
        if (trainingContext.value.errorChecking) {
            const err = validateTrainingDocument("commercial_act", document.value);
            if (err) {
                saveError.value = err;
                return;
            }
        }
    }
    try {
        const list = getStoredList();
        const doc = { ...document.value };
        if (!doc.id) {
            doc.id = Date.now().toString();
            doc.createdAt = new Date().toISOString();
            list.push(doc);
        } else {
            const idx = list.findIndex((d) => d.id === doc.id);
            if (idx >= 0) list[idx] = { ...doc, createdAt: list[idx].createdAt };
            else list.push(doc);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        document.value = { ...doc };
        if (getToken()) {
            try {
                const payload = { ...document.value };
                if (payload.backendId) {
                    await updateStudentDocument(payload.backendId, payload);
                } else {
                    const created = await saveStudentDocument("commercial_act", payload);
                    document.value.backendId = created.id;
                    const list2 = getStoredList();
                    const idx = list2.findIndex((d) => d.id === doc.id);
                    if (idx >= 0) list2[idx].backendId = created.id;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(list2));
                }
            } catch (apiErr) {
                console.warn("Синхронизация с сервером не выполнена:", apiErr);
            }
        }
        updateTitle("Коммерческий акт № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => { saveSuccess.value = null; }, 3000);
        if (!route.params.id) router.replace("/act/commercial/create/" + doc.id);
    } catch (e) {
        console.error(e);
        saveError.value = "Не удалось сохранить документ.";
    }
}

function signDocument() {
    if (document.value.signed) return;
    if (!confirm("Подписать акт?")) return;
    saveError.value = null;
    saveSuccess.value = null;
    document.value.signed = true;
    saveDocument();
    saveSuccess.value = "Акт подписан и сохранён.";
    setTimeout(() => { saveSuccess.value = null; }, 3000);
}

function spoilDocument() {
    if (!confirm("Испортить акт? Действие необратимо.")) return;
    saveError.value = null;
    saveSuccess.value = null;
    const id = document.value.id;
    if (id) {
        const list = getStoredList().filter((d) => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    document.value = getDefaultDocument();
    updateTitle("Коммерческий акт (Новый документ)");
    router.push("/act/commercial/menu");
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = { ...getDefaultDocument(), ...found };
        updateTitle("Коммерческий акт № " + id);
    }
}

onMounted(async () => {
    await Promise.all([getStations(), getSpeedTypes()]);
    if (route.params.id) loadDocumentById(route.params.id);
    else updateTitle("Коммерческий акт (Новый документ)");
});
</script>

<template>
    <div class="search-box">
        <div class="row">
            <div class="col-auto">
                <button type="button" class="btn btn-custom" @click="saveDocument">Сохранить</button>
                <button type="button" class="btn btn-custom" @click="signDocument" :disabled="document.signed">{{ document.signed ? 'Подписано' : 'Подписать' }}</button>
                <button type="button" class="btn btn-custom" @click="spoilDocument">Испортить</button>
            </div>
        </div>
        <div
            class="row mt-2"
            v-if="saveError && (!trainingContext || trainingContext.errorVisibility)"
        >
            <div class="col-auto"><div class="alert alert-danger py-1 px-2 mb-0">{{ saveError }}</div></div>
        </div>
        <div class="row mt-2" v-if="saveSuccess">
            <div class="col-auto"><div class="alert alert-success py-1 px-2 mb-0">{{ saveSuccess }}</div></div>
        </div>
        <TrainingScenarioPanel doc-type="commercial_act" :document="document" />
    </div>

    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="home-tab" data-toggle="tab" data-target="#home-tab-pane" type="button" role="tab" aria-controls="home-tab-pane" aria-selected="true">Документ</button>
            </li>
        </ul>
        <div class="tab-content" id="myTabContent">
            <div class="tab-pane fade show active" style="margin-top: 1em" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabindex="0">
                <!----------------------------------------------------------------Раздел А Общие сведения Отправки--------------------------------------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Общие сведения Отправки</label>
                </div>

                <div class="row mb-1">
                    <simple-input title="Поезд №" v-model="document.train_number" styleInput="width: 270px" />
                    <simple-input title="Дата прибытия" type="date" v-model="document.arrival_date" :fixWidth="false" styleInput="width: 150px" />
                    <simple-input title="Время прибытия" type="time" v-model="document.arrival_time" :fixWidth="false" styleInput="width: 150px" />
                </div>

                <!--Найти Номер поезда модальное окно -->
                <div class="modal fade" id="NomerPoezda" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер поезда</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер поезда</th>
                                                <th>Наименование</th>
                                                <th>Отметки</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="row mb-1">
                    <simple-select title="Скорость" :values="listsStore.speed_types" valueKey="id" name="name" v-model="document.id_speed_type" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" for="customCheck1">Сопровождение</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px; margin-left: 2px" type="checkbox" v-model="document.accompaniment" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-input title="Номер накладной" v-model="document.invoice_number" styleInput="width: 270px" />
                </div>

                <!--Найти Номер накладной модальное окно -->
                <div class="modal fade" id="NomerNakladnoy" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер накладной</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер накладной</th>
                                                <th>Дата создания</th>
                                                <th>Отметки</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Станция отправления</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.station_departure" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Станция назначения</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.station_destination" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Отправитель</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.shipper_name" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Код ОКПО</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.shipper_okpo" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Получатель</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.receiver_name" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Код ОКПО</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.receiver_okpo" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Перевозчик</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.carrier_name" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Отметки отправителя о состоянии тары или груза</label>
                    <div class="col-auto">
                        <div class="input-group" style="width: 450px">
                            <input type="text" class="form-control custom-search" v-model="document.sender_tare_marks" placeholder="Выберите из справочника" readonly />
                            <button class="btn btn-outline-secondary" type="button" @click="openSenderMarkModal()">
                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                            </button>
                        </div>
                    </div>
                </div>
                <p class="small text-muted">Справочник учебный (типовые формулировки); при необходимости пополняется в конфигурации actTrainingCatalogs.</p>

                <!--Найти Отметки отправителя о состоянии тары или груза модальное окно -->
                <div class="modal fade" id="OtmetkioSostoinii" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Отметки отправителя о состоянии тары или груза</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-2">
                                    <div class="col-12">
                                        <input type="text" class="form-control" v-model="senderMarkSearch" placeholder="Поиск по коду или описанию" />
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; max-height: 320px; overflow: auto">
                                    <table class="table table-hover table-bordered border-white table-sm">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Код</th>
                                                <th>Описание</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="row in filteredSenderMarks"
                                                :key="'sm' + row.id"
                                                style="cursor: pointer"
                                                @click="pickSenderMark(row)"
                                            >
                                                <td>{{ row.code }}</td>
                                                <td>{{ row.description }}</td>
                                                <td>{{ row.note }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="row justify-content-md-end mt-2">
                                    <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Закрыть</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Объявленная ценность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.declared_value" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Груз погружен средствами</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.cargo_loaded_means" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">масса груза при погрузке определена</label>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Кем</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.loaded_by_whom" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Каким способом</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 450px" v-model="document.loaded_how" />
                    </div>
                </div>

                <!----------------------------------------------------------------Общие сведения Отправки Вагоны--------------------------------------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Вагоны</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openWagonModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openWagonModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeWagons">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Номер вагона</th>
                                        <th>Род вагона</th>
                                        <th>Грузоподъемность</th>
                                        <th>Состояние</th>
                                        <th>Технический акт</th>
                                        <th>Принадлежность</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(w, idx) in document.commercial_wagons" :key="'cw' + idx">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedWagons" /></td>
                                        <td>{{ w.wagon_number }}</td>
                                        <td>{{ w.stock_type }}</td>
                                        <td>{{ w.capacity }}</td>
                                        <td>{{ w.condition }}</td>
                                        <td>{{ w.tech_act }}{{ w.tech_act_date ? " от " + w.tech_act_date : "" }}</td>
                                        <td>{{ w.ownership }}</td>
                                    </tr>
                                    <tr v-if="!document.commercial_wagons?.length">
                                        <td colspan="7" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Вагоны из отправки модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="VagonizOtpr" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Вагоны</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyWagonModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" v-model="wagonDraft.wagon_number" />
                                            <button class="btn btn-outline-secondary" type="button" @click="openDemoWagonPicker">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Род вагона</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.stock_type" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Грузоподъемность</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.capacity" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Принадлежность</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.ownership" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Состояние</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.condition" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Технический акт номер</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.tech_act" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Дата</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="wagonDraft.tech_act_date" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="modal fade" id="CommercialActDemoWagonPicker" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Демо-справочник вагонов</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <input type="text" class="form-control mb-2" v-model="demoWagonSearch" placeholder="Поиск" />
                                <div class="table-responsive" style="max-height: 280px; overflow: auto; border: 1px solid #c1c1c1">
                                    <table class="table table-sm table-hover">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер</th>
                                                <th>Род</th>
                                                <th>Г/п</th>
                                                <th>Принадлежность</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="(w, i) in filteredDemoWagons" :key="'dw' + i" style="cursor: pointer" @click="pickDemoWagon(w)">
                                                <td>{{ w.number }}</td>
                                                <td>{{ w.shortName }}</td>
                                                <td>{{ w.capacity }}</td>
                                                <td>{{ w.ownership }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" class="btn btn-custom mt-2" data-bs-dismiss="modal" data-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!----------------------------------------------------------------Общие сведения Отправки Контейнер--------------------------------------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Контейнеры</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openContainerModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openContainerModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeContainers">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Номер контейнера</th>
                                        <th>Типоразмер</th>
                                        <th>Принадлежность</th>
                                        <th>Состояние</th>
                                        <th>Технический акт</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(c, idx) in document.commercial_containers" :key="'cc' + idx">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedContainers" /></td>
                                        <td>{{ c.container_number }}</td>
                                        <td>{{ c.size_type }}</td>
                                        <td>{{ c.ownership }}</td>
                                        <td>{{ c.condition }}</td>
                                        <td>{{ c.tech_act }}{{ c.tech_act_date ? " от " + c.tech_act_date : "" }}</td>
                                    </tr>
                                    <tr v-if="!document.commercial_containers?.length">
                                        <td colspan="6" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Контейнеры из отправки модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="ConteinerizOtpr" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Контейнеры</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyContainerModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер контейнера</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" v-model="containerDraft.container_number" />
                                            <button class="btn btn-outline-secondary" type="button" @click="openDemoContainerPicker">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Типоразмер</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="containerDraft.size_type" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Принадлежность</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="containerDraft.ownership" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Состояние</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="containerDraft.condition" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Технический акт номер</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="containerDraft.tech_act" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Дата</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="containerDraft.tech_act_date" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <div class="modal fade" id="CommercialActDemoContainerPicker" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Демо-справочник контейнеров</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <input type="text" class="form-control mb-2" v-model="demoContainerSearch" placeholder="Поиск" />
                                <div class="table-responsive" style="max-height: 280px; overflow: auto; border: 1px solid #c1c1c1">
                                    <table class="table table-sm table-hover">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер</th>
                                                <th>Типоразмер</th>
                                                <th>Принадлежность</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="(c, i) in filteredDemoContainers" :key="'dc' + i" style="cursor: pointer" @click="pickDemoContainer(c)">
                                                <td>{{ c.number }}</td>
                                                <td>{{ c.sizeType }}</td>
                                                <td>{{ c.ownership }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" class="btn btn-custom mt-2" data-bs-dismiss="modal" data-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!----------------------------------------------------------------Общие сведения Отправки ЗПУ--------------------------------------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">ЗПУ</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openZpuModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openZpuModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeZpuRows">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№ вагона, контейнера</th>
                                        <th>Место наложения ЗПУ</th>
                                        <th>Принадлежность ЗПУ</th>
                                        <th>Тип ЗПУ</th>
                                        <th>Контрольные знаки</th>
                                        <th>Погашение</th>
                                        <th>Следы вскрытия или повреждения</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(z, idx) in document.zpu_rows" :key="'zpu' + idx">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedZpu" /></td>
                                        <td>{{ z.vehicle_ref }}</td>
                                        <td>{{ z.place }}</td>
                                        <td>{{ z.ownership }}</td>
                                        <td>{{ z.type }}</td>
                                        <td>{{ z.control_marks }}</td>
                                        <td>{{ z.cancellation }}</td>
                                        <td>{{ z.damage_traces }}</td>
                                    </tr>
                                    <tr v-if="!document.zpu_rows?.length">
                                        <td colspan="8" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--ЗПУ из отправки модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="ZPUizOtpr" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">ЗПУ</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyZpuModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона, контейнера</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 270px" v-model="zpuDraft.vehicle_ref" placeholder="Вручную или из таблицы вагонов выше" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Место наложения ЗПУ</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="zpuDraft.place" style="width: 270px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Принадлежность ЗПУ</label>
                                    <div class="col-auto">
                                        <select class="form-select custom-input" style="width: 270px" v-model="zpuDraft.ownership">
                                            <option value="">Выберите</option>
                                            <option v-for="o in ZPU_OWNERSHIP_OPTIONS" :key="o.id" :value="o.id">{{ o.name }}</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Тип ЗПУ</label>
                                    <div class="col-auto">
                                        <select class="form-select custom-input" style="width: 270px" v-model="zpuDraft.type">
                                            <option value="">Выберите</option>
                                            <option v-for="o in ZPU_TYPE_OPTIONS" :key="o.id" :value="o.id">{{ o.name }}</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Контрольные знаки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="zpuDraft.control_marks" style="width: 400px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Погашение</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="zpuDraft.cancellation" style="width: 400px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Следы вскрытия или повреждения</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="zpuDraft.damage_traces" style="width: 400px" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!-------------------------------------------------------------------------Раздел А конец----------------------------------------------------------------------------------------------------------------------------------->

                <!----------------------------------------------------------------Груз--------------------------------------------------------------->

                <!-------------------------------------------------------------------Раздел Б Значится по документам------------------------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Значится по документам</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openCargoDocModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openCargoDocModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeCargoDocs">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№ вагона, контейнера</th>
                                        <th>Марка</th>
                                        <th>Число мест</th>
                                        <th>Род упаковки</th>
                                        <th>Наименование груза</th>
                                        <th>Общая масса в кг</th>
                                        <th>Масса одного места при стандартной упаковке</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(r, idx) in document.cargo_by_docs" :key="'cbd' + idx">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedCargoDocs" /></td>
                                        <td>{{ r.vehicle_ref }}</td>
                                        <td>{{ r.brand }}</td>
                                        <td>{{ r.places_count }}</td>
                                        <td>{{ r.package_type }}</td>
                                        <td>{{ r.cargo_name }}</td>
                                        <td>{{ r.total_mass_kg }}</td>
                                        <td>{{ r.mass_per_place }}</td>
                                    </tr>
                                    <tr v-if="!document.cargo_by_docs?.length">
                                        <td colspan="8" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Груз по документам модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="GruzpoDoc" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Груз по документам</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyCargoDocModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона, контейнера</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 270px" v-model="cargoDocDraft.vehicle_ref" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Марка</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoDocDraft.brand" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Число мест</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoDocDraft.places_count" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Род упаковки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoDocDraft.package_type" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование груза</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 400px" v-model="cargoDocDraft.cargo_name" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Общая масса в кг</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoDocDraft.total_mass_kg" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса одного места при стандартной упаковке</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 400px" v-model="cargoDocDraft.mass_per_place" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!-------------------------------------------------------------------Раздел В, Г В действительности оказалось------------------------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">В действительности оказалось</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openCargoActModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openCargoActModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeCargoActual">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№ вагона, контейнера</th>
                                        <th>Марка</th>
                                        <th>Число мест</th>
                                        <th>Род упаковки</th>
                                        <th>Наименование груза</th>
                                        <th>Общая масса в кг</th>
                                        <th>Масса одного места при стандартной упаковке</th>
                                        <th>Отметка о повреждении</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(r, idx) in document.cargo_actual" :key="'ca' + idx">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedCargoActual" /></td>
                                        <td>{{ r.vehicle_ref }}</td>
                                        <td>{{ r.brand }}</td>
                                        <td>{{ r.places_count }}</td>
                                        <td>{{ r.package_type }}</td>
                                        <td>{{ r.cargo_name }}</td>
                                        <td>{{ r.total_mass_kg }}</td>
                                        <td>{{ r.mass_per_place }}</td>
                                        <td>{{ r.damage_note }}</td>
                                    </tr>
                                    <tr v-if="!document.cargo_actual?.length">
                                        <td colspan="9" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Груз в действительности модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="GruzpoDocvDeist" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Груз в действительности</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyCargoActModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона, контейнера</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 270px" v-model="cargoActDraft.vehicle_ref" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Марка</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoActDraft.brand" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Число мест</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoActDraft.places_count" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 150px">Род упаковки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoActDraft.package_type" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование груза</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 400px" v-model="cargoActDraft.cargo_name" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Общая масса в кг</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="cargoActDraft.total_mass_kg" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса одного места при стандартной упаковке</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 400px" v-model="cargoActDraft.mass_per_place" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Отметка о повреждении</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 400px" v-model="cargoActDraft.damage_note" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!-------------------------------------------------------------------------Груз конец----------------------------------------------------------------------------------------------------------------------------------->

                <!-------------------------------------------------------------------Результаты проверки------------------------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Результаты проверки</label>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Описание оказавшегося груза с указанием количества недосдачи или излишка</label>
                </div>

                <div class="row mb-1">
                    <div class="col-10">
                        <textarea class="form-control mt-0 custom-input" style="height: 120px; min-width: 100%" v-model="document.cargo_discrepancy_description" />
                    </div>
                </div>

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <!-------------------------------------------------------------------Раздел Е Сведения о проведении экспертизы------------------------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Сведения о проведении экспертизы</label>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Номер акта</label>
                    <div class="col-auto">
                        <div class="input-group" style="width: 270px">
                            <input type="text" class="form-control custom-search" v-model="document.expertise_act_number" placeholder="Вручную или из справочника" />
                            <button class="btn btn-outline-secondary" type="button" @click="openActNumberModal">
                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                            </button>
                        </div>
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Дата</label>
                    <div class="col-auto">
                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.expertise_act_date" />
                    </div>
                </div>
                <p class="small text-muted">Номер акта экспертизы: учебный справочник в actTrainingCatalogs (примеры связки с накладной).</p>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Заключение</label>
                </div>

                <div class="row mb-1">
                    <div class="col-10">
                        <textarea class="form-control mt-0 custom-input" style="height: 120px; min-width: 100%" v-model="document.expertise_conclusion" />
                    </div>
                </div>

                <!------------------------------------------------------------------------------------------------------------------------------------------------>

                <div style="display: none">
                    <!-------------------------------------------------------------------Раздел Ж Отметки перевозчика на станции назначения------------------------------------------------------------>
                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Отметки перевозчика на станции назначения</label>
                    </div>

                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0">Сосояние груза, прибывшего с актом попутной станции</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-10">
                            <input type="text" class="form-control mt-0 custom-input" style="height: 150px; min-width: 100%" />
                        </div>
                    </div>

                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0">Подписи Перевозчика</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <button type="button" class="btn btn-custom">Добавить</button>
                            <button type="button" class="btn btn-custom">Изменить</button>
                            <button type="button" class="btn btn-custom">Удалить</button>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                                <table class="table table-hover table-bordered border-white">
                                    <thead style="background-color: #7da5f0; color: white">
                                        <tr>
                                            <th></th>
                                            <th style="width: 300px">Должность</th>
                                            <th style="width: 400px">ФИО</th>
                                            <th>Подпись</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        <tr>
                                            <td><input type="checkbox" class="row-checkbox" /></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-------------------------------------------------------------------Отметки о выдаче груза по досылочному документу------------------------------------------------------------>
                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Отметки о выдаче груза по досылочному документу</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <button type="button" class="btn btn-custom">Добавить</button>
                            <button type="button" class="btn btn-custom">Изменить</button>
                            <button type="button" class="btn btn-custom">Удалить</button>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                                <table class="table table-hover table-bordered border-white">
                                    <thead style="background-color: #7da5f0; color: white">
                                        <tr>
                                            <th></th>
                                            <th>Номер досылки</th>
                                            <th>Номер вагона</th>
                                            <th>Станция оформления досылки</th>
                                            <th>Дата оформления досылки</th>
                                            <th>Дата выдачи груза</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        <tr>
                                            <td><input type="checkbox" class="row-checkbox" /></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0">Подписи Перевозчика</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <button type="button" class="btn btn-custom">Добавить</button>
                            <button type="button" class="btn btn-custom">Изменить</button>
                            <button type="button" class="btn btn-custom">Удалить</button>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                                <table class="table table-hover table-bordered border-white">
                                    <thead style="background-color: #7da5f0; color: white">
                                        <tr>
                                            <th></th>
                                            <th style="width: 300px">Должность</th>
                                            <th style="width: 400px">ФИО</th>
                                            <th>Подпись</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        <tr>
                                            <td><input type="checkbox" class="row-checkbox" /></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!------------------------------------------------------------------------------------------------------------------------------------------------>

                    <!-------------------------------------------------------------------Настоящий акт препровождается------------------------------------------------------------>
                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Настоящий акт препровождается</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <input type="text" class="form-control mt-0 custom-input" style="width: 250px" />
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <input type="text" class="form-control mt-0 custom-input" style="width: 250px" />
                        </div>
                    </div>

                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0">Подписи Перевозчика</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <button type="button" class="btn btn-custom">Добавить</button>
                            <button type="button" class="btn btn-custom">Изменить</button>
                            <button type="button" class="btn btn-custom">Удалить</button>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                                <table class="table table-hover table-bordered border-white">
                                    <thead style="background-color: #7da5f0; color: white">
                                        <tr>
                                            <th></th>
                                            <th style="width: 300px">Должность</th>
                                            <th style="width: 400px">ФИО</th>
                                            <th>Подпись</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        <tr>
                                            <td><input type="checkbox" class="row-checkbox" /></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-2">
                        <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Коммерческий акт получил</label>
                        <div class="col-auto">
                            <input type="text" class="form-control mt-0 custom-input" style="width: 250px" />
                        </div>

                        <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">на основании</label>
                        <div class="col-auto">
                            <input type="text" class="form-control mt-0 custom-input" style="width: 250px" />
                        </div>

                        <label class="col-auto col-form-label mb-0 label-custom">Дата выдачи акта</label>
                        <div class="col-auto">
                            <input type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                        </div>
                    </div>

                    <!------------------------------------------------------------------------------------------------------------------------------------------------>

                    <!------------------------------------------------------------------------------------------------------------------------------------------------>
                </div>

                <!--Найти Номер вагона модальное окно -->
                <div class="modal fade" id="NomerVagona" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер вагона</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер вагона</th>
                                                <th>Наименование</th>
                                                <th>Кратное наименование</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер контейнера модальное окно -->
                <div class="modal fade" id="NomerKonteinera" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер контейнера</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер контейнера</th>
                                                <th>Наименование</th>
                                                <th>Кратное наименование</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер вагона/контейнера ЗПУ модальное окно -->
                <div class="modal fade" id="NomerVagonaorKonteineraZPU" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер вагона/контейнера</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер вагона/контейнера</th>
                                                <th>Наименование</th>
                                                <th>Кратное наименование</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер вагона/контейнера Значится по документам модальное окно -->
                <div class="modal fade" id="NomerVagonaorKonteineraPoDoc" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер вагона/контейнера</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер вагона/контейнера</th>
                                                <th>Наименование</th>
                                                <th>Кратное наименование</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер вагона/контейнера модальное В действительности окно -->
                <div class="modal fade" id="NomerVagonaorKonteineraVDeist" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер вагона/контейнера</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="button" id="clearButton">
                                                    <font-awesome-icon icon="fa-solid fa-xmark" />
                                                </button>
                                                <button class="btn btn-outline-secondary" type="button">
                                                    <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 200px">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер вагона/контейнера</th>
                                                <th>Наименование</th>
                                                <th>Кратное наименование</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер акта  модальное окно -->
                <div class="modal fade" id="NomerAckta" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Номер акта</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <input type="text" class="form-control mb-2" v-model="actNumberSearch" placeholder="Поиск по номеру, накладной, названию" />
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; max-height: 320px; overflow: auto">
                                    <table class="table table-hover table-bordered border-white table-sm">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер акта</th>
                                                <th>Наименование</th>
                                                <th>Номер накладной</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="row in filteredActNumbers"
                                                :key="'an' + row.id"
                                                style="cursor: pointer"
                                                @click="pickActNumber(row)"
                                            >
                                                <td>{{ row.number }}</td>
                                                <td>{{ row.title }}</td>
                                                <td>{{ row.invoice }}</td>
                                                <td>{{ row.note }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="row justify-content-md-end mt-2">
                                    <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Закрыть</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!-- Подписать акт модальное окно -->
                <div class="modal fade" id="podpisat" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-sm">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Подпись акта</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center">
                                    <label class="col-auto col-form-label mb-0 label-custom">Подписать акт?</label>
                                </div>
                                <div class="row justify-content-md-center">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!-- Испортить акт модальное окно -->
                <div class="modal fade" id="isportit" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-sm">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Удаление акта</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center">
                                    <label class="col-12 col-form-label mb-0 label-custom">Вы действительно хотите удалить акт?</label>
                                </div>
                                <div class="row justify-content-md-center">
                                    <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px">Да</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->
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
    justify-content: space-between;
    padding: 0 15px;
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
}

.header .title {
    flex-grow: 1;
    text-align: center;
}

.dropdown {
    margin-left: 0 5px;
}
.btn-custom {
    width: auto;
    background-color: #7da5f0;
    color: white;
    margin: 3px;
}
.btn-custom:hover {
    background-color: #3e6cb4;
    color: white;
}
body {
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
    padding-top: 50px;
}

.search-box {
    padding-top: 10px;
    padding-bottom: 10px;
    background-color: white;
    height: 70px;
    width: 100%;
    position: fixed;
    top: 50px;
    left: 15px;
    z-index: 1000;
}

.content-container {
    padding: 120px 15px;
    top: 100px;
}
.span-custom {
    background-color: #ffffde;
    border: solid #a8a8a8 1px;
    color: black;
    height: 30px;
    padding: 3px 50px;
}
.disabled-input {
    background-color: #ffffde;
    opacity: 1;
    height: 30px;
    width: 270px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
    border: 1px solid #c1c1c1;
}
.custom-input {
    background-color: #e3e2ff;
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
    width: 270px;
    border: 1px solid #c1c1c1;
}
.input-group .form-control {
    background-color: #e3e2ff;
    border: 1px solid #c1c1c1;
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}
.input-group .btn {
    background-color: #e3e2ff;
    border: 1px solid #c1c1c1;
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}
.input-group .btn:hover {
    background-color: #d1d0ff;
}
.label-custom {
    width: 180px;
}
.form-check-input-checked-bg-color {
    background-color: #7da5f0;
}

.btn-box {
    width: 90%;
    position: fixed;
}

.modal-title {
    text-align: center !important;
}
.selected {
    background-color: #2165b6;
    color: white;
}
</style>
