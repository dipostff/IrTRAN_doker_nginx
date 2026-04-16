<script>
export default {
    name: "disable-simple-input",
    props: {
        type: {
            type: String,
        },
        title: {
            type: String,
        },
        value: {
            type: [String, Number, Boolean],
        },
        dis: {
            type: Boolean,
            default: true,
        },
        req: {
            type: Boolean,
            default: false,
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
};
</script>

<template>
    <label class="col-auto col-form-label mb-0" :class="{ label_custom: fixWidth, required: req }" :style="styleLabel">{{ title }}</label>
    <div class="col-auto" v-if="type === 'checkbox'">
        <input :type="type" class="form-control form-check-input custom-input" :value="value" :disabled="dis" :required="req" :style="styleInput" />
    </div>
    <div class="col-auto" v-else>
        <input type="text" class="form-control mt-0" :value="value" :disabled="dis" :required="req" :style="styleInput" />
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
