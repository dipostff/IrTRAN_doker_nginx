package abopijservice.code.aiirtran;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ai-irtran;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.ai.deepseek.api-key=test-key",
        "irtran.ai.configured-api-key=test-key",
        "irtran.security.jwk-set-uri=http://localhost/unused",
        "irtran.security.issuer-uri=http://localhost/realms/test"
})
class AiIrtranContextTest {

    @Test
    void contextLoads() {
    }
}
