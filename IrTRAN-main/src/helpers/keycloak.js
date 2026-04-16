import Keycloak from 'keycloak-js';

// Keycloak configuration (Vite: VITE_KEYCLOAK_* задаются при сборке/в .env)
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'master',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'irtran-client'
};

// Initialize Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

// Flag to track initialization status
let initPromise = null;
let isInitialized = false;
let isInitializing = false;

/**
 * Initialize Keycloak and return a promise
 */
export function initKeycloak() {
  if (isInitialized) {
    return Promise.resolve(!!keycloak.authenticated);
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = new Promise((resolve) => {
    try {
      keycloak
        .init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          redirectUri: window.location.href,
          checkLoginIframe: false,
          enableLogging: false,
          /**
           * Без silentCheckSsoRedirectUri keycloak-js не открывает 3rd-party iframe проверки cookie.
           * С silent URI после logout/смены аккаунта часто: «Timeout when waiting for 3rd party check iframe message»
           * и вечная загрузка. При check-sso без silent используется redirect с prompt=none.
           * Тихий SSO: снова задать silentCheckSsoRedirectUri + при необходимости messageReceiveTimeout.
           */
          messageReceiveTimeout: 25000
        })
        .then((authenticated) => {
          isInitialized = true;
          isInitializing = false;
          if (authenticated) {
            console.log('User is authenticated');
            setInterval(() => {
              keycloak.updateToken(30).catch(() => {
                console.error('Failed to refresh token');
              });
            }, 300000);
          } else {
            console.log('User is not authenticated');
          }
          resolve(authenticated);
        })
        .catch((error) => {
          isInitialized = true;
          isInitializing = false;
          initPromise = null;
          console.error('Keycloak initialization error:', error);
          resolve(false);
        });
    } catch (error) {
      isInitialized = true;
      isInitializing = false;
      initPromise = null;
      console.error('Keycloak initialization exception:', error);
      resolve(false);
    }
  });

  return initPromise;
}

/**
 * Login function
 */
export function login() {
  return keycloak.login({
    redirectUri: window.location.origin + '/menu'
  });
}

/**
 * Logout: выход из Keycloak и редирект на страницу входа приложения.
 * Если keycloak.logout() не срабатывает (например, адаптер не инициализирован), выполняется редирект по URL выхода Keycloak.
 */
export function logout() {
  const redirectUri = window.location.origin + '/';
  try {
    if (keycloak && typeof keycloak.logout === 'function') {
      keycloak.logout({ redirectUri });
      return;
    }
  } catch (e) {
    console.warn('keycloak.logout failed, using fallback:', e);
  }
  const baseUrl = ((keycloak && keycloak.authServerUrl) || keycloakConfig.url || '').replace(/\/$/, '');
  const realm = (keycloak && keycloak.realm) || keycloakConfig.realm;
  const params = new URLSearchParams({
    post_logout_redirect_uri: redirectUri,
    client_id: keycloakConfig.clientId
  });
  if (keycloak && keycloak.idToken) {
    params.set('id_token_hint', keycloak.idToken);
  }
  window.location.href = `${baseUrl}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}

/**
 * Get the current token
 */
export function getToken() {
  return keycloak.token;
}

/**
 * Get the refresh token
 */
export function getRefreshToken() {
  return keycloak.refreshToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return keycloak.authenticated;
}

/**
 * Get user info
 */
export function getUserInfo() {
  return keycloak.tokenParsed;
}

/**
 * Update token if needed
 */
export function updateToken(minValidity = 30) {
  return keycloak.updateToken(minValidity);
}

/**
 * Check if token is expired
 */
export function isTokenExpired() {
  return keycloak.isTokenExpired();
}

/**
 * Проверка наличия realm-роли у текущего пользователя.
 * Роли берутся из поля realm_access.roles токена Keycloak.
 */
export function hasRealmRole(roleName) {
  const info = getUserInfo();
  if (!info || !info.realm_access || !Array.isArray(info.realm_access.roles)) {
    return false;
  }
  return info.realm_access.roles.includes(roleName);
}

/**
 * Проверка наличия хотя бы одной роли из списка.
 */
export function hasAnyRealmRole(roleNames) {
  if (!Array.isArray(roleNames)) return false;
  return roleNames.some((r) => hasRealmRole(r));
}

export function isStudent() {
  return hasRealmRole('student');
}

export function isTeacher() {
  return hasRealmRole('teacher');
}

export function isAppAdmin() {
  return hasRealmRole('app-admin');
}

export function isDictionaryAdmin() {
  return hasRealmRole('dictionary-admin');
}

/** Учебный аккаунт студента без ролей преподавателя и администратора (модуль «Успеваемость»). */
export function isPureStudentAccount() {
  return isStudent() && !isTeacher() && !isAppAdmin();
}

// Export the keycloak instance for advanced usage
export default keycloak;


