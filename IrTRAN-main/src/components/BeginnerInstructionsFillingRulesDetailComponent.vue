<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getFillingRulesContent, FILLING_RULES_INDEX } from "@/config/beginnerFillingRules";

const route = useRoute();
const router = useRouter();

const slug = computed(() => String(route.params.docType || ""));

const content = computed(() => getFillingRulesContent(slug.value));

const knownSlugs = new Set(FILLING_RULES_INDEX.map((x) => x.slug));

const isValid = computed(() => knownSlugs.has(slug.value));

function goBack() {
  router.push({ name: "beginner-instructions-filling-rules-menu" });
}
</script>

<template>
  <div class="page-wrap">
    <div v-if="!isValid" class="invalid">
      <p>Раздел не найден.</p>
      <button type="button" class="btn btn-primary" @click="goBack">К списку правил</button>
    </div>

    <template v-else-if="content">
      <div class="toolbar">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="goBack">← К плиткам</button>
      </div>

      <article class="rules-article">
        <h1 class="rules-title">{{ content.pageTitle }}</h1>

        <section v-for="(block, idx) in content.blocks" :key="idx" class="rules-block">
          <h2 class="rules-block-title">{{ block.title }}</h2>
          <p v-for="(p, pi) in block.paragraphs" :key="pi" class="rules-p">{{ p }}</p>
        </section>
      </article>
    </template>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 72px 24px 48px;
  max-width: 900px;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 1rem;
}

.rules-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  color: #2c3e50;
}

.rules-block {
  margin-bottom: 1.75rem;
}

.rules-block-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.65rem;
  color: #34495e;
}

.rules-p {
  margin-bottom: 0.5rem;
  line-height: 1.55;
  color: #333;
  text-align: justify;
}

.invalid {
  text-align: center;
  padding: 3rem 1rem;
}
</style>
