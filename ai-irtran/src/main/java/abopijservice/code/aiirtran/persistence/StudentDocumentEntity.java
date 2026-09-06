package abopijservice.code.aiirtran.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Immutable
@Table(name = "student_documents")
public class StudentDocumentEntity {

    @Id
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "document_type", nullable = false)
    private String documentType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "json")
    private Map<String, Object> payload;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    protected StudentDocumentEntity() {
    }

    public Long getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getDocumentType() {
        return documentType;
    }

    public Map<String, Object> getPayload() {
        return payload == null ? Map.of() : payload;
    }
}
