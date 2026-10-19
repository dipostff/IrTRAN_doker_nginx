# Импорт и экспорт реалма Keycloak

Инструкция для резервного копирования и восстановления конфигурации реалма (клиенты, пользователи, роли и т.д.) в Keycloak.

---

## Экспорт реалма

### 1. Через админ-консоль (ручной экспорт)

1. Войдите в Keycloak Admin Console: http://localhost:8080  
   Логин: `admin`, пароль: `admin`.

2. В выпадающем списке слева сверху выберите нужный реалм (например, `master` или `irtran`).

3. Перейдите в **Realm settings** (Настройки области).

4. Откройте вкладку **Action** (Действия) → нажмите **Partial export** или **Export**:
   - **Export** — полный экспорт реалма (включая пользователей и секреты).
   - **Partial export** — только структура (клиенты, роли, потоки и т.д.), без пользователей (удобно для переноса конфигурации).

5. Сохраните скачанный JSON-файл (например, `irtran-realm.json`).

### 2. Через CLI внутри контейнера (автоматический экспорт)

Если Keycloak запущен через Docker:

```bash
# Экспорт реалма master в файл (без пользователей — только конфигурация)
docker exec -it keycloak /opt/keycloak/bin/kc.sh export --realm master --dir /tmp/export --users skip

# Скопировать файл с контейнера на хост
docker cp keycloak:/tmp/export/. ./keycloak-export/
```

Полный экспорт (включая пользователей):

```bash
docker exec -it keycloak /opt/keycloak/bin/kc.sh export --realm master --dir /tmp/export
docker cp keycloak:/tmp/export/. ./keycloak-export/
```

В каталоге появится файл вида `master-realm.json`.

### 3. Через REST Admin API (для скриптов)

Получить токен админа и вызвать Export API (требует включённый admin API и права).

---

## Импорт реалма

### 1. Импорт при старте Keycloak (рекомендуется для Docker)

Keycloak может автоматически импортировать реалм при первом запуске, если положить JSON в каталог импорта.

**Шаги:**

1. Создайте каталог для экспорта реалма в проекте, например:
   ```text
   projirgups/keycloak-realm/
   ```

2. Положите в него **полный экспорт realm**, используя имя `<realm>-realm.json`.
   Для realm `master` это `master-realm.json`. Экспорт пользователей из CLI должен называться
   `master-users-0.json`, `master-users-1.json` и т. д.

   Не помещайте сюда отдельный экспорт клиента. Файл, начинающийся с поля `clientId`, не является
   `RealmRepresentation`: при `--import-realm` Keycloak завершится с ошибкой
   `Unrecognized field "clientId"`.

3. В `docker-compose.yml` добавьте volume и измените команду keycloak:

   ```yaml
   keycloak:
     ...
     volumes:
       - ./keycloak-realm/master-realm.json:/opt/keycloak/data/import/master-realm.json:ro
       - ./keycloak-realm/master-users-0.json:/opt/keycloak/data/import/master-users-0.json:ro
     command: start-dev --import-realm
   ```

4. Перезапустите контейнер:
   ```bash
   docker-compose up -d keycloak
   ```

Реалм будет импортирован при старте. Повторный запуск с тем же файлом не создаёт дубликаты (реалм уже существует).

### 2. Импорт через админ-консоль

1. Войдите в Admin Console → выберите реалм (например, `master`).
2. **Realm settings** → вкладка **Action** → **Create realm** (или **Import**).
3. Выберите ранее экспортированный JSON-файл и загрузите его.

### 3. Импорт через CLI внутри контейнера

```bash
# Предварительно скопировать JSON в контейнер
docker cp ./irtran-realm.json keycloak:/tmp/irtran-realm.json

# Импорт (в режиме start-dev нужно перезапустить Keycloak с --import-realm и файлом в /opt/keycloak/data/import)
# Либо использовать один раз:
docker exec -it keycloak /opt/keycloak/bin/kc.sh import --file /tmp/irtran-realm.json
```

После импорта через CLI может потребоваться перезапуск контейнера.

---

## Какой реалм использует приложение

В `docker-compose` и в приложении реалм задаётся переменной окружения **`KEYCLOAK_REALM`** (в `.env` или в `docker-compose`).

- По умолчанию: `master`.
- Если вы импортируете реалм с другим именем (например, `irtran`), задайте в `.env`:
  ```env
  KEYCLOAK_REALM=irtran
  ```
- Убедитесь, что в этом реалме создан клиент с идентификатором из `KEYCLOAK_RESOURCE` (по умолчанию `irtran-client`).

---

## Краткая шпаргалка

| Действие | Команда / место |
|----------|------------------|
| Экспорт из контейнера | `docker exec keycloak /opt/keycloak/bin/kc.sh export --realm master --dir /tmp/export --users skip` |
| Скопировать экспорт на хост | `docker cp keycloak:/tmp/export/. ./keycloak-export/` |
| Импорт при старте | `<realm>-realm.json` и, при необходимости, `<realm>-users-N.json`; монтировать в `/opt/keycloak/data/import` только эти файлы |
| Реалм в приложении | Переменная `KEYCLOAK_REALM` в `.env` (должна совпадать с именем реалма в Keycloak) |
