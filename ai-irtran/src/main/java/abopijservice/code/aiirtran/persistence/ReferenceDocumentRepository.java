package abopijservice.code.aiirtran.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReferenceDocumentRepository extends JpaRepository<ReferenceDocumentEntity, Long> {

    @Query("""
            select r from ReferenceDocumentEntity r
            where lower(coalesce(r.title, '')) like lower(concat('%', :query, '%'))
               or lower(coalesce(r.textContent, '')) like lower(concat('%', :query, '%'))
            order by r.updatedAt desc, r.id desc
            """)
    List<ReferenceDocumentEntity> search(@Param("query") String query, Pageable pageable);
}
