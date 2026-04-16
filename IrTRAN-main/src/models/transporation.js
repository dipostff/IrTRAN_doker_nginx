import { getDocumentTypes, getMessageTypes, getSignsSending, getCountries, getLegalEntities, getOwnerships, getOwnersNonPublicRailway, getApprovalsWithOwner, getCargoGroups, getMethodsSubmission, getStations, getSendings, getCargos, getTransportPackageTypes, getSendTypes, getRollingStockTypes, getSpeedTypes, getDestinationIndications, getContracts, getPayers, getPayerTypes, getSubmissionSchedules, getSendNumbers } from "@/helpers/API";
import { updateSubtitle } from "@/helpers/headerHelper";
import { useListsStore } from "@/stores/main";
import { getDiffDays } from "@/helpers/dateHelper";

const listsStore = useListsStore();
const date = new Date().toISOString().split("T")[0];
let essentialListsPromise = null;
let extendedListsPromise = null;

export class Transporation {
    static getRequiredFields() {
        return {
            id_document_type: "Нет типа документа",
            registration_date: "Нет даты регистрации документа",
            transportation_date_from: "Нет дат периода перевозок",
            transportation_date_to: "Нет дат периода перевозок",
            id_message_type: "Не выбран вид сообщения",
            id_sign_sending: "Не указан признак отправки",
            id_country_departure: "Не указана страна отправления",
            id_station_departure: "Не указана станция отправления/входа в СНГ",
            id_shipper: "Не указан грузоотправитель",
            id_carriage_ownership: "Не указана принадлежность вагонов/контейнеров",
            id_cargo_group: "Не указана группа груза",
            id_method_submission: "Не указан способ подачи",
        };
    }

    static getDefaultDocument() {
        return {
            id_document_type: 4,
            registration_date: date,
            Sendings: [],
        };
    }

    static getStatus() {
        return {
            0: "Хз",
            1: "Хз",
            2: "Подписан",
            null: "Хз",
        };
    }

    static checkSignature(object) {
        return object.document_status === 2;
    }

    static subscribe(object) {
        object.document_status = 2;
    }

    static checkAutoFilledFields(newVal, oldVal) {
        if (newVal.id_message_type !== oldVal.id_message_type) {
            if (listsStore.message_types[newVal.id_message_type]?.name === "Прямое" || listsStore.message_types[newVal.id_message_type]?.name === "Местное") {
                let filterCountries = Object.values(listsStore.countries).filter((item) => item.name == "Российская Федерация");
                let idRussia = filterCountries.length ? filterCountries[0].id : null;
                newVal.id_country_departure = idRussia;
                newVal.update = true;
            }
        }
    }

    static hasEssentialLists() {
        return (
            Object.keys(listsStore.document_types || {}).length > 0 &&
            Object.keys(listsStore.message_types || {}).length > 0 &&
            Object.keys(listsStore.signs_sending || {}).length > 0 &&
            Object.keys(listsStore.countries || {}).length > 0 &&
            Object.keys(listsStore.legal_entities || {}).length > 0 &&
            Object.keys(listsStore.cargo_groups || {}).length > 0 &&
            Object.keys(listsStore.methods_submission || {}).length > 0 &&
            Object.keys(listsStore.stations || {}).length > 0 &&
            Object.keys(listsStore.cargos || {}).length > 0
        );
    }

    static hasExtendedLists() {
        return (
            Object.keys(listsStore.destination_indications || {}).length > 0 &&
            Object.keys(listsStore.contracts || {}).length > 0 &&
            Object.keys(listsStore.payers || {}).length > 0 &&
            Object.keys(listsStore.payer_types || {}).length > 0 &&
            Object.keys(listsStore.submission_schedules || {}).length > 0 &&
            Object.keys(listsStore.send_numbers || {}).length > 0
        );
    }

    static async loadEssentialLists() {
        if (Transporation.hasEssentialLists()) return;
        if (essentialListsPromise) {
            await essentialListsPromise;
            return;
        }
        essentialListsPromise = Promise.all([
            getDocumentTypes(),
            getMessageTypes(),
            getSignsSending(),
            getCountries(),
            getLegalEntities(),
            getOwnerships(),
            getOwnersNonPublicRailway(),
            getApprovalsWithOwner(),
            getCargoGroups(),
            getMethodsSubmission(),
            getStations(),
            getSendings(),
            getCargos(),
            getTransportPackageTypes(),
            getSendTypes(),
            getRollingStockTypes(),
            getSpeedTypes(),
        ]).finally(() => {
            essentialListsPromise = null;
        });
        await essentialListsPromise;
    }

    static async loadExtendedLists() {
        if (Transporation.hasExtendedLists()) return;
        if (extendedListsPromise) {
            await extendedListsPromise;
            return;
        }
        extendedListsPromise = Promise.allSettled([
            getDestinationIndications(),
            getContracts(),
            getPayers(),
            getPayerTypes(),
            getSubmissionSchedules(),
            getSendNumbers(),
        ]).finally(() => {
            extendedListsPromise = null;
        });
        await extendedListsPromise;
    }

    static async loadLists() {
        await Transporation.loadEssentialLists();
        // Не блокируем первичный рендер формы тяжёлыми справочниками.
        void Transporation.loadExtendedLists();
    }

    /**
     * Сообщение о блокирующей ошибке перед сохранением или null, если можно сохранять.
     * Используется тренажёром при включённой «Проверке ошибок».
     */
    static getBlockingMessage(object) {
        if (Transporation.checkSignature(object)) {
            return null;
        }

        const requiredFields = this.getRequiredFields();
        for (const field in requiredFields) {
            if (!object[field]) {
                return requiredFields[field];
            }
        }

        const dateMsg = Transporation.getDateValidationMessage(object);
        if (dateMsg) return dateMsg;

        if (!object.Sendings || object.Sendings.length === 0) {
            return "Не указаны отправки";
        }

        return null;
    }

    static checkRequiredFields(object) {
        updateSubtitle("");

        const msg = Transporation.getBlockingMessage(object);
        if (msg) {
            updateSubtitle(msg);
        }
    }

    static getDateValidationMessage(object) {
        if (object.registration_date < date) {
            return "Дата регистрации должна быть не раньше текущей даты";
        }
        if (object.transportation_date_from > object.transportation_date_to) {
            return "Начало перевозки должно быть раньше конца перевозки";
        }
        if (object.transportation_date_from < date || object.transportation_date_to < date) {
            return "Период перевозок должен быть не раньше текущей даты";
        }
        if (getDiffDays(object.transportation_date_from, object.transportation_date_to) > 45) {
            return "Перевозка превышает 45 дней";
        }
        return null;
    }

    static checkCorrectDate(object) {
        const msg = Transporation.getDateValidationMessage(object);
        if (msg) {
            updateSubtitle(msg);
            return;
        }
        return true;
    }
}
