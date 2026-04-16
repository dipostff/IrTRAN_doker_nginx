<script setup>
import { reactive, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useBeginnerSimulatorStore } from "@/stores/beginnerSimulatorSettings";

const TRAINING_KEY = "irtran-training-profile";

const store = useBeginnerSimulatorStore();
const draft = reactive(store.draftFromStore());
const savedOk = ref(false);
let savedTimer;

onMounted(() => {
  Object.assign(draft, store.draftFromStore());
});

function markBeginnerTraining() {
  sessionStorage.setItem(TRAINING_KEY, "beginner");
}

function onConfirm() {
  store.applyDraft(draft);
  savedOk.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    savedOk.value = false;
  }, 2500);
}

function onCancel() {
  Object.assign(draft, store.draftFromStore());
}
</script>

<template>
  <div class="beginner-simulator-root">
    <div class="sim-settings-wrap">
      <form class="setting" @submit.prevent="onConfirm">
        <header class="settings-header">
          <div class="row mb-1">
            <div class="col-auto col-form-label label-custom mb-0 settings-title">Настройки режима</div>
          </div>
          <p v-if="savedOk" class="text-success small mb-0 ms-3">Настройки применены и сохранены в браузере.</p>
        </header>

        <fieldset class="field">
          <div class="row mb-1 align-items-center">
            <label class="col-auto col-form-label label-custom mb-0" for="bs-theory">Обращение к теории</label>
            <div class="col-auto form-check-inline form-switch">
              <input id="bs-theory" v-model="draft.theoryAccess" class="form-check-input" type="checkbox" />
            </div>
          </div>

          <div class="row mb-1 align-items-center">
            <label class="col-auto col-form-label label-custom mb-0" for="bs-check-errors">Проверка ошибок</label>
            <div class="col-auto form-check-inline form-switch">
              <input id="bs-check-errors" v-model="draft.errorChecking" class="form-check-input" type="checkbox" />
            </div>
          </div>

          <div class="row mb-1 align-items-center">
            <label class="col-auto col-form-label label-custom mb-0" for="bs-view-errors">Видимость ошибок</label>
            <div class="col-auto form-check-inline form-switch">
              <input id="bs-view-errors" v-model="draft.errorVisibility" class="form-check-input" type="checkbox" />
            </div>
          </div>

          <div class="row mb-1 align-items-center">
            <label class="col-auto col-form-label label-custom mb-0" for="bs-hints">Подсказки</label>
            <div class="col-auto form-check-inline form-switch">
              <input id="bs-hints" v-model="draft.hints" class="form-check-input" type="checkbox" />
            </div>
          </div>

          <div class="row mb-1 align-items-center">
            <label class="col-auto col-form-label label-custom mb-0" for="bs-extra"
              >Доп. пояснения к полям</label
            >
            <div class="col-auto form-check-inline form-switch">
              <input id="bs-extra" v-model="draft.extraFieldTips" class="form-check-input" type="checkbox" />
            </div>
          </div>
        </fieldset>

        <footer class="settings-footer">
          <div class="row mb-1 align-items-center">
            <button type="submit" class="btn btn-custom">Подтвердить</button>
            <button type="button" class="btn btn-light border ms-2" @click="onCancel">Отменить</button>
          </div>
        </footer>
      </form>
    </div>

    <div class="sim-tiles-wrap">
      <div class="card-container">
        <RouterLink
          class="card-square"
          style="border-radius: 10px"
          to="/transporation/menu"
          @click="markBeginnerTraining"
        >
          <img src="@/assets/IMAGES/AppID_2.png" alt="Заявка на грузоперевозку" />
          <span class="card-text">Заявка на грузоперевозку</span>
        </RouterLink>

        <RouterLink class="card-square" style="border-radius: 10px" to="/invoice/menu" @click="markBeginnerTraining">
          <img src="@/assets/IMAGES/AppID_1.png" alt="Накладная" />
          <span class="card-text">Накладная</span>
        </RouterLink>

        <RouterLink class="card-square" style="border-radius: 10px" to="/act/menu" @click="markBeginnerTraining">
          <img src="https://cdn-icons-png.freepik.com/512/3566/3566009.png" alt="Акты" />
          <span class="card-text">Акты</span>
        </RouterLink>

        <RouterLink class="card-square" style="border-radius: 10px" to="/reminder/menu" @click="markBeginnerTraining">
          <img
            src="https://d1xez26aurxsp6.cloudfront.net/models/mkjAgYDBaZG/thumbnails/6361d9e53a2ff.png"
            alt="Памятка приемосдатчика"
          />
          <span class="card-text">Памятка приемосдатчика</span>
        </RouterLink>

        <RouterLink
          class="card-square"
          style="border-radius: 10px"
          to="/filling-statement/menu"
          @click="markBeginnerTraining"
        >
          <img src="@/assets/IMAGES/AppID_19.png" alt="Ведомости подачи и уборки" />
          <span class="card-text">Ведомости подачи и уборки</span>
        </RouterLink>

        <RouterLink
          class="card-square"
          style="border-radius: 10px"
          to="/cumulative-statement/menu"
          @click="markBeginnerTraining"
        >
          <img src="@/assets/IMAGES/AppID_11809.png" alt="Накопительная ведомость" />
          <span class="card-text">Накопительная ведомость</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beginner-simulator-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80px;
  padding-bottom: 48px;
}

.sim-settings-wrap {
  width: 100%;
  max-width: 900px;
  padding: 0 16px;
}

.sim-tiles-wrap {
  width: 100%;
  max-width: 960px;
  padding: 28px 16px 0;
}

.settings-title {
  font-size: large;
  font-weight: bold;
  width: auto;
}

.settings-header {
  margin-left: 15px;
}

.settings-footer {
  margin-left: 0;
}

.card-square {
  width: 200px;
  height: 200px;
  background-color: #efefef;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color 0.3s;
  cursor: pointer;
  text-align: center;
  margin: 5px;
  padding: 8px;
  text-decoration: none;
  color: inherit;
  border: none;
  box-sizing: border-box;
}

.card-square:hover {
  background-color: #4f85eb;
}

.card-square img {
  max-width: 50%;
  max-height: 50%;
  margin-bottom: 5px;
}

.card-text {
  font-weight: bold;
  margin: 0;
  font-size: 16px;
  color: #545556;
}

.card-square:hover .card-text {
  color: white;
}

.setting {
  background-color: #efefef;
  width: 100%;
  max-width: 850px;
  height: auto;
  border-radius: 10px;
  padding: 15px;
  display: block;
}

.card-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5px;
  width: 100%;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-custom {
  width: auto;
  background-color: #7da5f0;
  color: white;
  margin-left: 15px;
  border: none;
}

.btn-custom:hover {
  background-color: #3e6cb4;
  color: white;
}

.label-custom {
  width: 200px;
}

.field {
  border: #9d9fa0 solid 2px;
  border-radius: 10px;
  padding: 15px;
  margin: 0 0 10px 0;
}
</style>
