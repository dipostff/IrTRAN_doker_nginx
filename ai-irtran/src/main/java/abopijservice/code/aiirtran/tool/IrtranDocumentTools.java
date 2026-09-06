package abopijservice.code.aiirtran.tool;

import abopijservice.code.aiirtran.api.DocumentContext;
import abopijservice.code.aiirtran.api.KnowledgeSource;
import abopijservice.code.aiirtran.api.ValidationIssue;
import abopijservice.code.aiirtran.service.DocumentContextService;
import abopijservice.code.aiirtran.service.DocumentDefinitionCatalog;
import abopijservice.code.aiirtran.service.KnowledgeSearchService;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class IrtranDocumentTools {

    private final DocumentContextService documentContextService;
    private final DocumentDefinitionCatalog catalog;
    private final KnowledgeSearchService knowledgeSearchService;

    public IrtranDocumentTools(
            DocumentContextService documentContextService,
            DocumentDefinitionCatalog catalog,
            KnowledgeSearchService knowledgeSearchService
    ) {
        this.documentContextService = documentContextService;
        this.catalog = catalog;
        this.knowledgeSearchService = knowledgeSearchService;
    }

    @Tool(name = "get_current_document", description = """
            Получить актуальное состояние документа текущего студента. Используй инструмент перед анализом
            формы или ответом о причине ошибки. Инструмент проверяет владельца документа по данным авторизации.
            """)
    public DocumentContext getCurrentDocument(ToolContext toolContext) {
        return resolve(toolContext);
    }

    @Tool(name = "validate_current_document", description = """
            Выполнить программную проверку текущего документа. Используй перед аудитом документа и когда
            студент спрашивает, почему документ не принимается. Не придумывай дополнительные ошибки.
            """)
    public ValidationResult validateCurrentDocument(ToolContext toolContext) {
        DocumentContext context = resolve(toolContext);
        return new ValidationResult(
                context.documentType(),
                context.documentTypeLabel(),
                context.validationIssues().isEmpty(),
                context.validationIssues()
        );
    }

    @Tool(name = "get_validation_errors", description = """
            Получить только подтверждённые программной логикой ошибки текущего документа. Полезно для
            последовательного разбора проблем без автоматического исправления данных студента.
            """)
    public List<ValidationIssue> getValidationErrors(ToolContext toolContext) {
        return resolve(toolContext).validationIssues();
    }

    @Tool(name = "get_field_info", description = """
            Получить назначение поля текущего документа и связанные фрагменты учебных материалов.
            Если нормативный источник не найден, явно сообщи об этом и не выдумывай правило.
            """)
    public FieldInfoResult getFieldInfo(
            @ToolParam(description = "Техническое имя или русское название поля") String fieldName,
            ToolContext toolContext
    ) {
        String documentType = stringValue(toolContext, "documentType");
        DocumentDefinitionCatalog.FieldDefinition field = catalog.describeField(documentType, fieldName);
        List<KnowledgeSource> sources = knowledgeSearchService.search(field.label());
        return new FieldInfoResult(documentType, field.name(), field.label(), field.description(), field.required(), sources);
    }

    @Tool(name = "search_training_materials", description = """
            Найти подтверждающие фрагменты в загруженных учебных и нормативных документах IrTRAN.
            Используй для вопросов по теории и правилам заполнения. Если список пуст, не формулируй правило как факт.
            """)
    public List<KnowledgeSource> searchTrainingMaterials(
            @ToolParam(description = "Короткий поисковый запрос по теме или полю") String query,
            ToolContext toolContext
    ) {
        return knowledgeSearchService.search(query);
    }

    @SuppressWarnings("unchecked")
    private DocumentContext resolve(ToolContext toolContext) {
        Map<String, Object> context = toolContext.getContext();
        return documentContextService.resolve(
                String.valueOf(context.get("userId")),
                stringValue(toolContext, "source"),
                stringValue(toolContext, "documentType"),
                longValue(context.get("documentId")),
                context.get("clientDocument") instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of(),
                stringValue(toolContext, "currentStep")
        );
    }

    private String stringValue(ToolContext toolContext, String key) {
        Object value = toolContext.getContext().get(key);
        return value == null ? null : String.valueOf(value);
    }

    private Long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) return Long.valueOf(text);
        return null;
    }

    public record ValidationResult(
            String documentType,
            String documentTypeLabel,
            boolean valid,
            List<ValidationIssue> issues
    ) {
    }

    public record FieldInfoResult(
            String documentType,
            String field,
            String label,
            String description,
            boolean required,
            List<KnowledgeSource> sources
    ) {
    }
}
