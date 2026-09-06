package abopijservice.code.aiirtran;

import abopijservice.code.aiirtran.api.ValidationIssue;
import abopijservice.code.aiirtran.service.DocumentDefinitionCatalog;
import abopijservice.code.aiirtran.service.DocumentValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AiIrtranApplicationTests {

    private DocumentValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new DocumentValidationService(new DocumentDefinitionCatalog());
    }

    @Test
    void reportsMissingRequiredInvoiceField() {
        Map<String, Object> invoice = validInvoice();
        invoice.put("id_receiver", null);

        List<ValidationIssue> issues = validationService.validate("invoice", invoice);

        assertThat(issues).extracting(ValidationIssue::field).contains("id_receiver");
    }

    @Test
    void detectsNestedWeightAndPlacesMismatch() {
        Map<String, Object> invoice = validInvoice();
        invoice.put("goods", List.of(Map.of("total_mass_kg", 1500, "places_count", 0)));

        List<ValidationIssue> issues = validationService.validate("invoice", invoice);

        assertThat(issues).extracting(ValidationIssue::code).contains("weight_places_mismatch");
    }

    @Test
    void acceptsConsistentInvoice() {
        Map<String, Object> invoice = validInvoice();
        invoice.put("goods", List.of(Map.of("total_mass_kg", 1500, "places_count", 12)));

        assertThat(validationService.validate("invoice", invoice)).isEmpty();
    }

    @Test
    void detectsReversedTransportationDates() {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("id_document_type", 4);
        request.put("registration_date", "2026-09-06");
        request.put("transportation_date_from", "2026-10-10");
        request.put("transportation_date_to", "2026-10-01");
        request.put("id_message_type", 1);
        request.put("id_sign_sending", 1);
        request.put("id_country_departure", 1);
        request.put("id_station_departure", 1);
        request.put("id_shipper", 1);
        request.put("id_carriage_ownership", 1);
        request.put("id_cargo_group", 1);
        request.put("id_method_submission", 1);
        request.put("Sendings", List.of(Map.of("id", 1)));

        assertThat(validationService.validate("transportation_request", request))
                .extracting(ValidationIssue::code)
                .contains("invalid_date_order");
    }

    @Test
    void detectsInvalidDateFormat() {
        Map<String, Object> invoice = validInvoice();
        invoice.put("arrival_date", "06.09.2026");

        assertThat(validationService.validate("commercial_act", invoice))
                .extracting(ValidationIssue::code)
                .contains("invalid_date_format");
    }

    @Test
    void rejectsNonPositiveDirectoryIdentifier() {
        Map<String, Object> invoice = validInvoice();
        invoice.put("id_receiver", 0);

        assertThat(validationService.validate("invoice", invoice))
                .extracting(ValidationIssue::code)
                .contains("invalid_reference_value");
    }

    @Test
    void requiresCircumstancesForCommonAct() {
        Map<String, Object> act = Map.of("id_station", 1, "act_date", "2026-09-06");

        assertThat(validationService.validate("common_act", act))
                .extracting(ValidationIssue::code)
                .contains("missing_act_circumstances");
    }

    private Map<String, Object> validInvoice() {
        Map<String, Object> invoice = new LinkedHashMap<>();
        invoice.put("invoice_type", "Накладная на погрузку");
        invoice.put("id_blank_type", 1);
        invoice.put("id_station_departure", 1);
        invoice.put("id_station_destination", 2);
        invoice.put("id_shipper", 3);
        invoice.put("id_receiver", 4);
        invoice.put("id_send_type", 1);
        invoice.put("id_speed_type", 1);
        return invoice;
    }
}
