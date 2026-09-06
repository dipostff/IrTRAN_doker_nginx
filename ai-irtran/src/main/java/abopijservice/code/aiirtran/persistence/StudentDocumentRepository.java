package abopijservice.code.aiirtran.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentDocumentRepository extends JpaRepository<StudentDocumentEntity, Long> {
    Optional<StudentDocumentEntity> findByIdAndUserIdAndDeletedAtIsNull(Long id, String userId);
}
