package abopijservice.code.aiirtran.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Immutable
@Table(name = "requests_transportation")
public class TransportationRequestEntity {

    @Id
    private Long id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "id_document_type")
    private Long documentTypeId;

    @Column(name = "registration_date")
    private LocalDateTime registrationDate;

    @Column(name = "transportation_date_from")
    private LocalDateTime transportationDateFrom;

    @Column(name = "transportation_date_to")
    private LocalDateTime transportationDateTo;

    @Column(name = "id_message_type")
    private Long messageTypeId;

    @Column(name = "id_sign_sending")
    private Long sendingSignId;

    @Column(name = "id_country_departure")
    private Long departureCountryId;

    @Column(name = "id_station_departure")
    private Long departureStationId;

    @Column(name = "id_shipper")
    private Long shipperId;

    @Column(name = "id_carriage_ownership")
    private Long carriageOwnershipId;

    @Column(name = "id_loading_organizer")
    private Long loadingOrganizerId;

    @Column(name = "id_cargo_group")
    private Long cargoGroupId;

    @Column(name = "id_method_submission")
    private Long submissionMethodId;

    @Column(name = "description")
    private String description;

    @Column(name = "document_status")
    private Integer documentStatus;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected TransportationRequestEntity() {
    }

    public Long getId() {
        return id;
    }

    public Map<String, Object> asContextMap() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("id_document_type", documentTypeId);
        result.put("registration_date", registrationDate);
        result.put("transportation_date_from", transportationDateFrom);
        result.put("transportation_date_to", transportationDateTo);
        result.put("id_message_type", messageTypeId);
        result.put("id_sign_sending", sendingSignId);
        result.put("id_country_departure", departureCountryId);
        result.put("id_station_departure", departureStationId);
        result.put("id_shipper", shipperId);
        result.put("id_carriage_ownership", carriageOwnershipId);
        result.put("id_loading_organizer", loadingOrganizerId);
        result.put("id_cargo_group", cargoGroupId);
        result.put("id_method_submission", submissionMethodId);
        result.put("description", description);
        result.put("document_status", documentStatus);
        return result;
    }
}
