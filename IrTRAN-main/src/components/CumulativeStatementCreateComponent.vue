<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useListsStore } from "@/stores/main";
import { useTrainingSimulatorContext } from "@/composables/useTrainingSimulatorContext";
import TrainingScenarioPanel from "@/components/training/TrainingScenarioPanel.vue";
import { validateTrainingDocument } from "@/helpers/trainingDocumentValidators";
import { updateTitle } from "@/helpers/headerHelper";
import { getLegalEntities, saveStudentDocument, updateStudentDocument } from "@/helpers/API";
import { getToken } from "@/helpers/keycloak";
import { applyCoefficientDerivatives, parseNum, fmtNum } from "@/helpers/fillingStatementCalculations";
import {
    CUMULATIVE_SOURCE_DOCUMENTS,
    CUMULATIVE_FEE_ARTICLES,
    CUMULATIVE_ADDITIONAL_CODES,
    CUMULATIVE_NDS_OPTIONS,
} from "@/config/cumulativeStatementCatalogs";

const route = useRoute();
const router = useRouter();
const listsStore = useListsStore();
const { trainingContext } = useTrainingSimulatorContext();
const STORAGE_KEY = "cumulative_statement_documents";
const saveError = ref(null);
const saveSuccess = ref(null);

const placeOptions = [{ id: "ЦФТО", name: "ЦФТО" }];
const sourceDocumentOptions = CUMULATIVE_SOURCE_DOCUMENTS;
const feeArticleOptions = CUMULATIVE_FEE_ARTICLES;
const additionalCodeOptions = CUMULATIVE_ADDITIONAL_CODES;
const ndsOptions = CUMULATIVE_NDS_OPTIONS;

const selectedFeeRows = ref([]);
const feeDraft = ref(emptyFeeRow());
const editingFeeIndex = ref(-1);
const feeClipboard = ref(null);
const sourceDocumentChoices = ref([]);

function getDefaultDocument() {
    return {
        id: null,
        signed: false,
        document_number: "",
        manual_number: false,
        period_from: "",
        period_to: "",
        arbitration_court: false,
        id_carrier_org: null,
        place_of_calculation: "",
        id_payer: null,
        total_to_pay: null,
        head_signer_name: "",
        fee_rows: [],
        backendId: null,
    };
}

const document = ref(getDefaultDocument());

function emptyFeeRow() {
    return {
        fee_date: "",
        source_document_type: "",
        source_document_number: "",
        source_document_state: "",
        fee_article_id: "",
        additional_code_id: "",
        note: "",
        wagon_or_container_number: "",
        amount_rub: "",
        amount_kzt: "",
        nds_option_id: "nds_20",
        nds_rate: "",
        nds_amount: "",
        calculated_amount: "",
        coeff_safety: "1",
        coeff_tax: "1",
        coeff_cap: "1",
        sum_wo_nonindexed: "",
        sum_wo_safety: "",
        sum_wo_tax: "",
        sum_wo_extra: "",
        income_safety: "",
        income_tax: "",
        income_cap: "",
    };
}

function normalizeDocument(raw) {
    const d = { ...getDefaultDocument(), ...(raw || {}) };
    d.fee_rows = Array.isArray(raw?.fee_rows) ? raw.fee_rows.map((r) => ({ ...emptyFeeRow(), ...r })) : [];
    return d;
}

function readListSafe(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function makeSourceChoice(docType, d) {
    return {
        key: `${docType}:${d.id}`,
        id: String(d.id ?? ""),
        number: String(d.document_number || d.id || ""),
        state: d.signed ? "Подписан" : "Черновик",
        createdAt: d.createdAt || "",
    };
}

function reloadSourceDocumentChoices() {
    const choices = {
        invoice: readListSafe("invoice_documents").map((d) => makeSourceChoice("invoice", d)),
        filling_statement: readListSafe("filling_statement_documents").map((d) => makeSourceChoice("filling_statement", d)),
        reminder: readListSafe("reminder_documents").map((d) => makeSourceChoice("reminder", d)),
        cumulative_statement: readListSafe("cumulative_statement_documents").map((d) => makeSourceChoice("cumulative_statement", d)),
        common_act: readListSafe("common_act_documents").map((d) => makeSourceChoice("common_act", d)),
        commercial_act: readListSafe("commercial_act_documents").map((d) => makeSourceChoice("commercial_act", d)),
    };
    sourceDocumentChoices.value = choices;
}

function getSourceChoicesForType(docType) {
    if (!docType || !sourceDocumentChoices.value) return [];
    const list = sourceDocumentChoices.value[docType] || [];
    return list.filter((x) => matchesCumulativePeriod(x));
}

function applySelectedSourceDocument() {
    const list = getSourceChoicesForType(feeDraft.value.source_document_type);
    const found = list.find((x) => x.id === String(feeDraft.value.source_document_number));
    feeDraft.value.source_document_state = found?.state || "";
}

function matchesCumulativePeriod(choice) {
    const from = document.value.period_from;
    const to = document.value.period_to;
    if (!from && !to) return true;
    if (!choice?.createdAt) return true;
    const created = String(choice.createdAt).slice(0, 10);
    if (from && created < from) return false;
    if (to && created > to) return false;
    return true;
}

function selectedCarrier() {
    return listsStore.legal_entities[document.value.id_carrier_org] || null;
}

function carrierRailwayDisplay() {
    const org = selectedCarrier();
    if (!org) return "";
    return org.railway || org.railway_code || org.road || org.short_name || "";
}

function feeArticleById(id) {
    return feeArticleOptions.find((x) => x.id === id);
}

function additionalCodeById(id) {
    return additionalCodeOptions.find((x) => x.id === id);
}

function ndsById(id) {
    return ndsOptions.find((x) => x.id === id) || ndsOptions[0];
}

function recalcFeeDraftAmounts() {
    if (!feeDraft.value) return;
    const rate = ndsById(feeDraft.value.nds_option_id).rate;
    const base = parseNum(feeDraft.value.amount_rub);
    feeDraft.value.nds_rate = String(rate);
    feeDraft.value.nds_amount = fmtNum((base * rate) / 100);
    feeDraft.value.calculated_amount = fmtNum(base + parseNum(feeDraft.value.nds_amount));
}

function recalcFeeDraftDerivatives() {
    if (!feeDraft.value) return;
    applyCoefficientDerivatives(
        {
            coeff_safety: feeDraft.value.coeff_safety,
            coeff_tax: feeDraft.value.coeff_tax,
            coeff_cap: feeDraft.value.coeff_cap,
            sum_payment_wo_nonindexed: feeDraft.value.sum_wo_nonindexed,
            sum_wo_safety: feeDraft.value.sum_wo_safety,
            sum_wo_tax: feeDraft.value.sum_wo_tax,
            sum_wo_extra: feeDraft.value.sum_wo_extra,
            income_safety: feeDraft.value.income_safety,
            income_tax: feeDraft.value.income_tax,
            income_cap: feeDraft.value.income_cap,
        },
        parseNum(feeDraft.value.calculated_amount)
    );
    const t = {
        coeff_safety: feeDraft.value.coeff_safety,
        coeff_tax: feeDraft.value.coeff_tax,
        coeff_cap: feeDraft.value.coeff_cap,
        sum_payment_wo_nonindexed: "",
        sum_wo_safety: "",
        sum_wo_tax: "",
        sum_wo_extra: "",
        income_safety: "",
        income_tax: "",
        income_cap: "",
    };
    applyCoefficientDerivatives(t, parseNum(feeDraft.value.calculated_amount));
    feeDraft.value.sum_wo_nonindexed = t.sum_payment_wo_nonindexed;
    feeDraft.value.sum_wo_safety = t.sum_wo_safety;
    feeDraft.value.sum_wo_tax = t.sum_wo_tax;
    feeDraft.value.sum_wo_extra = t.sum_wo_extra;
    feeDraft.value.income_safety = t.income_safety;
    feeDraft.value.income_tax = t.income_tax;
    feeDraft.value.income_cap = t.income_cap;
}

function recalcTotalToPay() {
    let total = 0;
    document.value.fee_rows.forEach((r) => {
        total += parseNum(r.calculated_amount);
    });
    document.value.total_to_pay = fmtNum(total);
}

function isFeeRowSelected(i) {
    return selectedFeeRows.value.includes(i);
}

function onFeeRowCheckbox(i, e) {
    const checked = e.target.checked;
    if (checked && !selectedFeeRows.value.includes(i)) selectedFeeRows.value.push(i);
    if (!checked) selectedFeeRows.value = selectedFeeRows.value.filter((x) => x !== i);
}

function openFeeModal(isNew) {
    reloadSourceDocumentChoices();
    editingFeeIndex.value = -1;
    if (isNew) {
        feeDraft.value = emptyFeeRow();
        showModalById("AddSbor");
        return;
    }
    if (selectedFeeRows.value.length !== 1) {
        alert("Выберите одну строку для изменения.");
        return;
    }
    editingFeeIndex.value = selectedFeeRows.value[0];
    feeDraft.value = { ...emptyFeeRow(), ...document.value.fee_rows[editingFeeIndex.value] };
    applySelectedSourceDocument();
    showModalById("AddSbor");
}

function applyFeeModal() {
    if (!feeDraft.value) return;
    recalcFeeDraftAmounts();
    recalcFeeDraftDerivatives();
    const row = { ...emptyFeeRow(), ...feeDraft.value };
    if (editingFeeIndex.value >= 0) document.value.fee_rows[editingFeeIndex.value] = row;
    else document.value.fee_rows.push(row);
    recalcTotalToPay();
    hideModalById("AddSbor");
}

function removeFeeRows() {
    if (!selectedFeeRows.value.length) return;
    [...selectedFeeRows.value]
        .sort((a, b) => b - a)
        .forEach((i) => document.value.fee_rows.splice(i, 1));
    selectedFeeRows.value = [];
    recalcTotalToPay();
}

function copyFeeRow() {
    if (selectedFeeRows.value.length !== 1) {
        alert("Выберите одну строку для копирования.");
        return;
    }
    feeClipboard.value = { ...document.value.fee_rows[selectedFeeRows.value[0]] };
}

function pasteFeeRow() {
    if (!feeClipboard.value) return;
    document.value.fee_rows.push({ ...emptyFeeRow(), ...feeClipboard.value });
    recalcTotalToPay();
}

function showFormula() {
    alert("Формула расчета: Расчетная сумма = Сумма сбора + Сумма НДС; Сумма НДС = Сумма сбора * Ставка НДС / 100.");
}

function showModalById(id) {
    const el = window.document.getElementById(id);
    if (!el || typeof bootstrap === "undefined" || !bootstrap.Modal) return;
    const Modal = bootstrap.Modal;
    let inst = null;
    if (typeof Modal.getOrCreateInstance === "function") inst = Modal.getOrCreateInstance(el);
    if (!inst) inst = new Modal(el);
    inst.show();
}

function hideModalById(id) {
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
            const err = validateTrainingDocument("cumulative_statement", document.value);
            if (err) {
                saveError.value = err;
                return;
            }
        }
    }
    try {
        const list = getStoredList();
        const doc = normalizeDocument({ ...document.value });
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
        document.value = normalizeDocument(doc);
        if (getToken()) {
            try {
                const payload = { ...document.value };
                if (payload.backendId) {
                    await updateStudentDocument(payload.backendId, payload);
                } else {
                    const created = await saveStudentDocument("cumulative_statement", payload);
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
        updateTitle("Накопительная ведомость № " + doc.id);
        saveSuccess.value = "Документ сохранён.";
        setTimeout(() => { saveSuccess.value = null; }, 3000);
        if (!route.params.id) router.replace("/cumulative-statement/create/" + doc.id);
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
    document.value = normalizeDocument(getDefaultDocument());
    updateTitle("Накопительная ведомость (Новый документ)");
    router.push("/cumulative-statement/menu");
}

function loadDocumentById(id) {
    const list = getStoredList();
    const found = list.find((d) => d.id === id);
    if (found) {
        document.value = normalizeDocument({ ...getDefaultDocument(), ...found });
        updateTitle("Накопительная ведомость № " + id);
    }
}

onMounted(async () => {
    await getLegalEntities();
    reloadSourceDocumentChoices();
    if (route.params.id) loadDocumentById(route.params.id);
    else {
        document.value = normalizeDocument(getDefaultDocument());
        updateTitle("Накопительная ведомость (Новый документ)");
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
        <TrainingScenarioPanel doc-type="cumulative_statement" :document="document" />
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
                    <label class="col-auto col-form-label mb-0 label-custom">Вид документа</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" placeholder="Накопительная ведомость" disabled="disabled" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Ввод номера документа вручную</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="cumManualNumber" v-model="document.manual_number" />
                    </div>
                </div>

                <div class="row mb-1">
                    <simple-input title="Номер документа" v-model="document.document_number" :fixWidth="false" styleInput="width: 200px" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Период с</label>
                    <div class="col-auto">
                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.period_from" />
                    </div>
                    <label class="col-auto col-form-label mb-0">по</label>
                    <div class="col-auto">
                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="document.period_to" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" for="customCheck1" style="width: auto">Арбитражный суд</label>
                    <div class="col-auto">
                        <input class="form-check-input custom-input" style="width: 20px; height: 20px" type="checkbox" id="cumArbitration" v-model="document.arbitration_court" />
                    </div>
                </div>

                <div class="row mb-1">
                    <select-with-search title="Организация перевозчика" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_carrier_org" modalName="CumCarrier" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование': 'name', 'ИД бизнеса': 'id_business', 'ИД холдинга': 'id_holding' }" />
                    <disable-simple-input title="ж.д." :dis="true" :value="carrierRailwayDisplay()" :fixWidth="false" styleInput="width: 120px" />
                </div>

                <div class="row mb-1">
                    <simple-select title="Место расчета" :values="placeOptions" valueKey="id" name="name" v-model="document.place_of_calculation" />
                </div>

                <div class="row mb-1">
                    <select-with-search title="Плательщик" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="document.id_payer" modalName="CumPayer" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование': 'name', 'ИД бизнеса': 'id_business', 'ИД холдинга': 'id_holding' }" />
                    <disable-simple-input title="Код" :dis="true" :value="listsStore.legal_entities[document.id_payer]?.id ?? ''" :fixWidth="false" styleInput="width: 80px" />
                    <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[document.id_payer]?.OKPO ?? ''" :fixWidth="false" styleInput="width: 120px" />
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Форма расчета</label>
                    <div class="col-3">
                        <select class="form-select mt-0 disabled-input" disabled>
                            <option value="">Безналичный централизованный</option>
                        </select>
                    </div>
                </div>

                <!-- Сборы -->
                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Сборы</label>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <button type="button" class="btn btn-custom" @click="openFeeModal(true)">Добавить</button>
                        <button type="button" class="btn btn-custom" @click="openFeeModal(false)">Изменить</button>
                        <button type="button" class="btn btn-custom" @click="removeFeeRows">Удалить</button>
                        <button type="button" class="btn btn-custom" @click="copyFeeRow">Копировать</button>
                        <button type="button" class="btn btn-custom" @click="pasteFeeRow">Вставить</button>
                        <button type="button" class="btn btn-custom" disabled>Данные из актов</button>
                    </div>
                </div>

                <div class="row mb-1">
                    <div class="col-auto">
                        <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                            <table class="table table-hover table-bordered border-white">
                                <thead style="background-color: #7da5f0; color: white">
                                    <tr>
                                        <th></th>
                                        <th>Дата</th>
                                        <th>Наименование документа</th>
                                        <th>Номер документа</th>
                                        <th>Состояние родительского документа</th>
                                        <th>Код статьи сбора</th>
                                        <th>Наименование сбора</th>
                                        <th>Примечание</th>
                                        <th>Номер ваг/конт</th>
                                        <th>Сумма, руб.</th>
                                        <th>Сумма, тенге</th>
                                        <th>Признак НДС</th>
                                        <th>Сумма НДС</th>
                                        <th>Ставка НДС</th>
                                    </tr>
                                </thead>
                                <tbody class="table-group-divider">
                                    <tr v-for="(row, idx) in document.fee_rows" :key="'fee' + idx">
                                        <td><input type="checkbox" :checked="isFeeRowSelected(idx)" @change="onFeeRowCheckbox(idx, $event)" /></td>
                                        <td>{{ row.fee_date }}</td>
                                        <td>{{ sourceDocumentOptions.find((x) => x.id === row.source_document_type)?.name || row.source_document_type }}</td>
                                        <td>{{ row.source_document_number }}</td>
                                        <td>{{ row.source_document_state }}</td>
                                        <td>{{ feeArticleById(row.fee_article_id)?.code || "" }}</td>
                                        <td>{{ feeArticleById(row.fee_article_id)?.name || "" }}</td>
                                        <td>{{ row.note }}</td>
                                        <td>{{ row.wagon_or_container_number }}</td>
                                        <td>{{ row.amount_rub }}</td>
                                        <td>{{ row.amount_kzt }}</td>
                                        <td>{{ ndsById(row.nds_option_id).name }}</td>
                                        <td>{{ row.nds_amount }}</td>
                                        <td>{{ row.nds_rate }}</td>
                                    </tr>
                                    <tr v-if="!document.fee_rows?.length"><td colspan="14" class="text-muted text-center py-2">Нет строк сборов.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">Итого к оплате</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 disabled-input" placeholder="" disabled="disabled" :value="document.total_to_pay != null ? document.total_to_pay : ''" />
                    </div>
                </div>

                <div class="row mb-1">
                    <label class="col-auto col-form-label mb-0 label-custom">ФИО руководителя, подписывающего документ</label>
                    <div class="col-auto">
                        <input type="text" class="form-control mt-0 custom-input" placeholder="" v-model="document.head_signer_name" />
                    </div>
                </div>

                <!--Данные по актам Сборов модальное окно -->
                <div class="modal fade bd-example-modal-lg" id="AddSbor" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 90%">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center col-auto" id="staticBackdropLabel" style="color: white; font-weight: bold">Сборы</span>
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 35%">Не указана статья сбора</span>
                                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="applyFeeModal">Применить</button>
                                        <button type="button" class="btn btn-custom" data-dismiss="modal">Отменить</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дата сбора</label>
                                    <div class="col-auto">
                                        <input type="date" class="form-control mt-0 custom-input" style="width: 150px" v-model="feeDraft.fee_date" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Наименование документа</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input" v-model="feeDraft.source_document_type">
                                            <option value="">Выберете элемент списка</option>
                                            <option v-for="d in sourceDocumentOptions" :key="d.id" :value="d.id">{{ d.name }}</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Номер документа</label>
                                    <div class="col-auto" style="width: 280px">
                                        <select
                                            class="form-select mt-0 custom-input"
                                            v-model="feeDraft.source_document_number"
                                            @change="applySelectedSourceDocument"
                                        >
                                            <option value="">Выберите документ</option>
                                            <option
                                                v-for="doc in getSourceChoicesForType(feeDraft.source_document_type)"
                                                :key="doc.key"
                                                :value="doc.id"
                                            >
                                                {{ doc.number }} ({{ doc.state }})
                                            </option>
                                        </select>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Ид*</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" :value="feeDraft.source_document_number" disabled="disabled" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Состояние документа</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" :value="feeDraft.source_document_state" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Статья сбора</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 478px">
                                            <select class="form-select mt-0 custom-input" v-model="feeDraft.fee_article_id">
                                                <option value="">Выберите статью</option>
                                                <option v-for="a in feeArticleOptions" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option>
                                            </select>
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#StatiaSbora">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код статьи</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" :value="feeArticleById(feeDraft.fee_article_id)?.code || ''" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Признак НДС</label>
                                    <div class="col-3">
                                        <select class="form-select mt-0 custom-input" v-model="feeDraft.nds_option_id">
                                            <option value="">Выберете элемент списка</option>
                                            <option v-for="n in ndsOptions" :key="n.id" :value="n.id">{{ n.name }}</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Дополнительный код</label>
                                    <div class="col-auto">
                                        <div class="input-group" style="width: 270px">
                                            <select class="form-select mt-0 custom-input" v-model="feeDraft.additional_code_id">
                                                <option value="">Выберите код</option>
                                                <option v-for="c in additionalCodeOptions" :key="c.id" :value="c.id">{{ c.code }} - {{ c.name }}</option>
                                            </select>
                                            <button class="btn btn-outline-secondary" type="button" data-toggle="modal" data-target="#DopKod">
                                                <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                            </button>
                                        </div>
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Код</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 120px" :value="additionalCodeById(feeDraft.additional_code_id)?.code || ''" disabled="disabled" />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Рассчетная сумма</label>
                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.calculated_amount" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма сбора</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 100px" placeholder="" v-model="feeDraft.amount_rub" />
                                    </div>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" placeholder="" disabled :value="feeDraft.amount_kzt" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Ставка НДС</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" placeholder="" disabled :value="feeDraft.nds_rate" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom" style="width: auto">Сумма НДС</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" placeholder="" disabled :value="feeDraft.nds_amount" />
                                    </div>

                                     <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="recalcFeeDraftAmounts">Расчет</button>
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="showFormula">Формула расчетов</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Коэф. надбавки на безопаность</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 100px" placeholder="" v-model="feeDraft.coeff_safety" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Коэф. надбавки на компенсацию налогов</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 100px" placeholder="" v-model="feeDraft.coeff_tax" />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Коэф. надбавки на кап. ремонт</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 custom-input" style="width: 100px" placeholder="" v-model="feeDraft.coeff_cap" />
                                    </div>

                                    <div class="col-auto">
                                        <button type="button" class="btn btn-custom" @click="recalcFeeDraftDerivatives">Расчет</button>
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма без неиндек. части тарифа</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.sum_wo_nonindexed" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма без коэф. на безопасность</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.sum_wo_safety" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма без коэф. на налог</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.sum_wo_tax" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Сумма без доп коэф.</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.sum_wo_extra" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на обесп. безопасности</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.income_safety" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на компенсацию налогов</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.income_tax" disabled />
                                    </div>

                                    <label class="col-auto col-form-label mb-0 label-custom">Доход от надбавки на кап. ремонт</label>

                                    <div class="col-auto">
                                        <input type="text" class="form-control mt-0 disabled-input" style="width: 100px" :value="feeDraft.income_cap" disabled />
                                    </div>
                                </div>

                                <div class="row mb-1">
                                    <label class="col-auto col-form-label mb-0 label-custom">Примечание</label>

                                    <div class="col-10">
                                        <input type="text" class="form-control mt-0 custom-input" style="min-width: 100%" v-model="feeDraft.note" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!----------------------------- -->

                <!--Найти Номер документа модальное окно -->
                <div class="modal fade" id="NomerDocumenta" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Номер документа</span>
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

                <!--Найти Статья сборов модальное окно -->
                <div class="modal fade" id="StatiaSbora" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Статья сборов</span>
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

                <!--Найти Дополнительный код модальное окно -->
                <div class="modal fade" id="DopKod" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="DopKod" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background-color: #7da5f0">
                                <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Дополнительный код</span>
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
                <!-- ------------------------------------------------------- -->
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
