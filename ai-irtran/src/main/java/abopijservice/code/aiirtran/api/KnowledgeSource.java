package abopijservice.code.aiirtran.api;

public record KnowledgeSource(
        Long documentId,
        String title,
        String filename,
        String excerpt
) {
}
