package abopijservice.code.aiirtran.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record AiChatRequest(
        @NotBlank(message = "Введите сообщение")
        @Size(max = 2_000, message = "Сообщение не должно превышать 2000 символов")
        String message,

        @NotBlank(message = "Не указана учебная сессия")
        @Pattern(regexp = "[A-Za-z0-9._:-]{8,120}", message = "Некорректный идентификатор сессии")
        String sessionId,

        @Size(max = 32) String source,
        @Size(max = 64) String documentType,
        Long documentId,
        @Size(max = 160) String currentStep,
        Map<String, Object> documentContext
) {
    public Map<String, Object> safeDocumentContext() {
        return documentContext == null ? Map.of() : documentContext;
    }
}
