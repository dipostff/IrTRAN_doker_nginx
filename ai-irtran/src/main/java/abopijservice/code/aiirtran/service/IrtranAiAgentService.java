package abopijservice.code.aiirtran.service;

import abopijservice.code.aiirtran.api.AiChatRequest;
import abopijservice.code.aiirtran.api.AiChatResponse;
import abopijservice.code.aiirtran.api.AiStatusResponse;
import abopijservice.code.aiirtran.api.AiStreamMetadata;
import abopijservice.code.aiirtran.api.DocumentContext;
import abopijservice.code.aiirtran.api.DocumentContextRequest;
import abopijservice.code.aiirtran.api.KnowledgeSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class IrtranAiAgentService {

    private static final Logger log = LoggerFactory.getLogger(IrtranAiAgentService.class);
    private static final String PUBLIC_MODEL_NAME = "IrtranAi";
    private static final long STREAM_TIMEOUT_MILLIS = 180_000L;

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final DocumentContextService documentContextService;
    private final KnowledgeSearchService knowledgeSearchService;
    private final boolean enabled;
    private final String configuredApiKey;

    public IrtranAiAgentService(
            ChatClient chatClient,
            ChatMemory chatMemory,
            DocumentContextService documentContextService,
            KnowledgeSearchService knowledgeSearchService,
            @Value("${irtran.ai.enabled:true}") boolean enabled,
            @Value("${irtran.ai.configured-api-key:}") String configuredApiKey
    ) {
        this.chatClient = chatClient;
        this.chatMemory = chatMemory;
        this.documentContextService = documentContextService;
        this.knowledgeSearchService = knowledgeSearchService;
        this.enabled = enabled;
        this.configuredApiKey = configuredApiKey;
    }

    public AiChatResponse chat(String userId, AiChatRequest request) {
        PreparedRequest prepared = prepare(userId, request);
        try {
            String answer = prompt(prepared)
                    .call()
                    .content();
            if (!StringUtils.hasText(answer)) {
                throw new AiProviderException("Модель вернула пустой ответ", null);
            }
            return new AiChatResponse(
                    answer.trim(),
                    request.sessionId(),
                    PUBLIC_MODEL_NAME,
                    prepared.context().documentType(),
                    prepared.context().documentId(),
                    prepared.context().documentType() != null,
                    prepared.context().validationIssues(),
                    prepared.sources(),
                    Instant.now()
            );
        } catch (AiProviderException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            log.warn(
                    "AI provider request failed for session {}: {}",
                    request.sessionId(),
                    providerFailureSummary(exception)
            );
            log.debug("AI provider request stack trace for session " + request.sessionId(), exception);
            throw new AiProviderException("ИИ-помощник временно не смог получить ответ от модели", exception);
        }
    }

    public SseEmitter streamChat(String userId, AiChatRequest request) {
        PreparedRequest prepared = prepare(userId, request);
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        AtomicReference<Disposable> subscription = new AtomicReference<>();
        AtomicBoolean finished = new AtomicBoolean(false);

        Runnable dispose = () -> {
            Disposable current = subscription.get();
            if (current != null && !current.isDisposed()) current.dispose();
        };
        emitter.onCompletion(dispose);
        emitter.onTimeout(() -> {
            dispose.run();
            emitter.complete();
        });
        emitter.onError(ignored -> dispose.run());

        try {
            AiStreamMetadata metadata = metadata(prepared);
            emitter.send(SseEmitter.event().name("meta").data(metadata));
            Disposable current = prompt(prepared)
                    .stream()
                    .content()
                    .filter(StringUtils::hasLength)
                    .subscribe(
                            token -> sendToken(emitter, subscription, finished, token),
                            exception -> completeWithProviderError(emitter, finished, request.sessionId(), exception),
                            () -> completeStream(emitter, finished, metadata)
                    );
            subscription.set(current);
            if (finished.get() && !current.isDisposed()) current.dispose();
        } catch (RuntimeException | IOException exception) {
            completeWithProviderError(emitter, finished, request.sessionId(), exception);
        }
        return emitter;
    }

    public DocumentContext validate(String userId, DocumentContextRequest request) {
        return documentContextService.resolve(
                userId,
                request.source(),
                request.documentType(),
                request.documentId(),
                request.safeDocumentContext(),
                request.currentStep()
        );
    }

    public void clearSession(String userId, String sessionId) {
        if (sessionId == null || !sessionId.matches("[A-Za-z0-9._:-]{8,120}")) {
            throw new IllegalArgumentException("Некорректный идентификатор сессии");
        }
        chatMemory.clear(scopedConversationId(userId, sessionId));
    }

    public AiStatusResponse status() {
        boolean available = isAvailable();
        return new AiStatusResponse(
                available,
                PUBLIC_MODEL_NAME,
                List.of("chat", "sse-stream", "document-context", "validation", "jpa-tools", "session-memory", "knowledge-search"),
                available
                        ? "ИИ-помощник готов к работе"
                        : "Добавьте API-ключ провайдера и включите AI_ENABLED"
        );
    }

    private void ensureAvailable() {
        if (!isAvailable()) {
            throw new AiUnavailableException("IrtranAi не настроен: задайте API-ключ провайдера");
        }
    }

    private boolean isAvailable() {
        return enabled
                && StringUtils.hasText(configuredApiKey)
                && !"not-configured".equalsIgnoreCase(configuredApiKey)
                && !configuredApiKey.toLowerCase().startsWith("replace-");
    }

    private String scopedConversationId(String userId, String sessionId) {
        return userId + ":" + sessionId;
    }

    private PreparedRequest prepare(String userId, AiChatRequest request) {
        ensureAvailable();
        DocumentContext context = documentContextService.resolve(
                userId,
                request.source(),
                request.documentType(),
                request.documentId(),
                request.safeDocumentContext(),
                request.currentStep()
        );
        return new PreparedRequest(
                userId,
                request,
                context,
                knowledgeSearchService.search(request.message()),
                scopedConversationId(userId, request.sessionId())
        );
    }

    private ChatClient.ChatClientRequestSpec prompt(PreparedRequest prepared) {
        return chatClient.prompt()
                .user(composeUserPrompt(prepared.request().message(), prepared.context(), prepared.sources()))
                .toolContext(toolContext(prepared.userId(), prepared.request(), prepared.context()))
                .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, prepared.conversationId()));
    }

    private AiStreamMetadata metadata(PreparedRequest prepared) {
        DocumentContext context = prepared.context();
        return new AiStreamMetadata(
                prepared.request().sessionId(),
                PUBLIC_MODEL_NAME,
                context.documentType(),
                context.documentId(),
                context.documentType() != null,
                context.validationIssues(),
                prepared.sources(),
                Instant.now()
        );
    }

    private void sendToken(
            SseEmitter emitter,
            AtomicReference<Disposable> subscription,
            AtomicBoolean finished,
            String token
    ) {
        if (finished.get()) return;
        try {
            emitter.send(SseEmitter.event().name("token").data(Map.of("content", token)));
        } catch (IOException | IllegalStateException exception) {
            if (finished.compareAndSet(false, true)) {
                Disposable current = subscription.get();
                if (current != null) current.dispose();
                emitter.completeWithError(exception);
            }
        }
    }

    private void completeStream(SseEmitter emitter, AtomicBoolean finished, AiStreamMetadata metadata) {
        if (!finished.compareAndSet(false, true)) return;
        try {
            emitter.send(SseEmitter.event().name("done").data(metadata));
            emitter.complete();
        } catch (IOException | IllegalStateException exception) {
            emitter.completeWithError(exception);
        }
    }

    private void completeWithProviderError(
            SseEmitter emitter,
            AtomicBoolean finished,
            String sessionId,
            Throwable exception
    ) {
        if (!finished.compareAndSet(false, true)) return;
        log.warn("AI provider stream failed for session {}: {}", sessionId, providerFailureSummary(exception));
        log.debug("AI provider stream stack trace for session " + sessionId, exception);
        try {
            emitter.send(SseEmitter.event().name("error").data(Map.of(
                    "error", "ai_provider_error",
                    "message", "ИИ-помощник временно не смог получить ответ от модели"
            )));
            emitter.complete();
        } catch (IOException | IllegalStateException sendException) {
            emitter.completeWithError(sendException);
        }
    }

    private Map<String, Object> toolContext(String userId, AiChatRequest request, DocumentContext context) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", userId);
        putIfPresent(result, "source", context.source());
        putIfPresent(result, "documentType", context.documentType());
        putIfPresent(result, "documentId", context.documentId());
        putIfPresent(result, "currentStep", context.currentStep());
        result.put("clientDocument", request.safeDocumentContext());
        result.put("userMessage", request.message());
        return result;
    }

    private String providerFailureSummary(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof WebClientResponseException responseException) {
                String body = responseException.getResponseBodyAsString().replaceAll("\\s+", " ").trim();
                if (body.length() > 600) body = body.substring(0, 600) + "…";
                return "HTTP " + responseException.getStatusCode().value()
                        + (body.isBlank() ? "" : " — " + body);
            }
            current = current.getCause();
        }
        String message = exception.getMessage();
        return exception.getClass().getSimpleName()
                + (StringUtils.hasText(message) ? " — " + message : "");
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) target.put(key, value);
    }

    private String composeUserPrompt(String userMessage, DocumentContext context, List<KnowledgeSource> sources) {
        if (context.documentType() == null) {
            return "Сообщение студента: " + userMessage
                    + "\nКонтекст формы сейчас не передан. Для нормативных утверждений используй поиск учебных материалов."
                    + formatSources(sources);
        }

        StringBuilder prompt = new StringBuilder();
        prompt.append("Сообщение студента: ").append(userMessage).append('\n');
        prompt.append("Текущий документ: ").append(context.documentTypeLabel()).append('\n');
        if (context.documentId() != null) prompt.append("Идентификатор сохранённого документа: ").append(context.documentId()).append('\n');
        if (StringUtils.hasText(context.currentStep())) prompt.append("Текущий этап: ").append(context.currentStep()).append('\n');
        prompt.append("Источник состояния: ")
                .append(context.databaseBacked() ? "MySQL через JPA" : "несохранённая форма")
                .append(context.includesFreshClientState() ? " и актуальные поля интерфейса" : "")
                .append('\n');
        if (!context.unfilledRequiredFields().isEmpty()) {
            prompt.append("Незаполненные обязательные поля: ")
                    .append(String.join(", ", context.unfilledRequiredFields()))
                    .append('\n');
        }
        if (!context.validationIssues().isEmpty()) {
            prompt.append("Подтверждённые программной проверкой проблемы:\n");
            context.validationIssues().forEach(issue -> prompt
                    .append("- ").append(issue.fieldLabel()).append(": ").append(issue.message()).append('\n'));
        }
        if (!context.values().isEmpty()) {
            prompt.append("Текущие заполненные значения:\n");
            context.values().forEach((field, value) -> prompt
                    .append("- ").append(field).append(" = ").append(value).append('\n'));
        }
        prompt.append(formatSources(sources));
        prompt.append("Перед выводом о корректности используй инструменты. Не заменяй данные студента готовыми значениями.");
        return prompt.toString();
    }

    private String formatSources(List<KnowledgeSource> sources) {
        if (sources == null || sources.isEmpty()) {
            return "\nПредварительный поиск по учебной базе не нашёл подходящего фрагмента.\n";
        }
        StringBuilder block = new StringBuilder("\nПредварительно найденные материалы:\n");
        sources.forEach(source -> block
                .append("- ").append(source.title() == null ? source.filename() : source.title())
                .append(": ").append(source.excerpt()).append('\n'));
        return block.toString();
    }

    private record PreparedRequest(
            String userId,
            AiChatRequest request,
            DocumentContext context,
            List<KnowledgeSource> sources,
            String conversationId
    ) {
    }
}
