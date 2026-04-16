<script>
export default {
    name: "table-with-search",
    props: {
        modelValue: {
            type: [String, Number],
        },
        title: {
            type: String,
        },
        values: {
            type: [Array, Object],
            default: [],
        },
        valueKey: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        modalName: {
            type: String,
            required: true,
        },
        fields: {
            type: [Array, Object],
            default: [],
        },
    },
    data() {
        return {
            searchQueries: "",
            filteredItems: [],
        };
    },
    methods: {
        setValue() {
            if (this.modelValue) {
                const filterVal = Object.values(this.values).filter((item) => item[this.valueKey] == this.modelValue);
                this.searchQueries = filterVal.length ? filterVal[0][this.name] : "";
            }
        },
        getFilteredItems() {
            if (!this.searchQueries) {
                this.filteredItems = Object.values(this.values);
            } else {
                this.filteredItems = Object.values(this.values).filter((item) => item[this.name].toLowerCase().includes(this.searchQueries.toLowerCase()));
            }
        },
        changeOption(key, value) {
            this.$emit("update:modelValue", key);
            this.searchQueries = value;
            this.closeModal();
        },
        clearSearch() {
            this.searchQueries = "";
            this.getFilteredItems();
        },
        openModal() {
            $("#modalSearch" + this.modalName).show();
            $("#modalSearch" + this.modalName).css("opacity", "1");
            $("#modalSearch" + this.modalName + "Backdrop").show();
            $("body").css("overflow", "hidden");
        },
        closeModal() {
            $("#modalSearch" + this.modalName).hide();
            $("#modalSearch" + this.modalName + "Backdrop").hide();
            $("body").css("overflow", "");
        },
    },
    mounted() {
        this.setValue();
    },
    watch: {
        values() {
            this.setValue();
        },
        modelValue() {
            this.setValue();
        },
    },
};
</script>

<template>
    <div class="modal fade" :id="'modalSearch' + modalName" data-backdrop="static" data-keyboard="false" tabindex="-1" :aria-labelledby="'#modalSearch' + modalName + 'Label'" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header" style="background-color: #7da5f0">
                    <span class="modal-title text-center" :id="'modalSearch' + modalName + 'Label'" style="color: white; font-weight: bold">{{ title }}</span>
                    <button type="button" class="btn-close" aria-label="Закрыть" style="color: white" @click="closeModal"></button>
                </div>
                <div class="modal-body">
                    <div class="row justify-content-md-center mb-2">
                        <div class="col-12">
                            <div class="input-group">
                                <input type="text" class="form-control" id="clearimput" placeholder="Поиск" aria-label="Поиск" v-model="searchQueries" @input="getFilteredItems" @focus="getFilteredItems" />
                                <div class="input-group-append">
                                    <button class="btn btn-outline-secondary" type="reset" id="clearButton" @click="clearSearch">
                                        <font-awesome-icon icon="fa-solid fa-xmark" />
                                    </button>
                                    <button class="btn btn-outline-secondary" type="button">
                                        <font-awesome-icon icon="fa-solid fa-magnifying-glass" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive" style="border: #c1c1c1 solid 1px; height: 70vh">
                        <table class="table table-hover table-bordered border-white">
                            <thead style="background-color: #7da5f0; color: white">
                                <tr>
                                    <th v-for="(field, key) in fields" :key="'th-' + field">{{ key }}</th>
                                </tr>
                            </thead>
                            <tbody class="table-group-divider">
                                <tr v-for="(item, index) in filteredItems" :key="item[valueKey]" @dblclick="changeOption(item[valueKey], item[name])">
                                    <td v-for="(field, key) in fields" :key="'td-' + item[valueKey] + '-' + field">{{ item[field] }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="row justify-content-md-end">
                        <simple-button title="Нет" @click="closeModal" styleButton="width: 70px; margin: 1rem 1rem 0 0;" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal-backdrop fade show" :id="'modalSearch' + modalName + 'Backdrop'" style="display: none"></div>
</template>

<style scoped>
.input-group .btn {
    background-color: #e3e2ff; /* Цвет кнопки */
    border: 1px solid #c1c1c1; /* Цвет границы кнопки */
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}

.input-group .btn:hover {
    background-color: #d1d0ff; /* Цвет кнопки при наведении */
}

.form-control {
    background-color: #e3e2ff;
    border: 1px solid #c1c1c1;
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
}

.modal-title {
    text-align: center !important;
}

.modal {
    top: 20px;
    overflow: inherit;
}
</style>
