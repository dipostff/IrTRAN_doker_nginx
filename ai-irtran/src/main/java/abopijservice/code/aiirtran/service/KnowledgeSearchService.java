package abopijservice.code.aiirtran.service;

import abopijservice.code.aiirtran.api.KnowledgeSource;
import abopijservice.code.aiirtran.persistence.ReferenceDocumentEntity;
import abopijservice.code.aiirtran.persistence.ReferenceDocumentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class KnowledgeSearchService {

    private static final Set<String> STOP_WORDS = Set.of(
            "какие", "какой", "какая", "почему", "зачем", "когда", "куда", "нужно", "надо", "поле", "документ"
    );

    private final ReferenceDocumentRepository repository;

    public KnowledgeSearchService(ReferenceDocumentRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<KnowledgeSource> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        LinkedHashSet<String> terms = new LinkedHashSet<>();
        String normalized = query.trim().replaceAll("\\s+", " ");
        if (normalized.length() > 160) normalized = normalized.substring(0, 160);
        terms.add(normalized);
        for (String token : normalized.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}-]+")) {
            if (token.length() >= 4 && !STOP_WORDS.contains(token)) {
                terms.add(token);
            }
            if (terms.size() >= 5) break;
        }

        Map<Long, KnowledgeSource> results = new LinkedHashMap<>();
        for (String term : terms) {
            for (ReferenceDocumentEntity document : repository.search(term, PageRequest.of(0, 4))) {
                results.putIfAbsent(document.getId(), toExcerpt(document, term));
                if (results.size() >= 4) {
                    return List.copyOf(results.values());
                }
            }
        }
        return List.copyOf(results.values());
    }

    private KnowledgeSource toExcerpt(ReferenceDocumentEntity document, String term) {
        String text = document.getTextContent() == null ? "" : document.getTextContent().replaceAll("\\s+", " ").trim();
        int center = text.toLowerCase(Locale.ROOT).indexOf(term.toLowerCase(Locale.ROOT));
        if (center < 0) center = 0;
        int from = Math.max(0, center - 180);
        int to = Math.min(text.length(), center + term.length() + 420);
        String excerpt = text.substring(from, to);
        if (from > 0) excerpt = "…" + excerpt;
        if (to < text.length()) excerpt = excerpt + "…";
        return new KnowledgeSource(document.getId(), document.getTitle(), document.getFilename(), excerpt);
    }
}
