package abopijservice.code.aiirtran.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.temporal.TemporalAccessor;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class ContextSanitizer {

    private static final Set<String> SENSITIVE_PARTS = Set.of(
            "password", "secret", "token", "authorization", "screenshot", "binary", "file_content"
    );

    private final int maxFields;

    public ContextSanitizer(@Value("${irtran.ai.max-context-fields:120}") int maxFields) {
        this.maxFields = Math.max(20, maxFields);
    }

    public Map<String, Object> flatten(Map<String, Object> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        walk(source, "", result, 0);
        return Map.copyOf(result);
    }

    private void walk(Object value, String path, Map<String, Object> target, int depth) {
        if (target.size() >= maxFields || depth > 5 || value == null) {
            return;
        }
        if (value instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                if (isSensitive(key)) continue;
                walk(entry.getValue(), join(path, key), target, depth + 1);
                if (target.size() >= maxFields) break;
            }
            return;
        }
        if (value instanceof Iterable<?> iterable) {
            int index = 0;
            for (Object item : iterable) {
                if (index >= 20 || target.size() >= maxFields) break;
                walk(item, path + "[" + index + "]", target, depth + 1);
                index++;
            }
            if (index == 0 && !path.isBlank()) {
                target.put(path, "не заполнено");
            }
            return;
        }
        if (path.isBlank()) {
            return;
        }
        if (value instanceof String text) {
            if (text.isBlank()) return;
            target.put(path, text.length() > 500 ? text.substring(0, 500) + "…" : text);
        } else if (value instanceof Number || value instanceof Boolean || value instanceof Enum<?> || value instanceof TemporalAccessor) {
            target.put(path, value);
        } else {
            String text = String.valueOf(value);
            target.put(path, text.length() > 500 ? text.substring(0, 500) + "…" : text);
        }
    }

    private boolean isSensitive(String key) {
        String normalized = key.toLowerCase(Locale.ROOT);
        return SENSITIVE_PARTS.stream().anyMatch(normalized::contains);
    }

    private String join(String path, String key) {
        return path.isBlank() ? key : path + "." + key;
    }
}
