package abopijservice.code.aiirtran.service;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class DocumentDefinitionCatalog {

    private final Map<String, DocumentDefinition> definitions = createDefinitions();

    public String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        String normalized = type.trim().toLowerCase(Locale.ROOT);
        return "transportation".equals(normalized) ? "transportation_request" : normalized;
    }

    public String label(String type) {
        DocumentDefinition definition = definitions.get(normalizeType(type));
        return definition == null ? (type == null ? "Общая консультация" : type) : definition.label();
    }

    public Map<String, FieldDefinition> requiredFields(String type) {
        DocumentDefinition definition = definitions.get(normalizeType(type));
        return definition == null ? Map.of() : definition.requiredFields();
    }

    public Optional<FieldDefinition> findField(String type, String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return Optional.empty();
        }
        DocumentDefinition definition = definitions.get(normalizeType(type));
        if (definition == null) {
            return Optional.empty();
        }
        String requested = fieldName.trim().toLowerCase(Locale.ROOT);
        return definition.fields().values().stream()
                .filter(field -> field.name().equalsIgnoreCase(requested)
                        || field.label().toLowerCase(Locale.ROOT).contains(requested))
                .findFirst();
    }

    public FieldDefinition describeField(String type, String fieldName) {
        return findField(type, fieldName).orElseGet(() -> new FieldDefinition(
                fieldName,
                humanize(fieldName),
                "Поле относится к текущему документу. Точное правило следует подтвердить в учебных материалах.",
                false
        ));
    }

    public String humanize(String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return "Поле";
        }
        String value = fieldName.replace('_', ' ').trim();
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private Map<String, DocumentDefinition> createDefinitions() {
        Map<String, DocumentDefinition> result = new LinkedHashMap<>();
        result.put("transportation_request", definition("Заявка на грузоперевозку",
                field("id_document_type", "Тип документа", "Определяет вид оформляемой заявки.", true),
                field("registration_date", "Дата регистрации", "Дата регистрации заявки.", true),
                field("transportation_date_from", "Начало периода перевозки", "Начальная дата должна быть не позже конечной.", true),
                field("transportation_date_to", "Окончание периода перевозки", "Период перевозки не должен превышать 45 дней.", true),
                field("id_message_type", "Вид сообщения", "Выбирается из справочника видов сообщения.", true),
                field("id_sign_sending", "Признак отправки", "Характеризует оформляемую отправку.", true),
                field("id_country_departure", "Страна отправления", "Страна отправления или входа груза.", true),
                field("id_station_departure", "Станция отправления", "Станция отправления или входа в сеть.", true),
                field("id_shipper", "Грузоотправитель", "Организация, передающая груз к перевозке.", true),
                field("id_carriage_ownership", "Принадлежность вагонов", "Категория принадлежности подвижного состава.", true),
                field("id_cargo_group", "Группа груза", "Выбирается с учётом станции и справочника грузов.", true),
                field("id_method_submission", "Способ подачи", "Способ подачи заявки перевозчику.", true),
                field("Sendings", "Отправки", "В заявке должна быть хотя бы одна отправка.", true)));

        result.put("invoice", definition("Накладная",
                field("invoice_type", "Тип накладной", "Определяет назначение и форму накладной.", true),
                field("id_blank_type", "Тип бланка", "Форма перевозочного документа.", true),
                field("id_station_departure", "Станция отправления", "Станция приёма груза к перевозке.", true),
                field("id_station_destination", "Станция назначения", "Станция выдачи груза.", true),
                field("id_shipper", "Грузоотправитель", "Сторона, предъявляющая груз к перевозке.", true),
                field("id_receiver", "Грузополучатель", "Конечный получатель груза, идентифицируемый по справочнику.", true),
                field("id_send_type", "Вид отправки", "Категория отправки по правилам перевозки.", true),
                field("id_speed_type", "Скорость", "Выбранный режим скорости перевозки.", true)));

        result.put("reminder", definition("Памятка приёмосдатчика",
                field("reminder_type", "Тип памятки", "Указывает, оформляется памятка на подачу или уборку вагонов.", true),
                field("id_station", "Станция", "Станция выполнения операции.", true)));

        result.put("common_act", definition("Акт общей формы ГУ 23",
                field("id_station", "Станция составления", "Станция, на которой составлен акт.", true),
                field("act_date", "Дата акта", "Дата фактического составления акта.", true),
                field("downtime_type", "Тип простоя", "Указывается тип простоя либо содержательное описание обстоятельств.", false),
                field("description", "Описание", "Фактические обстоятельства, зафиксированные актом.", false)));

        result.put("commercial_act", definition("Коммерческий акт ГУ 22",
                field("train_number", "Номер поезда", "Номер поезда, с которым прибыл объект проверки.", true),
                field("arrival_date", "Дата прибытия", "Дата прибытия поезда или груза.", true),
                field("arrival_time", "Время прибытия", "Фактическое время прибытия.", true),
                field("id_speed_type", "Скорость", "Вид скорости из справочника.", true)));

        result.put("filling_statement", definition("Ведомость подачи и уборки",
                field("id_station", "Станция", "Станция выполнения операций подачи и уборки.", true),
                field("id_contract", "Договор", "Договор, на основании которого выполняются операции.", true),
                field("id_payer", "Плательщик", "Организация, отвечающая за оплату начислений.", true),
                field("place_of_calculation", "Место расчёта", "Подразделение или место выполнения расчётов.", true)));

        result.put("cumulative_statement", definition("Накопительная ведомость",
                field("period_from", "Начало периода", "Начальная дата расчётного периода.", true),
                field("period_to", "Окончание периода", "Конечная дата не должна быть раньше начальной.", true),
                field("id_carrier_org", "Организация перевозчик", "Организация, оказывающая услуги перевозки.", true),
                field("id_payer", "Плательщик", "Организация, отвечающая за оплату.", true),
                field("place_of_calculation", "Место расчёта", "Место оформления расчётных данных.", true)));
        return Map.copyOf(result);
    }

    private DocumentDefinition definition(String label, FieldDefinition... fields) {
        Map<String, FieldDefinition> all = new LinkedHashMap<>();
        Map<String, FieldDefinition> required = new LinkedHashMap<>();
        for (FieldDefinition field : fields) {
            all.put(field.name(), field);
            if (field.required()) {
                required.put(field.name(), field);
            }
        }
        return new DocumentDefinition(label, Map.copyOf(all), Map.copyOf(required));
    }

    private FieldDefinition field(String name, String label, String description, boolean required) {
        return new FieldDefinition(name, label, description, required);
    }

    private record DocumentDefinition(
            String label,
            Map<String, FieldDefinition> fields,
            Map<String, FieldDefinition> requiredFields
    ) {
    }

    public record FieldDefinition(String name, String label, String description, boolean required) {
    }
}
