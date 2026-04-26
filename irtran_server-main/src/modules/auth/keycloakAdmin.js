//-----------Подключаемые модули-----------//
const axios = require('axios');
const fileKeycloak = require('./../../../config/keycloak.json');
//-----------Подключаемые модули-----------//

/**
 * Конфиг для работы с Keycloak Admin REST API.
 * Используем тот же реалм, что и для аутентификации приложения.
 * Базовый URL для админ‑эндпоинтов берём из KEYCLOAK_JWKS_URL (в Docker это http://keycloak:8080),
 * чтобы обращаться к Keycloak по имени сервиса, а не по localhost.
 */
function getAdminConfig() {
  const realm = process.env.KEYCLOAK_REALM || fileKeycloak.realm;

  const baseUrlFromEnv =
    process.env.KEYCLOAK_JWKS_URL ||
    process.env.KEYCLOAK_AUTH_SERVER_URL ||
    fileKeycloak['auth-server-url'];

  const baseUrl = baseUrlFromEnv.replace(/\/$/, '');

  const adminUsername = process.env.KEYCLOAK_ADMIN || 'admin';
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

  return {
    realm,
    baseUrl,
    adminUsername,
    adminPassword,
    tokenUrl: `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
    adminApiBaseUrl: `${baseUrl}/admin/realms/${realm}`
  };
}

const adminConfig = getAdminConfig();

const GROUP_ROOT_PATH = ['IrTRAN', 'Teachers'];

/**
 * Получить access token администратора Keycloak через password grant.
 */
async function getAdminAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', 'admin-cli');
  params.append('username', adminConfig.adminUsername);
  params.append('password', adminConfig.adminPassword);

  const response = await axios.post(adminConfig.tokenUrl, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}

async function getRoleRepresentation(roleName, token) {
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/roles/${encodeURIComponent(roleName)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return res.data;
}

/**
 * Добавить пользователю одну или несколько realm‑ролей по именам.
 */
async function addRealmRolesToUser(userId, roleNames) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return;
  const token = await getAdminAccessToken();
  const roles = [];
  for (const name of roleNames) {
    // eslint-disable-next-line no-await-in-loop
    const rep = await getRoleRepresentation(name, token);
    roles.push(rep);
  }

  await axios.post(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(
      userId
    )}/role-mappings/realm`,
    roles,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Удалить у пользователя одну или несколько realm‑ролей по именам.
 */
async function removeRealmRolesFromUser(userId, roleNames) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return;
  const token = await getAdminAccessToken();
  const roles = [];
  for (const name of roleNames) {
    // eslint-disable-next-line no-await-in-loop
    const rep = await getRoleRepresentation(name, token);
    roles.push(rep);
  }

  await axios.delete(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(
      userId
    )}/role-mappings/realm`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: roles
    }
  );
}

/**
 * Получить список пользователей realm’а (с базовыми полями).
 */
async function listUsers() {
  const token = await getAdminAccessToken();
  const res = await axios.get(`${adminConfig.adminApiBaseUrl}/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data || [];
}

async function listTopLevelGroups() {
  const token = await getAdminAccessToken();
  const res = await axios.get(`${adminConfig.adminApiBaseUrl}/groups`, authHeaders(token));
  return res.data || [];
}

async function getGroup(groupId) {
  const token = await getAdminAccessToken();
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/groups/${encodeURIComponent(groupId)}`,
    authHeaders(token)
  );
  return res.data;
}

async function listGroupChildren(groupId) {
  const token = await getAdminAccessToken();
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/groups/${encodeURIComponent(groupId)}/children`,
    authHeaders(token)
  );
  return res.data || [];
}

async function createTopLevelGroup(name) {
  const token = await getAdminAccessToken();
  const res = await axios.post(
    `${adminConfig.adminApiBaseUrl}/groups`,
    { name },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const location = res.headers?.location || '';
  const id = location.split('/').pop() || null;
  return id ? getGroup(id) : null;
}

async function createChildGroup(parentGroupId, name) {
  const token = await getAdminAccessToken();
  const res = await axios.post(
    `${adminConfig.adminApiBaseUrl}/groups/${encodeURIComponent(parentGroupId)}/children`,
    { name },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const location = res.headers?.location || '';
  const id = location.split('/').pop() || null;
  return id ? getGroup(id) : null;
}

async function ensureGroupPath(pathSegments) {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    throw new Error('group_path_required');
  }

  // 1) top-level
  let current = null;
  const topName = pathSegments[0];
  const topGroups = await listTopLevelGroups();
  current = topGroups.find((g) => (g.name || '') === topName) || null;
  if (!current) {
    current = await createTopLevelGroup(topName);
  }

  // 2) nested
  for (let i = 1; i < pathSegments.length; i++) {
    const name = pathSegments[i];
    // eslint-disable-next-line no-await-in-loop
    const children = await listGroupChildren(current.id);
    let next = children.find((g) => (g.name || '') === name) || null;
    if (!next) {
      // eslint-disable-next-line no-await-in-loop
      next = await createChildGroup(current.id, name);
    }
    current = next;
  }

  return current;
}

async function listTeacherOwnedGroups(teacherUserId) {
  const ownerPath = [...GROUP_ROOT_PATH, teacherUserId, 'Groups'];
  const groupsFolder = await ensureGroupPath(ownerPath);
  const children = await listGroupChildren(groupsFolder.id);
  return children.map((g) => ({
    id: g.id,
    name: g.name,
    path: g.path
  }));
}

async function createTeacherOwnedGroup(teacherUserId, groupName) {
  const ownerPath = [...GROUP_ROOT_PATH, teacherUserId, 'Groups'];
  const groupsFolder = await ensureGroupPath(ownerPath);
  const existing = (await listGroupChildren(groupsFolder.id)).find((g) => g.name === groupName);
  if (existing) return { id: existing.id, name: existing.name, path: existing.path };
  const created = await createChildGroup(groupsFolder.id, groupName);
  return created ? { id: created.id, name: created.name, path: created.path } : null;
}

async function listAllTeacherGroups() {
  const teachersRoot = await ensureGroupPath([...GROUP_ROOT_PATH]);
  const teacherNodes = await listGroupChildren(teachersRoot.id); // <teacherUserId> groups

  const all = [];
  for (const t of teacherNodes) {
    // eslint-disable-next-line no-await-in-loop
    const groupsFolder = (await listGroupChildren(t.id)).find((c) => c.name === 'Groups') || null;
    if (!groupsFolder) continue;
    // eslint-disable-next-line no-await-in-loop
    const groups = await listGroupChildren(groupsFolder.id);
    groups.forEach((g) =>
      all.push({
        id: g.id,
        name: g.name,
        path: g.path,
        ownerTeacherId: t.name
      })
    );
  }
  return all;
}

async function listGroupMembers(groupId) {
  const token = await getAdminAccessToken();
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/groups/${encodeURIComponent(groupId)}/members`,
    authHeaders(token)
  );
  return res.data || [];
}

async function addUserToGroup(userId, groupId) {
  const token = await getAdminAccessToken();
  await axios.put(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
    {},
    authHeaders(token)
  );
}

async function removeUserFromGroup(userId, groupId) {
  const token = await getAdminAccessToken();
  await axios.delete(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
    authHeaders(token)
  );
}

async function deleteGroup(groupId) {
  const token = await getAdminAccessToken();
  await axios.delete(
    `${adminConfig.adminApiBaseUrl}/groups/${encodeURIComponent(groupId)}`,
    authHeaders(token)
  );
}

async function listUserGroups(userId) {
  const token = await getAdminAccessToken();
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(userId)}/groups`,
    authHeaders(token)
  );
  return res.data || [];
}

function resolveTeacherIdsFromUserGroups(userGroups) {
  const ids = new Set();
  for (const g of userGroups || []) {
    const path = String(g.path || '');
    const match = path.match(/^\/IrTRAN\/Teachers\/([^/]+)\/Groups\/[^/]+$/);
    if (match && match[1]) {
      ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

/**
 * Получить текущие realm‑роли пользователя.
 */
async function getUserRealmRoles(userId) {
  const token = await getAdminAccessToken();
  const res = await axios.get(
    `${adminConfig.adminApiBaseUrl}/users/${encodeURIComponent(
      userId
    )}/role-mappings/realm`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  const roles = (res.data || []).map((r) => r.name);
  return roles;
}

/**
 * Создать пользователя в Keycloak с паролем.
 * Возвращает базовые данные созданного пользователя.
 */
async function createUserAccount(payload) {
  const token = await getAdminAccessToken();
  const body = {
    username: payload.username,
    email: payload.email,
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    enabled: true,
    emailVerified: false,
    credentials: [
      {
        type: 'password',
        value: payload.password,
        temporary: false
      }
    ]
  };

  await axios.post(
    `${adminConfig.adminApiBaseUrl}/users`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // На создание Keycloak обычно отвечает 201 + Location с id пользователя.
  const users = await axios.get(
    `${adminConfig.adminApiBaseUrl}/users`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { username: payload.username, max: 5 }
    }
  );
  const created = (users.data || []).find((u) => u.username === payload.username || u.email === payload.email);
  if (!created) {
    throw new Error('user_created_but_not_found');
  }
  return created;
}

//-----------Экспортируемые модули-----------//
module.exports = {
  addRealmRolesToUser,
  removeRealmRolesFromUser,
  createUserAccount,
  listUsers,
  getUserRealmRoles,
  // groups (for teacher groups feature)
  listTeacherOwnedGroups,
  createTeacherOwnedGroup,
  listAllTeacherGroups,
  listGroupMembers,
  listUserGroups,
  resolveTeacherIdsFromUserGroups,
  addUserToGroup,
  removeUserFromGroup,
  deleteGroup,
  ensureGroupPath
};
//-----------Экспортируемые модули-----------//

