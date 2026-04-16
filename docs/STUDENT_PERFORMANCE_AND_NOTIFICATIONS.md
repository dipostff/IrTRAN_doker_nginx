## Модули «Успеваемость» и «Уведомления и дедлайны»

Документ описывает новую функциональность:

- **модуль студента** `Успеваемость`;
- **модуль уведомлений** (личные уведомления + дедлайны);
- **модерацию изменений профиля студента** со стороны администратора;
- **назначение дедлайнов** индивидуально и по группе;
- **авто-уведомления** и **эскалации преподавателю**.

---

## 1) Роли и доступ

### 1.1. Успеваемость (frontend `/student-performance`)

- Плитка доступна пользователям с ролью `student`.
- API данных успеваемости (`/api/student/...`) рассчитан на учебные аккаунты студентов (без привилегий преподавателя/админа).
- При наличии ролей преподавателя/админа на странице показывается объясняющее сообщение.

### 1.2. Уведомления и дедлайны (frontend `/notifications`)

- Просмотр собственных уведомлений: любой авторизованный пользователь.
- Создание уведомлений, управление дедлайнами, назначение сроков по группе:
  - роли `teacher` или `app-admin`.

---

## 2) База данных (миграции)

Добавлены таблицы:

1. `student_profiles`
2. `student_profile_change_requests`
3. `reference_document_views`
4. `beginner_scenario_sessions`
5. `notifications`
6. `learning_deadlines`

Миграции:

- `20260328200000-StudentPerformanceModule.js`
- `20260329120000-Notifications.js`
- `20260329123000-NotificationsExternalKey.js`
- `20260329130000-LearningDeadlines.js`

---

## 3) Модуль «Успеваемость» (студент)

### 3.1. Что показывает студент

- регистрационные данные из Keycloak (логин, e-mail, имя, фамилия);
- дополнительные поля профиля (отчество, телефон, группа, № зачётной книжки);
- успеваемость по тестам:
  - зачтён/не зачтён,
  - лучший процент,
  - использованные/оставшиеся попытки;
- ознакомление со сценариями;
- ознакомление со справочными материалами;
- сессии «Сценария Новичок»:
  - число запусков,
  - длительность сессий,
  - количество сохранённых документов в сессии.

### 3.2. API студента

`src/modules/student/studentRoutes.js`:

- `GET /api/student/performance`
- `POST /api/student/profile/change-request`
- `POST /api/student/beginner-session/start`
- `POST /api/student/beginner-session/:id/end`
- `POST /api/student/reference-views/:docId`

---

## 4) Модерация данных студента (админ)

Администратор в панели управления (`/admin`) может:

- смотреть заявки студентов на изменение профиля;
- одобрять/отклонять заявки;
- при одобрении данные переносятся в `student_profiles`.

Backend:

- `GET /api/admin/student-profile-requests`
- `POST /api/admin/student-profile-requests/:id/approve`
- `POST /api/admin/student-profile-requests/:id/reject`

---

## 5) Уведомления

### 5.1. Пользовательская часть

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

### 5.2. Управление уведомлениями (teacher/app-admin)

- `GET /api/notifications/student-users`
- `POST /api/notifications`

Поддерживаемые типы:

- `info`
- `warning`
- `deadline`
- `success`

---

## 6) Дедлайны по тестам и сценариям

### 6.1. Индивидуальные дедлайны

- `GET /api/learning-deadlines`
- `POST /api/learning-deadlines`
- `DELETE /api/learning-deadlines/:id`

Сущности:

- `entity_type = test` + `entity_id = tests.id`
- `entity_type = scenario` + `entity_id = scenarios.id`

### 6.2. Массовое назначение по группе

- `GET /api/notifications/groups`
- `POST /api/learning-deadlines/by-group`

Логика:

- teacher может назначать дедлайны только своим группам;
- app-admin — любым группам;
- дедлайны назначаются всем студентам в группе;
- для существующих сроков выполняется update.

---

## 7) Авто-уведомления и эскалации

При `GET /api/notifications` система автоматически дополняет уведомления:

1. по попыткам тестов:
   - осталась последняя попытка;
   - попытки исчерпаны.
2. по дедлайнам `learning_deadlines`:
   - срок назначен;
   - менее 24 часов;
   - просрочено.
3. эскалации преподавателю:
   - при просрочке создаётся уведомление назначившему преподавателю (`assigned_by_user_id`).

Для защиты от дублей используется `notifications.external_key`
с уникальностью по `(user_id, external_key)`.

---

## 8) Frontend-файлы

Ключевые файлы:

- `src/views/StudentPerformanceView.vue`
- `src/components/StudentPerformanceComponent.vue`
- `src/views/NotificationsView.vue`
- `src/components/NotificationsComponent.vue`
- `src/components/AdminPanelComponent.vue` (модерация профиля)
- `src/components/MenuComponent.vue` (плитки меню)
- `src/helpers/API.js`
- `src/helpers/keycloak.js`
- `src/router/index.js`

---

## 9) Что выполнить после обновления

1. Применить миграции:

```bash
npx sequelize-cli db:migrate
```

2. Перезапустить backend.
3. Перезапустить frontend (или пересобрать контейнер).

