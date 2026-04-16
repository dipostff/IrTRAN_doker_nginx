<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import { getStations, getOwnersNonPublicRailway, getCargos, saveStudentDocument, updateStudentDocument } from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();
const STORAGE_KEY = "reminder_documents";
const saveError = ref(null);
const saveSuccess = ref(null);

const reminderTypeOptions = [
    { id: "На уборку", name: "На уборку" },
    { id: "На подачу", name: "На подачу" },
];

const locomotiveOptions = [
    { id: "railway", name: "Железная дорога" },
    { id: "owner", name: "Владелец п/пути" },
];

function getDefaultDocument() {
    return {
        id: null,
        signed: false,
        reminder_type: "",
        id_station: null,
        id_owner: null,
        place_of_delivery: "",
        locomotive_by: null,
        train_index: "",
        wagon_lines: [],
        change_history: [],
        backendId: null,
    };
}

const document = ref(getDefaultDocument());

const activeTab = ref("document");
const selectedWagonLines = ref([]);
const clipboardWagonLine = ref(null);
const editingWagonLineIndex = ref(-1);
const cargoSearch = ref("");
const selectedHistoryEntry = ref(null);

const wagonDraft = ref({
    wagon_number: "",
    cargo_operation: "",
    cargo_name: "",
    delivery_date: "",
    delivery_time: "",
    removal_date: "",
    removal_time: "",
});

const reminderTitle = computed(() => {
    let type = "подачу или уборку";
    if (document.value.reminder_type === "На уборку") type = "уборку";
    else if (document.value.reminder_type === "На подачу") type = "подачу";
    const num = document.value.id || "—";
    return `ПАМЯТКА ПРИЕМОСДАТЧИКА №${num} на ${type} вагонов`;
});

function formatDmHm(dateStr, timeStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return "";
    const [, m, d] = parts;
    const hm = timeStr ? String(timeStr).slice(0, 5) : "";
    return hm ? `${d}.${m} ${hm}` : `${d}.${m}`;
}

/** Год для разбора «дд.мм» без года в таблице — из даты создания документа или текущий. */
function yearForParsingWagonTimes() {
    const ca = document.value.createdAt;
    if (ca && typeof ca === "string") {
        const y = parseInt(ca.slice(0, 4), 10);
        if (Number.isFinite(y) && y >= 1970 && y <= 2100) return y;
    }
    return new Date().getFullYear();
}

/**
 * Разбор строки вида «11.04» или «11.04 20:46» (как в колонках таблицы) обратно в date / time для input.
 */
function parseDmHmToDateTime(s, yearHint) {
    const out = { date: "", time: "" };
    if (!s || typeof s !== "string") return out;
    const trimmed = s.trim();
    if (!trimmed || trimmed === "—") return out;
    const year =
        Number(yearHint) && Number.isFinite(Number(yearHint)) ? Number(yearHint) : new Date().getFullYear();
    const sp = trimmed.indexOf(" ");
    const dmPart = sp >= 0 ? trimmed.slice(0, sp).trim() : trimmed;
    const hmPart = sp >= 0 ? trimmed.slice(sp + 1).trim() : "";
    const dm = dmPart.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!dm) return out;
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    if (d < 1 || d > 31 || m < 1 || m > 12) return out;
    const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const check = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(check.getTime())) return out;
    out.date = dateStr;
    if (hmPart) {
        const hm = hmPart.match(/^(\d{1,2}):(\d{2})/);
        if (hm) {
            const hh = Number(hm[1]);
            const mm = hm[2];
            if (hh >= 0 && hh <= 23) {
                out.time = `${String(hh).padStart(2, "0")}:${mm}`;
            }
        }
    }
    return out;
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

function ensureWagonLines() {
    if (!Array.isArray(document.value.wagon_lines)) document.value.wagon_lines = [];
}

function rowFromWagonDraft(existingRow = null) {
    const ex = existingRow && typeof existingRow === "object" ? existingRow : {};
    return {
        wagon_number: wagonDraft.value.wagon_number?.trim() || "",
        cargo_name: wagonDraft.value.cargo_name?.trim() || "",
        railway_admin: ex.railway_admin ?? "",
        wagon_ownership: ex.wagon_ownership ?? "",
        cargo_operation: wagonDraft.value.cargo_operation || "",
        op_delivery: formatDmHm(wagonDraft.value.delivery_date, wagonDraft.value.delivery_time),
        op_notify: ex.op_notify ?? "",
        op_removal: formatDmHm(wagonDraft.value.removal_date, wagonDraft.value.removal_time),
        delay_hm: ex.delay_hm ?? "",
        gu23_act: ex.gu23_act ?? "",
        weigh_count: ex.weigh_count ?? "",
        note: ex.note ?? "",
    };
}

function openWagonLineModal(isNew) {
    saveError.value = null;
    cargoSearch.value = "";
    if (isNew) {
        editingWagonLineIndex.value = -1;
        wagonDraft.value = {
            wagon_number: "",
            cargo_operation: "",
            cargo_name: "",
            delivery_date: "",
            delivery_time: "",
            removal_date: "",
            removal_time: "",
        };
    } else {
        const sel = selectedWagonLines.value.map(Number).filter((x) => Number.isFinite(x));
        if (sel.length !== 1) {
            saveError.value = 'Выберите ровно одну строку вагона для «Изменить».';
            return;
        }
        editingWagonLineIndex.value = sel[0];
        const r = document.value.wagon_lines[sel[0]];
        const y = yearForParsingWagonTimes();
        const del = parseDmHmToDateTime(r.op_delivery, y);
        const rem = parseDmHmToDateTime(r.op_removal, y);
        wagonDraft.value = {
            wagon_number: r.wagon_number || "",
            cargo_operation: r.cargo_operation || "",
            cargo_name: r.cargo_name || "",
            delivery_date: del.date,
            delivery_time: del.time,
            removal_date: rem.date,
            removal_time: rem.time,
        };
    }
    showModalById("OsnovnoyRazdelPamaitky");
}

function applyWagonLineModal() {
    const existingRow =
        editingWagonLineIndex.value >= 0 ? document.value.wagon_lines[editingWagonLineIndex.value] : null;
    const row = rowFromWagonDraft(existingRow);
    if (!row.wagon_number) {
        saveError.value = "Укажите номер вагона.";
        return;
    }
    ensureWagonLines();
    if (editingWagonLineIndex.value >= 0) {
        document.value.wagon_lines[editingWagonLineIndex.value] = {
            ...document.value.wagon_lines[editingWagonLineIndex.value],
            ...row,
        };
    } else {
        document.value.wagon_lines.push(row);
    }
    selectedWagonLines.value = [];
    hideModalById("OsnovnoyRazdelPamaitky");
    saveError.value = null;
}

function removeSelectedWagonLines() {
    const sel = new Set(selectedWagonLines.value.map(Number));
    if (!sel.size) {
        saveError.value = "Выберите строки для удаления.";
        return;
    }
    ensureWagonLines();
    document.value.wagon_lines = document.value.wagon_lines.filter((_, i) => !sel.has(i));
    selectedWagonLines.value = [];
    saveError.value = null;
}

function copyWagonLine() {
    const sel = selectedWagonLines.value.map(Number).filter((x) => Number.isFinite(x));
    if (sel.length !== 1) {
        saveError.value = "Выберите одну строку для копирования.";
        return;
    }
    clipboardWagonLine.value = JSON.parse(JSON.stringify(document.value.wagon_lines[sel[0]]));
    saveSuccess.value = "Строка скопирована в буфер модуля.";
    setTimeout(() => {
        saveSuccess.value = null;
    }, 2000);
    saveError.value = null;
}

function pasteWagonLine() {
    if (!clipboardWagonLine.value) {
        saveError.value = "Нет скопированной строки.";
        return;
    }
    ensureWagonLines();
    const copy = JSON.parse(JSON.stringify(clipboardWagonLine.value));
    document.value.wagon_lines.push(copy);
    saveError.value = null;
}

const cargoList = computed(() => {
    const o = listsStore.cargos || {};
    return Object.values(o).filter(Boolean);
});

const filteredCargos = computed(() => {
    const q = (cargoSearch.value || "").trim().toLowerCase();
    if (!q) return cargoList.value;
    return cargoList.value.filter(
        (c) =>
            String(c.code || "").toLowerCase().includes(q) ||
            String(c.name || "").toLowerCase().includes(q) ||
            String(c.short_name || "").toLowerCase().includes(q)
    );
});

function openCargoPicker() {
    cargoSearch.value = "";
    showModalById("NaimenovanieGruza");
}

function pickCargo(c) {
    wagonDraft.value.cargo_name = c.name || c.short_name || "";
    hideModalById("NaimenovanieGruza");
}

function ensureHistory() {
    if (!Array.isArray(document.value.change_history)) document.value.change_history = [];
}

function appendChangeHistory(operation, result) {
    ensureHistory();
    const now = new Date();
    document.value.change_history.push({
        at: now.toISOString(),
        reporting_date: now.toISOString().split("T")[0],
        position: "Пользователь тренажёра",
        name: "—",
        operation,
        result,
        ep: "—",
        note: "",
        workplace: "ОТРЭД",
        contacts: "—",
    });
}

function formatHistoryAt(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleString("ru-RU");
    } catch {
        return iso;
    }
}

function openHistoryDetail(entry) {
    selectedHistoryEntry.value = entry;
    showModalById("ViewHistory");
}

function assignNewDocumentIdIfNeeded() {
    if (!route.params.id && !document.value.id) {
        document.value.id = String(Date.now());
    }
}

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
            const err = validateTrainingDocument("reminder", document.value);
            if (err) {
                saveError.value = err;
                return;
            }
        }
    }
    try {
        appendChangeHistory(
            document.value.signed ? "Сохранение (подписанный документ)" : "Сохранение",
            "Запись в локальное хранилище" + (getToken() ? "; синхронизация с сервером при наличии доступа" : "")
        );
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
                    const created = await saveStudentDocument("reminder", payload);
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
        updateTitle("Памятка приемосдатчика № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => { saveSuccess.value = null; }, 3000);
        if (!route.params.id) router.replace("/reminder/create/" + doc.id);
    } catch (e) {
        console.error(e);
        saveError.value = "Не удалось сохранить документ.";
    }
}

function signDocument() {
    if (document.value.signed) return;
    if (!confirm("Подписать документ?")) return;
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    document.value = getDefaultDocument();
    activeTab.value = "document";
    selectedWagonLines.value = [];
    clipboardWagonLine.value = null;
    updateTitle("Памятка приемосдатчика (Заготовка)");
    router.push("/reminder/menu");
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = { ...getDefaultDocument(), ...found };
        ensureWagonLines();
        ensureHistory();
        updateTitle("Памятка приемосдатчика № " + id);
    }
}

onMounted(async () => {
    await Promise.all([getStations(), getOwnersNonPublicRailway(), getCargos()]);
    if (route.params.id) {
        loadDocumentById(route.params.id);
    } else {
        assignNewDocumentIdIfNeeded();
        updateTitle("Памятка приемосдатчика № " + document.value.id);
    }
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
        <TrainingScenarioPanel doc-type="reminder" :document="document" />
    </div>

    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    type="button"
                    class="nav-link"
                    :class="{ active: activeTab === 'document' }"
                    id="home-tab"
                    @click="activeTab = 'document'"
                >
                    Документ
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    type="button"
                    class="nav-link"
                    :class="{ active: activeTab === 'history' }"
                    id="History-tab"
                    @click="activeTab = 'history'"
                >
                    История
                </button>
            </li>
        </ul>
        <div class="tab-content" id="myTabContent">
            <div
                v-show="activeTab === 'document'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'document' }"
                style="margin-top: 1em"
                id="home-tab-pane"
                role="tabpanel"
                tabindex="0"
            >
                <div class="row mb-1 justify-content-md-end" style="margin-right: 10px">
                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Форма ГУ-45 ЭТД</label>
                    <label class="col-auto col-form-label mb-0 label-custom" style="border: solid 1px black; width: 100px">0367802</label>
                </div>

                <div class="row mb-1 justify-content-md-end" style="margin-right: 10px">
                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Утверждена ОАО "РЖД" в 2015г.</label>
                </div>

                <div class="row mb-1">
                    <simple-select title="Тип памятки" :values="reminderTypeOptions" valueKey="id" name="name" v-model="document.reminder_type" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Станция" :values="listsStore.stations" valueKey="id" name="name" v-model="document.id_station" modalName="ReminderStation" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name' }" />
                    <disable-simple-input title="Номер станции" :dis="true" :value="listsStore.stations[document.id_station]?.code ?? ''" :fixWidth="false" styleInput="width: 120px" />
                </div>

                <div class="row mb-1 justify-content-md-center">
                    <label class="col-4 col-form-label mb-0 label-custom" style="font-weight: bold">{{ reminderTitle }}</label>
                </div>

                <div class="row mb-1">
                    <select-with-search title="Наименование владельца п/п(клиента)" :values="listsStore.owners_non_public_railway" valueKey="id" name="name" v-model="document.id_owner" modalName="ReminderOwner" :fields="{ 'Код ОКПО': 'code', 'Наименование владельца': 'name' }" />
                    <simple-input title="Место подачи" v-model="document.place_of_delivery" :fixWidth="false" styleInput="width: 200px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Подача производилась локомотивом" :values="locomotiveOptions" valueKey="id" name="name" v-model="document.locomotive_by" />
                    <simple-input title="Индекс поезда" v-model="document.train_index" :fixWidth="false" styleInput="width: 150px" />
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openWagonLineModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openWagonLineModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeSelectedWagonLines">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="copyWagonLine">Копировать</button>
                        <button type="button" class="btn btn-custom" @click="pasteWagonLine">Вставить</button>
                    </div>
                </div>

                <div class="table-responsive" style="border: black solid 1px; padding-bottom: 100px">
                    <table class="table table-hover table-bordered border-dark">
                        <thead style="background-color: rgba(135, 135, 135, 0.4); color: black">
                            <tr>
                                <th rowspan="2" style="width: 30px">№п/<br />п</th>
                                <th>№ вагона</th>
                                <th rowspan="2" style="width: 30px">Код <br />ж.д <br />адм.</th>
                                <th rowspan="2" style="width: 60px">
                                    Принадл.<br />
                                    вагонов
                                </th>
                                <th rowspan="2" style="width: 40px">
                                    Груз.<br />
                                    опер.
                                </th>
                                <th colspan="3">
                                    Время выполнения операции<br />
                                    день-месяц<br />
                                    часы-минуты
                                </th>
                                <th colspan="2">
                                    Задержка окончания<br />
                                    груз. операции
                                </th>
                                <th rowspan="2" style="width: 30px">
                                    Кол-во<br />
                                    взв.
                                </th>
                                <th rowspan="2" style="width: 300px">Примечание</th>
                            </tr>
                            <tr>
                                <th>Наименование груза</th>
                                <th>
                                    Подача/<br />передача<br />
                                    на<br />
                                    выстав.<br />
                                    путь
                                </th>
                                <th>
                                    Уведом.<br />
                                    о <br />заверш.<br />
                                    гр. опер.<br />
                                    возврт.<br />
                                    на выст.<br />
                                    путь
                                </th>
                                <th>Уборка</th>
                                <th>
                                    Время <br />
                                    час <br />мин
                                </th>
                                <th>
                                    № акта<br />
                                    ГУ-23
                                </th>
                            </tr>
                            <tr>
                                <th>1</th>
                                <th>2</th>
                                <th>3</th>
                                <th>4</th>
                                <th>5</th>
                                <th>6</th>
                                <th>7</th>
                                <th>8</th>
                                <th>9</th>
                                <th>10</th>
                                <th>11</th>
                                <th>12</th>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr v-for="(row, idx) in document.wagon_lines" :key="'wl' + idx">
                                <td>
                                    <input type="checkbox" class="me-1" :value="idx" v-model="selectedWagonLines" />
                                    {{ idx + 1 }}
                                </td>
                                <td>
                                    <div>{{ row.wagon_number }}</div>
                                    <div class="small text-muted">{{ row.cargo_name }}</div>
                                </td>
                                <td>{{ row.railway_admin || "—" }}</td>
                                <td>{{ row.wagon_ownership || "—" }}</td>
                                <td>{{ row.cargo_operation || "—" }}</td>
                                <td>{{ row.op_delivery || "—" }}</td>
                                <td>{{ row.op_notify || "—" }}</td>
                                <td>{{ row.op_removal || "—" }}</td>
                                <td>{{ row.delay_hm || "—" }}</td>
                                <td>{{ row.gu23_act || "—" }}</td>
                                <td>{{ row.weigh_count || "—" }}</td>
                                <td>{{ row.note || "—" }}</td>
                            </tr>
                            <tr v-if="!document.wagon_lines?.length">
                                <td colspan="12" class="text-muted small px-2">Нет строк — нажмите «Добавить» и заполните модальное окно.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!--Добавить Основной раздел памятки модальное окно -->
                <div class="modal fade" id="OsnovnoyRazdelPamaitky" data-backdrop="static" tabindex="-1" aria-labelledby="staticGraficPodachLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Основной раздел памятки</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyWagonLineModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" v-model="wagonDraft.wagon_number" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Грузовая операция</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input" v-model="wagonDraft.cargo_operation">
                                            <option value="">Выберите</option>
                                            <option value="Погрузка">Погрузка</option>
                                            <option value="Выгрузка">Выгрузка</option>
                                            <option value="Сдвоенная">Сдвоенная</option>
                                            <option value="Без операций">Без операций</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование груза</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <input type="text" class="form-control custom-search" v-model="wagonDraft.cargo_name" placeholder="Текст или справочник" />
                                            <button class="btn btn-outline-secondary" type="button" @click="openCargoPicker">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата подачи</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="wagonDraft.delivery_date" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Время подачи</label>
                                    <div class="col-auto">
                                        <input type="time" class="form-control mt-0 custom-input" style="width: 150px" v-model="wagonDraft.delivery_time" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата уборки</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="wagonDraft.removal_date" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Время уборки</label>
                                    <div class="col-auto">
                                        <input type="time" class="form-control mt-0 custom-input" style="width: 150px" v-model="wagonDraft.removal_time" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Подписать документ модальное окно -->
                <div class="modal fade" id="Podpisatdoc" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <h1 class="modal-title fs-5" id="staticBackdropLabel" style="color: white">Подпись документа</h1>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1 justify-content-md-end" style="margin-right: 10px">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="font-weight: bold">Форма ГУ-45 ЭТД</label>
                                    <label class="col-auto col-form-label mb-0 label-custom" style="border: solid 1px black; width: 100px">0000000</label>
                                </div>

                                <div class="row mb-1 justify-content-md-end" style="margin-right: 10px">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Утверждена ОАО "РЖД" в 2015г.</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Станция:</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(Наименование станции)</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(Номер станции)</label>
                                </div>

                                <div class="row mb-1 justify-content-md-center">
                                    <label class="col-4 col-form-label mb-0 label-custom" style="font-weight: bold">{{ reminderTitle }}</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Наименование владельца п/п(клиента):</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(Наименование клиента/владельца)</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Место подачи:</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(Наименование Места подачи)</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Подача производилась:</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(Наименование кем производилась подача)</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Индекс поезда:</label>
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">(индекс)</label>
                                </div>

                                <div class="row mb-1"></div>

                                <div class="table-responsive" style="border: black solid 1px; padding-bottom: 100px">
                                    <table class="table table-bordered border-dark">
                                        <thead style="color: black">
                                            <tr>
                                                <th rowspan="2" style="width: 30px">№п/<br />п</th>
                                                <th>№ вагона</th>
                                                <th rowspan="2" style="width: 30px">Код <br />ж.д <br />адм.</th>
                                                <th rowspan="2" style="width: 60px">
                                                    Принадл.<br />
                                                    вагонов
                                                </th>
                                                <th rowspan="2" style="width: 40px">
                                                    Груз.<br />
                                                    опер.
                                                </th>
                                                <th colspan="3">
                                                    Время выполнения операции<br />
                                                    день-месяц<br />
                                                    часы-минуты
                                                </th>
                                                <th colspan="2">
                                                    Задержка окончания<br />
                                                    груз. операции
                                                </th>
                                                <th rowspan="2" style="width: 30px">
                                                    Кол-во<br />
                                                    взв.
                                                </th>
                                                <th rowspan="2" style="width: 300px">Примечание</th>
                                            </tr>
                                            <tr>
                                                <th>Наименование груза</th>
                                                <th>
                                                    Подача/<br />передача<br />
                                                    на<br />
                                                    выстав.<br />
                                                    путь
                                                </th>
                                                <th>
                                                    Уведом.<br />
                                                    о <br />заверш.<br />
                                                    гр. опер.<br />
                                                    возврт.<br />
                                                    на выст.<br />
                                                    путь
                                                </th>
                                                <th>Уборка</th>
                                                <th>
                                                    Время <br />
                                                    час <br />мин
                                                </th>
                                                <th>
                                                    № акта<br />
                                                    ГУ-23
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>1</th>
                                                <th>2</th>
                                                <th>3</th>
                                                <th>4</th>
                                                <th>5</th>
                                                <th>6</th>
                                                <th>7</th>
                                                <th>8</th>
                                                <th>9</th>
                                                <th>10</th>
                                                <th>11</th>
                                                <th>12</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto; font-weight: bold">Место для отметок</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto; font-weight: bold">Вагон ПРИНЯЛ</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto; font-weight: bold">Вагон СДАЛ приемосдатчик ж.д.</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto; font-weight: bold">Памятка проведена по ведомости подачи и уборки №</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto; font-weight: bold">Товарный кассир(агент станции)</label>
                                </div>

                                <div class="row justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 150px; margin: 1em">Подписать</button>
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 150px; margin: 1em">Отмена</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Наименование груза модальное окно -->
                <div class="modal fade" id="NaimenovanieGruza" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">Наименование груза</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <input type="text" class="form-control mb-2" v-model="cargoSearch" placeholder="Поиск по коду или наименованию" />
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px; max-height: 320px; overflow: auto">
                                    <table class="table table-hover table-bordered border-white table-sm">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Код груза</th>
                                                <th>Наименование груза</th>
                                                <th>Краткое наименование</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="(c, i) in filteredCargos"
                                                :key="'cg' + (c.id ?? i)"
                                                style="cursor: pointer"
                                                @click="pickCargo(c)"
                                            >
                                                <td>{{ c.code }}</td>
                                                <td>{{ c.name }}</td>
                                                <td>{{ c.short_name }}</td>
                                            </tr>
                                            <tr v-if="!filteredCargos.length">
                                                <td colspan="3" class="text-muted small">Нет данных — проверьте авторизацию и справочник грузов.</td>
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
            </div>

            <!----------------------------------------------------------------------------------История изменений-------------------------------------------------------------------------------------------------->
            <div
                v-show="activeTab === 'history'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'history' }"
                style="margin-top: 1em"
                id="History-tab-pane"
                role="tabpanel"
                tabindex="0"
            >
                <p class="small text-muted">Записи появляются при сохранении и при операциях с документом (учебный журнал в данных документа).</p>
                <div class="table-responsive" style="border: black solid 1px; padding-bottom: 100px">
                    <table class="table table-hover table-bordered">
                        <thead style="background-color: rgba(135, 135, 135, 0.4); color: black">
                            <tr>
                                <th>Дата и время операции</th>
                                <th>Отчетная дата</th>
                                <th>Должность</th>
                                <th>ФИО</th>
                                <th>Операция</th>
                                <th>Результат</th>
                                <th>ЭП</th>
                                <th>Примечание</th>
                                <th>Рабочее место</th>
                                <th>Контакты</th>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr
                                v-for="(h, hi) in document.change_history"
                                :key="'hist' + hi"
                                style="cursor: pointer"
                                @click="openHistoryDetail(h)"
                            >
                                <td>{{ formatHistoryAt(h.at) }}</td>
                                <td>{{ h.reporting_date || "—" }}</td>
                                <td>{{ h.position }}</td>
                                <td>{{ h.name }}</td>
                                <td>{{ h.operation }}</td>
                                <td>{{ h.result }}</td>
                                <td>{{ h.ep }}</td>
                                <td>{{ h.note }}</td>
                                <td>{{ h.workplace }}</td>
                                <td>{{ h.contacts }}</td>
                            </tr>
                            <tr v-if="!document.change_history?.length">
                                <td colspan="10" class="text-muted small px-2">Пока нет записей — сохраните документ.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!--Посмотреть историю изменений модальное окно -->
                <div class="modal fade" id="ViewHistory" data-backdrop="static" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" style="color: white; font-weight: bold">История изменений</span>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body" v-if="selectedHistoryEntry">
                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата и время операции</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="formatHistoryAt(selectedHistoryEntry.at)" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Отчетная дата</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.reporting_date" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Должность</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.position" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">ФИО</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.name" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Операция</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.operation" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Результат</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.result" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">ЭП</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.ep" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Рабочее место</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.workplace" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Контакты</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" :value="selectedHistoryEntry.contacts" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Примечание</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%; height: 200px" :value="selectedHistoryEntry.note" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1 justify-content-md-end">
                                    <button type="button" class="btn btn-custom" style="width: 80px; margin-right: 30px">Печать</button>
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

.table-bordered {
    border: 1px solid rgba(135, 135, 135, 0.4);
}
.table-bordered th,
.table-bordered tr,
.table-bordered thead,
.table-bordered td {
    border: 1px solid rgba(135, 135, 135, 0.4); /* Устанавливаем черный цвет для ячеек */
}
</style>
