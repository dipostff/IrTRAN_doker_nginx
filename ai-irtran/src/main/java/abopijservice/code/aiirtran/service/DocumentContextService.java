package abopijservice.code.aiirtran.service;

import abopijservice.code.aiirtran.api.DocumentContext;
import abopijservice.code.aiirtran.api.ValidationIssue;
import abopijservice.code.aiirtran.persistence.StudentDocumentEntity;
import abopijservice.code.aiirtran.persistence.StudentDocumentRepository;
import abopijservice.code.aiirtran.persistence.TransportationRequestEntity;
import abopijservice.code.aiirtran.persistence.TransportationRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DocumentContextService {

    private final StudentDocumentRepository studentDocuments;
    private final TransportationRequestRepository transportationRequests;
    private final DocumentValidationService validationService;
    private final DocumentDefinitionCatalog catalog;
    private final ContextSanitizer sanitizer;

    public DocumentContextService(
            StudentDocumentRepository studentDocuments,
            TransportationRequestRepository transportationRequests,
            DocumentValidationService validationService,
            DocumentDefinitionCatalog catalog,
            ContextSanitizer sanitizer
    ) {
        this.studentDocuments = studentDocuments;
        this.transportationRequests = transportationRequests;
        this.validationService = validationService;
        this.catalog = catalog;
        this.sanitizer = sanitizer;
    }

    @Transactional(readOnly = true)
    public DocumentContext resolve(
            String userId,
            String requestedSource,
            String requestedType,
            Long documentId,
            Map<String, Object> clientValues,
            String currentStep
    ) {
        String documentType = catalog.normalizeType(requestedType);
        Map<String, Object> merged = new LinkedHashMap<>();
        boolean databaseBacked = false;
        String source = normalizeSource(requestedSource, documentType);

        if (documentId != null) {
            if ("transportation".equals(source)) {
                TransportationRequestEntity entity = transportationRequests
                        .findByIdAndUserIdAndDeletedAtIsNull(documentId, userId)
                        .orElseThrow(() -> new DocumentAccessException("Документ не найден или недоступен текущему пользователю"));
                merged.putAll(entity.asContextMap());
                long sendingCount = transportationRequests.countSendings(documentId);
                merged.put("Sendings", sendingCount == 0 ? List.of() : List.of("Количество отправок: " + sendingCount));
                documentType = "transportation_request";
                databaseBacked = true;
            } else {
                StudentDocumentEntity entity = studentDocuments
                        .findByIdAndUserIdAndDeletedAtIsNull(documentId, userId)
                        .orElseThrow(() -> new DocumentAccessException("Документ не найден или недоступен текущему пользователю"));
                merged.putAll(entity.getPayload());
                documentType = catalog.normalizeType(entity.getDocumentType());
                source = "student";
                databaseBacked = true;
            }
        }

        Map<String, Object> safeClientValues = clientValues == null ? Map.of() : clientValues;
        merged.putAll(safeClientValues);

        if (documentType == null && merged.isEmpty()) {
            return DocumentContext.empty(currentStep);
        }

        List<ValidationIssue> issues = validationService.validate(documentType, merged);
        List<String> filledFields = new ArrayList<>();
        merged.forEach((key, value) -> {
            if (!isEmpty(value) && !isTechnicalField(key)) {
                filledFields.add(key);
            }
        });
        List<String> unfilledRequired = catalog.requiredFields(documentType).entrySet().stream()
                .filter(entry -> isEmpty(merged.get(entry.getKey())))
                .map(entry -> entry.getValue().label())
                .toList();

        return new DocumentContext(
                source,
                documentType,
                catalog.label(documentType),
                documentId,
                currentStep,
                databaseBacked,
                !safeClientValues.isEmpty(),
                List.copyOf(filledFields),
                unfilledRequired,
                sanitizer.flatten(merged),
                issues
        );
    }

    private String normalizeSource(String requestedSource, String documentType) {
        if (requestedSource == null || requestedSource.isBlank()) {
            return "transportation_request".equals(documentType) ? "transportation" : "student";
        }
        String source = requestedSource.trim().toLowerCase();
        if (!"student".equals(source) && !"transportation".equals(source)) {
            throw new IllegalArgumentException("Неизвестный источник документа");
        }
        return source;
    }

    private boolean isTechnicalField(String key) {
        return "backendId".equals(key) || "createdAt".equals(key) || "change_history".equals(key);
    }

    private boolean isEmpty(Object value) {
        if (value == null) return true;
        if (value instanceof String text) return text.isBlank();
        if (value instanceof Iterable<?> iterable) return !iterable.iterator().hasNext();
        if (value instanceof Map<?, ?> map) return map.isEmpty();
        return false;
    }
}
