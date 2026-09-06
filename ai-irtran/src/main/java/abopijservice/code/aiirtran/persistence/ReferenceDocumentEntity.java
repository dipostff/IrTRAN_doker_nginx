package abopijservice.code.aiirtran.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

@Entity
@Immutable
@Table(name = "reference_documents")
public class ReferenceDocumentEntity {

    @Id
    private Long id;

    @Column(name = "title")
    private String title;

    @Column(name = "filename")
    private String filename;

    @Column(name = "text_content", columnDefinition = "longtext")
    private String textContent;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected ReferenceDocumentEntity() {
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getFilename() {
        return filename;
    }

    public String getTextContent() {
        return textContent;
    }
}
