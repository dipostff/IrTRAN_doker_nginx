import '@/assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from '@/App.vue';
import router from '@/router';
import { initKeycloak } from '@/helpers/keycloak';

/* import the UI */
import UIcomponents from '@/components/UI';
/* import the UI */

/* import the fontawesome */
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas)
/* import the fontawesome */

/* import the vuetify */
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createVuetify } from 'vuetify';
const vuetify = createVuetify({ components, directives });
/* import the vuetify */

const app = createApp(App);

UIcomponents.forEach(element => {
    app.component(element.name, element);
});

app.component('font-awesome-icon', FontAwesomeIcon);
app.use(vuetify);
app.use(createPinia());
app.use(router);

// Keycloak: не даём UI зависнуть, если init «подвис» на iframe/cookie
const KEYCLOAK_MOUNT_TIMEOUT_MS = 18000;
let appMounted = false;
function mountAppOnce() {
  if (appMounted) return;
  appMounted = true;
  app.mount('#app');
}

const watchdog = setTimeout(() => {
  console.warn(
    'Keycloak: превышено время ожидания инициализации — открываем приложение. При необходимости обновите страницу или войдите снова.'
  );
  mountAppOnce();
}, KEYCLOAK_MOUNT_TIMEOUT_MS);

initKeycloak()
  .then((authenticated) => {
    console.log('Keycloak initialized, authenticated:', authenticated);
    mountAppOnce();
  })
  .catch((error) => {
    console.error('Failed to initialize Keycloak:', error);
    mountAppOnce();
  })
  .finally(() => {
    clearTimeout(watchdog);
  });
