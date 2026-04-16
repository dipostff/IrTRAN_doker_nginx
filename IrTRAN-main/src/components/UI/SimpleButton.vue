<script>
export default {
    name: "simple-button",
    props: {
        title: {
            type: String,
        },
        styleButton: {
            type: String,
            default: "",
        },
    },
};
</script>

<template>
    <button type="button" class="btn btn-custom" :style="styleButton">{{ title }}</button>
</template>

<style scoped>
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
</style>
