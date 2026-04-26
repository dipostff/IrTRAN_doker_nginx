# Документация проекта (docs/)

В этой папке лежит документация по развёртыванию, Keycloak и админ‑модулям. Ниже — “карта” файлов, чтобы быстро найти нужное.

## Быстрый старт / запуск

- `DOCKER.md` — как поднять проект через Docker, тома для загрузок, миграции.

## Keycloak

- `keycloak-setup.md` — настройка реалма и клиента `irtran-client`.
- `KEYCLOAK_TROUBLESHOOTING.md` — типовые ошибки (400, invalid redirect, бесконечные редиректы).
- `KEYCLOAK_REALM_IMPORT_EXPORT.md` — импорт/экспорт реалма.

## Панели и функции

- `ADMIN_PANELS.md` — роли, панель администратора и преподавателя, основные backend/FE моменты.
- `DOCUMENT_REVIEW_MODULE.md` — модуль «Проверка документов»: поток, API, метрики, audit trail, UI-проверки.
- `GROUPS_TEACHER_DASHBOARD.md` — группы студентов через Keycloak + успеваемость группы.
- `TESTS_AND_ATTEMPTS.md` — тесты, попытки, лимиты, логика “списание при открытии”.
- `DICTIONARIES_IMPORT.md` — импорт справочников из JSON/XLSX и шаблоны.
- `STUDENT_PERFORMANCE_AND_NOTIFICATIONS.md` — модуль «Успеваемость», уведомления/дедлайны, модерация профиля, авто-уведомления и эскалации.

## Фронтенд тренажёра (Vue, IrTRAN-main)

Сводка правок по учебным формам (акты, памятка, ведомость подачи и уборки):

- [`IrTRAN-main/docs/README.md`](../IrTRAN-main/docs/README.md) — указатель.
- [`IrTRAN-main/docs/MODULE_UPDATES_RU.md`](../IrTRAN-main/docs/MODULE_UPDATES_RU.md) — полное описание изменений по модулям.

