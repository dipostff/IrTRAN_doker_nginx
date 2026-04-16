<script>
export default {
    name: "simple-select",
    props: {
        modelValue: {
            type: [String, Number],
        },
        title: {
            type: String,
        },
        values: {
            type: [Array, Object],
            default: () => [],
        },
        valueKey: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        dis: {
            type: Boolean,
        },
        req: {
            type: Boolean,
        },
        fixWidth: {
            type: Boolean,
            default: true,
        },
        styleLabel: {
            type: String,
            default: "",
        },
        styleSelect: {
            type: String,
            default: "",
        },
    },
    computed: {
        optionsList() {
            const v = this.values;
            if (Array.isArray(v)) return v;
            if (v && typeof v === "object") return Object.values(v);
            return [];
        },
    },
    methods: {
        changeOption(event) {
            this.$emit("update:modelValue", event.target.value === "" ? null : (Number(event.target.value) || event.target.value));
        },
    },
};
</script>

<template>
    <label class="col-auto col-form-label mb-0" :class="{ label_custom: fixWidth, required: req }" :required="req" :style="styleLabel">{{ title }}</label>
    <div class="col-3">
        <select class="form-select mt-0 custom-input" :value="modelValue" :disabled="dis" :required="req" @change="changeOption" :style="styleSelect">
            <option disabled value="">Выберите элемент списка</option>
            <option v-if="optionsList.length === 0" value="">— Нет данных</option>
            <option v-for="(item, index) in optionsList" :key="item[valueKey] != null ? item[valueKey] : index" :value="item[valueKey]">{{ item[name] != null ? item[name] : "—" }}</option>
        </select>
    </div>
</template>

<style scoped>
.label_custom {
    width: 180px;
}

input[disabled] {
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
</style>
