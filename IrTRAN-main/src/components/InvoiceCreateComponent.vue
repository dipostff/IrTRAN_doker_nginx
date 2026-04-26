<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import {
    getStations,
    getLegalEntities,
    getSendTypes,
    getCountries,
    getSpeedTypes,
    getRollingStockTypes,
    getOwnerships,
    getCargos,
    getTransportPackageTypes,
    getSubmissionSchedules,
    getTransportations,
    saveStudentDocument,
    updateStudentDocument,
} from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();

const INVOICE_STORAGE_KEY = "invoice_documents";
const saveError = ref(null);
const saveSuccess = ref(null);
const selectedRouteRows = ref([]);
const selectedSpecialMarks = ref([]);
const selectedAttachedDocs = ref([]);
const selectedGoods = ref([]);
const selectedContainers = ref([]);
const selectedWagons = ref([]);
const selectedConductors = ref([]);
const selectedWagonMarks = ref([]);
const editingSection = ref(null);
const editingIndex = ref(null);

function getDefaultDocument() {
    return {
        id: null,
        signed: false,
        invoice_type: "",
        id_blank_type: null,
        input_by_destination: false,
        id_send_type: null,
        id_shipper: null,
        shipper_addr: "",
        id_station_departure: null,
        id_station_destination: null,
        departure_railway_path: "",
        destination_railway_path: "",
        id_speed_type: null,
        id_place_of_payment: null,
        id_request_transportation: null,
        id_submission_schedule: null,
        cargo_work_type: null,
        id_country_departure: null,
        id_country_destination: null,
        payment_form: null,
        container_capacity_tons: null,
        id_receiver: null,
        receiver_addr: "",
        id_rolling_stock_type: null,
        id_ownership: null,
        goods: [],
        route_rows: [],
        special_marks: [],
        attached_documents: [],
        containers: [],
        wagons: [],
        conductors: [],
        wagon_marks: [],
        loading_time_msk: "",
        loading_time_local: "",
        mass_determination_method: null,
        cargo_secured_according_to: null,
        technical_conditions: "",
        loading_finished: false,
        backendId: null,
    };
}

// Состояние документа накладной (сохранение в localStorage до появления API)
const document = ref(getDefaultDocument());

// Типы накладной — статичный справочник
const invoiceTypeOptions = [
    { id: "Досылочная накладная", name: "Досылочная накладная" },
    { id: "Накладная на регулировку", name: "Накладная на регулировку" },
    { id: "Накладная на погрузку", name: "Накладная на погрузку" },
    { id: "Пересылочная накладная", name: "Пересылочная накладная" },
    { id: "Спец. перевозка", name: "Спец. перевозка" },
];

// Типы бланка — статичный справочник (при появлении API можно заменить на listsStore)
const blankTypeOptions = [
    { id: 1, name: "Грузовая накладная (форма ГУ-1)", code: "ГУ-1" },
    { id: 2, name: "Дополнение к перевозочным документам", code: "ГУ-1д" },
];

const cargoWorkTypeOptions = [
    { id: "Погрузка", name: "Погрузка" },
    { id: "Выгрузка", name: "Выгрузка" },
    { id: "Перегрузка", name: "Перегрузка" },
];

const paymentFormOptions = [
    { id: "Безналичный расчет", name: "Безналичный расчет" },
    { id: "Предоплата", name: "Предоплата" },
    { id: "Оплата получателем", name: "Оплата получателем" },
];

const containerCapacityOptions = [
    { id: 3, name: "3 т", code: "03" },
    { id: 5, name: "5 т", code: "05" },
    { id: 20, name: "20 т", code: "20" },
    { id: 24, name: "24 т", code: "24" },
    { id: 30, name: "30 т", code: "30" },
];

const massDeterminationOptions = [
    { id: "По трафарету", name: "По трафарету" },
    { id: "По весам", name: "По весам" },
    { id: "Расчетным путем", name: "Расчетным путем" },
];

const cargoSecuredOptions = [
    { id: "ТУ ЦМ-943", name: "ТУ ЦМ-943" },
    { id: "МТУ 2024", name: "МТУ 2024" },
    { id: "Схема размещения грузоотправителя", name: "Схема размещения грузоотправителя" },
];

const zpuTypeOptions = [
    { id: "Пломба", name: "Пломба" },
    { id: "Блокиратор", name: "Блокиратор" },
    { id: "Тросовый ЗПУ", name: "Тросовый ЗПУ" },
];

const zpuOwnershipOptions = [
    { id: "Перевозчик", name: "Перевозчик" },
    { id: "Грузоотправитель", name: "Грузоотправитель" },
    { id: "Собственник вагона", name: "Собственник вагона" },
];

const goodsRows = computed(() => Array.isArray(document.value.goods) ? document.value.goods : []);
const routeRows = computed(() => Array.isArray(document.value.route_rows) ? document.value.route_rows : []);
const specialMarksRows = computed(() => Array.isArray(document.value.special_marks) ? document.value.special_marks : []);
const attachedDocsRows = computed(() => Array.isArray(document.value.attached_documents) ? document.value.attached_documents : []);
const containersRows = computed(() => Array.isArray(document.value.containers) ? document.value.containers : []);
const wagonsRows = computed(() => Array.isArray(document.value.wagons) ? document.value.wagons : []);
const conductorsRows = computed(() => Array.isArray(document.value.conductors) ? document.value.conductors : []);
const wagonMarksRows = computed(() => Array.isArray(document.value.wagon_marks) ? document.value.wagon_marks : []);

const totalConductorCount = computed(() => conductorsRows.value.length);

function ensureArray(name) {
    if (!Array.isArray(document.value[name])) document.value[name] = [];
}

function requireSingleSelection(selectedRef, sectionName) {
    if (!Array.isArray(selectedRef.value) || selectedRef.value.length !== 1) {
        saveError.value = `Для изменения в секции "${sectionName}" выберите ровно одну строку.`;
        return false;
    }
    saveError.value = null;
    saveSuccess.value = `Редактирование: измените значения прямо в выбранной строке секции "${sectionName}".`;
    setTimeout(() => { saveSuccess.value = null; }, 2500);
    return true;
}

function removeSelectedByIndexes(fieldName, selectedRef, sectionName) {
    ensureArray(fieldName);
    const selected = new Set((selectedRef.value || []).map((x) => Number(x)));
    if (selected.size === 0) {
        saveError.value = `Для удаления в секции "${sectionName}" выберите хотя бы одну строку.`;
        return;
    }
    document.value[fieldName] = document.value[fieldName].filter((_, idx) => !selected.has(idx));
    selectedRef.value = [];
    saveError.value = null;
}

async function startInlineEdit(selectedRef, sectionKey, sectionName) {
    if (!requireSingleSelection(selectedRef, sectionName)) return;
    const idx = Number(selectedRef.value[0]);
    if (!Number.isFinite(idx)) return;
    editingSection.value = sectionKey;
    editingIndex.value = idx;
    await nextTick();
    const el = document.querySelector(`[data-edit-row="${sectionKey}-${idx}"]`);
    if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function isRowEditable(sectionKey, idx) {
    if (editingSection.value !== sectionKey) return true;
    return editingIndex.value === idx;
}

function finishInlineEdit() {
    editingSection.value = null;
    editingIndex.value = null;
}

function addRouteRow() {
    ensureArray("route_rows");
    document.value.route_rows.push({
        id_country: document.value.id_country_departure || null,
        id_station: document.value.id_station_departure || null,
        distance: "",
        payer_code: ""
    });
}
function removeRouteRow() { document.value.route_rows.pop(); }

function addSpecialMark() {
    ensureArray("special_marks");
    document.value.special_marks.push({ type: "Общая", mark: "", note: "" });
}
function removeSpecialMark() { document.value.special_marks.pop(); }

function addAttachedDoc() {
    ensureArray("attached_documents");
    document.value.attached_documents.push({ type: "Сертификат", document: "", number: "" });
}
function removeAttachedDoc() { document.value.attached_documents.pop(); }

function addGoodsRow() {
    ensureArray("goods");
    document.value.goods.push({
        id_cargo: null,
        package: "",
        places: "",
        packages: "",
        planned_weight_kg: "",
        gng_name: "",
        gng_code: "",
        danger: ""
    });
}
function removeGoodsRow() { document.value.goods.pop(); }

function addContainerRow() {
    ensureArray("containers");
    document.value.containers.push({
        number: "",
        id_ownership: null,
        id_owner: null,
        capacity_tons: "",
        net_kg: "",
        gross_kg: "",
        zpu_count: ""
    });
}
function removeContainerRow() { document.value.containers.pop(); }

function addWagonRow() {
    ensureArray("wagons");
    document.value.wagons.push({
        number: "",
        id_rolling_stock_type: null,
        capacity_tons: "",
        net_kg: "",
        gross_kg: "",
        zpu_count: ""
    });
}
function removeWagonRow() { document.value.wagons.pop(); }

function calculateWagonsNet() {
    const totalGoodsKg = goodsRows.value.reduce((sum, g) => sum + (Number(g.planned_weight_kg) || 0), 0);
    if (!wagonsRows.value.length) return;
    const each = Math.round(totalGoodsKg / wagonsRows.value.length);
    wagonsRows.value.forEach((w) => {
        w.net_kg = each;
        w.gross_kg = each + 24000;
    });
}

function addConductorRow() {
    ensureArray("conductors");
    document.value.conductors.push({ fio: "", passport_series: "", passport_number: "", mission_id: "" });
}
function removeConductorRow() { document.value.conductors.pop(); }

function addWagonMark() {
    ensureArray("wagon_marks");
    document.value.wagon_marks.push({ type: "Тарифная", mark: "", note: "" });
}
function removeWagonMark() { document.value.wagon_marks.pop(); }

async function loadLists() {
    try {
        await Promise.all([
            getStations(),
            getLegalEntities(),
            getSendTypes(),
            getCountries(),
            getSpeedTypes(),
            getRollingStockTypes(),
            getOwnerships(),
            getCargos(),
            getTransportPackageTypes(),
            getSubmissionSchedules(),
            getTransportations(),
        ]);
    } catch (e) {
        console.error("Ошибка загрузки справочников накладной:", e);
    }
}

function getStoredList() {
    try {
        const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
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
            const err = validateTrainingDocument("invoice", document.value);
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
        localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(list));
        document.value = { ...doc };
        if (getToken()) {
            try {
                const payload = { ...document.value };
                if (payload.backendId) {
                    await updateStudentDocument(payload.backendId, payload);
                } else {
                    const created = await saveStudentDocument("invoice", payload);
                    document.value.backendId = created.id;
                    const list2 = getStoredList();
                    const idx = list2.findIndex((d) => d.id === doc.id);
                    if (idx >= 0) list2[idx].backendId = created.id;
                    localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(list2));
                }
            } catch (apiErr) {
                console.warn("Синхронизация с сервером не выполнена:", apiErr);
            }
        }
        updateTitle("Накладная № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => { saveSuccess.value = null; }, 3000);
        if (!route.params.id) router.replace("/invoice/create/" + doc.id);
    } catch (e) {
        console.error(e);
        saveError.value = "Не удалось сохранить документ.";
    }
}

function signDocument() {
    if (document.value.signed) return;
    saveError.value = null;
    saveSuccess.value = null;
    document.value.signed = true;
    saveDocument();
    saveSuccess.value = "Документ подписан и сохранён.";
    setTimeout(() => { saveSuccess.value = null; }, 3000);
}

function spoilDocument() {
    if (!confirm("Испортить документ? Действие необратимо.")) return;
    saveError.value = null;
    saveSuccess.value = null;
    const id = document.value.id;
    if (id) {
        const list = getStoredList().filter((d) => d.id !== id);
        localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(list));
    }
    document.value = getDefaultDocument();
    updateTitle("Накладная (Новый документ)");
    router.push("/invoice/menu");
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = { ...getDefaultDocument(), ...found };
        updateTitle("Накладная № " + id);
    }
}

onMounted(async () => {
    await loadLists();
    if (route.params.id) loadDocumentById(route.params.id);
    else updateTitle("Накладная (Новый документ)");
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
            <div class="col-auto">
                <div class="alert alert-danger py-1 px-2 mb-0">{{ saveError }}</div>
            </div>
        </div>
        <div class="row mt-2" v-if="saveSuccess">
            <div class="col-auto">
                <div class="alert alert-success py-1 px-2 mb-0">{{ saveSuccess }}</div>
            </div>
        </div>
        <TrainingScenarioPanel doc-type="invoice" :document="document" />
    </div>

    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="home-tab" data-toggle="tab" data-target="#home-tab-pane" type="button" role="tab" aria-controls="home-tab-pane" aria-selected="true">Документ</button>
            </li>
        </ul>

        <div class="tab-content" id="myTabContent">
            <div class="tab-pane fade show active" style="margin-top: 1em" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabindex="0">
                <div class="row mb-1">
                    <simple-select title="Тип накладной" :values="invoiceTypeOptions" valueKey="id" name="name" v-model="document.invoice_type" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Ввод по назначению</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" v-model="document.input_by_destination" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select title="Тип бланка" :values="blankTypeOptions" valueKey="id" name="name" v-model="document.id_blank_type" />
                    <disable-simple-input title="Код бланка" :dis="true" :value="blankTypeOptions.find(b => b.id === document.id_blank_type)?.code ?? ''" :fixWidth="false" styleInput="width: 100px" />
                    </div>

                <div class="row mb-1">
                    <select-with-search title="Вид отправки" :values="listsStore.send_types" valueKey="id" name="name" v-model="document.id_send_type" modalName="InvoiceSendType" :fields="{ 'Код ИОДВ': 'code_IODV', 'Наименование': 'name', 'Аббревиатура': 'abbreviation' }" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Грузоотправитель" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_shipper" modalName="InvoiceShipper" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование грузоотправителя': 'name', 'ИД бизнеса': 'id_business', 'ИД холдинга': 'id_holding', 'Наименование холдинга': 'name_holding' }" />
                    <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.OKPO ?? ''" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="ИНН" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.INN ?? ''" :fixWidth="false" styleInput="width: 150px" />
                    </div>

                <div class="row mb-1">
                    <disable-simple-input title="Наименование грузоотправителя" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.name ?? ''" styleInput="width: 870px" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Адрес грузоотправителя" v-model="document.shipper_addr" styleInput="width: 770px" />
                    <disable-simple-input title="ТГНЛ" :dis="true" :value="listsStore.legal_entities[document.id_shipper]?.TGNL_code ?? ''" :fixWidth="false" styleInput="width: 150px" />
                </div>

                <div class="row mb-1">
                    <select-with-search
                        title="Заявка"
                        :values="listsStore.transportations"
                        valueKey="id"
                        name="id"
                        v-model="document.id_request_transportation"
                        modalName="InvoiceRequestTransportation"
                        :fields="{ 'ID заявки': 'id', 'Период с': 'transportation_date_from', 'Период по': 'transportation_date_to' }"
                    />
                </div>

                <!--Найти Заявка отправки модальное окно -->
                <div class="modal fade" id="Zaivka" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Заявка</span>
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
                                                <th>Код заявки</th>
                                                <th>Наименование грузоотправителя</th>
                                                <th>Краткое наименование</th>
                                                <th>ИД</th>
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
                    <select-with-search
                        title="График подач"
                        :values="listsStore.submission_schedules"
                        valueKey="id"
                        name="id"
                        v-model="document.id_submission_schedule"
                        modalName="InvoiceSubmissionSchedule"
                        :fields="{ 'ID графика': 'id', 'Дата': 'submission_date', 'Вагонов': 'count_wagon', 'Вес': 'weight' }"
                    />
                </div>

                                <!--Найти График подач модальное окно -->
                <div class="modal fade" id="GrafikPodach" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">График подач</span>
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
                                                <th>Номер отправки</th>
                                                <th>Дата подачи</th>
                                                <th>Кол-во вагонов</th>
                                                <th>Вес</th>
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
                    <select-with-search title="Грузополучатель" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_receiver" modalName="InvoiceReceiver" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование грузополучателя': 'name', 'ИД бизнеса': 'id_business', 'ИД холдинга': 'id_holding', 'Наименование холдинга': 'name_holding' }" />
                    <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[document.id_receiver]?.OKPO ?? ''" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="ИНН" :dis="true" :value="listsStore.legal_entities[document.id_receiver]?.INN ?? ''" :fixWidth="false" styleInput="width: 150px" />
                    </div>

                <div class="row mb-1">
                    <disable-simple-input title="Наименование грузополучателя" :dis="true" :value="listsStore.legal_entities[document.id_receiver]?.name ?? ''" styleInput="width: 870px" />
                </div>

                <div class="row mb-1">
                    <simple-input title="Адрес" v-model="document.receiver_addr" styleInput="width: 770px" />
                    <disable-simple-input title="ТГНЛ" :dis="true" :value="listsStore.legal_entities[document.id_receiver]?.TGNL_code ?? ''" :fixWidth="false" styleInput="width: 150px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Вид грузовых работ" :values="cargoWorkTypeOptions" valueKey="id" name="name" v-model="document.cargo_work_type" />
                </div>

                <!--Найти Вид грузовых работ отправки модальное окно -->
                <div class="modal fade" id="VidGruzRabot" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Вид грузовых работ</span>
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
                                                <th>Код вида грузовой работы</th>
                                                <th>Вид грузовой работы</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <select-with-search title="Страна отправления" :values="listsStore.countries" valueKey="id" name="name" v-model="document.id_country_departure" modalName="InvoiceCountryDeparture" :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование': 'name', 'Краткое': 'short_name' }" />
                    <disable-simple-input title="Код" :dis="true" :value="listsStore.countries[document.id_country_departure]?.OSCM_code ?? ''" :fixWidth="false" styleInput="width: 100px" />
                </div>

                <!--Найти Страна отправления модальное окно -->
                <div class="modal fade" id="StranaOtprInvoce" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Страна отправления</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код ОСКМ</th>
                                                <th>Наименование страны</th>
                                                <th>Краткое наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <select-with-search title="Страна назначения" :values="listsStore.countries" valueKey="id" name="name" v-model="document.id_country_destination" modalName="InvoiceCountryDestination" :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование': 'name', 'Краткое': 'short_name' }" />
                    <disable-simple-input title="Код" :dis="true" :value="listsStore.countries[document.id_country_destination]?.OSCM_code ?? ''" :fixWidth="false" styleInput="width: 100px" />
                </div>

                <!--Найти Страна назначения модальное окно -->
                <div class="modal fade" id="StranaNaznachInvoce" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Страна назначения</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код ОСКМ</th>
                                                <th>Наименование страны</th>
                                                <th>Краткое наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <select-with-search title="Станция отправления/входа в СНГ" :values="listsStore.stations" valueKey="id" name="name" v-model="document.id_station_departure" modalName="InvoiceStationDep" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', 'Параграфы': 'paragraph' }" />
                    <disable-simple-input title="Код" :dis="true" :value="listsStore.stations[document.id_station_departure]?.code ?? ''" :fixWidth="false" styleInput="width: 90px" />
                    <disable-simple-input title="ЖД" :dis="true" :value="listsStore.stations[document.id_station_departure]?.railway ?? ''" :fixWidth="false" styleInput="width: 60px" />
                    <disable-simple-input title="Параграфы" :dis="true" :value="listsStore.stations[document.id_station_departure]?.paragraph ?? ''" :fixWidth="false" styleInput="width: 140px" />
                    <disable-simple-input title="Узел" :dis="true" :value="listsStore.stations[document.id_station_departure]?.knot ?? ''" :fixWidth="false" styleInput="width: 140px" />
                    </div>

                <div class="row mb-1">
                    <simple-input title="Подъездной путь станции отправления" v-model="document.departure_railway_path" styleInput="width: 270px" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Станция назначения/выхода из СНГ" :values="listsStore.stations" valueKey="id" name="name" v-model="document.id_station_destination" modalName="InvoiceStationDest" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', 'Параграфы': 'paragraph' }" />
                    <disable-simple-input title="Код" :dis="true" :value="listsStore.stations[document.id_station_destination]?.code ?? ''" :fixWidth="false" styleInput="width: 90px" />
                    <disable-simple-input title="ЖД" :dis="true" :value="listsStore.stations[document.id_station_destination]?.railway ?? ''" :fixWidth="false" styleInput="width: 60px" />
                    <disable-simple-input title="Параграфы" :dis="true" :value="listsStore.stations[document.id_station_destination]?.paragraph ?? ''" :fixWidth="false" styleInput="width: 140px" />
                    <disable-simple-input title="Узел" :dis="true" :value="listsStore.stations[document.id_station_destination]?.knot ?? ''" :fixWidth="false" styleInput="width: 140px" />
                    </div>

                <div class="row mb-1">
                    <simple-input title="Подъездной путь станции назначения" v-model="document.destination_railway_path" styleInput="width: 270px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Скорость" :values="listsStore.speed_types" valueKey="id" name="name" v-model="document.id_speed_type" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Место оплаты" :values="listsStore.countries" valueKey="id" name="name" v-model="document.id_place_of_payment" modalName="InvoicePlacePayment" :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование страны': 'name', 'Краткое наименование': 'short_name' }" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Форма оплаты" :values="paymentFormOptions" valueKey="id" name="name" v-model="document.payment_form" />
                </div>

                <!--Найти Форма оплаты модальное окно -->
                <div class="modal fade" id="FormaOplat" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Форма оплаты</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Наименование</th>
                                                <th>Краткое наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <label class="col-auto col-form-label mb-0 label-custom">Код исключительного тарифа</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <select-with-search title="Планируемый род вагона" :values="listsStore.rolling_stock_types" valueKey="id" name="name" v-model="document.id_rolling_stock_type" modalName="InvoiceRollingStock" :fields="{ 'Код': 'code', 'Наименование': 'name', 'Аббревиатура': 'abbreviation', 'Код рода вагонов в накладной': 'code_invoice_wagon' }" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Планируемый тип собственности вагона" :values="listsStore.ownerships" valueKey="id" name="name" v-model="document.id_ownership" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Планируемое количество вагонов</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select title="Планируемая грузоподъемность контейнера (т)" :values="containerCapacityOptions" valueKey="id" name="name" v-model="document.container_capacity_tons" />
                    <disable-simple-input title="Код" :dis="true" :value="containerCapacityOptions.find((x) => x.id === document.container_capacity_tons)?.code ?? ''" :fixWidth="false" styleInput="width: 100px" />
                </div>

                <!--Найти Планируемая грузоподъемность контейнера (т) модальное окно -->
                <div class="modal fade" id="GruzopodCont" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Планируемая грузоподъемность контейнера (т)</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Мнемокод</th>
                                                <th>Наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <label class="col-auto col-form-label mb-0 label-custom">Планируемый тип собственности контейнера / контрейлера</label>
                    <div class="col-3">
                        <select class="form-select mt-0 custom-input">
                            <option value="">Выберете элемент списка</option>
                            <option value="Собственные">Собственные</option>
                            <option value="Арендованные">Арендованные</option>
                            <option value="Собственные и арендованные">Собственные и арендованные</option>
                        </select>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Планируемое количество контейнеров / контрейлеров</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                    </div>
                </div>

                <!---------------------------------------- Грузы ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Грузы</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addGoodsRow">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedGoods, 'goods', 'Грузы')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'goods'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('goods', selectedGoods, 'Грузы')">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="document.goods = []">Удалить все</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Код груза</th>
                                        <th>Груз</th>
                                        <th>Упаковка</th>
                                        <th>Кол-во мест</th>
                                        <th>Кол-во пакетов</th>
                                        <th>План. масса груза (кг)</th>
                                        <th>Код груза ГНГ</th>
                                        <th>Признак опасности</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(good, idx) in goodsRows" :key="`good-${idx}`" :data-edit-row="`goods-${idx}`" :class="{ 'editing-row': editingSection === 'goods' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedGoods" :disabled="editingSection === 'goods' && editingIndex !== idx" /></td>
                                        <td>{{ listsStore.cargos[good.id_cargo]?.code_ETSNG ?? "—" }}</td>
                                        <td>{{ listsStore.cargos[good.id_cargo]?.name ?? good.gng_name ?? "—" }}</td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="good.package" :disabled="!isRowEditable('goods', idx)" /></td>
                                        <td><input type="number" class="form-control mt-0 custom-input" v-model="good.places" :disabled="!isRowEditable('goods', idx)" /></td>
                                        <td><input type="number" class="form-control mt-0 custom-input" v-model="good.packages" :disabled="!isRowEditable('goods', idx)" /></td>
                                        <td><input type="number" class="form-control mt-0 custom-input" v-model="good.planned_weight_kg" :disabled="!isRowEditable('goods', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="good.gng_code" :disabled="!isRowEditable('goods', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="good.danger" :disabled="!isRowEditable('goods', idx)" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Погрузка на вагон средствами</label>
                    <div class="col-3">
                        <select class="form-select mt-0 custom-input">
                            <option value="">Выберете элемент списка</option>
                            <option value="Грузоотправителя">Грузоотправителя</option>
                            <option value="Грузоотправителя">Грузоотправителя</option>
                            <option value="Плательщика">Плательщика</option>
                        </select>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Объявленная ценность (руб)</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Объявленная ценность (фр)</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                    </div>
                </div>

                <!--Добавить Грузы модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="DobavitGruz" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 90%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" id="staticBackdropLabel" style="color: white; font-weight: bold">Грузы</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 32%">Поле "Груз ЕТ СНГ" обязательно к заполнению</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>

                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Опасный груз</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Признак опасного груза</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value="Неопасный груз">Неопасный груз</option>
                                            <option value="Контейнерная">Контейнерная</option>
                                            <option value="Контейнерная комплектом на вагон">Контейнерная комплектом на вагон</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Код ГНГ</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Груз ГНГ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 460px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#GruzGNG">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 130px">Код груза ГНГ</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 140px" placeholder="" disabled="disabled" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 140px">Старый код ГНГ</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 138px" placeholder="" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование груза ГНГ</label>
                                    <div class="col-10">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%; height: 200px" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Код ЕТ СНГ</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Груз ЕТ СНГ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 670px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#GruzETSNG">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 100px">Код груза</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 268px" placeholder="" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Точное наименование груза</label>
                                    <div class="col-10">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%; height: 200px" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дополнительные сведения о грузе</label>

                                    <div class="col-10">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%; height: 200px" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса груза (кг)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Количество мест</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Знаки и марки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Объем</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>
                                </div>

                                <!-------------------------------------Отметки на груз---------------------------->

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Отметки на груз</label>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="#DobavitOtmetkyNaGruz">Добавить</button>
                                        <button type="button" class="btn btn-custom">Изменить</button>
                                        <button type="button" class="btn btn-custom">Удалить</button>
                                        <button type="button" class="btn btn-custom">Удалить все</button>
                                        <button type="button" class="btn btn-custom">Копировать</button>
                                        <button type="button" class="btn btn-custom">Вставить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-12">
                                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                                            <table class="table table-hover table-bordered border-white">
                                                <thead style="background-color: #7da5f0; color: white">
                                                    <tr>
                                                        <th></th>
                                                        <th>Тип</th>
                                                        <th>Отметка</th>
                                                        <th>Замечание</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="table-group-divider">
                                                    <tr>
                                                        <td>
                                                            <input type="checkbox" class="row-checkbox" />
                                                        </td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <!----------------------------------------------------------------->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ------------------------------------------------------- -->

                <!--Найти Груз ГНГ модальное окно -->
                <div class="modal fade" id="GruzGNG" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Груз ГНГ</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код груза</th>
                                                <th>Код груза ГНГ</th>
                                                <th>Старый код груза ГНГ</th>
                                                <th>Наименование</th>
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

                <!--Найти Груз ЕТ СНГ модальное окно -->
                <div class="modal fade" id="GruzETSNG" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Груз ЕТ СНГ</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код груза</th>
                                                <th>Код груза ЕТ СНГ</th>
                                                <th>Наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!--Добавить отметки на груз модальное окно -->
                <div class="modal fade" id="DobavitOtmetkyNaGruz" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Добавить отметки на груз</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 10%">Поле "Отметка" обязательно к заполнению</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Отметки на груз</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Отметки на груз</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 670px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityOtmetkyNaGruz">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Найти отметки на груз модальное окно -->
                <div class="modal fade" id="NaityOtmetkyNaGruz" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Отметки на груз</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Тип</th>
                                                <th>Значение</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------->

                <!---------------------------------------- Маршрут следования ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Маршрут следования</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addRouteRow">Выполнить расчет маршрута</button>
                        <button type="button" class="btn btn-custom" disabled>Снять промывку</button>
                        <button type="button" class="btn btn-custom" disabled>Перегруз по колее</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedRouteRows, 'route', 'Маршрут следования')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'route'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('route_rows', selectedRouteRows, 'Маршрут следования')">Удалить</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Страна инфраструктуры</th>
                                        <th>Тарифная станция</th>
                                        <th>Дорога</th>
                                        <th>Код станции</th>
                                        <th>Порт</th>
                                        <th>Подъездной путь</th>
                                        <th>Кратчайшее расстояние</th>
                                        <th>Плательщик</th>
                                        <th>Код плательщика</th>
                                        <th>Подкод экспедитора</th>
                                        <th>Вид транспорта</th>
                                        <th>Код колеи</th>
                                        <th>Тип станции</th>
                                        <th>Фактическая станция</th>
                                        <th>Код факт. станции</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(routeRow, idx) in routeRows" :key="`route-${idx}`" :data-edit-row="`route-${idx}`" :class="{ 'editing-row': editingSection === 'route' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedRouteRows" :disabled="editingSection === 'route' && editingIndex !== idx" /></td>
                                        <td>{{ listsStore.countries[routeRow.id_country]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.stations[routeRow.id_station]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.stations[routeRow.id_station]?.railway ?? "—" }}</td>
                                        <td>{{ listsStore.stations[routeRow.id_station]?.code ?? "—" }}</td>
                                        <td>—</td>
                                        <td>{{ document.departure_railway_path || "—" }}</td>
                                        <td>{{ routeRow.distance || "—" }}</td>
                                        <td>{{ listsStore.legal_entities[document.id_shipper]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.legal_entities[document.id_shipper]?.OKPO ?? "—" }}</td>
                                        <td>—</td>
                                        <td>ЖД</td>
                                        <td>1520</td>
                                        <td>Станция</td>
                                        <td>{{ listsStore.stations[routeRow.id_station]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.stations[routeRow.id_station]?.code ?? "—" }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Вид сообщения</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                    </div>
                </div>

                <!--Выполнить расчет маршрута модальное окно -->
                <div class="modal fade" id="RaschetMarhruta" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Выполнить расчет маршрута</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------->

                <!---------------------------------------- Специальные отметки ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Специальные отметки</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addSpecialMark">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedSpecialMarks, 'special', 'Специальные отметки')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'special'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('special_marks', selectedSpecialMarks, 'Специальные отметки')">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="document.special_marks = []">Удалить все</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-12">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Тип</th>
                                        <th>Отметка</th>
                                        <th>Замечание</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(mark, idx) in specialMarksRows" :key="`sp-${idx}`" :data-edit-row="`special-${idx}`" :class="{ 'editing-row': editingSection === 'special' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedSpecialMarks" :disabled="editingSection === 'special' && editingIndex !== idx" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.type" :disabled="!isRowEditable('special', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.mark" :disabled="!isRowEditable('special', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.note" :disabled="!isRowEditable('special', idx)" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Специальные отметки модальное окно -->
                <div class="modal fade" id="DobavitSpecOtmetku" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Cпециальные отметки</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 10%">Поле "Отметка" обязательно к заполнению</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Отметки</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 670px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaitySpecOtmetky">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Найти Специальные отметки модальное окно -->
                <div class="modal fade" id="NaitySpecOtmetky" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Специальные отметки</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Тип</th>
                                                <th>Значение</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------->

                <!---------------------------------------- Прилагаемые и предъявляемые документы ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Прилагаемые и предъявляемые документы</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addAttachedDoc">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedAttachedDocs, 'docs', 'Прилагаемые и предъявляемые документы')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'docs'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('attached_documents', selectedAttachedDocs, 'Прилагаемые и предъявляемые документы')">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="document.attached_documents = []">Удалить все</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-12">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Тип документа</th>
                                        <th>Документ</th>
                                        <th>Номер документа</th>
                                        <th>Увеличение срока доставки (сут)</th>
                                        <th>Модель вагона</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(docRow, idx) in attachedDocsRows" :key="`ad-${idx}`" :data-edit-row="`docs-${idx}`" :class="{ 'editing-row': editingSection === 'docs' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedAttachedDocs" :disabled="editingSection === 'docs' && editingIndex !== idx" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="docRow.type" :disabled="!isRowEditable('docs', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="docRow.document" :disabled="!isRowEditable('docs', idx)" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="docRow.number" :disabled="!isRowEditable('docs', idx)" /></td>
                                        <td>0</td>
                                        <td>{{ listsStore.rolling_stock_types[document.id_rolling_stock_type]?.name ?? "—" }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Ответственный за внесение данных</label>
                    <div class="col-4">
                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Заполнение заготовки закончено</label>
                    <div class="col-10">
                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" placeholder="" disabled />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">На визирование</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>
                </div>

                <!--Добавить Прилагаемые и предъявляемые документы модальное окно -->
                <div class="modal fade" id="DobavitPrilagDoc" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Прилагаемые и предъявляемые документы</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 5%">Поле "Документ" обязательно к заполнению</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 120px">Документ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 570px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityPrilagDoc">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 120px">№ документа</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 570px" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Найти Прилагаемые и предъявляемые документы модальное окно -->
                <div class="modal fade" id="NaityPrilagDoc" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Прилагаемые и предъявляемые документы</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Номер</th>
                                                <th>Тип</th>
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

                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------->

                <!---------------------------------------- Контейнеры ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Контейнеры</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addContainerRow">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedContainers, 'containers', 'Контейнеры')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'containers'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('containers', selectedContainers, 'Контейнеры')">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="document.containers = []">Удалить все</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Номер контейнера</th>
                                        <th>Масса тары</th>
                                        <th>Объем (м3)</th>
                                        <th>Масса брутто (кг)</th>
                                        <th>Масса нетто (кг)</th>
                                        <th>Тип собственности</th>
                                        <th>Страна собственности</th>
                                        <th>Собственник ОКПО</th>
                                        <th>Собственник наименование орг.</th>
                                        <th>Количество ЗПУ и пломб</th>
                                        <th>Отцеп / перегруз</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(container, idx) in containersRows" :key="`ctr-${idx}`" :data-edit-row="`containers-${idx}`" :class="{ 'editing-row': editingSection === 'containers' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedContainers" :disabled="editingSection === 'containers' && editingIndex !== idx" /></td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="container.number" :disabled="!isRowEditable('containers', idx)" /></td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>{{ container.gross_kg || "—" }}</td>
                                        <td>{{ container.net_kg || "—" }}</td>
                                        <td>{{ listsStore.ownerships[container.id_ownership]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.countries[document.id_country_departure]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.legal_entities[container.id_owner]?.OKPO ?? "—" }}</td>
                                        <td>{{ listsStore.legal_entities[container.id_owner]?.name ?? "—" }}</td>
                                        <td>{{ container.zpu_count || "—" }}</td>
                                        <td>—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Контейнеры модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="DobavitCont" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 90%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" id="staticBackdropLabel" style="color: white; font-weight: bold">Контейнеры</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 32%">Необходимо ввести номер контейнера!</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер контейнера</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Из АБДПК</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Типоразмер с кузова</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Грузоподъемность (тонны)</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#GruzopodTonn">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Значение грузоподъемности</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Объем, м3</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса тары, кг</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Количество мест в контейнере</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса нетто</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса брутто фактическая</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Администрация собственника</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 470px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#AdminSobst">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Код администрации собственника</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Тип собственности</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value=""></option>
                                            <option value=""></option>
                                            <option value=""></option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Собственник</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#Sobstvennik">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Собственник ОКПО</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Собственник наименование организации</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <!-------------------------------------ЗПУ---------------------------->

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">ЗПУ</label>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="#DobavitZPU">Добавить</button>
                                        <button type="button" class="btn btn-custom">Изменить</button>
                                        <button type="button" class="btn btn-custom">Удалить</button>
                                        <button type="button" class="btn btn-custom">Удалить все</button>
                                        <button type="button" class="btn btn-custom">Копировать</button>
                                        <button type="button" class="btn btn-custom">Вставить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-12">
                                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                                            <table class="table table-hover table-bordered border-white">
                                                <thead style="background-color: #7da5f0; color: white">
                                                    <tr>
                                                        <th></th>
                                                        <th>Тип ЗПУ</th>
                                                        <th>Знаки</th>
                                                        <th>Количество</th>
                                                        <th>Год изготовления</th>
                                                        <th>Принадлежность</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="table-group-divider">
                                                    <tr>
                                                        <td>
                                                            <input type="checkbox" class="row-checkbox" />
                                                        </td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <!----------------------------------------------------------------->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ------------------------------------------------------- -->

                <!--Найти Грузоподъемность (тонны) модальное окно -->
                <div class="modal fade" id="GruzopodTonn" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Грузоподъемность (тонны)</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код груза</th>
                                                <th>Наименование груза</th>
                                                <th>Макс грузоподъемность</th>
                                                <th>Мин грузоподъемность</th>
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

                <!--Найти Администрация собственника модальное окно -->
                <div class="modal fade" id="AdminSobst" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Администрация собственника</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Код ОКПО</th>
                                                <th>Наименование</th>
                                                <th>Адрес</th>
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

                <!--Найти Собственник модальное окно -->
                <div class="modal fade" id="Sobstvennik" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Собственник</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Код ОКПО</th>
                                                <th>Наименование</th>
                                                <th>Адрес</th>
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

                <!--Добавить ЗПУ модальное окно -->
                <div class="modal fade" id="DobavitZPU" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">ЗПУ</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 40%">Введите тип ЗПУ!</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Тип ЗПУ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 370px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityTipZPU">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" style="width: auto" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Знаки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Год изготовления</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Принадлежность ЗПУ/пломб</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value=""></option>
                                            <option value=""></option>
                                            <option value=""></option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дорога</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 655px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityDorogu">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Найти Тип ЗПУ модальное окно -->
                <div class="modal fade" id="NaityTipZPU" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Тип ЗПУ</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Тип</th>
                                                <th>Значение</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!--Найти Дорога модальное окно -->
                <div class="modal fade" id="NaityDorogu" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Дорога</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код дороги</th>
                                                <th>Параграфы</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------->

                <!---------------------------------------- Вагоны ----------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Вагоны</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addWagonRow">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedWagons, 'wagons', 'Вагоны')">Изменить</button>
                        <button type="button" class="btn btn-custom" v-if="editingSection === 'wagons'" @click="finishInlineEdit">Готово</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('wagons', selectedWagons, 'Вагоны')">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="document.wagons = []">Удалить все</button>
                        <button type="button" class="btn btn-custom">Копировать</button>
                        <button type="button" class="btn btn-custom">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№ п/п</th>
                                        <th>Номер вагона</th>
                                        <th>Страна собств.</th>
                                        <th>Собств.</th>
                                        <th>Род вагона</th>
                                        <th>Грузоподъемность</th>
                                        <th>Масса тары с бруса (ц)</th>
                                        <th>Масса тары пров. (ц)</th>
                                        <th>Рол.</th>
                                        <th>Масса брутто</th>
                                        <th>Масса нетто</th>
                                        <th>Мест</th>
                                        <th>Количество пакетов</th>
                                        <th>Пров.</th>
                                        <th>Негабаритность</th>
                                        <th>Темп. налива t(С)</th>
                                        <th>Высота налива (см)</th>
                                        <th>Плот. (г/см3)</th>
                                        <th>Объем (м3)</th>
                                        <th>Тип цистерны</th>
                                        <th>Отцеп</th>
                                        <th>Количество ЗПУ и пломб</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(wagon, idx) in wagonsRows" :key="`wag-${idx}`" :data-edit-row="`wagons-${idx}`" :class="{ 'editing-row': editingSection === 'wagons' && editingIndex === idx }">
                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedWagons" :disabled="editingSection === 'wagons' && editingIndex !== idx" /></td>
                                        <td>{{ idx + 1 }}</td>
                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="wagon.number" :disabled="!isRowEditable('wagons', idx)" /></td>
                                        <td>{{ listsStore.countries[document.id_country_departure]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.legal_entities[document.id_shipper]?.name ?? "—" }}</td>
                                        <td>{{ listsStore.rolling_stock_types[wagon.id_rolling_stock_type]?.name ?? "—" }}</td>
                                        <td>{{ wagon.capacity_tons || "—" }}</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>{{ wagon.gross_kg || "—" }}</td>
                                        <td>{{ wagon.net_kg || "—" }}</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>{{ wagon.zpu_count || "—" }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Вагоны модальное окно -->
                <div class="modal fade" id="DobavitVagon" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 80%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Вагон № п/п 1</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 30%">Необходимо ввести номер вагона!</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код дороги приписки</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Род вагона</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityRodVagona">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Грузоподъемность (тонны)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса тары с бруса (центнеры)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса тары проверен. (центнеры)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Оси</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Длина по осям</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Администрация собственник</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityAdminSobst">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код администрации</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Тип собственности</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input">
                                            <option value="">Выберете элемент списка</option>
                                            <option value="Собственный">Собственный</option>
                                            <option value=""></option>
                                            <option value=""></option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Собственник</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 470px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaitySobst">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">ОКПО собственника</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование собственника</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса нетто (кг)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="calculateWagonsNet">Рассчитать</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса дополнительного оборудования (кг)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Масса брутто (кг)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <!------------------------------------------------------Проводники----------------------------------------------------->

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Проводники</label>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="addConductorRow">Добавить</button>
                                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedConductors, 'conductors', 'Проводники')">Изменить</button>
                                        <button type="button" class="btn btn-custom" v-if="editingSection === 'conductors'" @click="finishInlineEdit">Готово</button>
                                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('conductors', selectedConductors, 'Проводники')">Удалить</button>
                                        <button type="button" class="btn btn-custom" @click="document.conductors = []">Удалить все</button>
                                        <button type="button" class="btn btn-custom">Копировать</button>
                                        <button type="button" class="btn btn-custom">Вставить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-12">
                                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                                            <table class="table table-hover table-bordered border-white">
                                                <thead style="background-color: #7da5f0; color: white">
                                                    <tr>
                                                        <th></th>
                                                        <th>ФИО</th>
                                                        <th>Серия паспорта</th>
                                                        <th>№ паспорта</th>
                                                        <th>№ командировочного удостоверения</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="table-group-divider">
                                                    <tr v-for="(conductor, idx) in conductorsRows" :key="`cond-${idx}`" :data-edit-row="`conductors-${idx}`" :class="{ 'editing-row': editingSection === 'conductors' && editingIndex === idx }">
                                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedConductors" :disabled="editingSection === 'conductors' && editingIndex !== idx" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="conductor.fio" :disabled="!isRowEditable('conductors', idx)" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="conductor.passport_series" :disabled="!isRowEditable('conductors', idx)" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="conductor.passport_number" :disabled="!isRowEditable('conductors', idx)" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="conductor.mission_id" :disabled="!isRowEditable('conductors', idx)" /></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Количество проводников</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" :value="totalConductorCount" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Ранее перевозимый груз ГНГ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 370px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityRaneePerevozGruzGNG">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 120px">Код ГНГ</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Ранее перевозимый груз ЕТ СНГ</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 370px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityRaneePerevozGruzETSNG">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 120px">Код ЕТ СНГ</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Индекс негабаритности</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <!----------------------------------------------------------------------------------------------->

                                <!------------------------------------------------------Вагонные отметки и тарифные отметки на вагон----------------------------------------------------->

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Вагонные отметки и тарифные отметки на вагон</label>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="addWagonMark">Добавить</button>
                                        <button type="button" class="btn btn-custom" @click="startInlineEdit(selectedWagonMarks, 'wagon-marks', 'Вагонные отметки')">Изменить</button>
                                        <button type="button" class="btn btn-custom" v-if="editingSection === 'wagon-marks'" @click="finishInlineEdit">Готово</button>
                                        <button type="button" class="btn btn-custom" @click="removeSelectedByIndexes('wagon_marks', selectedWagonMarks, 'Вагонные отметки')">Удалить</button>
                                        <button type="button" class="btn btn-custom" @click="document.wagon_marks = []">Удалить все</button>
                                        <button type="button" class="btn btn-custom">Копировать</button>
                                        <button type="button" class="btn btn-custom">Вставить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <div class="col-12">
                                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                                            <table class="table table-hover table-bordered border-white">
                                                <thead style="background-color: #7da5f0; color: white">
                                                    <tr>
                                                        <th></th>
                                                        <th>Тип отметки</th>
                                                        <th>Отметка</th>
                                                        <th>Замечание</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="table-group-divider">
                                                    <tr v-for="(mark, idx) in wagonMarksRows" :key="`wm-${idx}`" :data-edit-row="`wagon-marks-${idx}`" :class="{ 'editing-row': editingSection === 'wagon-marks' && editingIndex === idx }">
                                                        <td><input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedWagonMarks" :disabled="editingSection === 'wagon-marks' && editingIndex !== idx" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.type" :disabled="!isRowEditable('wagon-marks', idx)" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.mark" :disabled="!isRowEditable('wagon-marks', idx)" /></td>
                                                        <td><input type="text" class="form-control mt-0 custom-input" v-model="mark.note" :disabled="!isRowEditable('wagon-marks', idx)" /></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <!---------------------------------------------------------------------------------------------------------------------------------------------->
                            </div>
                        </div>
                    </div>
                </div>

                <!--Найти Род вагона модальное окно -->
                <div class="modal fade" id="NaityRodVagona" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Род вагона</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Наименование рода вагона</th>
                                                <th>Аббревиатура</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!--Найти Администрация собственник модальное окно -->
                <div class="modal fade" id="NaityAdminSobst" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Администрация собственник</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>ОКПО</th>
                                                <th>Наименование</th>
                                                <th>Адрес</th>
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

                <!--Найти Собственник модальное окно -->
                <div class="modal fade" id="NaitySobst" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Собственник</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>ОКПО</th>
                                                <th>Наименование</th>
                                                <th>Адрес</th>
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

                <!--Найти Ранее перевозимый груз ГНГ модальное окно -->
                <div class="modal fade" id="NaityRaneePerevozGruzGNG" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Ранее перевозимый груз ГНГ</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Код ГПГ</th>
                                                <th>Наименование груза</th>
                                                <th>Аббревиатура</th>
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

                <!--Найти Ранее перевозимый груз ЕТ СНГ модальное окно -->
                <div class="modal fade" id="NaityRaneePerevozGruzETSNG" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Ранее перевозимый груз ЕТ СНГ</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Код ЕТ СНГ</th>
                                                <th>Наименование груза</th>
                                                <th>Аббревиатура</th>
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

                <!--Добавить Проводника модальное окно -->
                <div class="modal fade" id="DobavitProvodnika" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Проводник</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 35%">Введите ФИО</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">ФИО</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Серия</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">№ паспорта</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: auto" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">№ командировочного удостоверения</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" placeholder="" disabled />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-------------------------------------------------->

                <!--Добавить Вагонные отметки и тарифные отметки на вагон модальное окно -->
                <div class="modal fade" id="DobavitVagonOtmatky" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Вагонные отметки и тарифные отметки на вагон</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 10%">Поле "Отметка" обязательно к заполнению</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Отметка</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 670px">
                                            <input type="text" class="form-control custom-search" placeholder="Поиск" aria-label="Введите запрос" />
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#NaityVagonOtmetku">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-------------------------------------------------->

                <!--Найти Отметка модальное окно -->
                <div class="modal fade" id="NaityVagonOtmetku" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Отметка</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Тип</th>
                                                <th>Значение</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!--Найти Дорога модальное окно -->
                <div class="modal fade" id="NaityDorogu" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Дорога</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код дороги</th>
                                                <th>Параграфы</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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

                <!----------------------------- -->

                <!----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->

                <div class="row mb-1">
                    <simple-select title="Способ определения массы" :values="massDeterminationOptions" valueKey="id" name="name" v-model="document.mass_determination_method" />
                </div>

                <!--Найти Способ определения массы модальное окно -->
                <div class="modal fade" id="SposobOpredMass" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Способ определения массы</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row justify-content-md-center mb-2">
                                    <div class="col-12">
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                            <div class="input-group-append">
                                                <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                <th>Код</th>
                                                <th>Мнемокод</th>
                                                <th>Наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
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
                    <label class="col-auto col-form-label mb-0 label-custom">Кем проводилось</label>
                    <div class="col-3">
                        <select class="form-select mt-0 custom-input">
                            <option value="">Выберете элемент списка</option>
                            <option value="Грузоотправителем">Грузоотправителем</option>
                            <option value="Погрузчиком">Погрузчиком</option>
                            <option value="Получателем">Получателем</option>
                        </select>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Фактические дата и время погрузки МСК</label>
                    <div class="col-auto">
                        <input type="datetime-local" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.loading_time_msk" />
                    </div>

                    <label class="col-auto col-form-label mb-0">Фактические дата и время погрузки МЕСТНЫЕ</label>
                    <div class="col-auto">
                        <input type="datetime-local" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.loading_time_local" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Ответственный за размещение груза</label>
                    <div class="col-10">
                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" placeholder="" />
                    </div>

                    <div class="row mb-1">
                        <simple-select title="Груз закреплен и размещен согласно" :values="cargoSecuredOptions" valueKey="id" name="name" v-model="document.cargo_secured_according_to" />
                    </div>

                    <!--Найти Груз закреплен и размещен согласно модальное окно -->
                    <div class="modal fade" id="GruzZariRazmeh" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered modal-lg">
                            <div class="modal-content">
                                <div class="modal-header" style="background-color: #7da5f0">
                                    <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Груз закреплен и размещен согласно</span>
                                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row justify-content-md-center mb-2">
                                        <div class="col-12">
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" />
                                                <div class="input-group-append">
                                                    <button class="btn btn-outline-secondary" type="reset" id="clearButton">
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
                                                    <th>Код</th>
                                                    <th>Мнемокод</th>
                                                    <th>Наименование</th>
                                                </tr>
                                            </thead>
                                            <tbody class="table-group-divider">
                                                <tr>
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
                        <label class="col-auto col-form-label mb-0 label-custom">Технические условия размещения груза</label>
                        <div class="col-9">
                            <textarea class="form-control mt-0 custom-input" placeholder="" style="min-width: 100%; height: 200px" v-model="document.technical_conditions"></textarea>
                        </div>

                        <div class="col-auto">
                            <button type="button" class="btn btn-custom">Изменить</button>
                        </div>
                    </div>

                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0 label-custom">Заполнение данных о погрузке закончено</label>
                        <div class="col-10">
                            <input type="checkbox" class="form-check-input custom-input" style="width: 20px; height: 20px" v-model="document.loading_finished" />
                        </div>
                    </div>

                    <!----------------------------------------------------------------------------------------------------------------->

                    <!--Найти Организация перевозчика модальное окно -->
                    <div class="modal fade" id="OrganizaciaPerevozchika" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered modal-lg">
                            <div class="modal-content">
                                <div class="modal-header" style="background-color: #7da5f0">
                                    <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Организация перевозчика</span>
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
                                                    <th>Код ОКПО</th>
                                                    <th>Наименование</th>
                                                    <th>ИД бизнеса</th>
                                                    <th>ИД холдинга</th>
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
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
    font-size: 14px;
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
    /* Цвет кнопки */
    border: 1px solid #c1c1c1;
    /* Цвет границы кнопки */
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}

.input-group .btn:hover {
    background-color: #d1d0ff;
    /* Цвет кнопки при наведении */
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
    /* Закрепление шапки в верхней части страницы */
}

.modal-title {
    text-align: center !important;
}

.selected {
    background-color: #2165b6;
    /* Цвет выделения строки */
    color: white;
}

.editing-row {
    background-color: #fff8dc;
}
</style>
