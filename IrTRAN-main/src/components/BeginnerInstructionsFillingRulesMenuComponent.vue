<script setup>
import { computed } from "vue";
import { FILLING_RULES_INDEX } from "@/config/beginnerFillingRules";
import imgTransport from "@/assets/IMAGES/AppID_2.png";
import imgInvoice from "@/assets/IMAGES/AppID_1.png";
import imgAct from "@/assets/IMAGES/AppID_19.png";
import imgCumulative from "@/assets/IMAGES/AppID_11809.png";

const slugToImage = {
  transportation: imgTransport,
  invoice: imgInvoice,
  common_act: imgAct,
  commercial_act: imgAct,
  reminder: imgAct,
  filling_statement: imgAct,
  cumulative_statement: imgCumulative,
};

const tiles = computed(() =>
  FILLING_RULES_INDEX.map((item) => ({
    ...item,
    image: slugToImage[item.slug] || imgAct,
  }))
);
</script>

<template>
  <div class="search-box">
    <div class="search-container">
      <p>
        Ниже приведены правила заполнения по каждому модулю с документом. Выберите плитку, чтобы открыть
        подробное описание полей, порядка работы и сохранения.
      </p>
    </div>
  </div>

  <div class="content-container">
    <div class="row mt-4 justify-content-center">
      <div v-for="t in tiles" :key="t.slug" class="col-md-3">
        <router-link
          :to="`/beginner-instructions/filling-rules/${t.slug}`"
          class="card-square"
          style="border-radius: 10px"
        >
          <img :src="t.image" :alt="t.tileTitle" />
          <span class="card-text" style="text-decoration: none">{{ t.tileTitle }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  background-color: white;
  min-height: 100px;
  width: 100%;
  position: fixed;
  top: 50px;
  left: 0;
  z-index: 1000;
  border-bottom: solid gray 1px;
}

.content-container {
  padding: 150px 300px;
}

.search-container {
  margin: 20px 0;
  padding: 0 300px;
}

.card-square {
  width: 200px;
  height: 220px;
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
  margin-bottom: 20px;
  text-decoration: none;
  color: inherit;
}

.card-square:hover {
  background-color: #4f85eb;
}

.card-square img {
  max-width: 50%;
  max-height: 45%;
  margin-bottom: 8px;
  object-fit: contain;
}

.card-text {
  font-weight: bold;
  margin: 0;
  font-size: 14px;
  line-height: 1.25;
  color: #545556;
}

.card-square:hover .card-text {
  color: white;
}
</style>
