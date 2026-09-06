package abopijservice.code.aiirtran.api;

import jakarta.validation.constraints.Size;

import java.util.Map;

public record DocumentContextRequest(
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
