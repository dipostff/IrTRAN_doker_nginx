package abopijservice.code.aiirtran.tool;

import abopijservice.code.aiirtran.service.DocumentDefinitionCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class ContextRetrievalAugmentationTools {

    private static final Logger log = LoggerFactory.getLogger(ContextRetrievalAugmentationTools.class);
    private static final String CONTEXT_RESOURCE_ROOT = "classpath:/dataset/context/";
    private static final int MAX_COMPLETE_DOCUMENT_CHARACTERS = 40_000;
    private static final int MAX_LARGE_DOCUMENT_CHARACTERS = 60_000;
    private static final Set<String> QUERY_STOP_WORDS = Set.of(
            "документ", "документа", "форму", "форма", "проверь", "проверить", "ошибка", "ошибки",
            "поле", "поля", "значение", "значения", "справочник", "справочника", "текущий", "текущего"
    );

    /**
     * Связь типов документов с теми справочниками, которые фактически используются
     * соответствующими формами IrTRAN.
     */
    private static final HashMap<String, List<String>> CONTEXT_FILES_BY_DOCUMENT_TYPE = createContextFilesMap();

    private final ResourceLoader resourceLoader;
    private final DocumentDefinitionCatalog documentCatalog;

    public ContextRetrievalAugmentationTools(
            ResourceLoader resourceLoader,
            DocumentDefinitionCatalog documentCatalog
    ) {
        this.resourceLoader = resourceLoader;
        this.documentCatalog = documentCatalog;
    }

    @Tool(name = "load_document_reference_context", description = """
            Загрузить полный набор справочников, относящихся к указанному типу документа ЭТРАН.
            Используй инструмент, когда нужно проверить выбранные справочные значения, объяснить код,
            станцию, организацию, груз, вид отправки, подвижной состав или другой элемент справочника.
            Передай технический documentType текущей формы.
            """)
    public ContextAugmentationResult loadDocumentReferenceContext(
            @ToolParam(description = "Технический тип документа, например invoice или transportation_request")
            String documentType,
            ToolContext toolContext
    ) {
        String normalizedType = documentCatalog.normalizeType(documentType);
        List<String> filenames = CONTEXT_FILES_BY_DOCUMENT_TYPE.get(normalizedType);
        if (filenames == null) {
            log.warn("AI tool failed: load_document_reference_context documentType={} reason=unsupported_type", documentType);
            throw new IllegalArgumentException("Для типа документа не настроены справочные материалы: " + documentType);
        }

        log.info(
                "AI tool invoked: load_document_reference_context documentType={} dictionaries={}",
                normalizedType,
                filenames.size()
        );

        String userMessage = contextValue(toolContext, "userMessage");
        List<String> queryTerms = queryTerms(userMessage);
        List<ReferenceContextDocument> documents = new ArrayList<>(filenames.size());
        long sourceCharacters = 0;
        long returnedCharacters = 0;
        for (String filename : filenames) {
            String content = readContextFile(filename);
            ReducedDocument reduced = reduceDocument(content, queryTerms);
            sourceCharacters += content.length();
            returnedCharacters += reduced.markdown().length();
            documents.add(new ReferenceContextDocument(
                    filename,
                    reduced.markdown(),
                    reduced.truncated(),
                    content.length(),
                    reduced.matchedRows()
            ));
        }

        log.info(
                "AI tool completed: load_document_reference_context documentType={} dictionaries={} sourceCharacters={} returnedCharacters={} queryTerms={}",
                normalizedType,
                documents.size(),
                sourceCharacters,
                returnedCharacters,
                queryTerms.size()
        );
        return new ContextAugmentationResult(normalizedType, List.copyOf(documents));
    }

    private ReducedDocument reduceDocument(String content, List<String> queryTerms) {
        if (content.length() <= MAX_COMPLETE_DOCUMENT_CHARACTERS) {
            return new ReducedDocument(content, false, countDataRows(content));
        }

        List<String> lines = content.lines().toList();
        int firstDataLine = findFirstDataLine(lines);
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < firstDataLine; index++) {
            result.append(lines.get(index)).append('\n');
        }

        List<ScoredLine> matches = new ArrayList<>();
        for (int index = firstDataLine; index < lines.size(); index++) {
            String line = lines.get(index);
            int score = relevanceScore(line, queryTerms);
            if (score > 0) matches.add(new ScoredLine(index, score, line));
        }
        matches.sort(Comparator.comparingInt(ScoredLine::score).reversed().thenComparingInt(ScoredLine::index));

        if (matches.isEmpty()) {
            result.append('\n')
                    .append("> Большой справочник сокращён: подходящие строки не найдены. ")
                    .append("Для точного поиска укажите код или часть наименования.\n");
            return new ReducedDocument(result.toString(), true, 0);
        }

        result.append('\n')
                .append("> Большой справочник сокращён до строк, релевантных текущему вопросу.\n\n");
        int matchedRows = 0;
        for (ScoredLine match : matches) {
            if (result.length() + match.line().length() + 1 > MAX_LARGE_DOCUMENT_CHARACTERS) break;
            result.append(match.line()).append('\n');
            matchedRows++;
        }
        return new ReducedDocument(result.toString(), true, matchedRows);
    }

    private int findFirstDataLine(List<String> lines) {
        for (int index = 0; index < lines.size(); index++) {
            if (lines.get(index).startsWith("| ---")) return index + 1;
        }
        return Math.min(lines.size(), 10);
    }

    private int relevanceScore(String line, List<String> queryTerms) {
        if (queryTerms.isEmpty() || !line.startsWith("| ")) return 0;
        String normalizedLine = line.toLowerCase(Locale.ROOT);
        int score = 0;
        for (String term : queryTerms) {
            if (normalizedLine.contains(term)) score += Math.max(2, term.length());
        }
        return score;
    }

    private List<String> queryTerms(String query) {
        if (query == null || query.isBlank()) return List.of();
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}-]+")) {
            if (token.length() >= 3 && !QUERY_STOP_WORDS.contains(token)) result.add(token);
        }
        return List.copyOf(result);
    }

    private int countDataRows(String content) {
        List<String> lines = content.lines().toList();
        int firstDataLine = findFirstDataLine(lines);
        int count = 0;
        for (int index = firstDataLine; index < lines.size(); index++) {
            if (lines.get(index).startsWith("| ")) count++;
        }
        return count;
    }

    private String contextValue(ToolContext toolContext, String key) {
        if (toolContext == null) return null;
        Object value = toolContext.getContext().get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String readContextFile(String filename) {
        Resource resource = resourceLoader.getResource(CONTEXT_RESOURCE_ROOT + filename);
        if (!resource.exists() || !resource.isReadable()) {
            log.error("Reference context resource is unavailable: {}", filename);
            throw new IllegalStateException("Справочник недоступен: " + filename);
        }
        try {
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            log.error("Failed to read reference context resource: {}", filename, exception);
            throw new IllegalStateException("Не удалось прочитать справочник: " + filename, exception);
        }
    }

    private static HashMap<String, List<String>> createContextFilesMap() {
        HashMap<String, List<String>> result = new HashMap<>();
        result.put("transportation_request", List.of(
                "signs_sending.md",
                "countries.md",
                "stations.md",
                "legal_entities.md",
                "ownerships.md",
                "owners_non_public_railway.md",
                "cargo_groups.md",
                "methods_submission.md",
                "cargo.md",
                "transport_package_types.md",
                "send_types.md",
                "rolling_stock_types.md",
                "speed_types.md",
                "destination_indications.md",
                "contracts.md"
        ));
        result.put("invoice", List.of(
                "stations.md",
                "legal_entities.md",
                "send_types.md",
                "countries.md",
                "speed_types.md",
                "rolling_stock_types.md",
                "ownerships.md",
                "cargo.md",
                "transport_package_types.md"
        ));
        result.put("reminder", List.of(
                "stations.md",
                "owners_non_public_railway.md",
                "cargo.md"
        ));
        result.put("common_act", List.of("stations.md"));
        result.put("commercial_act", List.of("stations.md", "speed_types.md"));
        result.put("filling_statement", List.of(
                "stations.md",
                "contracts.md",
                "owners_non_public_railway.md",
                "legal_entities.md",
                "cargo.md",
                "rolling_stock_types.md",
                "ownerships.md"
        ));
        result.put("cumulative_statement", List.of("legal_entities.md"));
        return result;
    }

    public record ContextAugmentationResult(
            String documentType,
            List<ReferenceContextDocument> documents
    ) {
    }

    public record ReferenceContextDocument(
            String filename,
            String markdown,
            boolean truncated,
            int sourceCharacters,
            int matchedRows
    ) {
    }

    private record ReducedDocument(String markdown, boolean truncated, int matchedRows) {
    }

    private record ScoredLine(int index, int score, String line) {
    }
}
