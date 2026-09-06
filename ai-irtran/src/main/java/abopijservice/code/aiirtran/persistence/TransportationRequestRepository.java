package abopijservice.code.aiirtran.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TransportationRequestRepository extends JpaRepository<TransportationRequestEntity, Long> {
    Optional<TransportationRequestEntity> findByIdAndUserIdAndDeletedAtIsNull(Long id, String userId);

    @Query(value = "select count(*) from requests_transportation_sending where id_request_transportation = :id", nativeQuery = true)
    long countSendings(@Param("id") Long id);
}
