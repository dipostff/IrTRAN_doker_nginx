package abopijservice.code.aiirtran.api;

import java.time.Instant;
import java.util.List;

public record AiStreamMetadata(
        String sessionId,
        String model,
        String documentType,
        Long documentId,
        boolean documentContextUsed,
        List<ValidationIssue> validationIssues,
        List<KnowledgeSource> sources,
        Instant createdAt
) {
}
