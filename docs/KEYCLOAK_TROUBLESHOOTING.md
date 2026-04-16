# Keycloak: частые проблемы и решения

## Симптомы

- При входе/обновлении страницы вы видите ошибку **400 Bad Request**.
- После обновления любой страницы приложение уходит в **бесконечные редиректы/«ребут»**.
- После входа вы не возвращаетесь в приложение, или Keycloak ругается на redirect URI.

## Что проверить в первую очередь

### 1. Проверьте, что Keycloak запущен
```bash
docker-compose ps
```
Убедитесь, что контейнер `keycloak` работает.

### 2. Проверьте доступность Keycloak
Откройте в браузере: http://localhost:8080

### 3. Создайте/проверьте клиента в Keycloak

1. Войдите в Keycloak Admin Console: http://localhost:8080
   - Username: `admin`
   - Password: `admin`

2. Убедитесь, что вы находитесь в realm `master` (выбрано в левом верхнем углу)

3. Перейдите в **Clients** (Клиенты) в левом меню

4. Проверьте, существует ли клиент `irtran-client`:
   - Если НЕТ - создайте его (см. шаг 5)
   - Если ДА - откройте его и проверьте настройки (см. шаг 6)

### 4. Создание клиента (если не существует)

1. Нажмите **Create client** (Создать клиента)
2. Заполните:
   - **Client ID**: `irtran-client`
   - **Client protocol**: `openid-connect`
3. Нажмите **Next**

4. На вкладке **Capability config**:
   - **Client authentication**: `OFF` (для public клиента)
   - **Authorization**: `OFF`
   - **Standard flow**: `ON` ✅
   - **Direct access grants**: `ON` ✅
   - **Implicit flow**: `OFF`
   - **OAuth 2.0 Device Authorization Grant**: `OFF`
   - **OIDC CIBA Grant**: `OFF`

5. Нажмите **Next**

6. На вкладке **Login settings**:
   - **Root URL**: оставьте пустым
   - **Home URL**: оставьте пустым
   - **Valid redirect URIs**: добавьте следующие (каждый с новой строки):
     ```
     http://localhost:5173/*
     http://localhost:5173/
     http://localhost:5173
     http://localhost:5173/silent-check-sso.html
     ```
   - **Valid post logout redirect URIs**: добавьте:
     ```
     http://localhost:5173/*
     http://localhost:5173/
     ```
   - **Web origins**: добавьте:
     ```
     http://localhost:5173
     ```

7. Нажмите **Save**

### 5. Проверка существующего клиента

Если клиент уже существует, откройте его и проверьте:

1. Вкладка **Settings**:
   - **Access Type** или **Client authentication**: должно быть `public` или `OFF`
   - **Standard Flow Enabled**: должно быть `ON` ✅
   - **Direct Access Grants Enabled**: должно быть `ON` ✅

2. Вкладка **Settings** → секция **Valid redirect URIs**:
   Убедитесь, что добавлены ВСЕ следующие URI (каждый с новой строки):
   ```
   http://localhost:5173/*
   http://localhost:5173/
   http://localhost:5173
   http://localhost:5173/silent-check-sso.html
   ```

3. Вкладка **Settings** → секция **Web origins**:
   Убедитесь, что добавлено:
   ```
   http://localhost:5173
   ```

4. Нажмите **Save** после внесения изменений

### 6. Проверка realm настроек

1. Перейдите в **Realm settings** (Настройки области)
2. Убедитесь, что выбран realm `master`
3. Проверьте, что realm активен

### 7. Перезапуск приложения

После настройки Keycloak:
1. Очистите кэш браузера (Ctrl+Shift+Delete)
2. Перезагрузите страницу приложения
3. Попробуйте войти снова

### 8. Проверка логов Keycloak

Если проблема сохраняется, проверьте логи:
```bash
docker-compose logs keycloak
```

Ищите ошибки, связанные с:
- Invalid redirect URI
- Client not found
- Invalid client

## Частые ошибки

### Ошибка: "Invalid redirect URI"
**Причина**: Redirect URI в запросе не совпадает с настройками в Keycloak
**Решение**: Убедитесь, что в Keycloak добавлены ВСЕ варианты:
- `http://localhost:5173/*`
- `http://localhost:5173/`
- `http://localhost:5173`
- `http://localhost:5173/silent-check-sso.html`

### Ошибка: "Client not found"
**Причина**: Клиент `irtran-client` не создан
**Решение**: Создайте клиента согласно шагу 4

### Ошибка: "Client authentication required"
**Причина**: Клиент настроен как confidential, но не предоставлен секрет
**Решение**: Установите **Client authentication** в `OFF` (для public клиента)

## Дополнительная информация

После правильной настройки, при нажатии кнопки **«Войти»** в приложении вы должны:

- попасть на страницу входа Keycloak;
- после входа вернуться в SPA на `http://localhost:5173`.

### Если есть бесконечный «ребут» после F5

Это почти всегда цикл **check-sso → redirect → check-sso**, когда не настроен silent-check или Keycloak не принимает redirect.

Что сделать:

1. Проверьте наличие файла `IrTRAN-main/public/silent-check-sso.html`.
2. Добавьте `http://localhost:5173/silent-check-sso.html` в **Valid redirect URIs** клиента `irtran-client`.
3. Очистите cookies для `localhost:8080` и `localhost:5173` и попробуйте снова.







