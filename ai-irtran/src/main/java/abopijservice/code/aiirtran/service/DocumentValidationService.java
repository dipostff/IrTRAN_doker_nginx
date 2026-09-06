package abopijservice.code.aiirtran.service;

import abopijservice.code.aiirtran.api.ValidationIssue;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static abopijservice.code.aiirtran.api.ValidationIssue.Severity.ERROR;

@Service
public class DocumentValidationService {

    private static final Set<String> WEIGHT_FIELDS = Set.of(
            "weight", "weight_kg", "mass", "mass_kg", "total_mass_kg", "gross_weight"
    );
    private static final Set<String> PLACES_FIELDS = Set.of(
            "places", "places_count", "count_places", "package_count", "cargo_places"
    );

    private final DocumentDefinitionCatalog catalog;

    public DocumentValidationService(DocumentDefinitionCatalog catalog) {
        this.catalog = catalog;
    }

    public List<ValidationIssue> validate(String documentType, Map<String, Object> values) {
        if (documentType == null || values == null || values.isEmpty()) {
            return List.of();
        }

        String normalizedType = catalog.normalizeType(documentType);
        List<ValidationIssue> issues = new ArrayList<>();
        catalog.requiredFields(normalizedType).forEach((name, field) -> {
            if (isEmpty(values.get(name))) {
                issues.add(issue(
                        "required_field",
                        name,
                        field.label(),
                        "Обязательное поле не заполнено.",
                        "Какие сведения из задания или справочника помогут заполнить поле «" + field.label() + "»?"
                ));
            } else if (name.startsWith("id_") && !isPositiveInteger(values.get(name))) {
                issues.add(issue(
                        "invalid_reference_value",
                        name,
                        field.label(),
                        "Выбрано недопустимое значение справочника.",
                        "Получено ли значение поля «" + field.label() + "» из доступного справочника?"
                ));
            }
        });

        if ("common_act".equals(normalizedType)
                && isEmpty(values.get("downtime_type"))
                && isEmpty(values.get("description"))) {
            issues.add(issue(
                    "missing_act_circumstances",
                    "description",
                    "Обстоятельства акта",
                    "Не указан ни тип простоя, ни описание обстоятельств.",
                    "Какое событие должен зафиксировать акт и где оно отражено в форме?"
            ));
        }

        validateDate(values, "registration_date", "Дата регистрации", issues);
        validateDate(values, "act_date", "Дата акта", issues);
        validateDate(values, "arrival_date", "Дата прибытия", issues);
        validateDate(values, "period_from", "Начало периода", issues);
        validateDate(values, "period_to", "Окончание периода", issues);
        validateDate(values, "transportation_date_from", "Начало периода перевозки", issues);
        validateDate(values, "transportation_date_to", "Окончание периода перевозки", issues);
        validateTime(values, "arrival_time", "Время прибытия", issues);

        validateDateRange(values, "period_from", "period_to", "Период ведомости", null, issues);
        validateDateRange(values, "transportation_date_from", "transportation_date_to", "Период перевозки", 45L, issues);
        validateNestedWeightAndPlaces(values, "", issues);
        return List.copyOf(issues);
    }

    private void validateDate(Map<String, Object> values, String field, String label, List<ValidationIssue> issues) {
        Object value = values.get(field);
        if (!isEmpty(value) && toDate(value) == null) {
            issues.add(issue(
                    "invalid_date_format",
                    field,
                    label,
                    "Дата имеет неверный формат.",
                    "Можно ли представить эту дату в формате ГГГГ-ММ-ДД?"
            ));
        }
    }

    private void validateTime(Map<String, Object> values, String field, String label, List<ValidationIssue> issues) {
        Object value = values.get(field);
        if (isEmpty(value) || value instanceof LocalTime) {
            return;
        }
        try {
            LocalTime.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            issues.add(issue(
                    "invalid_time_format",
                    field,
                    label,
                    "Время имеет неверный формат.",
                    "Соответствует ли время формату ЧЧ:ММ?"
            ));
        }
    }

    private void validateDateRange(
            Map<String, Object> values,
            String fromField,
            String toField,
            String label,
            Long maxDays,
            List<ValidationIssue> issues
    ) {
        LocalDate from = toDate(values.get(fromField));
        LocalDate to = toDate(values.get(toField));
        if (from == null || to == null) {
            return;
        }
        if (from.isAfter(to)) {
            issues.add(issue(
                    "invalid_date_order",
                    toField,
                    label,
                    "Конечная дата раньше начальной.",
                    "Как должны соотноситься начало и окончание периода?"
            ));
        } else if (maxDays != null && ChronoUnit.DAYS.between(from, to) > maxDays) {
            issues.add(issue(
                    "period_too_long",
                    toField,
                    label,
                    "Продолжительность периода превышает " + maxDays + " дней.",
                    "Укладывается ли выбранный период в допустимые " + maxDays + " дней?"
            ));
        }
    }

    @SuppressWarnings("unchecked")
    private void validateNestedWeightAndPlaces(Object value, String path, List<ValidationIssue> issues) {
        if (value instanceof Map<?, ?> rawMap) {
            Map<String, Object> map = (Map<String, Object>) rawMap;
            String weightField = findKey(map, WEIGHT_FIELDS);
            String placesField = findKey(map, PLACES_FIELDS);
            BigDecimal weight = weightField == null ? null : toDecimal(map.get(weightField));
            BigDecimal places = placesField == null ? null : toDecimal(map.get(placesField));
            if (weight != null && places != null
                    && weight.compareTo(BigDecimal.ZERO) > 0
                    && places.compareTo(BigDecimal.ZERO) <= 0) {
                String issuePath = join(path, placesField);
                issues.add(issue(
                        "weight_places_mismatch",
                        issuePath,
                        "Количество грузовых мест",
                        "Указана положительная масса груза при нулевом количестве мест.",
                        "Может ли груз с указанной массой иметь нулевое количество грузовых мест?"
                ));
            }
            map.forEach((key, nested) -> validateNestedWeightAndPlaces(nested, join(path, key), issues));
        } else if (value instanceof Iterable<?> iterable) {
            int index = 0;
            for (Object nested : iterable) {
                validateNestedWeightAndPlaces(nested, path + "[" + index + "]", issues);
                index++;
            }
        }
    }

    private String findKey(Map<String, Object> values, Set<String> candidates) {
        return values.keySet().stream()
                .filter(key -> candidates.contains(key.toLowerCase(Locale.ROOT)))
                .findFirst()
                .orElse(null);
    }

    private String join(String path, String field) {
        return path == null || path.isBlank() ? field : path + "." + field;
    }

    private BigDecimal toDecimal(Object value) {
        if (value instanceof Number number) {
            return new BigDecimal(number.toString());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.replace(',', '.').trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private boolean isPositiveInteger(Object value) {
        BigDecimal number = toDecimal(value);
        return number != null
                && number.compareTo(BigDecimal.ZERO) > 0
                && number.stripTrailingZeros().scale() <= 0;
    }

    private LocalDate toDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toLocalDate();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return LocalDate.parse(text.substring(0, Math.min(10, text.length())));
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
    }

    private boolean isEmpty(Object value) {
        if (value == null) return true;
        if (value instanceof String text) return text.isBlank();
        if (value instanceof Iterable<?> iterable) return !iterable.iterator().hasNext();
        if (value instanceof Map<?, ?> map) return map.isEmpty();
        return false;
    }

    private ValidationIssue issue(String code, String field, String label, String message, String question) {
        return new ValidationIssue(code, field, label, ERROR, message, question);
    }
}
