package abopijservice.code.aiirtran.api;

public record ValidationIssue(
        String code,
        String field,
        String fieldLabel,
        Severity severity,
        String message,
        String guidingQuestion
) {
    public enum Severity {
        ERROR,
        WARNING
    }
}
