## Панели управления и роли Keycloak

Этот документ описывает, как работают:

- вкладка `Панель управления` (администратор тренажёра),
- вкладка `Панель управления преподавателя`,
- вкладка `Группы` (группы студентов через Keycloak),
- роли Keycloak (`student`, `teacher`, `app-admin`) и права доступа.

Документ актуален для текущей Docker‑сборки (Keycloak, backend, frontend).

---

## 1. Роли и права доступа

### 1.1. Realm‑роли Keycloak

В выбранном realm’е (по умолчанию `master`) должны быть созданы realm‑roles:

- `student` — студент;
- `teacher` — преподаватель;
- `app-admin` — администратор тренажёра.
- `dictionary-admin` — администратор раздела «Заполнение справочников».

**Рекомендуемая настройка:**

- В разделе **Роли → Default roles** добавить роль `student` в набор ролей по умолчанию realm’а.
  - Тогда все новые пользователи автоматически получают роль `student`.
- Роль `app-admin` назначается вручную только тем учётным записям, которые должны иметь доступ к общей панели управления.
- Роль `teacher` добавляется либо вручную в админке Keycloak, либо через backend (см. `/auth/upgrade-to-teacher` и панель управления).

### 1.2. Права по ролям

- **student**:
  - читать справочник, скачивать файлы;
  - просматривать и скачивать сценарии (но не создавать/редактировать);
  - проходить тесты (но не создавать/редактировать тесты и вопросы).
- **teacher**:
  - все права студента;
  - создавать и изменять сценарии;
  - создавать и изменять банк вопросов и тестов.
- **app-admin**:
  - все права преподавателя;
  - доступ к панели `Панель управления` для выдачи ролей (`student`/`teacher`);
  - служебные операции (в т.ч. работа с Keycloak Admin API).
- **dictionary-admin**:
  - доступ к модулю `Заполнение справочников`;
  - не получает автоматически полномочия `teacher`/`app-admin`.

Проверка прав:

- **Backend**:
  - проверка токена: `keycloakAuth.verifyToken()`;
  - проверка ролей: `keycloakAuth.requireRealmRole('app-admin')`, `keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin'])`.
- **Frontend**:
  - используется `realm_access.roles` из токена Keycloak;
  - вспомогательные функции:
    - `hasRealmRole(roleName)`,
    - `hasAnyRealmRole(['teacher', 'app-admin'])`,
    - `isStudent()`, `isTeacher()`, `isAppAdmin()`, `isDictionaryAdmin()`.

---

## 2. Панель управления (для администратора)

### 2.1. Назначение

Вкладка **`Панель управления`** предназначена для администраторов тренажёра (`app-admin`) и позволяет:

- просматривать список пользователей realm’а;
- видеть их текущие роли (`student`, `teacher`, `app-admin`);
- назначать/снимать роли `student` и `teacher` через Keycloak Admin API.

Если у пользователя нет роли `app-admin`, при переходе на вкладку:

- фронтенд показывает сообщение: **«Вкладка недоступна для пользователя»**;
- backend‑эндпоинты под `/api/admin/...` возвращают `403 Forbidden`.

### 2.2. Backend: Keycloak Admin API

Для работы панели используются служебные функции (модуль `src/modules/auth/keycloakAdmin.js`):

- получение admin‑token (клиент `admin-cli`, логин/пароль `KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD`);
- запросы к Keycloak Admin REST API:
  - список пользователей realm’а;
  - чтение и изменение их realm‑ролей.

**Важно:** переменные окружения `KEYCLOAK_ADMIN` и `KEYCLOAK_ADMIN_PASSWORD` должны совпадать с учётной записью администратора Keycloak, созданной при старте контейнера.

### 2.3. Backend: API панели управления

Реализуется отдельным модулем, например `src/modules/admin/adminRoutes.js`, регистрируется в `Server.js` через `registerAdminRoutes(app)` и подключается в `RegisterCustomRoutes`.

Эндпоинты (все требуют `app-admin`):

1. **`GET /api/admin/users`**

   - Возвращает список пользователей realm’а с их ролями.
   - Использует Keycloak Admin API: `GET /admin/realms/{realm}/users`.
   - Пример ответа:

   ```json
   [
     {
       "id": "e0c3...",
       "username": "student1",
       "email": "student1@example.com",
       "firstName": "Иван",
       "lastName": "Иванов",
       "roles": ["student"]
     },
     {
       "id": "1a2b...",
       "username": "teacher1",
       "email": "teacher1@example.com",
       "firstName": "Пётр",
       "lastName": "Петров",
       "roles": ["student", "teacher"]
     }
   ]
   ```

2. **`POST /api/admin/users/:id/roles`**

   - Управление ролями пользователя.
   - Тело запроса:

   ```json
   {
     "add": ["teacher"],
     "remove": ["student"]
   }
   ```

   - Backend вызывает Keycloak Admin API:
     - `POST /admin/realms/{realm}/users/{id}/role-mappings/realm` — добавить роли;
     - `DELETE /admin/realms/{realm}/users/{id}/role-mappings/realm` — снять роли.

### 2.4. Frontend: вкладка «Панель управления»

1. **Маршрут**:

   - В `src/router/index.js` добавить:

   ```js
   {
     path: "/admin",
     name: "admin-panel",
     component: () => import("../views/AdminPanelView.vue"),
   }
   ```

   - В `PAGE_TITLE`:

   ```js
   "admin-panel": "Тренажёр ОТРЭД - Панель управления",
   ```

2. **Компонент `AdminPanelView.vue`**:

   - Использует общий `HeaderComponent`.
   - В `onMounted`:
     - проверяет `isAppAdmin()`:
       - если **нет** — показывает блок с текстом:
         - «У вас нет прав доступа к этой панели (нужна роль администатора тренажёра).»
       - если **да** — отображает компонент `AdminPanelComponent`.

3. **Компонент `AdminPanelComponent.vue`**:

   - При монтировании:
     - отправляет `GET /api/admin/users` (с токеном в `Authorization: Bearer ...`);
     - заполняет таблицу пользователей.
   - Таблица:
     - ФИО/логин, e‑mail;
     - текущие роли (отображаются как метки `student`, `teacher`, `app-admin`);
     - кнопки:
       - «Сделать студентом» (гарантировать `student`, убрать `teacher`);
       - «Сделать преподавателем» (добавить `teacher`, оставить `student`).
   - Обработчик:
     - при нажатии отправляет `POST /api/admin/users/:id/roles` с нужными `add/remove`;
     - после успешного ответа обновляет строку или перезагружает список.

### 2.5. Модерация изменений профиля студента

В `AdminPanelComponent.vue` добавлен блок **«Модерация данных студентов»**:

- просмотр заявок студентов на изменение доп. полей профиля;
- фильтрация по статусам (`pending`, `approved`, `rejected`, `all`);
- действия администратора:
  - одобрить заявку;
  - отклонить заявку с комментарием.

Backend API:

- `GET /api/admin/student-profile-requests`
- `POST /api/admin/student-profile-requests/:id/approve`
- `POST /api/admin/student-profile-requests/:id/reject`

---

## 3. Панель управления преподавателя

### 3.1. Назначение

Вкладка **`Панель управления преподавателя`** предназначена для ролей `teacher` и `app-admin` и позволяет:

- видеть список студентов (`student`);
- просматривать статистику прохождения тестов:
  - сколько попыток у каждого студента;
  - лучший результат (процент правильных ответов);
  - условно «сдал/не сдал» тест;
- отслеживать ознакомление студентов со сценариями:
  - кто открывал сценарий;
  - даты первого/последнего просмотра;
  - флаг «ознакомился / не ознакомился».

- управлять **группами студентов** и смотреть **успеваемость по группам** (тесты/сценарии, фильтры “Проблемные”, профили студентов).
  - Подробности реализации см. в `docs/GROUPS_TEACHER_DASHBOARD.md`.

Если пользователь не `teacher` и не `app-admin`, при переходе на вкладку:

- фронтенд выводит сообщение «Вкладка недоступна для пользователя»;
- backend‑эндпоинты `/api/teacher/...` возвращают `403 Forbidden`.

### 3.2. Backend: дополнительные таблицы

Для работы панели преподавателя потребуется добавить таблицы (через миграции Sequelize):

1. **`test_attempts`** — попытки прохождения тестов:

   - `id` (PK, AUTO_INCREMENT);
   - `test_id` (INT UNSIGNED, FK → `tests.id`);
   - `user_id` (VARCHAR(255)) — `sub` из токена Keycloak;
   - `username` (VARCHAR(255)) — логин пользователя на момент попытки;
   - `correct_answers` (INT) — сколько ответов правильных;
   - `question_count` (INT) — общее число вопросов;
   - `percent` (DECIMAL(5,2)) — `correct_answers / question_count * 100`;
   - `created_at` (DATE/TIMESTAMP).

   В актуальной версии также используются поля для статуса попытки:

   - `status` (строка, например `started` / `finished`);
   - `started_at` (DATE/TIMESTAMP);
   - `finished_at` (DATE/TIMESTAMP).

2. **`scenario_views`** — ознакомление со сценариями:

   - `id` (PK, AUTO_INCREMENT);
   - `scenario_id` (INT UNSIGNED, FK → `scenarios.id`);
   - `user_id` (VARCHAR(255));
   - `username` (VARCHAR(255));
   - `first_viewed_at` (DATE/TIMESTAMP);
   - `last_viewed_at` (DATE/TIMESTAMP);
   - `completed` (BOOLEAN) — опционально, если нужно отдельно помечать «полное ознакомление».

> Примечание: при проектировании миграций важно, чтобы набор полей в `createTable` полностью совпадал со структурами в моделях Sequelize и объектами в `bulkInsert`, иначе возможны ошибки наподобие «Column count doesn't match value count at row 1».

### 3.3. Backend: маршруты преподавателя

Создаётся модуль, например `src/modules/teacher/teacherRoutes.js`, регистрируемый в `Server.js` (через `registerTeacherRoutes(app)` в `RegisterCustomRoutes`).

Все маршруты используют:

- `keycloakAuth.verifyToken()` — обязательная аутентификация;
- `keycloakAuth.requireAnyRealmRole(['teacher', 'app-admin'])` — проверка роли.

Дополнительно преподавательская часть включает **маршруты групп** (Keycloak Groups) и **успеваемость группы**. Они описаны в `docs/GROUPS_TEACHER_DASHBOARD.md`.

#### 3.3.1. Фиксация попыток тестов

В проекте попытка **списывается при открытии теста** (это важно для честной статистики).

1. **`POST /api/tests/:id/attempts/start`**

   - Вызывается фронтендом в момент открытия теста.
   - Backend атомарно:
     - проверяет лимит `max_attempts` для этого теста;
     - создаёт запись в `test_attempts` со статусом `started` и временем `started_at`.
   - Если попытки закончились → сервер вернёт `409` с кодом `max_attempts_reached`.

2. **`PATCH /api/tests/:id/attempts/:attemptId/finish`**

   - Вызывается фронтендом при завершении теста.
   - Тело запроса (пример):

   ```json
   {
     "correctAnswers": 4,
     "questionCount": 5,
     "earnedPoints": 7,
     "maxPoints": 10
   }
   ```

   - Backend:
     - находит попытку `attemptId` для текущего пользователя и теста;
     - вычисляет процент (по баллам, если они переданы);
     - обновляет попытку: `status=finished`, `finished_at=...`, сохраняет результат.

#### 3.3.2. Сбор статистики по тестам

2. **`GET /api/teacher/tests/results`**

   - Опциональные параметры:
     - `testId` — если передан, статистика по конкретному тесту;
     - если нет — по всем тестам.
   - Возвращает массив:

   ```json
   [
     {
       "testId": 1,
       "testTitle": "Транспортная документация: базовые понятия",
       "students": [
         {
           "userId": "uuid",
           "username": "student1",
           "bestPercent": 80,
           "lastAttemptAt": "2026-02-15T10:15:00Z",
           "attemptsCount": 3
         }
       ]
     }
   ]
   ```

   - Агрегация делается запросом к `test_attempts`:
     - группировка по `test_id` и `user_id`;
     - `MAX(percent)` как `bestPercent`;
     - `COUNT(*)` как `attemptsCount`;
     - `MAX(created_at)` как `lastAttemptAt`.

#### 3.3.3. Ознакомление со сценариями

3. **`POST /api/scenarios/:id/view`**

   - Вызывается фронтендом, когда студент открывает (просматривает) сценарий.
   - Backend:
     - по `(scenario_id, user_id)` ищет запись в `scenario_views`;
     - если нет — создаёт с `first_viewed_at = now`, `last_viewed_at = now`;
     - если есть — обновляет `last_viewed_at = now` и при необходимости `completed`.

4. **`GET /api/teacher/scenarios/views`**

   - Возвращает, для каждого сценария, список студентов и их статус знакомства:

   ```json
   [
     {
       "scenarioId": 1,
       "title": "Сценарий 1",
       "students": [
         {
           "userId": "uuid",
           "username": "student1",
           "viewed": true,
           "firstViewedAt": "...",
           "lastViewedAt": "...",
           "completed": true
         }
       ]
     }
   ]
   ```

   - Основной источник данных — `scenario_views` (JOIN с `scenarios`).

#### 3.3.4. Список студентов

5. **`GET /api/teacher/students`**

   - Использует Keycloak Admin API (через модуль `keycloakAdmin`):
     - получаем список пользователей, фильтруя по наличию роли `student`;
   - Возвращает JSON с полями:

   ```json
   [
     {
       "id": "e0c3...",
       "username": "student1",
       "email": "student1@example.com",
       "firstName": "Иван",
       "lastName": "Иванов"
     }
   ]
   ```

---

## 4. Frontend: Панель управления преподавателя

### 4.1. Маршрут

Добавить в `src/router/index.js`:

```js
{
  path: "/teacher-dashboard",
  name: "teacher-dashboard",
  component: () => import("../views/TeacherDashboardView.vue"),
}
```

И в `PAGE_TITLE`:

```js
"teacher-dashboard": "Тренажёр ОТРЭД - Панель преподавателя",
```

### 4.2. Доступ

В `TeacherDashboardView.vue`:

- при монтировании:
  - если `!isTeacher()` и `!isAppAdmin()`:
    - отобразить блок с сообщением:
      - «Вкладка недоступна для пользователя (нужна роль преподавателя или администратора).»
    - не выполнять запросы к API;
  - иначе — показать `TeacherDashboardComponent`.

### 4.3. Компонент `TeacherDashboardComponent.vue`

Рекомендуемая структура:

- Блок **«Результаты тестов»**:
  - селект теста (список из `GET /api/tests`);
  - таблица студентов:
    - студент (username / ФИО);
    - лучший результат в процентах;
    - число попыток;
    - дата последней попытки;
    - признак «сдал / не сдал» (по порогу, например 60 %).
  - данные берутся из `GET /api/teacher/tests/results?testId=...`.

- Блок **«Ознакомление со сценариями»**:
  - селект сценария (список из `GET /api/scenarios`);
  - список студентов с флагом:
    - ознакомился: есть запись в `scenario_views`;
    - не ознакомился: записи нет.
  - данные из `GET /api/teacher/scenarios/views`.

Все запросы отправляются с токеном Keycloak:

```js
const token = getToken();
axios.get("/api/teacher/tests/results", {
  headers: { Authorization: token ? `Bearer ${token}` : "" },
});
```

---

## 5. Как всё это завести с нуля (краткая инструкция)

1. **Запустить Keycloak через Docker, создать/импортировать realm** (см. `KEYCLOAK_REALM_IMPORT_EXPORT.md` и `keycloak-setup.md`).
2. **Создать роли** `student`, `teacher`, `app-admin` в этом realm’е:
   - добавить `student` в Default roles realm’а;
   - выдать `app-admin` нужной учётке.
3. **Убедиться, что клиент `irtran-client` настроен**:
   - Redirect URI и Web origins указывают на фронт (`http://localhost:5173` или адрес Nginx);
   - включён scope `roles` с маппером `realm_access.roles`.
4. **Настроить переменные окружения** в `docker-compose.yml` backend:
   - `KEYCLOAK_AUTH_SERVER_URL`, `KEYCLOAK_JWKS_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_RESOURCE`;
   - `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD` для доступа к Admin API.
5. **Прогнать миграции Sequelize** (после сборки образов):

```bash
docker-compose up -d
docker-compose exec backend npx sequelize-cli db:migrate
```

6. **Войти под пользователем с ролью `app-admin`**:
   - открыть фронт (`/menu`);
   - перейти на `/admin` и через панель управления выдать нужным пользователям роли `student`/`teacher`.
7. **Для преподавателя**:
   - войти под пользователем с ролью `teacher` (или `app-admin`);
   - открыть `/teacher-dashboard` и убедиться, что видна статистика по тестам и сценариям после того, как студенты начнут их проходить.

