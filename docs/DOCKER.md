# Развёртывание через Docker

## Быстрый старт

1. Скопируйте пример переменных окружения (при необходимости отредактируйте):
   ```bash
   cp .env.example .env
   ```

2. Запустите все сервисы (вместе с ними создаются тома для файлов «Справочник» и «Сценарии»):
   ```bash
   docker-compose up -d
   ```

3. Дождитесь готовности MySQL и Keycloak (≈30–60 сек). Контейнер **backend** при каждом старте сам выполняет `sequelize-cli db:migrate` (см. раздел «Миграции БД»).

4. Настройте Keycloak: создайте клиента `irtran-client` в реалме `master` (см. README и keycloak-setup.md).

5. Откройте в браузере:
   - Фронт: http://localhost:5173  
   - Бэкенд API: http://localhost:3000  
   - Keycloak Admin: http://localhost:8080 (логин: admin, пароль: admin)

---

## Проверка работоспособности

1. **Контейнеры запущены:**  
   `docker-compose ps` — все сервисы в статусе `Up`.

2. **MySQL:**  
   `docker exec -it irtran-mysql mysql -uirtran -pirtran irtran -e "SHOW TABLES;"` — после миграций выводится список таблиц.

3. **Keycloak:**  
   В браузере http://localhost:8080 — открывается страница Keycloak, вход в админку (admin / admin) работает.

4. **Бэкенд:**  
   В браузере или через curl: http://localhost:3000 — ответ от API (например, какая-то страница или JSON).

5. **Фронт:**  
   http://localhost:5173 — загружается SPA приложения.

6. **Вход через Keycloak:**  
   На фронте нажать «Войти» → редирект на Keycloak → после входа возврат в приложение. Для этого в Keycloak должен быть создан клиент `irtran-client` с Redirect URI `http://localhost:5173/*` (см. keycloak-setup.md).

---

## Сервисы в docker-compose

| Сервис    | Порт  | Описание                    |
|-----------|-------|-----------------------------|
| mysql     | 3306  | База данных приложения      |
| keycloak  | 8080  | SSO (реалм задаётся в .env) |
| postgres  | —     | БД для Keycloak             |
| backend   | 3000  | API IrTRAN (Node)           |
| frontend  | 5173  | SPA (собранный Vite)        |

---

## Тома для загрузок (Справочник и Сценарии)

Файлы со вкладок **«Справочник»** и **«Сценарии»** хранятся в **отдельных томах Docker**. Они не смешиваются: файлы из Справочника не попадают в каталог Сценариев и наоборот. Данные в томах сохраняются при перезапуске и пересоздании контейнера backend.

| Том                 | Назначение                          | Путь в контейнере backend   |
|---------------------|-------------------------------------|-----------------------------|
| `reference_uploads` | Файлы вкладки «Справочник»          | `/app/uploads/reference`    |
| `scenarios_uploads` | Файлы вкладки «Сценарии»            | `/app/uploads/scenarios`    |

**Как поднять проект с томами для загрузок**

Тома создаются и подключаются автоматически при запуске `docker-compose up`:

```bash
docker-compose up -d
```

После первого запуска тома `reference_uploads` и `scenarios_uploads` создаются и привязываются к сервису `backend`. Все загрузки через приложение попадают в эти тома и сохраняются между перезапусками.

**Проверка томов**

- Список томов:  
  `docker volume ls`  
  Должны быть тома `*_reference_uploads` и `*_scenarios_uploads` (префикс — имя проекта docker-compose, обычно имя каталога).

- Просмотр файлов в томе (например, Справочник; подставьте имя тома из вывода `docker volume ls`):  
  `docker run --rm -v <имя_проекта>_reference_uploads:/data alpine ls -la /data`

---

## Реалм Keycloak (KEYCLOAK_REALM)

В `.env` задаётся реалм, который использует приложение:

```env
KEYCLOAK_REALM=master
```

Имя реалма должно совпадать с тем, что создан или импортирован в Keycloak. Импорт/экспорт реалма описан в [KEYCLOAK_REALM_IMPORT_EXPORT.md](./KEYCLOAK_REALM_IMPORT_EXPORT.md).

---

## Миграции БД (таблицы приложения)

Миграции создают таблицы в MySQL. БД в Docker доступна на `localhost:3306`, учётные данные — из `.env` (по умолчанию пользователь `irtran`, пароль `irtran`, база `irtran`).

### Автоматически при `docker-compose up` (backend)

Образ backend использует `docker-entrypoint.sh`: перед `node app.js` выполняется `npx sequelize-cli db:migrate` с окружением из `NODE_ENV` (в compose обычно `production`). Переменные `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` задаются в `docker-compose` и читаются из `config/databases.js`.

Чтобы **отключить** автоматические миграции (например, для отладки), в сервис `backend` добавьте `RUN_MIGRATIONS=0` или `RUN_MIGRATIONS=false`.

**С хоста (если backend не в Docker):** из каталога `irtran_server-main` задайте переменные под вашу БД и выполните миграции вручную.

**Windows (PowerShell):**
```powershell
cd irtran_server-main
$env:DATABASE_HOST="localhost"; $env:DATABASE_USER="irtran"; $env:DATABASE_PASSWORD="irtran"; $env:DATABASE_NAME="irtran"
npx sequelize-cli db:migrate
```

**Linux / macOS (или Git Bash на Windows):**
```bash
cd irtran_server-main
export DATABASE_HOST=localhost DATABASE_USER=irtran DATABASE_PASSWORD=irtran DATABASE_NAME=irtran
npx sequelize-cli db:migrate
```

Если в `.env` другие логин/пароль/база — подставьте их в переменные. Конфиг `config/databases.js` читает эти переменные и передаёт их в sequelize-cli.

**Проверка:** после успешного выполнения в БД появятся таблицы (document_types, stations, request_transportations и др.). Можно проверить, зайдя в контейнер MySQL:  
`docker exec -it irtran-mysql mysql -uirtran -pirtran irtran -e "SHOW TABLES;"`

### Что важно по миграциям в актуальной версии

- Если используете **тесты и лимиты попыток**, убедитесь, что применены миграции для таблицы `test_attempts`, включая поля:
  - `status`, `started_at`, `finished_at`.

---

## Режим разработки (без Docker для backend и frontend)

Можно поднять только БД и Keycloak, а backend и frontend запускать локально:

1. Запустить только MySQL и Keycloak (и postgres для Keycloak):
   ```bash
   docker-compose up -d mysql postgres keycloak
   ```

2. В `irtran_server-main/config/databases.json` указать `host: localhost` (или использовать переменные окружения `DATABASE_HOST=localhost` и т.д.).

3. Запуск бэкенда:
   ```bash
   cd irtran_server-main
   npm install
   node app.js
   ```

4. Запуск фронта:
   ```bash
   cd IrTRAN-main
   npm install
   npm run dev
   ```

Фронт будет доступен на http://localhost:5173, бэкенд на http://localhost:3000.
