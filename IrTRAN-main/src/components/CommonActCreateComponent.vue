<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import { getStations, getTransportations, saveStudentDocument, updateStudentDocument } from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";
import { PRIOR_DOWNTIME_ACT_CATALOG } from "@/config/actTrainingCatalogs";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();
const STORAGE_KEY = "common_act_documents";
const saveError = ref(null);
const saveSuccess = ref(null);

const priorActCatalog = PRIOR_DOWNTIME_ACT_CATALOG;

function getDefaultDocument() {
    return {
        id: null,
        signed: false,
        id_station: null,
        act_date: new Date().toISOString().split("T")[0],
        downtime_type: "",
        description: "",
        supplement: "",
        persons: [],
        wagons: [],
        special_marks: [],
        attached_documents: [],
        backendId: null,
    };
}

const document = ref(getDefaultDocument());

const selectedPersons = ref([]);
const selectedWagons = ref([]);
const selectedSpecialMarks = ref([]);
const selectedAttachedDocs = ref([]);

const editingPersonIndex = ref(-1);
const personDraft = ref({ position: "", full_name: "" });

const editingWagonIndex = ref(-1);
const wagonDraft = ref({
    vehicle_number: "",
    id_transportation: null,
    shipment_label: "",
    downtime_start: "",
    downtime_end: "",
    prior_act_number: "",
    downtime_days: "",
});

const shipmentSearch = ref("");
const priorActPickerSearch = ref("");

function getStoredList() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

const transportationList = computed(() => {
    const o = listsStore.transportations || {};
    return Object.values(o).filter(Boolean);
});

const filteredTransportations = computed(() => {
    const q = (shipmentSearch.value || "").trim().toLowerCase();
    const list = transportationList.value;
    if (!q) return list;
    return list.filter((t) => {
        const id = String(t.id ?? "");
        const reg = String(t.registration_date ?? "").toLowerCase();
        const desc = String(t.description ?? "").toLowerCase();
        return id.includes(q) || reg.includes(q) || desc.includes(q);
    });
});

const filteredPriorActs = computed(() => {
    const q = (priorActPickerSearch.value || "").trim().toLowerCase();
    if (!q) return priorActCatalog;
    return priorActCatalog.filter(
        (x) =>
            String(x.number).toLowerCase().includes(q) ||
            String(x.note || "").toLowerCase().includes(q)
    );
});

function transportationLabel(t) {
    if (!t) return "";
    const reg = t.registration_date ? String(t.registration_date).split("T")[0] : "";
    return `Заявка №${t.id}${reg ? ` от ${reg}` : ""}`;
}

function computeDowntimeDays(start, end) {
    if (!start || !end) return "";
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return "";
    return String(Math.max(1, Math.ceil((b - a) / 86400000)));
}

function recalcWagonDraftDays() {
    const d = computeDowntimeDays(wagonDraft.value.downtime_start, wagonDraft.value.downtime_end);
    wagonDraft.value.downtime_days = d;
}

function hideModalById(id) {
    const el = window.document.getElementById(id);
    if (!el) return;
    try {
        if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
            const Modal = bootstrap.Modal;
            let inst = null;
            if (typeof Modal.getInstance === "function") inst = Modal.getInstance(el);
            if (!inst && typeof Modal.getOrCreateInstance === "function") inst = Modal.getOrCreateInstance(el);
            if (!inst) inst = new Modal(el);
            inst?.hide();
            return;
        }
    } catch (_) {
        /* ignore */
    }
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    window.document.body.classList.remove("modal-open");
    window.document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
}

function showModalById(id) {
    const el = window.document.getElementById(id);
    if (!el) return;
    try {
        if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
            const Modal = bootstrap.Modal;
            let inst = null;
            if (typeof Modal.getOrCreateInstance === "function") inst = Modal.getOrCreateInstance(el);
            if (!inst) inst = new Modal(el);
            inst.show();
            return;
        }
    } catch (_) {
        /* ignore */
    }
    el.classList.add("show");
    el.style.display = "block";
}

function openPersonModal(isNew) {
    saveError.value = null;
    if (isNew) {
        editingPersonIndex.value = -1;
        personDraft.value = { position: "", full_name: "" };
    } else {
        const sel = selectedPersons.value.map(Number).filter((x) => Number.isFinite(x));
        if (sel.length !== 1) {
            saveError.value = 'Для «Изменить» выберите ровно одну строку в блоке «присутствии следующих лиц».';
            return;
        }
        editingPersonIndex.value = sel[0];
        const row = document.value.persons[editingPersonIndex.value];
        personDraft.value = { position: row?.position ?? "", full_name: row?.full_name ?? "" };
    }
    showModalById("aktsostavlen");
}

function applyPersonModal() {
    const p = personDraft.value.position?.trim() || "";
    const f = personDraft.value.full_name?.trim() || "";
    if (!p && !f) {
        saveError.value = "Укажите должность или ФИО.";
        return;
    }
    const row = { position: p, full_name: f };
    if (!Array.isArray(document.value.persons)) document.value.persons = [];
    if (editingPersonIndex.value >= 0) {
        document.value.persons[editingPersonIndex.value] = row;
    } else {
        document.value.persons.push(row);
    }
    selectedPersons.value = [];
    hideModalById("aktsostavlen");
    saveError.value = null;
}

function removeSelectedPersons() {
    const sel = new Set(selectedPersons.value.map(Number).filter((x) => Number.isFinite(x)));
    if (sel.size === 0) {
        saveError.value = "Выберите строки для удаления.";
        return;
    }
    document.value.persons = document.value.persons.filter((_, i) => !sel.has(i));
    selectedPersons.value = [];
    saveError.value = null;
}

function openWagonModal(isNew) {
    saveError.value = null;
    shipmentSearch.value = "";
    if (isNew) {
        editingWagonIndex.value = -1;
        wagonDraft.value = {
            vehicle_number: "",
            id_transportation: null,
            shipment_label: "",
            downtime_start: "",
            downtime_end: "",
            prior_act_number: "",
            downtime_days: "",
        };
    } else {
        const sel = selectedWagons.value.map(Number).filter((x) => Number.isFinite(x));
        if (sel.length !== 1) {
            saveError.value = 'Для «Изменить» выберите ровно одну строку в таблице «Отправки, вагоны/контейнеры».';
            return;
        }
        editingWagonIndex.value = sel[0];
        const w = document.value.wagons[editingWagonIndex.value];
        wagonDraft.value = {
            vehicle_number: w?.vehicle_number ?? "",
            id_transportation: w?.id_transportation ?? null,
            shipment_label: w?.shipment_label ?? "",
            downtime_start: w?.downtime_start ?? "",
            downtime_end: w?.downtime_end ?? "",
            prior_act_number: w?.prior_act_number ?? "",
            downtime_days: w?.downtime_days ?? "",
        };
        recalcWagonDraftDays();
    }
    showModalById("otprakaAkt");
}

function applyWagonModal() {
    const v = wagonDraft.value.vehicle_number?.trim() || "";
    if (!v) {
        saveError.value = "Укажите номер вагона или контейнера.";
        return;
    }
    recalcWagonDraftDays();
    const row = {
        vehicle_number: v,
        id_transportation: wagonDraft.value.id_transportation,
        shipment_label: wagonDraft.value.shipment_label || transportationLabel(
            listsStore.transportations?.[wagonDraft.value.id_transportation]
        ),
        downtime_start: wagonDraft.value.downtime_start || "",
        downtime_end: wagonDraft.value.downtime_end || "",
        prior_act_number: wagonDraft.value.prior_act_number?.trim() || "",
        downtime_days: wagonDraft.value.downtime_days || "",
    };
    if (!Array.isArray(document.value.wagons)) document.value.wagons = [];
    if (editingWagonIndex.value >= 0) {
        document.value.wagons[editingWagonIndex.value] = row;
    } else {
        document.value.wagons.push(row);
    }
    selectedWagons.value = [];
    hideModalById("otprakaAkt");
    saveError.value = null;
}

function removeSelectedWagons() {
    const sel = new Set(selectedWagons.value.map(Number).filter((x) => Number.isFinite(x)));
    if (sel.size === 0) {
        saveError.value = "Выберите строки для удаления.";
        return;
    }
    document.value.wagons = document.value.wagons.filter((_, i) => !sel.has(i));
    selectedWagons.value = [];
    saveError.value = null;
}

function openShipmentSearchModal() {
    shipmentSearch.value = "";
    showModalById("naityOtpravku");
}

function pickTransportation(t) {
    if (!t) return;
    wagonDraft.value.id_transportation = t.id;
    wagonDraft.value.shipment_label = transportationLabel(t);
    hideModalById("naityOtpravku");
}

function openPriorActPicker() {
    priorActPickerSearch.value = "";
    showModalById("commonActPriorActPicker");
}

function pickPriorAct(item) {
    wagonDraft.value.prior_act_number = item.number;
    hideModalById("commonActPriorActPicker");
}

function ensureArray(field) {
    if (!Array.isArray(document.value[field])) document.value[field] = [];
}

function addSpecialMarkRow() {
    ensureArray("special_marks");
    document.value.special_marks.push({ type: "Общая", mark: "", note: "" });
}

function removeSelectedSpecialMarks() {
    const sel = new Set(selectedSpecialMarks.value.map(Number));
    if (sel.size === 0) {
        saveError.value = "Выберите строки в «Специальные отметки».";
        return;
    }
    document.value.special_marks = document.value.special_marks.filter((_, i) => !sel.has(i));
    selectedSpecialMarks.value = [];
    saveError.value = null;
}

function addAttachedDocRow() {
    ensureArray("attached_documents");
    document.value.attached_documents.push({ type: "Документ", document: "", number: "" });
}

function removeSelectedAttachedDocs() {
    const sel = new Set(selectedAttachedDocs.value.map(Number));
    if (sel.size === 0) {
        saveError.value = "Выберите строки в «Прилагаемые и предъявляемые документы».";
        return;
    }
    document.value.attached_documents = document.value.attached_documents.filter((_, i) => !sel.has(i));
    selectedAttachedDocs.value = [];
    saveError.value = null;
}

async function saveDocument() {
    saveError.value = null;
    saveSuccess.value = null;
    if (trainingContext.value) {
        if (trainingContext.value.errorChecking) {
            const err = validateTrainingDocument("common_act", document.value);
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
                    const created = await saveStudentDocument("common_act", payload);
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
        updateTitle("Акты (Общей формы) № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => {
            saveSuccess.value = null;
        }, 3000);
        if (!route.params.id) router.replace("/act/common/create/" + doc.id);
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
    setTimeout(() => {
        saveSuccess.value = null;
    }, 3000);
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
    updateTitle("Акты (Новый документ)");
    router.push("/act/common/menu");
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = { ...getDefaultDocument(), ...found };
        updateTitle("Акты (Общей формы) № " + id);
    }
}

onMounted(async () => {
    await Promise.all([getStations(), getTransportations()]);
    if (route.params.id) loadDocumentById(route.params.id);
    else updateTitle("Акты (Новый документ)");
});
</script>

<template>
    <div class="search-box">
        <div class="row">
            <div class="col-auto">
                <button type="button" class="btn btn-custom" @click="saveDocument">Сохранить</button>
                <button type="button" class="btn btn-custom" @click="signDocument" :disabled="document.signed">
                    {{ document.signed ? "Подписано" : "Подписать" }}
                </button>
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
        <TrainingScenarioPanel doc-type="common_act" :document="document" />
    </div>

    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    class="nav-link active"
                    id="home-tab"
                    data-toggle="tab"
                    data-target="#home-tab-pane"
                    type="button"
                    role="tab"
                    aria-controls="home-tab-pane"
                    aria-selected="true"
                >
                    Документ
                </button>
            </li>
        </ul>
        <div class="tab-content" id="myTabContent">
            <div
                class="tab-pane fade show active"
                style="margin-top: 1em"
                id="home-tab-pane"
                role="tabpanel"
                aria-labelledby="home-tab"
                tabindex="0"
            >
                <div class="row mb-1">
                    <select-with-search
                        title="Станция составления акта"
                        :values="listsStore.stations"
                        valueKey="id"
                        name="name"
                        v-model="document.id_station"
                        modalName="CommonActStation"
                        :fields="{
                            'Код станции': 'code',
                            'Наименование станции': 'name',
                            'Краткое наименование': 'short_name',
                        }"
                    />
                    <disable-simple-input
                        title="Код"
                        :dis="true"
                        :value="listsStore.stations[document.id_station]?.code ?? ''"
                        :fixWidth="false"
                        styleInput="width: 173px"
                    />
                </div>

                <div class="row mb-1">
                    <simple-input title="Дата составления акта" type="date" v-model="document.act_date" styleInput="width: 250px" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">
                        Настоящий акт составлен в присутствии следующих лиц
                    </label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openPersonModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openPersonModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedPersons">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th style="width: 400px">Должность</th>
                                        <th style="width: 500px">ФИО</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(p, idx) in document.persons" :key="'p' + idx">
                                        <td>
                                            <input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedPersons" />
                                        </td>
                                        <td>{{ p.position }}</td>
                                        <td>{{ p.full_name }}</td>
                                    </tr>
                                    <tr v-if="!document.persons?.length">
                                        <td colspan="3" class="text-muted small px-2">Нет записей — нажмите «Добавить».</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="modal fade bd-example-modal-lg" id="aktsostavlen" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 60%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Участники составления акта</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyPersonModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Должность</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="personDraft.position" style="width: 300px" />
                                    </div>
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">ФИО</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="personDraft.full_name" style="width: 300px" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select
                        title="Начало/Окончание простоя"
                        :values="[
                            { id: 'start', name: 'Начало простоя' },
                            { id: 'end', name: 'Окончание простоя' },
                        ]"
                        valueKey="id"
                        name="name"
                        v-model="document.downtime_type"
                    />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Отправки, вагоны/контейнеры</label>
                </div>
                <p class="small text-muted mb-1">
                    «Отправка №» подтягивается из списка заявок на грузоперевозку (API). «Номер акта на начало простоя» — из учебного справочника или вручную.
                    «Кол-во суток простоя» считается по дате/времени начала и окончания (можно скорректировать вручную перед сохранением строки).
                </p>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openWagonModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openWagonModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedWagons">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>№ п/п</th>
                                        <th>Номер вагона/контейнера</th>
                                        <th>Номер отправки</th>
                                        <th>Дата и время начала простоя</th>
                                        <th>Номер акта на начало простоя</th>
                                        <th>Кол-во суток простоя</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(w, idx) in document.wagons" :key="'w' + idx">
                                        <td>
                                            <input type="checkbox" class="row-checkbox" :value="idx" v-model="selectedWagons" />
                                        </td>
                                        <td>{{ idx + 1 }}</td>
                                        <td>{{ w.vehicle_number }}</td>
                                        <td>{{ w.shipment_label || "—" }}</td>
                                        <td>{{ w.downtime_start || "—" }}</td>
                                        <td>{{ w.prior_act_number || "—" }}</td>
                                        <td>{{ w.downtime_days || "—" }}</td>
                                    </tr>
                                    <tr v-if="!document.wagons?.length">
                                        <td colspan="7" class="text-muted small px-2">Нет строк — добавьте вагон/контейнер и отправку.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="modal fade bd-example-modal-lg" id="otprakaAkt" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 70%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" style="color: white; font-weight: bold">Отправки</span>
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
                                    <label class="col-auto col-form-label mb-0 label-custom">Вагон, контейнер №</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.vehicle_number" style="width: 200px" />
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Отправка №</label>
                                    <div class="input-group" style="width: 320px">
                                        <input type="text" class="form-control custom-search" readonly :value="wagonDraft.shipment_label" placeholder="Выберите заявку" />
                                        <button class="btn btn-outline-secondary" type="button" @click="openShipmentSearchModal">
                                            <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                        </button>
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата и время начала простоя</label>
                                    <div class="col-auto">
                                        <input
                                            type="datetime-local"
                                            class="form-control mt-0 custom-input"
                                            style="width: 220px"
                                            v-model="wagonDraft.downtime_start"
                                            @change="recalcWagonDraftDays"
                                        />
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата и время окончания простоя</label>
                                    <div class="col-auto">
                                        <input
                                            type="datetime-local"
                                            class="form-control mt-0 custom-input"
                                            style="width: 220px"
                                            v-model="wagonDraft.downtime_end"
                                            @change="recalcWagonDraftDays"
                                        />
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер акта на начало простоя</label>
                                    <div class="col-auto d-flex flex-wrap align-items-center gap-1">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.prior_act_number" style="width: 220px" />
                                        <button type="button" class="btn btn-outline-secondary btn-sm" @click="openPriorActPicker">Справочник</button>
                                    </div>
                                </div>
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Кол-во суток простоя</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.downtime_days" style="width: 120px" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal fade" id="naityOtpravku" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Заявки на грузоперевозку (отправка)</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-2">
                                    <div class="col-12">
                                        <input type="text" class="form-control" v-model="shipmentSearch" placeholder="Поиск по № заявки, дате, описанию" />
                                    </div>
                                </div>
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; max-height: 320px; overflow: auto">
                                    <table class="table table-hover table-bordered border-white table-sm">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Код (id)</th>
                                                <th>Дата регистрации</th>
                                                <th>Кратко</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="t in filteredTransportations"
                                                :key="'tr' + t.id"
                                                class="cursor-pointer"
                                                style="cursor: pointer"
                                                @click="pickTransportation(t)"
                                            >
                                                <td>{{ t.id }}</td>
                                                <td>{{ t.registration_date ? String(t.registration_date).split("T")[0] : "—" }}</td>
                                                <td>{{ (t.description || "").slice(0, 80) }}{{ (t.description || "").length > 80 ? "…" : "" }}</td>
                                            </tr>
                                            <tr v-if="!filteredTransportations.length">
                                                <td colspan="3" class="text-muted small">Нет данных. Сохраните заявки на грузоперевозку или проверьте вход в систему.</td>
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

                <div class="modal fade" id="commonActPriorActPicker" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Номер акта на начало простоя</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <input type="text" class="form-control mb-2" v-model="priorActPickerSearch" placeholder="Поиск" />
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; max-height: 280px; overflow: auto">
                                    <table class="table table-sm table-hover">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Номер</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="a in filteredPriorActs" :key="'pa' + a.id" style="cursor: pointer" @click="pickPriorAct(a)">
                                                <td>{{ a.number }}</td>
                                                <td>{{ a.note }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" class="btn btn-custom mt-2" data-bs-dismiss="modal" data-dismiss="modal">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Описание обстоятельств, вызвавших составление акта</label>
                    <div class="col-10">
                        <textarea class="form-control mt-0 custom-input" style="height: 120px; min-width: 100%" v-model="document.description" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Дополнение к описанию обстоятельств</label>
                    <div class="col-10">
                        <textarea class="form-control mt-0 custom-input" style="height: 120px; min-width: 100%" v-model="document.supplement" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Специальные отметки</label>
                </div>
                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addSpecialMarkRow">Добавить строку</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedSpecialMarks">Удалить выбранные</button>
                    </div>
                </div>
                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white table-sm">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Тип</th>
                                        <th>Отметка</th>
                                        <th>Примечание</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(r, idx) in document.special_marks" :key="'sm' + idx">
                                        <td><input type="checkbox" :value="idx" v-model="selectedSpecialMarks" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.type" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.mark" style="min-width: 200px" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.note" /></td>
                                    </tr>
                                    <tr v-if="!document.special_marks?.length">
                                        <td colspan="4" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Прилагаемые и предъявляемые документы</label>
                </div>
                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="addAttachedDocRow">Добавить строку</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedAttachedDocs">Удалить выбранные</button>
                    </div>
                </div>
                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px">
                            <table class="table table-hover table-bordered border-white table-sm">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Тип / вид</th>
                                        <th>Наименование документа</th>
                                        <th>Номер</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(r, idx) in document.attached_documents" :key="'ad' + idx">
                                        <td><input type="checkbox" :value="idx" v-model="selectedAttachedDocs" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.type" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.document" style="min-width: 220px" /></td>
                                        <td><input type="text" class="form-control form-control-sm" v-model="r.number" /></td>
                                    </tr>
                                    <tr v-if="!document.attached_documents?.length">
                                        <td colspan="4" class="text-muted small px-2">Нет строк.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
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
    min-height: 30px;
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
.modal-title {
    text-align: center !important;
}
</style>








