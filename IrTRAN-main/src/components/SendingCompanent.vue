<script>
import { useMainStore, useListsStore } from "@/stores/main";
import { Sending } from "@/models/sending";
import { saveSending, getCargoConstraints } from "@/helpers/API";
export default {
    props: {
        object: {
            type: Object,
        },
        sendingId: {
            type: Number,
        },
        resetNonce: {
            type: Number,
            default: 0,
        },
    },
    emits: ["saveSending"],
    data() {
        return {
            errorSending: "Не указано наименование груза",
            listsStore: {},
            mainStore: {},
            sending: {},
            selectedDestinationIndicationId: null,
            cargoConstraints: {
                hasCargoRestrictions: false,
                cargoIds: []
            },
        };
    },
    methods: {
        initSending() {
            if (this.sendingId && this.listsStore.sendings[this.sendingId]) {
                this.sending = { ...this.listsStore.sendings[this.sendingId] };
            } else {
                this.sending = Sending.getDefaultDocument();
            }
            if (!Array.isArray(this.sending.DestinationIndications)) {
                this.sending.DestinationIndications = [];
            }
            this.selectedDestinationIndicationId = null;
        },
        addDestinationIndication() {
            const id = Number(this.selectedDestinationIndicationId);
            if (!Number.isFinite(id)) return;
            const selected = this.listsStore.destination_indications?.[id];
            if (!selected) return;
            if (!Array.isArray(this.sending.DestinationIndications)) {
                this.sending.DestinationIndications = [];
            }
            const exists = this.sending.DestinationIndications.some((item) => Number(item?.id) === id);
            if (!exists) {
                this.sending.DestinationIndications.push(selected);
            }
        },
        removeDestinationIndication() {
            const id = Number(this.selectedDestinationIndicationId);
            if (!Number.isFinite(id)) return;
            this.sending.DestinationIndications = (this.sending.DestinationIndications || []).filter(
                (item) => Number(item?.id) !== id
            );
        },
        async fetchCargoConstraints() {
            try {
                const stationId =
                    this.object?.id_station_departure ||
                    this.sending?.id_station_departure ||
                    this.sending?.id_station_destination ||
                    null;

                if (!stationId) {
                    this.cargoConstraints = {
                        hasCargoRestrictions: false,
                        cargoIds: []
                    };
                    return;
                }

                const c = await getCargoConstraints({ stationId });

                const has = !!c?.hasCargoRestrictions;
                const ids = Array.isArray(c?.cargoIds) ? c.cargoIds : [];

                this.cargoConstraints = {
                    hasCargoRestrictions: has,
                    cargoIds: ids
                };

                if (has && this.sending?.id_cargo != null) {
                    const allowed = new Set(ids.map((x) => Number(x)));
                    if (!allowed.has(Number(this.sending.id_cargo))) {
                        this.sending.id_cargo = null;
                    }
                }
            } catch (e) {
                console.error("Failed to fetch cargo constraints:", e);
                this.cargoConstraints = {
                    hasCargoRestrictions: false,
                    cargoIds: []
                };
            }
        },
        async saveDocument() {
            const saveDoc = await saveSending(this.sending);
            if (!saveDoc || saveDoc.error || saveDoc.id == null) {
                console.error("Не удалось сохранить отправку", saveDoc);
                return;
            }
            this.$emit("saveSending", saveDoc);
        }
    },
    created() {
        this.listsStore = useListsStore();
        this.mainStore = useMainStore();
        this.initSending();
    },
    mounted() {},
    computed: {
        watchedComputed() {
            return Object.assign({}, this.sending);
        },
        filteredCargos() {
            const cargos = this.listsStore?.cargos || {};
            if (!this.cargoConstraints?.hasCargoRestrictions) return cargos;
            const allowed = new Set((this.cargoConstraints.cargoIds || []).map((x) => Number(x)));
            const out = {};
            for (const [id, item] of Object.entries(cargos)) {
                if (allowed.has(Number(id))) out[id] = item;
            }
            return out;
        }
    },
    watch: {
        watchedComputed: {
            deep: true,
            handler(newVal, oldVal) {
                Sending.checkAutoFilledFields(newVal, oldVal, this.object);
                Sending.checkRequiredFields(newVal);

                if (newVal.update) {
                    delete newVal.update;
                    this.sending = Object.assign({}, newVal);
                }
            },
        },
        "object.id_station_departure": {
            immediate: true,
            handler() {
                this.fetchCargoConstraints();
            }
        },
        sendingId: {
            immediate: true,
            handler() {
                this.initSending();
            }
        },
        resetNonce() {
            if (!this.sendingId) {
                this.initSending();
            }
        }
    },
};
</script>

<template>
    <div class="modal fade bd-example-modal-lg" id="DobavitOtpravka" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 90%">
            <div class="modal-content">
                <div class="modal-header" style="background-color: #7da5f0">
                    <span class="modal-title text-center col-auto" id="staticBackdropLabel" style="color: white; font-weight: bold">Отправка</span>
                    <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; background-color: red; margin: 0 35%">{{ mainStore.subtitleModal }}</span>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-auto">
                            <simple-button title="Применить" @click="saveDocument" data-dismiss="modal" aria-label="Закрыть" />
                            <simple-button title="Отменить" data-dismiss="modal" aria-label="Закрыть" />
                        </div>
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Груз" :req="true" :values="filteredCargos" valueKey="id" name="name" v-model="sending.id_cargo" modalName="SendingCargo" :fixWidth="false" :fields="{ 'Код груза ЕТСНГ': 'code_ETSNG', 'Наименование груза': 'name', 'Краткое наименование': 'short_name', 'Номер группы груза': 'number_group' }" />
                        <disable-simple-input title="Код груза" :dis="true" :value="listsStore.cargos[sending.id_cargo]?.code_ETSNG" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Вид транспотртной упаковки" :values="listsStore.transport_package_types" valueKey="id" name="name" v-model="sending.id_transport_package_type" modalName="SendingTransportPackageType" :fixWidth="false" :fields="{ 'ИД транспортной упаковки': 'id', 'Код транспортной упаковки': 'code', 'Наименование транспортной упаковки': 'name', 'Краткое наименование транспортной упаковки': 'short_name' }" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Перевозка поездным формированием, не принадлежащим перевозчику" type="checkbox" v-model="sending.is_train_formation" styleLabel="width: auto;" styleInput="width: 20px; height: 20px;" />
                    </div>

                    <div class="row mb-1">
                        <simple-select title="Вид отправки" :values="listsStore.send_types" valueKey="id" name="name" v-model="sending.id_send_type" :req="true" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Вид подвижного состава" :req="true" :values="listsStore.rolling_stock_types" valueKey="id" name="name" v-model="sending.id_rolling_stock_type" modalName="SendingRollingStockType" :fixWidth="false" :fields="{ 'Код подвижного состава': 'code', Наименование: 'name', Аббревиатура: 'abbreviation', 'Код для РПП': 'RPP', 'Код рода вагонов в накладной': 'code_invoice_wagon', 'Наименование рода вагонов в накладной': 'name_invoice_wagon' }" />
                        <disable-simple-input title="Код" :dis="true" :value="listsStore.rolling_stock_types[sending.id_rolling_stock_type]?.code" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <simple-select title="Скорость перевозки" :values="listsStore.speed_types" valueKey="id" name="name" v-model="sending.id_speed_type" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Владелец/арендатор вагонов" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="sending.id_owner_wagon" modalName="SendingOwnerWagon" :fixWidth="false" :fields="{ 'ИД холдинга': 'id', 'Наименование холдинга': 'name', ОКПО: 'OKPO', 'Наименование грузополучателя': '', 'ИД бизнеса': '', 'Наименование бизнеса': '' }" />
                        <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[sending.id_owner_wagon]?.OKPO" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Вес (тонн)" type="number" :req="true" v-model="sending.weight" styleLabel="width: auto;" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Количество вагонов" type="number" :req="true" v-model="sending.count_wagon" styleLabel="width: auto;" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Страна назначения" :req="true" :values="listsStore.countries" valueKey="id" name="name" v-model="sending.id_country_destination" modalName="SendingCountryDestination" :fixWidth="false" :fields="{ 'Код ОСКМ': 'OSCM_code', 'Наименование страны': 'name', ОКПО: 'OKPO', 'Краткое наименование': 'short_name' }" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Станция назначения/выхода СНГ" :values="listsStore.stations" valueKey="id" name="name" v-model="sending.id_station_destination" :req="true" modalName="SendingStationDestination" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', Параграфы: 'paragraph' }" />
                        <disable-simple-input title="Код дороги" :dis="true" :value="listsStore.stations[sending.id_station_destination]?.railway" :fixWidth="false" styleInput="width: 120px" />
                        <disable-simple-input title="Код станции" :dis="true" :value="listsStore.stations[sending.id_station_destination]?.code" :fixWidth="false" styleInput="width: 120px" />
                        <disable-simple-input title="Параграфы" :dis="true" :value="listsStore.stations[sending.id_station_destination]?.paragraph" :fixWidth="false" styleInput="width: auto" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Станция выхода из России" :values="listsStore.stations" valueKey="id" name="name" v-model="sending.id_station_out" modalName="SendingStationOut" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', Параграфы: 'paragraph' }" />
                        <disable-simple-input title="Код дороги" :dis="true" :value="listsStore.stations[sending.id_station_out]?.railway" :fixWidth="false" styleInput="width: 120px" />
                        <disable-simple-input title="Код станции" :dis="true" :value="listsStore.stations[sending.id_station_out]?.code" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <disable-simple-input title="Область назначения" :dis="true" :value="''" :fixWidth="false" styleInput="width: 120px" />
                        <!-- todo нет такого в БД -->
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Пункт перевалки" :values="listsStore.stations" valueKey="id" name="name" v-model="sending.id_transshipment_point" modalName="SendingTransshipmentPoint" :fields="{ 'Код станции': 'code', 'Наименование станции': 'name', 'Краткое наименование': 'short_name', Параграфы: 'paragraph' }" />
                        <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.stations[sending.id_transshipment_point]?.OKPO" :fixWidth="false" styleInput="width: 120px" />
                        <!-- todo проработать ОКПО, так как у станций их нет, надо брать из стран -->
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Организация в пункте перевалки" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="sending.id_organization_TP" modalName="SendingOrganizationTP" :fields="{ Код: 'TGNL_code', Наименование: 'name', 'Краткое наименование': 'short_name' }" />
                        <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[sending.id_organization_TP]?.OKPO" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <disable-simple-input title="Перевозка по альтернативному маршруту" :dis="true" type="checkbox" :value="false" styleLabel="width: auto;" styleInput="width: 20px; height: 20px;" />
                    </div>

                    <div class="row mb-1">
                        <select-with-search title="Грузополучатель" :req="true" :values="listsStore.legal_entities" valueKey="id" name="name" v-model="sending.id_receiver" modalName="SendingReceiver" :fields="{ 'Код ОКПО': 'OKPO', 'Наименование грузополучатель': 'name', 'ИД бизнеса': '', 'ИД холдинга': '', 'Наименование холдинга': '' }" />
                        <disable-simple-input title="ОКПО" :dis="true" :value="listsStore.legal_entities[sending.id_receiver]?.OKPO" :fixWidth="false" styleInput="width: 120px" />
                        <disable-simple-input title="ИНН" :dis="true" :value="listsStore.legal_entities[sending.id_receiver]?.INN" :fixWidth="false" styleInput="width: 120px" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Среди организаций при станции назначения" type="checkbox" v-model="sending.is_among_as" styleLabel="width: auto;" styleInput="width: 20px; height: 20px;" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="ОКПО" type="text" v-model="sending.OKPO" styleLabel="width: auto;" styleInput="width: 150px;" />
                        <simple-input title="Наименование" type="text" v-model="sending.name" styleLabel="width: auto;" styleInput="min-width: 100%;" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Адрес" type="text" v-model="sending.addr" styleLabel="width: auto;" styleInput="min-width: 100%; width: 60vw;" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Код исключительного тарифа" type="text" v-model="sending.code_exclusive_tariff" styleLabel="width: auto;" styleInput="width: 150px;" />
                    </div>

                    <div class="row mb-1">
                        <simple-input title="Примечание" type="text" v-model="sending.description" styleLabel="width: auto;" styleInput="height: 100px; min-width: 70vw;" />
                    </div>

                    <!-----------------Признак назначения------------------>
                    <div class="row mb-1">
                        <label class="col-auto col-form-label mb-0" style="width: auto; font-weight: bold">Признак назначения</label>
                    </div>

                    <div class="row mb-1">
                        <div class="col-auto">
                            <simple-button data-toggle="modal" data-target="#DobavitPriznak" title="Добавить" />
                            <simple-button title="Удалить" @click="removeDestinationIndication" />
                        </div>
                    </div>

                    <div class="row mb-1">
                        <div class="col-12">
                            <div class="table-responsive" style="border: #c1c1c1 solid 1px; padding-bottom: 50px">
                                <table class="table table-hover table-bordered border-white">
                                    <thead style="background-color: #7da5f0; color: white">
                                        <tr>
                                            <th></th>
                                            <th>№</th>
                                            <th>Признак назначения</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        <tr v-for="(item, key) in sending.DestinationIndications" :key="key">
                                            <td><input type="radio" class="form-check-input" :value="item.id" v-model="selectedDestinationIndicationId" /></td>
                                            <td>{{ item.code }}</td>
                                            <td>{{ item.name }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <!--------------------------------------------------->

                    <div class="row mb-1">
                        <select-with-search title="Договор на особых условиях" :fixWidth=false :values="listsStore.contracts" valueKey="id" name="name" v-model="sending.id_contract_special_terms" modalName="SendingContracts" :fields="{ Код: 'code', Наименование: 'name', 'Краткое': 'short_name' }" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!--Добавить Признак назначения модальное окно -->
    <div class="modal fade" id="DobavitPriznak" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header" style="background-color: #7da5f0">
                    <span class="modal-title text-center" id="staticBackdropLabel" style="color: white; font-weight: bold">Признак назначения</span>
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
                                    <th></th>
                                    <th>Код</th>
                                    <th>Наименование</th>
                                    <th>Примечание</th>
                                </tr>
                            </thead>
                            <tbody class="table-group-divider">
                                <tr v-for="(item, key) in listsStore.destination_indications" :key="key">
                                    <td><input type="radio" class="form-check-input" :value="item.id" v-model="selectedDestinationIndicationId" /></td>
                                    <td>{{ item.code }}</td>
                                    <td>{{ item.name }}</td>
                                    <td>{{ item.note }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="row justify-content-md-end">
                        <button type="button" class="btn btn-custom" style="width: 70px; margin: 10px" data-dismiss="modal" @click="addDestinationIndication">Да</button>
                        <button type="button" class="btn btn-custom" data-dismiss="modal" style="width: 70px; margin: 10px">Нет</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="css" scoped></style>
