<script setup></script>

<template>
    <div class="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header" style="background-color: #7da5f0">
                    <h1 class="modal-title fs-5" id="staticBackdropLabel" style="color: white">Поиск документа</h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" style="color: white"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <label class="col-auto form-check-label">Идентификатор документа</label>
                        <div class="col-6 justify-content-md-end"><input type="text" class="form-control" style="min-width: 100%" id="formGroupExampleInput" placeholder="Поиск" /></div>
                    </div>
                    <div class="row justify-content-md-center">
                        <button type="button" class="btn btn-custom" style="width: 150px; margin: 1em">Найти</button>
                        <button type="button" class="btn btn-custom" data-bs-dismiss="modal" style="width: 150px; margin: 1em">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
