<script>
export default {
    name: "simple-input",
    props: {
        modelValue: {
            type: [String, Number, Boolean],
        },
        title: {
            type: String,
        },
        type: {
            type: String,
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
        styleInput: {
            type: String,
            default: "",
        },
    },
    methods: {
        updateInput(event) {
            if (this.type === "checkbox") {
                this.$emit("update:modelValue", event.target.checked);
            } else {
                this.$emit("update:modelValue", event.target.value);
            }
        },
    },
};
</script>

<template>
    <label class="col-auto col-form-label mb-0" :class="{ label_custom: fixWidth, required: req }" :required="req" :style="styleLabel">{{ title }}</label>
    <div class="col-auto" v-if="type === 'checkbox'">
        <input :type="type" class="form-control form-check-input custom-input" :value="modelValue" :disabled="dis" :required="req" @change="updateInput" :style="styleInput" />
    </div>
    <div class="col-auto" v-else>
        <input :type="type" class="form-control mt-0" :value="modelValue" :disabled="dis" :required="req" @input="updateInput" :style="styleInput" />
    </div>
</template>

<style scoped>
.label_custom {
    width: 180px;
}

.form-control {
    background-color: #e3e2ff;
    border: 1px solid #c1c1c1;
    height: 30px;
    font-family: "Open Sans", sans-serif;
    font-size: 14px;
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
</style>
