package abopijservice.code.aiirtran.api;

import java.util.List;
import java.util.Map;

public record DocumentContext(
        String source,
        String documentType,
        String documentTypeLabel,
        Long documentId,
        String currentStep,
        boolean databaseBacked,
        boolean includesFreshClientState,
        List<String> filledFields,
        List<String> unfilledRequiredFields,
        Map<String, Object> values,
        List<ValidationIssue> validationIssues
) {
    public static DocumentContext empty(String currentStep) {
        return new DocumentContext(
                null,
                null,
                "Общая консультация",
                null,
                currentStep,
                false,
                false,
                List.of(),
                List.of(),
                Map.of(),
                List.of()
        );
    }
}
