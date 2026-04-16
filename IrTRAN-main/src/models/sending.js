import { updateSubtitleModal } from "@/helpers/headerHelper";
import { useListsStore } from "@/stores/main";

const listsStore = useListsStore();

export class Sending {
    static getRequiredFields() {
        return {
            id_cargo: "Не указан груз",
            id_send_type: "Не указан вид отправки",
            id_rolling_stock_type: "Не указан вид подвижного состава",
            weight: "Не указан вес",
            count_wagon: "Не указано количество вагонов",
            id_country_destination: "Не указана страна назначения",
            id_station_destination: "Не указана станция назначения/выхода из СНГ",
            //id_station_out: "Не указана станция выхода из России",
            id_receiver: "Не указан грузополучатель",
        };
    }

    static getDefaultDocument() {
        return {
            count_wagon: -1,
            DestinationIndications: [],
        };
    }

    static checkRequiredFields(object) {
        updateSubtitleModal("");

        let requiredFields = this.getRequiredFields();

        for (let field in requiredFields) {
            if (!object[field]) {
                updateSubtitleModal(requiredFields[field]);
                return;
            }
        }

        let cont = this.checkCorrectDate(object);
    }

    static checkCorrectDate(object) {
        return true;
    }

    static checkAutoFilledFields(newVal, oldVal, object) {
        if (!newVal.id_country_destination) {
            if (listsStore.message_types[object.id_message_type]?.name === "Прямое" || listsStore.message_types[object.id_message_type]?.name === "Местное") {
                let filterCountries = Object.values(listsStore.countries).filter((item) => item.name == "Российская Федерация");
                let idRussia = filterCountries.length ? filterCountries[0].id : null;
                newVal.id_country_destination = idRussia;
                newVal.update = true;
            }
        }
        if (newVal.id_receiver !== oldVal.id_receiver) {
            newVal.OKPO = listsStore.legal_entities[newVal.id_receiver]?.OKPO;
            newVal.name = listsStore.legal_entities[newVal.id_receiver]?.name;
            newVal.addr = listsStore.legal_entities[newVal.id_receiver]?.addr;
            newVal.update = true;
        }
    }
}
