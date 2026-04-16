import { ref, computed } from "vue";
import {
    SENDER_TARE_MARK_CATALOG,
    COMMERCIAL_ACT_NUMBER_CATALOG,
    DEMO_WAGON_UNITS,
    DEMO_CONTAINER_UNITS,
} from "@/config/actTrainingCatalogs";

const ZPU_TYPE_OPTIONS = [
    { id: "Пломба", name: "Пломба" },
    { id: "Блокиратор", name: "Блокиратор" },
    { id: "Тросовый ЗПУ", name: "Тросовый ЗПУ" },
];

const ZPU_OWNERSHIP_OPTIONS = [
    { id: "Перевозчик", name: "Перевозчик" },
    { id: "Грузоотправитель", name: "Грузоотправитель" },
    { id: "Собственник вагона", name: "Собственник вагона" },
];

export function commercialActDefaultDocument() {
    return {
        id: null,
        signed: false,
        train_number: "",
        arrival_date: new Date().toISOString().split("T")[0],
        arrival_time: "12:00",
        id_speed_type: null,
        accompaniment: false,
        invoice_number: "",
        station_departure: "",
        station_destination: "",
        shipper_name: "",
        shipper_okpo: "",
        receiver_name: "",
        receiver_okpo: "",
        carrier_name: "",
        declared_value: "",
        cargo_loaded_means: "",
        mass_determined_label: "",
        loaded_by_whom: "",
        loaded_how: "",
        sender_tare_marks: "",
        commercial_wagons: [],
        commercial_containers: [],
        zpu_rows: [],
        cargo_by_docs: [],
        cargo_actual: [],
        expertise_act_number: "",
        expertise_act_date: "",
        cargo_discrepancy_description: "",
        expertise_conclusion: "",
        backendId: null,
    };
}

export function hideModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
        if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
            const inst =
                bootstrap.Modal.getInstance(el) ||
                (bootstrap.Modal.getOrCreateInstance && bootstrap.Modal.getOrCreateInstance(el));
            inst?.hide();
            return;
        }
    } catch (_) {
        /* ignore */
    }
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    document.body.classList.remove("modal-open");
    document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
}

export function showModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
        if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
            if (bootstrap.Modal.getOrCreateInstance) {
                bootstrap.Modal.getOrCreateInstance(el).show();
            } else {
                new bootstrap.Modal(el).show();
            }
            return;
        }
    } catch (_) {
        /* ignore */
    }
    el.classList.add("show");
    el.style.display = "block";
}

export function useCommercialActForm(document, saveError) {
    const senderMarkSearch = ref("");
    const actNumberSearch = ref("");
    const demoWagonSearch = ref("");
    const demoContainerSearch = ref("");

    const selectedWagons = ref([]);
    const selectedContainers = ref([]);
    const selectedZpu = ref([]);
    const selectedCargoDocs = ref([]);
    const selectedCargoActual = ref([]);

    const editingWagonIndex = ref(-1);
    const wagonDraft = ref({
        wagon_number: "",
        stock_type: "",
        capacity: "",
        condition: "",
        tech_act: "",
        tech_act_date: "",
        ownership: "",
    });

    const editingContainerIndex = ref(-1);
    const containerDraft = ref({
        container_number: "",
        size_type: "",
        ownership: "",
        condition: "",
        tech_act: "",
        tech_act_date: "",
    });

    const editingZpuIndex = ref(-1);
    const zpuDraft = ref({
        vehicle_ref: "",
        place: "",
        ownership: "",
        type: "",
        control_marks: "",
        cancellation: "",
        damage_traces: "",
    });

    const editingCargoDocIndex = ref(-1);
    const cargoDocDraft = ref({
        vehicle_ref: "",
        brand: "",
        places_count: "",
        package_type: "",
        cargo_name: "",
        total_mass_kg: "",
        mass_per_place: "",
    });

    const editingCargoActIndex = ref(-1);
    const cargoActDraft = ref({
        vehicle_ref: "",
        brand: "",
        places_count: "",
        package_type: "",
        cargo_name: "",
        total_mass_kg: "",
        mass_per_place: "",
        damage_note: "",
    });

    const filteredSenderMarks = computed(() => {
        const q = (senderMarkSearch.value || "").trim().toLowerCase();
        if (!q) return SENDER_TARE_MARK_CATALOG;
        return SENDER_TARE_MARK_CATALOG.filter(
            (x) =>
                String(x.code).toLowerCase().includes(q) ||
                String(x.description).toLowerCase().includes(q)
        );
    });

    const filteredActNumbers = computed(() => {
        const q = (actNumberSearch.value || "").trim().toLowerCase();
        if (!q) return COMMERCIAL_ACT_NUMBER_CATALOG;
        return COMMERCIAL_ACT_NUMBER_CATALOG.filter(
            (x) =>
                String(x.number).toLowerCase().includes(q) ||
                String(x.title).toLowerCase().includes(q) ||
                String(x.invoice).toLowerCase().includes(q)
        );
    });

    const filteredDemoWagons = computed(() => {
        const q = (demoWagonSearch.value || "").trim().toLowerCase();
        if (!q) return DEMO_WAGON_UNITS;
        return DEMO_WAGON_UNITS.filter(
            (x) =>
                String(x.number).toLowerCase().includes(q) ||
                String(x.shortName).toLowerCase().includes(q)
        );
    });

    const filteredDemoContainers = computed(() => {
        const q = (demoContainerSearch.value || "").trim().toLowerCase();
        if (!q) return DEMO_CONTAINER_UNITS;
        return DEMO_CONTAINER_UNITS.filter(
            (x) =>
                String(x.number).toLowerCase().includes(q) ||
                String(x.sizeType).toLowerCase().includes(q)
        );
    });

    function ensureArr(field) {
        if (!Array.isArray(document.value[field])) document.value[field] = [];
    }

    function openSenderMarkModal() {
        senderMarkSearch.value = "";
        showModalById("OtmetkioSostoinii");
    }

    function pickSenderMark(row) {
        document.value.sender_tare_marks = `[${row.code}] ${row.description}`;
        hideModalById("OtmetkioSostoinii");
    }

    function openActNumberModal() {
        actNumberSearch.value = "";
        showModalById("NomerAckta");
    }

    function pickActNumber(row) {
        document.value.expertise_act_number = row.number;
        hideModalById("NomerAckta");
    }

    function openWagonModal(isNew) {
        saveError.value = null;
        demoWagonSearch.value = "";
        if (isNew) {
            editingWagonIndex.value = -1;
            wagonDraft.value = {
                wagon_number: "",
                stock_type: "",
                capacity: "",
                condition: "",
                tech_act: "",
                tech_act_date: "",
                ownership: "",
            };
        } else {
            const sel = selectedWagons.value.map(Number).filter((x) => Number.isFinite(x));
            if (sel.length !== 1) {
                saveError.value = 'Для «Изменить» выберите ровно одну строку в таблице «Вагоны».';
                return;
            }
            editingWagonIndex.value = sel[0];
            const w = document.value.commercial_wagons[sel[0]];
            wagonDraft.value = { ...w };
        }
        showModalById("VagonizOtpr");
    }

    function applyWagonModal() {
        const n = (wagonDraft.value.wagon_number || "").trim();
        if (!n) {
            saveError.value = "Укажите номер вагона.";
            return;
        }
        ensureArr("commercial_wagons");
        const row = { ...wagonDraft.value, wagon_number: n };
        if (editingWagonIndex.value >= 0) {
            document.value.commercial_wagons[editingWagonIndex.value] = row;
        } else {
            document.value.commercial_wagons.push(row);
        }
        selectedWagons.value = [];
        hideModalById("VagonizOtpr");
        saveError.value = null;
    }

    function removeWagons() {
        const sel = new Set(selectedWagons.value.map(Number));
        if (!sel.size) {
            saveError.value = "Выберите строки вагонов для удаления.";
            return;
        }
        document.value.commercial_wagons = document.value.commercial_wagons.filter((_, i) => !sel.has(i));
        selectedWagons.value = [];
        saveError.value = null;
    }

    function openDemoWagonPicker() {
        demoWagonSearch.value = "";
        showModalById("CommercialActDemoWagonPicker");
    }

    function pickDemoWagon(w) {
        wagonDraft.value.wagon_number = w.number;
        wagonDraft.value.stock_type = w.shortName;
        wagonDraft.value.capacity = w.capacity;
        wagonDraft.value.ownership = w.ownership;
        wagonDraft.value.condition = w.condition;
        hideModalById("CommercialActDemoWagonPicker");
    }

    function openContainerModal(isNew) {
        saveError.value = null;
        demoContainerSearch.value = "";
        if (isNew) {
            editingContainerIndex.value = -1;
            containerDraft.value = {
                container_number: "",
                size_type: "",
                ownership: "",
                condition: "",
                tech_act: "",
                tech_act_date: "",
            };
        } else {
            const sel = selectedContainers.value.map(Number).filter((x) => Number.isFinite(x));
            if (sel.length !== 1) {
                saveError.value = 'Для «Изменить» выберите ровно одну строку в таблице «Контейнеры».';
                return;
            }
            editingContainerIndex.value = sel[0];
            containerDraft.value = { ...document.value.commercial_containers[sel[0]] };
        }
        showModalById("ConteinerizOtpr");
    }

    function applyContainerModal() {
        const n = (containerDraft.value.container_number || "").trim();
        if (!n) {
            saveError.value = "Укажите номер контейнера.";
            return;
        }
        ensureArr("commercial_containers");
        const row = { ...containerDraft.value, container_number: n };
        if (editingContainerIndex.value >= 0) {
            document.value.commercial_containers[editingContainerIndex.value] = row;
        } else {
            document.value.commercial_containers.push(row);
        }
        selectedContainers.value = [];
        hideModalById("ConteinerizOtpr");
        saveError.value = null;
    }

    function removeContainers() {
        const sel = new Set(selectedContainers.value.map(Number));
        if (!sel.size) {
            saveError.value = "Выберите строки контейнеров для удаления.";
            return;
        }
        document.value.commercial_containers = document.value.commercial_containers.filter((_, i) => !sel.has(i));
        selectedContainers.value = [];
        saveError.value = null;
    }

    function openDemoContainerPicker() {
        demoContainerSearch.value = "";
        showModalById("CommercialActDemoContainerPicker");
    }

    function pickDemoContainer(c) {
        containerDraft.value.container_number = c.number;
        containerDraft.value.size_type = c.sizeType;
        containerDraft.value.ownership = c.ownership;
        containerDraft.value.condition = c.condition;
        hideModalById("CommercialActDemoContainerPicker");
    }

    function openZpuModal(isNew) {
        saveError.value = null;
        if (isNew) {
            editingZpuIndex.value = -1;
            zpuDraft.value = {
                vehicle_ref: "",
                place: "",
                ownership: "",
                type: "",
                control_marks: "",
                cancellation: "",
                damage_traces: "",
            };
        } else {
            const sel = selectedZpu.value.map(Number).filter((x) => Number.isFinite(x));
            if (sel.length !== 1) {
                saveError.value = 'Для «Изменить» выберите ровно одну строку в таблице «ЗПУ».';
                return;
            }
            editingZpuIndex.value = sel[0];
            zpuDraft.value = { ...document.value.zpu_rows[sel[0]] };
        }
        showModalById("ZPUizOtpr");
    }

    function applyZpuModal() {
        const v = (zpuDraft.value.vehicle_ref || "").trim();
        if (!v) {
            saveError.value = "Укажите № вагона или контейнера для ЗПУ.";
            return;
        }
        ensureArr("zpu_rows");
        const row = { ...zpuDraft.value, vehicle_ref: v };
        if (editingZpuIndex.value >= 0) {
            document.value.zpu_rows[editingZpuIndex.value] = row;
        } else {
            document.value.zpu_rows.push(row);
        }
        selectedZpu.value = [];
        hideModalById("ZPUizOtpr");
        saveError.value = null;
    }

    function removeZpuRows() {
        const sel = new Set(selectedZpu.value.map(Number));
        if (!sel.size) {
            saveError.value = "Выберите строки ЗПУ для удаления.";
            return;
        }
        document.value.zpu_rows = document.value.zpu_rows.filter((_, i) => !sel.has(i));
        selectedZpu.value = [];
        saveError.value = null;
    }

    function openCargoDocModal(isNew) {
        saveError.value = null;
        if (isNew) {
            editingCargoDocIndex.value = -1;
            cargoDocDraft.value = {
                vehicle_ref: "",
                brand: "",
                places_count: "",
                package_type: "",
                cargo_name: "",
                total_mass_kg: "",
                mass_per_place: "",
            };
        } else {
            const sel = selectedCargoDocs.value.map(Number).filter((x) => Number.isFinite(x));
            if (sel.length !== 1) {
                saveError.value = 'Для «Изменить» выберите ровно одну строку в «Значится по документам».';
                return;
            }
            editingCargoDocIndex.value = sel[0];
            cargoDocDraft.value = { ...document.value.cargo_by_docs[sel[0]] };
        }
        showModalById("GruzpoDoc");
    }

    function applyCargoDocModal() {
        const v = (cargoDocDraft.value.vehicle_ref || "").trim();
        if (!v) {
            saveError.value = "Укажите № вагона/контейнера.";
            return;
        }
        ensureArr("cargo_by_docs");
        const row = { ...cargoDocDraft.value, vehicle_ref: v };
        if (editingCargoDocIndex.value >= 0) {
            document.value.cargo_by_docs[editingCargoDocIndex.value] = row;
        } else {
            document.value.cargo_by_docs.push(row);
        }
        selectedCargoDocs.value = [];
        hideModalById("GruzpoDoc");
        saveError.value = null;
    }

    function removeCargoDocs() {
        const sel = new Set(selectedCargoDocs.value.map(Number));
        if (!sel.size) {
            saveError.value = "Выберите строки для удаления.";
            return;
        }
        document.value.cargo_by_docs = document.value.cargo_by_docs.filter((_, i) => !sel.has(i));
        selectedCargoDocs.value = [];
        saveError.value = null;
    }

    function openCargoActModal(isNew) {
        saveError.value = null;
        if (isNew) {
            editingCargoActIndex.value = -1;
            cargoActDraft.value = {
                vehicle_ref: "",
                brand: "",
                places_count: "",
                package_type: "",
                cargo_name: "",
                total_mass_kg: "",
                mass_per_place: "",
                damage_note: "",
            };
        } else {
            const sel = selectedCargoActual.value.map(Number).filter((x) => Number.isFinite(x));
            if (sel.length !== 1) {
                saveError.value = 'Для «Изменить» выберите ровно одну строку в «В действительности оказалось».';
                return;
            }
            editingCargoActIndex.value = sel[0];
            cargoActDraft.value = { ...document.value.cargo_actual[sel[0]] };
        }
        showModalById("GruzpoDocvDeist");
    }

    function applyCargoActModal() {
        const v = (cargoActDraft.value.vehicle_ref || "").trim();
        if (!v) {
            saveError.value = "Укажите № вагона/контейнера.";
            return;
        }
        ensureArr("cargo_actual");
        const row = { ...cargoActDraft.value, vehicle_ref: v };
        if (editingCargoActIndex.value >= 0) {
            document.value.cargo_actual[editingCargoActIndex.value] = row;
        } else {
            document.value.cargo_actual.push(row);
        }
        selectedCargoActual.value = [];
        hideModalById("GruzpoDocvDeist");
        saveError.value = null;
    }

    function removeCargoActual() {
        const sel = new Set(selectedCargoActual.value.map(Number));
        if (!sel.size) {
            saveError.value = "Выберите строки для удаления.";
            return;
        }
        document.value.cargo_actual = document.value.cargo_actual.filter((_, i) => !sel.has(i));
        selectedCargoActual.value = [];
        saveError.value = null;
    }

    return {
        ZPU_TYPE_OPTIONS,
        ZPU_OWNERSHIP_OPTIONS,
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
    };
}
