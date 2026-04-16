import { defineStore } from "pinia";

export const useMainStore = defineStore("main", {
    state: () => {
        return {
            title: "",
            subtitle: "",
            subtitleModal: "",
        };
    },
    actions: {},
});

export const useListsStore = defineStore("lists", {
    state: () => {
        return {
            document_types: {},
            message_types: {},
            signs_sending: {},
            countries: {},
            legal_entities: {},
            ownerships: {},
            owners_non_public_railway: {},
            approvals_with_owner: {},
            cargo_groups: {},
            methods_submission: {},
            stations: {},
            sendings: {},
            cargos: {},
            transport_package_types: {},
            rolling_stock_types: {},
            contracts: {},
            destination_indications: {},
            submission_schedules: {},
            send_numbers: {},
            payers: {},
            payer_types: {},
            send_types: {},
            speed_types: {},
            transportations: {},
        };
    },
    actions: {},
});
