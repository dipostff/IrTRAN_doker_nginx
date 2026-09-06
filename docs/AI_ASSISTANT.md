# ИИ наставник Spring AI

## Что реализовано

`ai-irtran` — отдельный Spring Boot сервис. Он использует Spring AI `ChatClient`, модель DeepSeek, память в пределах учебной сессии и read-only инструменты для работы с MySQL через Spring Data JPA.

Доступные сценарии:

- подсказка по текущему полю;
- программная проверка обязательных полей, дат и логических связей;
- разбор ошибки через наводящий вопрос;
- поиск по тексту загруженных материалов из `reference_documents`;
- общая консультация с явным отказом от неподтверждённых нормативных утверждений.

Инструменты модели не принимают `user_id` от самой модели. Идентификатор `sub` передаётся отдельно через Spring AI Tool Context, после чего JPA-запрос проверяет владельца документа.

## Запуск в Docker

1. Скопируйте `.env.example` в `.env`.
2. Укажите настоящий `DEEPSEEK_API_KEY` в созданном `.env` без кавычек и пробелов вокруг `=`.
3. Выполните:

```powershell
docker compose build ai frontend
docker compose up -d
```

После изменения только ключа пересобирать образ не нужно — достаточно пересоздать контейнер:

```powershell
docker compose up -d --force-recreate ai
```

Nginx направляет `/api/ai/**` в Spring Boot сервис, остальные `/api/**` остаются на Node.js backend. Ключ DeepSeek передаётся только серверному контейнеру и не включается в сборку Vue.

Проверка состояния:

```powershell
docker compose ps
docker compose logs --tail 100 ai
```

## Локальная разработка

Для Spring Boot задайте окружение:

```powershell
$env:DEEPSEEK_API_KEY="ваш-ключ"
$env:SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3306/irtran?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Irkutsk"
cd ai-irtran
.\mvnw.cmd spring-boot:run
```

Для Vue добавьте в `IrTRAN-main/.env.local`:

```dotenv
VITE_AI_API_URL=http://localhost:8081
```

## API

- `GET /api/ai/status` — готовность и возможности агента;
- `POST /api/ai/chat/stream` — основной диалог с контекстом формы, ответ в SSE-событиях `meta`, `token`, `done`;
- `POST /api/ai/chat` — совместимый синхронный endpoint для служебных клиентов;
- `POST /api/ai/validate` — программная проверка без обращения к LLM;
- `DELETE /api/ai/sessions/{sessionId}` — очистка памяти текущего пользователя.

Все маршруты требуют Bearer-токен Keycloak. Исключение — стандартный `/actuator/health` для Docker healthcheck.

## Эмбеддинги и следующий этап RAG

DeepSeek используется как chat-модель и поддерживает tool calling. В публичном API DeepSeek сейчас нет отдельного embedding endpoint, поэтому `spring.ai.model.embedding` намеренно установлен в `none`: подмена эмбеддингов ответами chat-модели дала бы некорректный векторный поиск.

Первая версия уже ищет нормативные материалы в `reference_documents` через JPA. Для векторного RAG следует подключить отдельную embedding-модель, вернуть Qdrant в зависимости и заменить реализацию поиска, сохранив интерфейс инструмента `search_training_materials`.
