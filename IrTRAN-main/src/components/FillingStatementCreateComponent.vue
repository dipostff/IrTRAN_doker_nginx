<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import {
    getStations,
    getContracts,
    getOwnersNonPublicRailway,
    getLegalEntities,
    getCargos,
    getRollingStockTypes,
    getOwnerships,
    saveStudentDocument,
    updateStudentDocument,
} from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";
import {
    TARIFF_PLAN_OPTIONS,
    STATEMENT_NUMBERING_TYPES,
    TRACK_BRANCH_OPTIONS,
    FILLING_OPERATION_OPTIONS,
    NORM_TIME_ON_TRACK_OPTIONS,
    TURNOVER_OPERATION_OPTIONS,
} from "@/config/fillingStatementCatalogs";
import {
    parseNum,
    fmtNum,
    hoursBetweenLocalDateTime,
    applyCoefficientDerivatives,
    sumFineTotal,
} from "@/helpers/fillingStatementCalculations";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();
const STORAGE_KEY = "filling_statement_documents";
const saveError = ref(null);
const saveSuccess = ref(null);
const activeTab = ref("document");

const placeOptions = [
    { id: "ЦФТО", name: "ЦФТО" },
];

const tariffPlanOptions = TARIFF_PLAN_OPTIONS;
const statementNumberingTypes = STATEMENT_NUMBERING_TYPES;
const trackBranchOptions = TRACK_BRANCH_OPTIONS;
const fillingOperationOptions = FILLING_OPERATION_OPTIONS;
const normTimeOptions = NORM_TIME_ON_TRACK_OPTIONS;
const turnoverOperationOptions = TURNOVER_OPERATION_OPTIONS;

function defaultDeliverySummary() {
    return {
        delivery_fee: "",
        coeff_safety: "1",
        coeff_tax: "1",
        coeff_cap: "1",
        sum_payment_wo_nonindexed: "",
        sum_wo_safety: "",
        sum_wo_tax: "",
        sum_wo_extra: "",
        income_safety: "",
        income_tax: "",
        income_cap: "",
    };
}

function defaultFine() {
    return {
        accrued: "",
        collected: "",
        from_account: "",
        by_notification: "",
        notification_no: "",
        usage_fee: "",
        presence_fee: "",
        coeff_safety: "1",
        coeff_tax: "1",
        coeff_cap: "1",
        sum_payment_wo_nonindexed: "",
        sum_wo_safety: "",
        sum_wo_tax: "",
        sum_wo_extra: "",
        income_safety: "",
        income_tax: "",
        income_cap: "",
        shunting: "",
        mileage: "",
        total: "",
        penalty_to_notice: "",
    };
}

function emptyCleaningRow() {
    return {
        reminder_number: "",
        reminder_date: "",
        wagon_turnover: "",
        cleanup_time: "",
        extra_maneuver_min: "",
        id_locomotive_station: null,
        maneuver_fee: "",
        locomotive_fee: "",
        state: "",
        id_counterparty: null,
    };
}

function emptyWagonRow() {
    return {
        wagon_number: "",
        reminder_delivery_number: "",
        reminder_cleaning_number: "",
        id_ownership: null,
        id_rolling_type: null,
        operation_code: "",
        id_cargo: null,
        delivery_dt: "",
        operation_end_dt: "",
        under_op_time_manual: "",
        id_norm_time: "z_koo4",
        tech_time_pop: "",
        id_counterparty: null,
        turnover_operation: "",
        payment_amount: "",
        fine_amount: "",
        fine_to_notice: "",
        presence_fee_row: "",
        row_total: "",
        note: "",
        payment_multiplicity: "",
        time_total_h: "",
        norm_hours_display: "",
        cargo_op_hours: "",
        calc_under_op_h: "",
        time_calc_payment_h: "",
        time_calc_fine_h: "",
        time_calc_presence_h: "",
    };
}

function emptyFeeRow() {
    return {
        reminder_number: "",
        operation: "",
        op_date: "",
        op_time: "",
        wagon_count: "",
        source: "",
        clarification: "",
        wagons_for_calc: "",
        rate: "",
        sum: "",
        delivery_place: "",
        note: "",
    };
}

function getDefaultDocument() {
    return {
        id: null,
        signed: false,
        id_station: null,
        id_contract: null,
        id_owner: null,
        place_of_calculation: "",
        id_payer: null,
        place_of_transfer: "",
        total_sum: null,
        backendId: null,
        createdAt: null,
        form2_number: "",
        tariff_plan_id: "",
        track_branch_id: "",
        statement_numbering_type: "",
        statement_heading_date: "",
        statement_number: "",
        period_from: "",
        period_to: "",
        unpaid_time: "",
        wagon_cycle_time: "",
        wagon_cycle_paired: "",
        expanded_track_length_m: "",
        cleaning_reminders: [],
        wagons_by_reminders: [],
        fee_delivery_rows: [],
        delivery_summary: defaultDeliverySummary(),
        pp_usage_summary: defaultDeliverySummary(),
        pp_usage_days: "",
        fine: defaultFine(),
        change_history: [],
    };
}

function normalizeFilling(raw) {
    const d = { ...getDefaultDocument(), ...raw };
    d.change_history = Array.isArray(raw?.change_history) ? [...raw.change_history] : [];
    d.cleaning_reminders = Array.isArray(raw?.cleaning_reminders) ? raw.cleaning_reminders.map((r) => ({ ...emptyCleaningRow(), ...r })) : [];
    d.wagons_by_reminders = Array.isArray(raw?.wagons_by_reminders) ? raw.wagons_by_reminders.map((r) => ({ ...emptyWagonRow(), ...r })) : [];
    d.fee_delivery_rows = Array.isArray(raw?.fee_delivery_rows) ? raw.fee_delivery_rows.map((r) => ({ ...emptyFeeRow(), ...r })) : [];
    d.delivery_summary = { ...defaultDeliverySummary(), ...(raw?.delivery_summary || {}) };
    d.pp_usage_summary = { ...defaultDeliverySummary(), ...(raw?.pp_usage_summary || {}) };
    d.fine = { ...defaultFine(), ...(raw?.fine || {}) };
    return d;
}

const document = ref(getDefaultDocument());

const selClean = ref([]);
const selWagon = ref([]);
const selFee = ref([]);

const cleaningDraft = ref(emptyCleaningRow());
const editingCleaningIndex = ref(-1);

const wagonDraft = ref(emptyWagonRow());
const editingWagonIndex = ref(-1);

const feeDraft = ref(emptyFeeRow());
const editingFeeIndex = ref(-1);

let clipCleaning = null;
let clipWagon = null;
let clipFee = null;

function pushHistory(action, detail) {
    if (!Array.isArray(document.value.change_history)) document.value.change_history = [];
    document.value.change_history.push({
        at: new Date().toISOString(),
        action,
        detail: detail || "",
    });
}

function closeModalById(id) {
    const el = window.document.getElementById(id);
    if (!el) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        const Modal = bootstrap.Modal;
        let inst = null;
        if (typeof Modal.getInstance === "function") inst = Modal.getInstance(el);
        if (!inst && typeof Modal.getOrCreateInstance === "function") inst = Modal.getOrCreateInstance(el);
        if (!inst) inst = new Modal(el);
        if (inst) inst.hide();
    }
    window.document.body.classList.remove("modal-open");
    window.document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
}

function openModalById(id) {
    const el = window.document.getElementById(id);
    if (!el || typeof bootstrap === "undefined" || !bootstrap.Modal) return;
    const Modal = bootstrap.Modal;
    let inst = null;
    if (typeof Modal.getOrCreateInstance === "function") inst = Modal.getOrCreateInstance(el);
    if (!inst) inst = new Modal(el);
    inst.show();
}

function onCleanCb(i, e) {
    const on = e.target.checked;
    if (on && !selClean.value.includes(i)) selClean.value.push(i);
    if (!on) selClean.value = selClean.value.filter((x) => x !== i);
}

function isCleanSel(i) {
    return selClean.value.includes(i);
}

function onWagonCb(i, e) {
    const on = e.target.checked;
    if (on && !selWagon.value.includes(i)) selWagon.value.push(i);
    if (!on) selWagon.value = selWagon.value.filter((x) => x !== i);
}

function isWagonSel(i) {
    return selWagon.value.includes(i);
}

function onFeeCb(i, e) {
    const on = e.target.checked;
    if (on && !selFee.value.includes(i)) selFee.value.push(i);
    if (!on) selFee.value = selFee.value.filter((x) => x !== i);
}

function isFeeSel(i) {
    return selFee.value.includes(i);
}

function normHoursForId(idNorm) {
    const n = normTimeOptions.find((x) => x.id === idNorm);
    return n ? n.hours : 0;
}

function recalcWagonDerived(row) {
    const r = row;
    r.time_total_h = fmtNum(hoursBetweenLocalDateTime(r.delivery_dt, r.operation_end_dt));
    const nh = normHoursForId(r.id_norm_time);
    r.norm_hours_display = nh ? String(nh) : "";
    const opH = r.under_op_time_manual ? parseNum(r.under_op_time_manual) : parseNum(r.time_total_h);
    r.cargo_op_hours = r.under_op_time_manual || r.time_total_h || "";
    r.calc_under_op_h = fmtNum(opH);
    const tech = parseNum(r.tech_time_pop);
    r.time_calc_payment_h = fmtNum(Math.max(0, parseNum(r.time_total_h) - tech));
    r.time_calc_fine_h = fmtNum(Math.max(0, opH - nh));
    r.time_calc_presence_h = r.time_calc_payment_h;
}

function openCleaningModal(isNew) {
    editingCleaningIndex.value = -1;
    if (isNew) {
        cleaningDraft.value = emptyCleaningRow();
        openModalById("DobavitPamaitkyUborky");
        return;
    }
    if (selClean.value.length !== 1) {
        alert("Выберите одну строку для изменения.");
        return;
    }
    editingCleaningIndex.value = selClean.value[0];
    cleaningDraft.value = {
        ...emptyCleaningRow(),
        ...document.value.cleaning_reminders[editingCleaningIndex.value],
    };
    openModalById("DobavitPamaitkyUborky");
}

function applyCleaningModal() {
    const row = { ...emptyCleaningRow(), ...cleaningDraft.value };
    if (editingCleaningIndex.value >= 0) {
        document.value.cleaning_reminders[editingCleaningIndex.value] = row;
    } else {
        document.value.cleaning_reminders.push(row);
    }
    closeModalById("DobavitPamaitkyUborky");
}

function removeCleaningRows() {
    if (!selClean.value.length) return;
    const sorted = [...selClean.value].sort((a, b) => b - a);
    sorted.forEach((i) => document.value.cleaning_reminders.splice(i, 1));
    selClean.value = [];
}

function copyCleaningRow() {
    if (selClean.value.length !== 1) {
        alert("Выберите одну строку для копирования.");
        return;
    }
    clipCleaning = { ...document.value.cleaning_reminders[selClean.value[0]] };
}

function pasteCleaningRow() {
    if (!clipCleaning) return;
    document.value.cleaning_reminders.push({ ...emptyCleaningRow(), ...clipCleaning });
}

function calcCleaningManeuverFee() {
    const m = parseNum(cleaningDraft.value.extra_maneuver_min);
    cleaningDraft.value.maneuver_fee = fmtNum(m * 45);
}

function openWagonModal(isNew) {
    editingWagonIndex.value = -1;
    if (isNew) {
        wagonDraft.value = emptyWagonRow();
        openModalById("DobavitVagonPoPamiatkam");
        return;
    }
    if (selWagon.value.length !== 1) {
        alert("Выберите одну строку для изменения.");
        return;
    }
    editingWagonIndex.value = selWagon.value[0];
    wagonDraft.value = { ...emptyWagonRow(), ...document.value.wagons_by_reminders[editingWagonIndex.value] };
    openModalById("DobavitVagonPoPamiatkam");
}

function applyWagonModal() {
    const row = { ...emptyWagonRow(), ...wagonDraft.value };
    recalcWagonDerived(row);
    if (editingWagonIndex.value >= 0) {
        document.value.wagons_by_reminders[editingWagonIndex.value] = row;
    } else {
        document.value.wagons_by_reminders.push(row);
    }
    closeModalById("DobavitVagonPoPamiatkam");
}

function removeWagonRows() {
    if (!selWagon.value.length) return;
    [...selWagon.value]
        .sort((a, b) => b - a)
        .forEach((i) => document.value.wagons_by_reminders.splice(i, 1));
    selWagon.value = [];
}

function copyWagonRow() {
    if (selWagon.value.length !== 1) {
        alert("Выберите одну строку.");
        return;
    }
    clipWagon = { ...document.value.wagons_by_reminders[selWagon.value[0]] };
}

function pasteWagonRow() {
    if (!clipWagon) return;
    const r = { ...emptyWagonRow(), ...clipWagon };
    recalcWagonDerived(r);
    document.value.wagons_by_reminders.push(r);
}

function calcWagonModalTimes() {
    recalcWagonDerived(wagonDraft.value);
}

function calcWagonModalPayment() {
    recalcWagonDerived(wagonDraft.value);
    const rate = 850;
    wagonDraft.value.payment_amount = fmtNum(parseNum(wagonDraft.value.time_calc_payment_h) * rate);
    updateWagonDraftTotal();
}

function calcWagonModalFine() {
    recalcWagonDerived(wagonDraft.value);
    const rate = 120;
    wagonDraft.value.fine_amount = fmtNum(parseNum(wagonDraft.value.time_calc_fine_h) * rate);
    wagonDraft.value.fine_to_notice = wagonDraft.value.fine_amount;
    updateWagonDraftTotal();
}

function openFeeModal(isNew) {
    editingFeeIndex.value = -1;
    if (isNew) {
        feeDraft.value = { ...emptyFeeRow(), source: "Форма ведомости" };
        openModalById("DobavitDliaRaschetaSborov");
        return;
    }
    if (selFee.value.length !== 1) {
        alert("Выберите одну строку.");
        return;
    }
    editingFeeIndex.value = selFee.value[0];
    const r = document.value.fee_delivery_rows[editingFeeIndex.value];
    feeDraft.value = {
        ...emptyFeeRow(),
        ...r,
        op_date: r.op_date || "",
        op_time: r.op_time || "",
    };
    openModalById("DobavitDliaRaschetaSborov");
}

function applyFeeModal() {
    const row = { ...emptyFeeRow(), ...feeDraft.value };
    row.source = row.source || "Форма ведомости";
    if (editingFeeIndex.value >= 0) {
        document.value.fee_delivery_rows[editingFeeIndex.value] = row;
    } else {
        document.value.fee_delivery_rows.push(row);
    }
    closeModalById("DobavitDliaRaschetaSborov");
}

function removeFeeRows() {
    if (!selFee.value.length) return;
    [...selFee.value]
        .sort((a, b) => b - a)
        .forEach((i) => document.value.fee_delivery_rows.splice(i, 1));
    selFee.value = [];
}

function recalcFeeCounts() {
    document.value.fee_delivery_rows.forEach((r) => {
        const c = parseNum(r.wagon_count);
        r.wagons_for_calc = c ? String(c) : r.wagons_for_calc;
    });
}

function recalcFeeSums() {
    document.value.fee_delivery_rows.forEach((r) => {
        r.sum = fmtNum(parseNum(r.wagons_for_calc || r.wagon_count) * parseNum(r.rate));
    });
}

function addSubmittedWagonsRow() {
    const n = document.value.wagons_by_reminders.length;
    document.value.fee_delivery_rows.push({
        ...emptyFeeRow(),
        reminder_number: "по вагонам",
        operation: "Подача",
        wagon_count: String(n),
        wagons_for_calc: String(n),
        rate: "500",
        source: "Поданные вагоны",
    });
    recalcFeeSums();
}

function runDeliveryCoeffCalc() {
    const s = document.value.delivery_summary;
    applyCoefficientDerivatives(s, parseNum(s.delivery_fee) || 0);
}

function runPpUsageCoeffCalc() {
    const s = document.value.pp_usage_summary;
    applyCoefficientDerivatives(s, parseNum(s.delivery_fee) || 0);
}

function calcDeliveryFeeFromRows() {
    let sum = 0;
    document.value.fee_delivery_rows.forEach((r) => {
        sum += parseNum(r.sum);
    });
    document.value.delivery_summary.delivery_fee = fmtNum(sum) || document.value.delivery_summary.delivery_fee;
}

function runFineCoeffCalc() {
    const f = document.value.fine;
    const base = parseNum(f.usage_fee) + parseNum(f.presence_fee) + parseNum(f.accrued) * 0.3;
    applyCoefficientDerivatives(f, base > 0 ? base : parseNum(f.collected) || 1);
}

function runFineTotalCalc() {
    const f = document.value.fine;
    f.total = fmtNum(sumFineTotal(f));
}

function calcFineAccrued() {
    const f = document.value.fine;
    let h = 0;
    document.value.wagons_by_reminders.forEach((w) => {
        h += parseNum(w.time_calc_fine_h);
    });
    const rate = 120;
    f.accrued = fmtNum(h > 0 ? h * rate : parseNum(f.usage_fee) * 0.15 + parseNum(f.presence_fee) * 0.1);
}

function calcFineUsage() {
    let s = 0;
    document.value.cleaning_reminders.forEach((r) => {
        s += parseNum(r.maneuver_fee) + parseNum(r.locomotive_fee);
    });
    document.value.fine.usage_fee = fmtNum(s > 0 ? s * 0.6 : parseNum(document.value.delivery_summary.delivery_fee) * 0.25);
}

function calcFinePresence() {
    let h = 0;
    document.value.wagons_by_reminders.forEach((w) => {
        h += parseNum(w.time_calc_presence_h);
    });
    document.value.fine.presence_fee = fmtNum(h * 95);
}

function calcFineShunting() {
    document.value.fine.shunting = fmtNum(parseNum(document.value.delivery_summary.delivery_fee) * 0.12 + 200);
}

function calcFineMileage() {
    let s = 0;
    document.value.cleaning_reminders.forEach((r) => {
        s += parseNum(r.locomotive_fee);
    });
    document.value.fine.mileage = fmtNum(s > 0 ? s * 0.4 : 150);
}

function calcFinePenaltyToNotice() {
    document.value.fine.penalty_to_notice = document.value.fine.accrued || "";
}

function stubNoticeFees() {
    alert("В учебном режиме извещение по сборам не формируется.");
}

function stubNoticeFines() {
    alert("В учебном режиме извещение по штрафам не формируется.");
}

function updateWagonDraftTotal() {
    wagonDraft.value.row_total = fmtNum(
        parseNum(wagonDraft.value.payment_amount) +
            parseNum(wagonDraft.value.fine_amount) +
            parseNum(wagonDraft.value.presence_fee_row)
    );
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
            const err = validateTrainingDocument("filling_statement", document.value);
            if (err) {
                saveError.value = err;
                return;
            }
        }
    }
    try {
        const list = getStoredList();
        const doc = normalizeFilling({ ...document.value });
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
        document.value = doc;
        pushHistory("Сохранение", "Документ записан в локальное хранилище.");
        if (getToken()) {
            try {
                const payload = { ...document.value };
                if (payload.backendId) {
                    await updateStudentDocument(payload.backendId, payload);
                } else {
                    const created = await saveStudentDocument("filling_statement", payload);
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
        updateTitle("Ведомость подачи и уборки № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => {
            saveSuccess.value = null;
        }, 3000);
        if (!route.params.id) router.replace("/filling-statement/create/" + doc.id);
    } catch (e) {
        console.error(e);
        saveError.value = "Не удалось сохранить документ.";
    }
}

function recalculate() {
    saveError.value = null;
    saveSuccess.value = null;
    calcDeliveryFeeFromRows();
    runDeliveryCoeffCalc();
    runPpUsageCoeffCalc();
    runFineCoeffCalc();
    runFineTotalCalc();
    const t =
        parseNum(document.value.delivery_summary.delivery_fee) + parseNum(document.value.fine.total);
    document.value.total_sum = fmtNum(t) || "0";
    saveSuccess.value = "Пересчёт выполнен.";
    setTimeout(() => {
        saveSuccess.value = null;
    }, 2000);
}

function signDocument() {
    if (document.value.signed) return;
    if (!confirm("Подписать документ?")) return;
    saveError.value = null;
    saveSuccess.value = null;
    document.value.signed = true;
    pushHistory("Подписание", "Документ подписан пользователем.");
    saveDocument();
    saveSuccess.value = "Документ подписан и сохранён.";
    setTimeout(() => {
        saveSuccess.value = null;
    }, 3000);
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = normalizeFilling(found);
        updateTitle("Ведомость подачи и уборки № " + id);
    }
}

onMounted(async () => {
    await Promise.all([
        getStations(),
        getContracts(),
        getOwnersNonPublicRailway(),
        getLegalEntities(),
        getCargos(),
        getRollingStockTypes(),
        getOwnerships(),
    ]);
    if (route.params.id) loadDocumentById(route.params.id);
    else {
        document.value = normalizeFilling(getDefaultDocument());
        updateTitle("Ведомость подачи и уборки (Новый документ)");
    }
});
</script>

<template>
    <div class="search-box">
        <div class="row">
            <div class="col-auto">
                <button type="button" class="btn btn-custom" @click="saveDocument">Сохранить</button>
                <button type="button" class="btn btn-custom" @click="recalculate">Пересчитать</button>
                <button type="button" class="btn btn-custom" @click="signDocument" :disabled="document.signed">{{ document.signed ? 'Подписано' : 'Подписать' }}</button>
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
        <TrainingScenarioPanel doc-type="filling_statement" :document="document" />
    </div>

    <div class="content-container">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button
                    type="button"
                    class="nav-link"
                    id="home-tab"
                    :class="{ active: activeTab === 'document' }"
                    @click="activeTab = 'document'"
                >
                    Документ
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button
                    type="button"
                    class="nav-link"
                    id="History-tab"
                    :class="{ active: activeTab === 'history' }"
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
                aria-labelledby="home-tab"
                tabindex="0"
            >
                <div class="row mb-1">
                    <select-with-search title="Станция" :values="listsStore.stations" valueKey="id" name="name" v-model="document.id_station" modalName="FillingStation" :fields="{ 'Код станции': 'code', 'Наименование': 'name', 'Краткое наименование': 'short_name' }" />
                    <disable-simple-input title="Дорога" :dis="true" :value="listsStore.stations[document.id_station]?.railway ?? ''" :fixWidth="false" styleInput="width: 120px" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Договор №" :values="listsStore.contracts" valueKey="id" name="name" v-model="document.id_contract" modalName="FillingContract" :fields="{ 'Код договора': 'code', 'Наименование': 'name', 'Краткое наименование': 'short_name' }" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Владелец/пользователь п.п." :values="listsStore.owners_non_public_railway" valueKey="id" name="name" v-model="document.id_owner" modalName="FillingOwner" :fields="{ 'Код ОКПО': 'code', 'Наименование': 'name' }" />
                    <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.owners_non_public_railway[document.id_owner]?.code ?? ''" :fixWidth="false" styleInput="width: 120px" />
                    <disable-simple-input title="ИНН" :dis="true" :value="''" :fixWidth="false" styleInput="width: 120px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Место расчета" :values="placeOptions" valueKey="id" name="name" v-model="document.place_of_calculation" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Плательщик" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_payer" modalName="FillingPayer" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование': 'name', 'ИНН': 'INN' }" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Арбитражный суд</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Воинская организация</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Номер формы 2</label>
                    <div class="col-auto">
                        <input v-model="document.form2_number" type="text" class="form-control mt-0 custom-input" placeholder="" style="width: 160px" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select title="Место передачи вагона" :values="placeOptions" valueKey="id" name="name" v-model="document.place_of_transfer" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Признак пути общего пользования</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Неоплачиваемое время</label>
                    <div class="col-auto">
                        <input v-model="document.unpaid_time" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Время оборота вагона</label>
                    <div class="col-auto">
                        <input v-model="document.wagon_cycle_time" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Время оборота вагона для сдвоен. операций</label>
                    <div class="col-auto">
                        <input v-model="document.wagon_cycle_paired" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Подача/уборка локомотивом клиента</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="margin-right: 20px">Расст. ваг. по местам погр./выгр. локом. кл.</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select
                        title="Принадлежность подъездного пути"
                        :values="trackBranchOptions"
                        valueKey="id"
                        name="name"
                        v-model="document.track_branch_id"
                    />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Расстояние в оба конца для ветвевладельца, км</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Развернутая длина п/п для ветвевладельца, м</label>
                    <div class="col-auto">
                        <input v-model="document.expanded_track_length_m" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select
                        title="Тарифный план"
                        :values="tariffPlanOptions"
                        valueKey="id"
                        name="name"
                        v-model="document.tariff_plan_id"
                    />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Развернутая длина пути для расчета платы за использование пути</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-select
                        title="Тип нумерации ведомости"
                        :values="statementNumberingTypes"
                        valueKey="id"
                        name="name"
                        v-model="document.statement_numbering_type"
                    />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">ВЕДОМОСТЬ ПОДАЧИ И УБОРКИ ВАГОНОВ ОТ</label>
                    <div class="col-auto">
                        <input v-model="document.statement_heading_date" type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                    </div>

                    <label class="col-auto col-form-label mb-0">№</label>
                    <div class="col-auto">
                        <input v-model="document.statement_number" type="text" class="form-control mt-0 custom-input" placeholder="" style="width: 140px" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">с</label>
                    <div class="col-auto">
                        <input v-model="document.period_from" type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">по</label>
                    <div class="col-auto">
                        <input v-model="document.period_to" type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                    </div>
                    <label class="col-auto col-form-label mb-0 label-custom">по местному времени</label>
                </div>

                <!----------------------------------------- Памятки уборки ------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Памятки уборки</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" disabled>Добавить памятки из АСУ ЛР</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openCleaningModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openCleaningModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeCleaningRows">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="copyCleaningRow">Копировать</button>
                        <button type="button" class="btn btn-custom" @click="pasteCleaningRow">Вставить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Номер памятки</th>
                                        <th>Дата памятки</th>
                                        <th>Вагонооборот</th>
                                        <th>Время уборки</th>
                                        <th>Время дополн. маневр. работы</th>
                                        <th>Сбор за маневровую работу</th>
                                        <th>Сбор за пробег локомотива</th>
                                        <th>Состояние памятки уборки</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(cr, ci) in document.cleaning_reminders" :key="'cr' + ci">
                                        <td>
                                            <input type="checkbox" :checked="isCleanSel(ci)" @change="onCleanCb(ci, $event)" />
                                        </td>
                                        <td>{{ cr.reminder_number }}</td>
                                        <td>{{ cr.reminder_date }}</td>
                                        <td>{{ cr.wagon_turnover }}</td>
                                        <td>{{ cr.cleanup_time }}</td>
                                        <td>{{ cr.extra_maneuver_min }}</td>
                                        <td>{{ cr.maneuver_fee }}</td>
                                        <td>{{ cr.locomotive_fee }}</td>
                                        <td>{{ cr.state }}</td>
                                    </tr>
                                    <tr v-if="!document.cleaning_reminders?.length">
                                        <td colspan="9" class="text-muted text-center py-2">Нет строк — нажмите «Добавить».</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Памятки уборки модальное окно -->
                <div class="modal fade" id="DobavitPamaitkyUborky" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 90%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Памятки уборки</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 35%">Не заполнен номер памятки</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyCleaningModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер памятки уборки</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.reminder_number" type="text" class="form-control mt-0 custom-input" style="width: 200px" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 180px">Состояние памятки уборки</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.state" type="text" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1 align-items-center">
                                    <select-with-search
                                        title="Контрагент"
                                        :values="listsStore.legal_entities"
                                        valueKey="id"
                                        name="name"
                                        v-model="cleaningDraft.id_counterparty"
                                        modalName="FillingCleanCounterparty"
                                        :fields="{ 'Код ОКПО': 'OKPO', 'Наименование': 'name', 'ИНН': 'INN' }"
                                    />
                                    <disable-simple-input
                                        title="ОКПО"
                                        :dis="true"
                                        :value="listsStore.legal_entities[cleaningDraft.id_counterparty]?.OKPO ?? ''"
                                        :fixWidth="false"
                                        styleInput="width: 120px"
                                    />
                                    <disable-simple-input
                                        title="ИНН"
                                        :dis="true"
                                        :value="listsStore.legal_entities[cleaningDraft.id_counterparty]?.INN ?? ''"
                                        :fixWidth="false"
                                        styleInput="width: 120px"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата памятки</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.reminder_date" type="date" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Время уборки</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.cleanup_time" type="text" class="form-control mt-0 custom-input" style="width: 100px" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">по московскому времени</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Вагонооборот (ваг./сут.)</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.wagon_turnover" type="text" class="form-control mt-0 custom-input" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дополнительная маневровая работа</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.extra_maneuver_min" type="text" class="form-control mt-0 custom-input" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">мин</label>
                                </div>

                                <div class="row mb-1">
                                    <select-with-search
                                        title="Станция затребования локомотива"
                                        :values="listsStore.stations"
                                        valueKey="id"
                                        name="name"
                                        v-model="cleaningDraft.id_locomotive_station"
                                        modalName="FillingLocoStation"
                                        :fields="{ 'Код станции': 'code', 'Наименование': 'name', 'Краткое наименование': 'short_name' }"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за маневровую работу</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.maneuver_fee" type="text" class="form-control mt-0 custom-input" />
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="calcCleaningManeuverFee">Расчет</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за пробег локомотива</label>
                                    <div class="col-auto">
                                        <input v-model="cleaningDraft.locomotive_fee" type="text" class="form-control mt-0 custom-input" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------------------------------------------------->

                <!--Найти Номер памятки уборки модальное окно -->
                <div class="modal fade" id="NaityNomerPamiatkyUborky" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер памятки уборки</span>
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
                                                <th>Код</th>
                                                <th>Номер</th>
                                                <th>Наименованиеа</th>
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

                <!--Найти Контрагент модальное окно -->
                <div class="modal fade" id="NaityKontragent" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Контрагент</span>
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
                                                <th>ИД холдинга</th>
                                                <th>Наименованиеа</th>
                                                <th>ИНН</th>
                                                <th>Адрес</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
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

                <!--Найти Станция затребования локомотива модальное окно -->
                <div class="modal fade" id="NaityStationZatrebovania" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Станция затребования локомотива</span>
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
                                                <th>Код станции</th>
                                                <th>Код дороги</th>
                                                <th>Код локомотива</th>
                                                <th>Наименование станции</th>
                                                <th>Примечание</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td></td>
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


                <!----------------------------------------------------------------------------------------------------------------->

                <!----------------------------------------- Вагоны по памяткам ------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Вагоны по памяткам</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" disabled>Добавить памятки из АСУ ЛР</button>
                        <button type="button" class="btn btn-custom" disabled>Добавить акты задержки подачи</button>
                        <button type="button" class="btn btn-custom" disabled>Добавить вагоны из памяток подачи</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openWagonModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openWagonModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeWagonRows">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="copyWagonRow">Копировать</button>
                        <button type="button" class="btn btn-custom" @click="pasteWagonRow">Вставить</button>
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
                                        <th>Номер памятки подачи</th>
                                        <th>Номер памятки уборки</th>
                                        <th>Принадл. вагона</th>
                                        <th>Код группы вагона</th>
                                        <th>Операция</th>
                                        <th>Время подачи</th>
                                        <th>Время завершения операции</th>
                                        <th>Общее время</th>
                                        <th>Расчетное время (час)</th>
                                        <th>Время для расчета платы</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(wr, wi) in document.wagons_by_reminders" :key="'w' + wi">
                                        <td>
                                            <input type="checkbox" :checked="isWagonSel(wi)" @change="onWagonCb(wi, $event)" />
                                        </td>
                                        <td>{{ wi + 1 }}</td>
                                        <td>{{ wr.wagon_number }}</td>
                                        <td>{{ wr.reminder_delivery_number }}</td>
                                        <td>{{ wr.reminder_cleaning_number }}</td>
                                        <td>{{ listsStore.ownerships[wr.id_ownership]?.name ?? '—' }}</td>
                                        <td>{{ listsStore.rolling_stock_types[wr.id_rolling_type]?.name ?? wr.wagon_group_label ?? '—' }}</td>
                                        <td>{{ wr.operation_code }}</td>
                                        <td>{{ wr.delivery_dt }}</td>
                                        <td>{{ wr.operation_end_dt }}</td>
                                        <td>{{ wr.time_total_h }}</td>
                                        <td>{{ wr.calc_under_op_h }}</td>
                                        <td>{{ wr.time_calc_payment_h }}</td>
                                    </tr>
                                    <tr v-if="!document.wagons_by_reminders?.length">
                                        <td colspan="13" class="text-muted text-center py-2">Нет строк — нажмите «Добавить».</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Вагоны по памяткам  модальное окно -->
                <div class="modal fade" id="DobavitVagonPoPamiatkam" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="min-width: 80%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Вагоны по ведомостям подачи и уборки</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 15%">Не выбрана памятка уборки!</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyWagonModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер памятки уборки</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.reminder_cleaning_number" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Номер памятки подачи</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.reminder_delivery_number" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер вагона</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.wagon_number" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <select-with-search
                                        title="Принадлежность вагона"
                                        :values="listsStore.ownerships"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.id_ownership"
                                        modalName="FillingWagonOwnership"
                                        :fields="{ 'Наименование': 'name' }"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <select-with-search
                                        title="Группа вагона (тип ПС)"
                                        :values="listsStore.rolling_stock_types"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.id_rolling_type"
                                        modalName="FillingWagonRsType"
                                        :fields="{ 'Код': 'code', 'Наименование': 'name' }"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <simple-select
                                        title="Операция"
                                        :values="fillingOperationOptions"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.operation_code"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <select-with-search
                                        title="Груз"
                                        :values="listsStore.cargos"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.id_cargo"
                                        modalName="FillingWagonCargo"
                                        :fields="{ 'Код ЕТСНГ': 'code_ETSNG', 'Наименование': 'name' }"
                                    />
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код ЕТСНГ</label>
                                    <div class="col-auto">
                                        <input
                                            type="text"
                                            class="form-control mt-0 disabled-input"
                                            style="width: 250px"
                                            disabled
                                            :value="listsStore.cargos[wagonDraft.id_cargo]?.code_ETSNG ?? ''"
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата и время подачи вагона</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.delivery_dt" type="datetime-local" class="form-control mt-0 custom-input" style="width: 190px" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">по московскому времени</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Время завершения грузовой операции</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.operation_end_dt" type="datetime-local" class="form-control mt-0 custom-input" style="width: 190px" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">по московскому времени</label>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Дополнительное неоплачиваемое время для вагона (ч), вручную</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.under_op_time_manual" type="text" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="calcWagonModalTimes">Расчет времён</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Технологическое время для расчета платы за нахождение на ПОП</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.tech_time_pop" type="text" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1 align-items-center">
                                    <select-with-search
                                        title="Контрагент"
                                        :values="listsStore.legal_entities"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.id_counterparty"
                                        modalName="FillingWagonCounterparty"
                                        :fields="{ 'Код ОКПО': 'OKPO', 'Наименование': 'name', 'ИНН': 'INN' }"
                                    />
                                    <disable-simple-input
                                        title="ОКПО"
                                        :dis="true"
                                        :value="listsStore.legal_entities[wagonDraft.id_counterparty]?.OKPO ?? ''"
                                        :fixWidth="false"
                                        styleInput="width: 150px"
                                    />
                                    <disable-simple-input
                                        title="ИНН"
                                        :dis="true"
                                        :value="listsStore.legal_entities[wagonDraft.id_counterparty]?.INN ?? ''"
                                        :fixWidth="false"
                                        styleInput="width: 150px"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <simple-select
                                        title="Выбор операции для срока оборота"
                                        :values="turnoverOperationOptions"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.turnover_operation"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <simple-select
                                        title="Норма времени на п/п (в т.ч. код «Ж» КОО-4)"
                                        :values="normTimeOptions"
                                        valueKey="id"
                                        name="name"
                                        v-model="wagonDraft.id_norm_time"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Время нахождения вагона на подъездном пути по норме (ч)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="wagonDraft.norm_hours_display" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Время нахождения под грузовой операцией (ч)</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.cargo_op_hours" type="text" class="form-control mt-0 custom-input" style="width: 150px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Расч. время нахожд. под гр. операцией (час)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="wagonDraft.calc_under_op_h" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Время для расчета платы (час)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="wagonDraft.time_calc_payment_h" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Время для расчета штрафа (час)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="wagonDraft.time_calc_fine_h" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 400px">Время для расчета платы за нахожд. (час)</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="wagonDraft.time_calc_presence_h" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Кратность платы</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.payment_multiplicity" type="text" class="form-control mt-0 custom-input" style="width: 50px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Вагон подан взамен вагона другой группы</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Сдвоенные операции</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Рефрижераторный вагон без поддержания режима</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Транспортеры 16-осные без обслуживающих бригад</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">8-осный вагон</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Прямое смешанное ж.д.-водное сообщение (по форме ГУ-28)</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Другой администрации без 1.3</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Перевалка широкой на узкую колею</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Вагон ГУП "Рефсервис"</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Без погрузки</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Без выгрузки</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Оставлен</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Ст. 188</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Переадресовка</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Отказ</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Воинские перевозки</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Для прикрытия</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Вагон-теплушка (расчет платы за польз. без штрафа)</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Экспорт</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Таможенный досмотр</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">Вагон привлечен по договору публичной оферты</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">По факту задержки заверш. груз. опер. оформлялся Акт ГУ-23</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 420px">По факту задержки подачи оформлялся Акт ГУ-23</label>
                                    <div class="col-auto">
                                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="checkboxNoLabel" value="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма платы</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.payment_amount" type="text" class="form-control mt-0 custom-input" style="width: 150px" placeholder="" />
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="calcWagonModalPayment">Расчет</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма штрафа</label>
                                    <div class="col-auto">
                                        <input v-model="wagonDraft.fine_amount" type="text" class="form-control mt-0 custom-input" style="width: 150px" placeholder="" />
                                    </div>
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="calcWagonModalFine">Расчет</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 360px">Сумма штрафа, переданная в уведомление</label>
                                    <div class="col-auto">
                                        <input
                                            type="text"
                                            class="form-control mt-0 disabled-input"
                                            style="width: 150px"
                                            disabled
                                            :value="wagonDraft.fine_to_notice"
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма платы за нахождение</label>
                                    <div class="col-auto">
                                        <input
                                            v-model="wagonDraft.presence_fee_row"
                                            type="text"
                                            class="form-control mt-0 custom-input"
                                            style="width: 150px"
                                            placeholder=""
                                            @change="updateWagonDraftTotal"
                                        />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Итого по вагону</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 150px" placeholder="" disabled :value="wagonDraft.row_total" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Примечание</label>
                                    <div class="col-10">
                                        <input v-model="wagonDraft.note" type="text" class="form-control mt-0 custom-input" style="min-width: 100%; height: 100px" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------------------------------------------------->

                <!--Найти Принадлежность вагона модальное окно -->
                <div class="modal fade" id="NaityPrinadlejnostVagona" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Принадлежность вагона</span>
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
                                                <th>Код локомотива</th>
                                                <th>Номер вагона</th>
                                                <th>Наименование</th>
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

                <!--Найти Группа вагона модальное окно -->
                <div class="modal fade" id="NaityGruppuVagona" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Группа вагона</span>
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
                                                <th>Код</th>
                                                <th>Номер</th>
                                                <th>Наименование</th>
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

                <!--Найти Операция модальное окно -->
                <div class="modal fade" id="NaityOperation" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Операция</span>
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
                                                <th>Код</th>
                                                <th>Наименование</th>
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

                <!--Найти Груз модальное окно -->
                <div class="modal fade" id="NaityGruz" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Груз</span>
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
                                                <th>Код</th>
                                                <th>Наименование</th>
                                                <th>Аббревиатура</th>
                                                <th>Код ЕТСНГ</th>
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

                <!--Найти Контрагент модальное окно -->
                <div class="modal fade" id="NaityVagonKontragent" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Контрагент</span>
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
                                                <th>ИД холдинга</th>
                                                <th>Наименование</th>
                                                <th>ИНН</th>
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

                
                <!----------------------------------------------------------------------------------------------------------------->

                <!----------------------------------------- Для расчета сборов за подачу и уборку ------------------------------------------>
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Для расчета сборов за подачу и уборку</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="recalcFeeCounts">Пересчитать количество</button>
                        <button type="button" class="btn btn-custom" @click="recalcFeeSums">Пересчитать суммы</button>
                        <button type="button" class="btn btn-custom" @click="addSubmittedWagonsRow">Добавить поданные вагоны</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openFeeModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openFeeModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeFeeRows">Удалить</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Номер памятки</th>
                                        <th>Операция</th>
                                        <th>Время операции</th>
                                        <th>Количество вагонов</th>
                                        <th>Источник</th>
                                        <th>Уточнение для расчета</th>
                                        <th>Вагонов для расчета</th>
                                        <th>Ставка</th>
                                        <th>Сумма</th>
                                        <th>Место подачи</th>
                                        <th>Примечание</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(fr, fi) in document.fee_delivery_rows" :key="'f' + fi">
                                        <td>
                                            <input type="checkbox" :checked="isFeeSel(fi)" @change="onFeeCb(fi, $event)" />
                                        </td>
                                        <td>{{ fr.reminder_number }}</td>
                                        <td>{{ fr.operation }}</td>
                                        <td>{{ fr.op_date }} {{ fr.op_time }}</td>
                                        <td>{{ fr.wagon_count }}</td>
                                        <td>{{ fr.source }}</td>
                                        <td>{{ fr.clarification }}</td>
                                        <td>{{ fr.wagons_for_calc }}</td>
                                        <td>{{ fr.rate }}</td>
                                        <td>{{ fr.sum }}</td>
                                        <td>{{ fr.delivery_place }}</td>
                                        <td>{{ fr.note }}</td>
                                    </tr>
                                    <tr v-if="!document.fee_delivery_rows?.length">
                                        <td colspan="12" class="text-muted text-center py-2">Нет строк — нажмите «Добавить».</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!--Добавить Для расчета сборов за подачу и уборку  модальное окно -->
                <div class="modal fade" id="DobavitDliaRaschetaSborov" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered" style="min-width: 50%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Для расчета сборов за подачу и уборку</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-1">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyFeeModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер памятки</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.reminder_number" type="text" class="form-control mt-0 custom-input" style="width: 220px" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <simple-select
                                        title="Операция"
                                        :values="fillingOperationOptions"
                                        valueKey="id"
                                        name="name"
                                        v-model="feeDraft.operation"
                                    />
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата операции</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.op_date" type="date" class="form-control mt-0 custom-input" style="width: 180px" />
                                    </div>
                                    <label class="col-auto col-form-label mb-0 label-custom">Время</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.op_time" type="time" class="form-control mt-0 custom-input" style="width: 120px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Количество вагонов</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.wagon_count" type="text" class="form-control mt-0 custom-input" style="width: 220px" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Место подачи</label>
                                    <div class="col-8">
                                        <input v-model="feeDraft.delivery_place" type="text" class="form-control mt-0 custom-input" style="min-width: 100%" placeholder="" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Ставка</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.rate" type="text" class="form-control mt-0 custom-input" style="width: 120px" />
                                    </div>
                                    <label class="col-auto col-form-label mb-0 label-custom">Вагонов для расчёта</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.wagons_for_calc" type="text" class="form-control mt-0 custom-input" style="width: 120px" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Источник информации</label>
                                    <div class="col-auto">
                                        <input v-model="feeDraft.source" type="text" class="form-control mt-0 disabled-input" placeholder="" style="width: 220px" readonly />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------------------------------------------------->

                <!----------------------------------------------------------------------------------------------------------------->

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за подачу/уборку</label>
                    <div class="col-auto">
                        <input v-model="document.delivery_summary.delivery_fee" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>

                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcDeliveryFeeFromRows">Расчет</button>
                    </div>
                </div>

               

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на безопасность</label>
                    <div class="col-auto">
                        <input v-model="document.delivery_summary.coeff_safety" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input v-model="document.delivery_summary.coeff_tax" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на кап. ремонт</label>
                    <div class="col-auto">
                        <input v-model="document.delivery_summary.coeff_cap" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="runDeliveryCoeffCalc">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сумма платежа без неиндексируемой части тарифа</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.sum_payment_wo_nonindexed" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.sum_wo_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на налог</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.sum_wo_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без доп коэф</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.sum_wo_extra" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.income_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.income_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на капитальный ремонт</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.delivery_summary.income_cap" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Количество суток факт.пользования ПП</label>
                    <div class="col-auto">
                        <input v-model="document.pp_usage_days" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за пользование ПП</label>
                    <div class="col-auto">
                        <input v-model="document.pp_usage_summary.delivery_fee" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>

                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="runPpUsageCoeffCalc">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на безопасность</label>
                    <div class="col-auto">
                        <input v-model="document.pp_usage_summary.coeff_safety" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input v-model="document.pp_usage_summary.coeff_tax" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на кап. ремонт</label>
                    <div class="col-auto">
                        <input v-model="document.pp_usage_summary.coeff_cap" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="runPpUsageCoeffCalc">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сумма платежа без неиндексируемой части тарифа</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.sum_payment_wo_nonindexed" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.sum_wo_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на налог</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.sum_wo_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без доп коэф</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.sum_wo_extra" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.income_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.income_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на капитальный ремонт</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.pp_usage_summary.income_cap" />
                    </div>
                </div>

                <!--------------------------------Штраф----------------------------------------->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Штраф</label>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Начислено</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.accrued" />
                    </div>

                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFineAccrued">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Взыскано</label>
                    <div class="col-auto">
                        <input v-model="document.fine.collected" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">С лицевого счета</label>
                    <div class="col-auto">
                        <input v-model="document.fine.from_account" type="text" class="form-control mt-0 custom-input" style="width: 220px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">По уведомлению</label>
                    <div class="col-auto">
                        <input v-model="document.fine.by_notification" type="text" class="form-control mt-0 custom-input" style="width: 220px" placeholder="" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">№</label>
                    <div class="col-auto">
                        <input v-model="document.fine.notification_no" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder="" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Плата за пользование</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 220px" disabled :value="document.fine.usage_fee" />
                    </div>
                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFineUsage">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Плата за нахождение</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 220px" disabled :value="document.fine.presence_fee" />
                    </div>
                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFinePresence">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на безопасность</label>
                    <div class="col-auto">
                        <input v-model="document.fine.coeff_safety" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input v-model="document.fine.coeff_tax" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Коэфф. надбавки на кап. ремонт</label>
                    <div class="col-auto">
                        <input v-model="document.fine.coeff_cap" type="text" class="form-control mt-0 custom-input" style="width: 120px" placeholder=""  />
                    </div>
                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="runFineCoeffCalc">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сумма платежа без неиндексируемой части тарифа</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.sum_payment_wo_nonindexed" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.sum_wo_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без коэф на налог</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.sum_wo_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Сумма руб без доп коэф</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.sum_wo_extra" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на безопасность</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.income_safety" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на компенсацию налогов</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.income_tax" />
                    </div>

                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на капитальный ремонт</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" disabled :value="document.fine.income_cap" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom" style="width: 360px">Сумма штрафа, переданная в уведомление</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 150px" disabled :value="document.fine.penalty_to_notice" />
                    </div>
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFinePenaltyToNotice">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за маневровые операции</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 220px" disabled :value="document.fine.shunting" />
                    </div>
                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFineShunting">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Сбор за пробег локомотива</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 220px" disabled :value="document.fine.mileage" />
                    </div>
                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="calcFineMileage">Расчет</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Итого</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" style="width: 220px" disabled :value="document.fine.total" />
                    </div>

                     <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="runFineTotalCalc">Расчет</button>
                    </div>

                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" data-toggle="modal" data-target="#Checkforpay">Чек</button>
                    </div>

                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="stubNoticeFees">Извещение по сборам</button>
                    </div>

                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="stubNoticeFines">Извещение по штрафам</button>
                    </div>
                </div>

                <!--Найти Чек модальное окно -->
                <div class="modal fade" id="Checkforpay" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Чек по сборам и плате</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="table-responsive" style="border: #c1c1c1 solid 1px;">
                                    <table class="table table-hover table-bordered border-white">
                                        <thead style="background-color: #7da5f0; color: white">
                                            <tr>
                                                <th>Наименование сбора/платы с учетом коэф.</th>
                                                <th>Сумма</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            <tr>
                                                <td>Сбор за подачу/уборку</td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td>Сбор за пользование ПП</td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td>Плата за нахождение</td>
                                                <td></td>
                                            </tr>
                                            <tr>
                                                <td>Сбор за маневровые операции</td>
                                                <td></td>
                                            </tr>
                                             <tr>
                                                <td>Сбор за пробег локомотива</td>
                                                <td></td>
                                            </tr>
                                             <tr>
                                                <td>Штрафы</td>
                                                <td></td>
                                            </tr>
                                             <tr>
                                                <td>Итого</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="row justify-content-md-center">
                                    <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Ок</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->
                <!-------------------------------------------------------------------------------->
            </div>

            <div
                v-show="activeTab === 'history'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'history' }"
                id="history-tab-pane"
                role="tabpanel"
                tabindex="0"
                style="margin-top: 1em"
            >
                <p v-if="!document.change_history?.length" class="text-muted">
                    Записей пока нет. Сохранение и подписание документа добавляют строки в журнал.
                </p>
                <div v-else class="table-responsive" style="border: #c1c1c1 solid 1px">
                    <table class="table table-hover table-bordered border-white">
                        <thead style="background-color: #7da5f0; color: white">
                            <tr>
                                <th>Дата и время (UTC)</th>
                                <th>Действие</th>
                                <th>Комментарий</th>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr v-for="(h, hi) in document.change_history" :key="'h' + hi">
                                <td>{{ h.at }}</td>
                                <td>{{ h.action }}</td>
                                <td>{{ h.detail }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
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
