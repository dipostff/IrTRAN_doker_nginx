<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { hasAnyRealmRole, isAppAdmin, isDictionaryAdmin, isStudent } from '@/helpers/keycloak';
import AppID2 from '@/assets/IMAGES/AppID_2.png';
import AppID1 from '@/assets/IMAGES/AppID_1.png';
import AppID19 from '@/assets/IMAGES/AppID_19.png';
import AppID11809 from '@/assets/IMAGES/AppID_11809.png';

const isTeacherOrAdmin = computed(() => hasAnyRealmRole(['teacher', 'app-admin']));
const canSeeAdmin = computed(() => isAppAdmin());
const canSeeDictionary = computed(() => isDictionaryAdmin() || isAppAdmin());

const CATEGORIES = [
  {
    id: 'docs',
    label: 'Документы',
    visible: () => true,
    items: [
      { to: '/transporation/menu', title: 'Заявка на грузоперевозку', icon: AppID2 },
      { to: '/invoice/menu', title: 'Накладная', icon: AppID1 },
      { to: '/act/menu', title: 'Акты', icon: 'https://cdn-icons-png.freepik.com/512/3566/3566009.png' },
      { to: '/reminder/menu', title: 'Памятка приёмосдатчика', icon: 'https://d1xez26aurxsp6.cloudfront.net/models/mkjAgYDBaZG/thumbnails/6361d9e53a2ff.png' },
      { to: '/filling-statement/menu', title: 'Ведомости подачи и уборки', icon: AppID19 },
      { to: '/cumulative-statement/menu', title: 'Накопительная ведомость', icon: AppID11809 },
      { to: '/documents', title: 'Документы пользователя', subtitle: 'загрузка / выгрузка', icon: 'https://cdn-icons-png.flaticon.com/512/3767/3767084.png' }
    ]
  },
  {
    id: 'study',
    label: 'Обучение',
    visible: () => true,
    items: [
      { to: '/beginner-scenario/menu', title: 'Сценарий «Новичок»', icon: 'https://cdn-icons-png.freepik.com/512/2234/2234794.png' },
      { to: '/advanced-scenario/menu', title: 'Сценарий «Продвинутый»', icon: 'https://static.tildacdn.com/tild3632-3336-4232-b165-386337626361/main.png' },
      { to: '/scenarios', title: 'Сценарии', subtitle: 'банк сценариев', icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995515.png' },
      { to: '/reference', title: 'Справочник', subtitle: 'поиск по материалам', icon: 'https://cdn-icons-png.flaticon.com/512/599/599055.png' }
    ]
  },
  {
    id: 'tests',
    label: 'Тестирование',
    visible: () => true,
    items: [
      { to: '/test-mode', title: 'Режим теста', subtitle: 'проходить / создавать', icon: 'https://cdn-icons-png.flaticon.com/512/1508/1508866.png' },
      {
        to: '/student-performance',
        title: 'Успеваемость',
        subtitle: 'профиль, тесты, прогресс',
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        visible: () => isStudent()
      }
    ]
  },
  {
    id: 'service',
    label: 'Сервис',
    visible: () => true,
    items: [
      { to: '/notifications', title: 'Уведомления и дедлайны', subtitle: 'события / сроки', icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827370.png' },
      { to: '/report-error', title: 'Сообщить об ошибке', subtitle: 'тикеты / статус', icon: 'https://cdn-icons-png.flaticon.com/512/3300/3300742.png' }
    ]
  },
  {
    id: 'admin',
    label: 'Преподавателю / Админу',
    visible: () => isTeacherOrAdmin.value || canSeeDictionary.value || canSeeAdmin.value,
    items: [
      {
        to: '/teacher-dashboard',
        title: 'Панель преподавателя',
        subtitle: 'группы / успеваемость',
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135755.png',
        visible: () => isTeacherOrAdmin.value
      },
      {
        to: '/dictionary-module',
        title: 'Заполнение справочников',
        subtitle: 'импорт / шаблоны',
        icon: 'https://cdn-icons-png.flaticon.com/512/942/942799.png',
        visible: () => canSeeDictionary.value
      },
      {
        to: '/admin',
        title: 'Панель управления',
        subtitle: 'пользователи / роли',
        icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828778.png',
        visible: () => canSeeAdmin.value
      }
    ]
  }
];

const categories = computed(() => CATEGORIES.filter((c) => (typeof c.visible === 'function' ? c.visible() : true)));
const totalModules = computed(() =>
  categories.value.reduce((sum, c) => sum + countForCategory(c), 0)
);
const FAVORITE_ROUTES = [
  '/transporation/menu',
  '/invoice/menu',
  '/act/menu',
  '/reminder/menu',
  '/filling-statement/menu',
  '/cumulative-statement/menu',
  '/test-mode',
  '/reference'
];
const FAVORITES_STORAGE_KEY = 'irtran_menu_favorites_v1';
const favoriteRoutes = ref([]);
const favoritesReady = ref(false);
const favoritesNotice = ref('');
let favoritesNoticeTimer = null;

const activeCategoryId = ref(categories.value[0]?.id || 'docs');
const transitionName = ref('tiles-down');
watch(
  () => categories.value.map((c) => c.id).join(','),
  () => {
    if (!categories.value.some((c) => c.id === activeCategoryId.value)) {
      activeCategoryId.value = categories.value[0]?.id || 'docs';
    }
  }
);

const activeCategory = computed(() => categories.value.find((c) => c.id === activeCategoryId.value) || categories.value[0]);

const tiles = computed(() => {
  const cat = activeCategory.value;
  if (!cat) return [];
  return (cat.items || []).filter((it) => (typeof it.visible === 'function' ? it.visible() : true));
});

const favoriteTiles = computed(() => {
  const all = categories.value.flatMap((c) =>
    (c.items || []).filter((it) => (typeof it.visible === 'function' ? it.visible() : true))
  );
  const byTo = new Map(all.map((i) => [i.to, i]));
  return favoriteRoutes.value.map((to) => byTo.get(to)).filter(Boolean).slice(0, 6);
});

function setActive(id) {
  const ids = categories.value.map((c) => c.id);
  const prevIdx = ids.indexOf(activeCategoryId.value);
  const nextIdx = ids.indexOf(id);
  if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
    transitionName.value = nextIdx > prevIdx ? 'tiles-right' : 'tiles-left';
  } else {
    transitionName.value = 'tiles-down';
  }
  activeCategoryId.value = id;
}

function iconSrc(icon) {
  // Support static URLs. Local assets already resolved by bundler when used directly in template.
  return icon;
}

function countForCategory(cat) {
  const arr = (cat.items || []).filter((it) => (typeof it.visible === 'function' ? it.visible() : true));
  return arr.length;
}

const CATEGORY_ICON = {
  docs: ['fas', 'file-lines'],
  study: ['fas', 'graduation-cap'],
  tests: ['fas', 'clipboard-check'],
  service: ['fas', 'wrench'],
  admin: ['fas', 'user-shield']
};

const CATEGORY_ACCENT = {
  docs: 'accent-docs',
  study: 'accent-study',
  tests: 'accent-tests',
  service: 'accent-service',
  admin: 'accent-admin'
};

const allVisibleTiles = computed(() =>
  categories.value.flatMap((c) =>
    (c.items || []).filter((it) => (typeof it.visible === 'function' ? it.visible() : true))
  )
);

function readFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch (e) {
    return [];
  }
}

function persistFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRoutes.value));
  } catch (e) {
    // ignore storage errors
  }
}

function isFavorite(route) {
  return favoriteRoutes.value.includes(route);
}

function toggleFavorite(route) {
  if (!route) return;
  const idx = favoriteRoutes.value.indexOf(route);
  if (idx >= 0) {
    favoriteRoutes.value.splice(idx, 1);
  } else {
    favoriteRoutes.value.unshift(route);
    if (favoriteRoutes.value.length > 12) {
      favoriteRoutes.value = favoriteRoutes.value.slice(0, 12);
    }
  }
  persistFavorites();
}

function resetFavorites() {
  favoriteRoutes.value = FAVORITE_ROUTES.slice(0, 6);
  persistFavorites();
  showFavoritesNotice('Избранные модули очищены и восстановлены по умолчанию.');
}

function clearFavorites() {
  favoriteRoutes.value = [];
  persistFavorites();
}

function showFavoritesNotice(message) {
  favoritesNotice.value = message;
  if (favoritesNoticeTimer) {
    clearTimeout(favoritesNoticeTimer);
  }
  favoritesNoticeTimer = setTimeout(() => {
    favoritesNotice.value = '';
    favoritesNoticeTimer = null;
  }, 2500);
}

onMounted(() => {
  try {
    const hasStored = localStorage.getItem(FAVORITES_STORAGE_KEY) !== null;
    if (hasStored) {
      const stored = readFavoritesFromStorage();
      favoriteRoutes.value = Array.isArray(stored) ? stored : [];
    } else {
      favoriteRoutes.value = FAVORITE_ROUTES.slice(0, 6);
      persistFavorites();
    }
  } catch (e) {
    favoriteRoutes.value = FAVORITE_ROUTES.slice(0, 6);
    persistFavorites();
  }
  favoritesReady.value = true;
});

onBeforeUnmount(() => {
  if (favoritesNoticeTimer) {
    clearTimeout(favoritesNoticeTimer);
    favoritesNoticeTimer = null;
  }
});

watch(
  () => allVisibleTiles.value.map((t) => t.to),
  (visibleRoutes) => {
    const visibleSet = new Set(visibleRoutes);
    const filtered = favoriteRoutes.value.filter((r) => visibleSet.has(r));
    if (filtered.length !== favoriteRoutes.value.length) {
      favoriteRoutes.value = filtered;
      persistFavorites();
    }
  }
);
</script>

<template>
  <div class="menu-shell">
    <div class="menu-topbar">
      <div class="topbar-card">
        <div class="topbar-item">
          <div class="topbar-value">{{ totalModules }}</div>
          <div class="topbar-label">доступных модулей</div>
        </div>
        <div class="topbar-sep" />
        <div class="topbar-item">
          <div class="topbar-value">{{ categories.length }}</div>
          <div class="topbar-label">категорий</div>
        </div>
        <div class="topbar-sep" />
        <div class="topbar-hint">Выберите категорию и откройте нужный модуль</div>
      </div>
    </div>

    <div class="menu-favorites">
      <div class="favorites-head">
        <div class="favorites-title">Избранные модули</div>
        <div class="favorites-actions">
          <div class="favorites-subtitle">Нажмите звезду на плитке, чтобы добавить или убрать модуль</div>
          <div class="favorites-buttons">
            <button type="button" class="favorites-reset" @click="clearFavorites">Очистить</button>
            <button type="button" class="favorites-reset" @click="resetFavorites">Сбросить избранное</button>
          </div>
        </div>
      </div>
      <div v-if="favoriteTiles.length" class="favorites-grid">
        <router-link
          v-for="t in favoriteTiles"
          :key="`fav-${t.to}`"
          :to="t.to"
          class="fav-tile"
        >
          <div class="tile-icon-wrap fav-icon-wrap">
            <img
              v-if="typeof t.icon === 'string'"
              class="tile-icon"
              :src="iconSrc(t.icon)"
              :alt="t.title"
              loading="lazy"
            />
          </div>
          <div class="fav-title">{{ t.title }}</div>
        </router-link>
      </div>
      <div v-else-if="favoritesReady" class="favorites-empty">
        Список избранных модулей пуст. Отметьте звёздочкой нужные плитки ниже.
      </div>
      <div v-if="favoritesNotice" class="favorites-notice">{{ favoritesNotice }}</div>
    </div>

    <div class="menu-categories">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="cat-pill"
        :class="[CATEGORY_ACCENT[c.id], { active: c.id === activeCategoryId }]"
        @click="setActive(c.id)"
      >
        <font-awesome-icon class="cat-icon" :icon="CATEGORY_ICON[c.id] || ['fas','layer-group']" />
        <span class="cat-label">{{ c.label }}</span>
        <span class="cat-count">{{ countForCategory(c) }}</span>
        <span class="cat-underline" />
      </button>
    </div>

    <div class="menu-tiles">
      <transition-group :name="transitionName" tag="div" class="tiles-grid">
        <router-link
          v-for="t in tiles"
          :key="t.to"
          :to="t.to"
          class="tile tile-strong"
        >
          <button
            type="button"
            class="fav-toggle"
            :class="{ active: isFavorite(t.to) }"
            :title="isFavorite(t.to) ? 'Убрать из избранного' : 'Добавить в избранное'"
            @click.prevent.stop="toggleFavorite(t.to)"
          >
            <font-awesome-icon :icon="['fas', 'star']" />
          </button>
          <div class="tile-icon-wrap">
            <img
              v-if="typeof t.icon === 'string'"
              class="tile-icon"
              :src="iconSrc(t.icon)"
              :alt="t.title"
              loading="lazy"
            />
          </div>
          <div class="tile-body">
            <div class="tile-title">{{ t.title }}</div>
            <div v-if="t.subtitle" class="tile-subtitle">{{ t.subtitle }}</div>
          </div>
          <div class="tile-chevron" aria-hidden="true">→</div>
        </router-link>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
/* Single palette aligned with header (#7da5f0) */
.menu-shell {
  --bg: #f6f8ff;
  --surface: #ffffff;
  --ink: #1f2937;
  --muted: #5b667a;
  --brand: #7da5f0;
  --brand-2: #4f85eb;
  --ring: rgba(125, 165, 240, 0.28);
  --shadow: 0 18px 50px rgba(16, 24, 40, 0.10);

  padding: 78px 20px 40px;
  min-height: calc(100vh - 50px);
  background:
    radial-gradient(900px 280px at 50% 0%, rgba(125, 165, 240, 0.22), transparent 70%),
    linear-gradient(180deg, var(--bg), #ffffff);
}

.menu-topbar {
  display: flex;
  justify-content: center;
  margin: 6px 0 14px;
}

.topbar-card {
  width: min(980px, 100%);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(16, 24, 40, 0.08);
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.08);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.topbar-item {
  min-width: 120px;
}
.topbar-value {
  font-size: 22px;
  font-weight: 800;
  color: #2e5db8;
  line-height: 1;
}
.topbar-label {
  margin-top: 2px;
  color: var(--muted);
  font-size: 13px;
}
.topbar-sep {
  width: 1px;
  align-self: stretch;
  background: rgba(16, 24, 40, 0.1);
}
.topbar-hint {
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
}

.menu-categories {
  width: min(980px, 100%);
  margin: 0 auto 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.menu-favorites {
  width: min(980px, 100%);
  margin: 0 auto 14px;
}
.favorites-title {
  color: #2b3b55;
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}
.favorites-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin: 0 0 8px;
}
.favorites-subtitle {
  color: #64748b;
  font-size: 12px;
}
.favorites-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.favorites-buttons {
  display: inline-flex;
  gap: 8px;
}
.favorites-reset {
  border: 1px solid rgba(16, 24, 40, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
}
.favorites-reset:hover {
  border-color: rgba(79, 133, 235, 0.45);
  color: #1d4ed8;
}
.favorites-empty {
  border: 1px dashed rgba(16, 24, 40, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  color: #5b667a;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.8);
}
.favorites-notice {
  margin-top: 8px;
  color: #166534;
  font-size: 13px;
  font-weight: 600;
}
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.fav-tile {
  text-decoration: none;
  border: 1px solid rgba(16, 24, 40, 0.1);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,246,255,0.9));
  padding: 10px;
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  min-height: 74px;
  overflow: hidden;
}
.fav-tile:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 165, 240, 0.4);
  box-shadow: 0 12px 30px rgba(79, 133, 235, 0.16);
}
.fav-icon-wrap {
  width: 54px;
  height: 54px;
}
.fav-title {
  color: #243246;
  font-weight: 700;
  font-size: 13px;
  line-height: 1.25;
}

.cat-pill {
  appearance: none;
  border: 1px solid rgba(16, 24, 40, 0.10);
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink);
  border-radius: 999px;
  padding: 12px 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.cat-icon {
  width: 16px;
  height: 16px;
  color: rgba(31, 41, 55, 0.72);
}

.cat-pill:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 165, 240, 0.35);
  box-shadow: 0 10px 24px rgba(125, 165, 240, 0.14);
}

.cat-pill.active {
  background: rgba(125, 165, 240, 0.16);
  border-color: rgba(125, 165, 240, 0.45);
  box-shadow: 0 14px 34px rgba(79, 133, 235, 0.16);
}

.cat-pill.active .cat-icon {
  color: rgba(79, 133, 235, 0.95);
}
.cat-pill.accent-docs.active {
  background: rgba(96, 165, 250, 0.18);
}
.cat-pill.accent-study.active {
  background: rgba(52, 211, 153, 0.18);
}
.cat-pill.accent-tests.active {
  background: rgba(251, 191, 36, 0.2);
}
.cat-pill.accent-service.active {
  background: rgba(167, 139, 250, 0.2);
}
.cat-pill.accent-admin.active {
  background: rgba(248, 113, 113, 0.18);
}

.cat-label {
  font-weight: 700;
  font-size: 14px;
}

.cat-count {
  min-width: 26px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: rgba(31, 41, 55, 0.85);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(16, 24, 40, 0.10);
}

.cat-pill.active .cat-count {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(125, 165, 240, 0.35);
}

.cat-underline {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 6px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 140ms ease, transform 140ms ease;
  transform: scaleX(0.3);
  transform-origin: center;
}

.cat-pill.active .cat-underline {
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
  transform: scaleX(1);
}

.menu-tiles {
  width: min(980px, 100%);
  margin: 0 auto;
}

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.tile {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(16, 24, 40, 0.10);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.08);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  will-change: transform;
  position: relative;
}
.tile-strong {
  border-width: 1px;
  min-height: 92px;
  padding-top: 18px;
}
.fav-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(16, 24, 40, 0.14);
  background: rgba(255, 255, 255, 0.9);
  color: rgba(100, 116, 139, 0.85);
  display: grid;
  place-items: center;
  z-index: 2;
}
.fav-toggle:hover {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.45);
}
.fav-toggle.active {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(255, 251, 235, 0.95);
}

.tile:hover {
  transform: translateY(-2px);
  border-color: rgba(125, 165, 240, 0.42);
  box-shadow: 0 16px 44px rgba(79, 133, 235, 0.16);
}

.tile:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--ring), 0 16px 44px rgba(79, 133, 235, 0.16);
}

.tile-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(125, 165, 240, 0.18), rgba(79, 133, 235, 0.10));
  border: 1px solid rgba(125, 165, 240, 0.30);
  display: grid;
  place-items: center;
}

.tile-icon {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.tile-title {
  font-weight: 800;
  color: var(--ink);
  font-size: 16px;
  line-height: 1.2;
}

.tile-subtitle {
  margin-top: 2px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.2;
}

.tile-chevron {
  color: rgba(31, 41, 55, 0.55);
  font-weight: 900;
  font-size: 18px;
  transition: transform 160ms ease, color 160ms ease;
}

.tile:hover .tile-chevron {
  transform: translateX(2px);
  color: rgba(79, 133, 235, 0.9);
}

/* Animations: "tiles красиво выезжают" */
.tiles-down-enter-active,
.tiles-down-leave-active,
.tiles-left-enter-active,
.tiles-left-leave-active,
.tiles-right-enter-active,
.tiles-right-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

/* Default (down) */
.tiles-down-enter-from {
  opacity: 0;
  transform: translateY(14px);
}
.tiles-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.tiles-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.tiles-down-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

/* Slide left (when switching to previous category) */
.tiles-left-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}
.tiles-left-enter-to {
  opacity: 1;
  transform: translateX(0);
}
.tiles-left-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.tiles-left-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

/* Slide right (when switching to next category) */
.tiles-right-enter-from {
  opacity: 0;
  transform: translateX(18px);
}
.tiles-right-enter-to {
  opacity: 1;
  transform: translateX(0);
}
.tiles-right-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.tiles-right-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}

.tiles-down-move,
.tiles-left-move,
.tiles-right-move {
  transition: transform 220ms ease;
}

@media (max-width: 980px) {
  .favorites-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tiles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .menu-shell {
    padding-top: 72px;
  }
  .topbar-card {
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .topbar-sep {
    display: none;
  }
  .topbar-hint {
    width: 100%;
    border-top: 1px solid rgba(16, 24, 40, 0.08);
    padding-top: 8px;
  }
  .favorites-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .favorites-actions {
    width: 100%;
    justify-content: space-between;
  }
  .favorites-buttons {
    width: 100%;
    justify-content: flex-start;
  }
  .favorites-grid {
    grid-template-columns: 1fr;
  }
  .tiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
