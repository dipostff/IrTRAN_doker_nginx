package abopijservice.code.aiirtran;

import abopijservice.code.aiirtran.service.DocumentDefinitionCatalog;
import abopijservice.code.aiirtran.tool.ContextRetrievalAugmentationTools;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class ContextRetrievalAugmentationToolsTest {

    private ContextRetrievalAugmentationTools tools;

    @BeforeEach
    void setUp() {
        tools = new ContextRetrievalAugmentationTools(
                new DefaultResourceLoader(),
                new DocumentDefinitionCatalog()
        );
    }

    @Test
    void loadsEveryTransportationReferenceAsMarkdown() {
        ContextRetrievalAugmentationTools.ContextAugmentationResult result =
                tools.loadDocumentReferenceContext(
                        "transportation",
                        new ToolContext(Map.of("userMessage", "Проверь текущий документ"))
                );

        assertThat(result.documentType()).isEqualTo("transportation_request");
        assertThat(result.documents())
                .hasSize(15)
                .extracting(ContextRetrievalAugmentationTools.ReferenceContextDocument::filename)
                .contains("cargo.md", "stations.md", "contracts.md");
        assertThat(result.documents())
                .allSatisfy(document -> assertThat(document.markdown())
                        .startsWith("# Справочник:")
                        .contains("| ---"));
        assertThat(result.documents())
                .filteredOn(document -> document.filename().equals("cargo.md"))
                .singleElement()
                .satisfies(document -> {
                    assertThat(document.truncated()).isTrue();
                    assertThat(document.markdown()).hasSizeLessThan(2_000);
                    assertThat(document.matchedRows()).isZero();
                });
    }

    @Test
    void loadsOnlyReferencesUsedByCommercialAct() {
        ContextRetrievalAugmentationTools.ContextAugmentationResult result =
                tools.loadDocumentReferenceContext(
                        "commercial_act",
                        new ToolContext(Map.of("userMessage", "Какие бывают скорости?"))
                );

        assertThat(result.documents())
                .extracting(ContextRetrievalAugmentationTools.ReferenceContextDocument::filename)
                .containsExactly("stations.md", "speed_types.md");
    }

    @Test
    void rejectsUnsupportedDocumentType() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> tools.loadDocumentReferenceContext(
                        "unknown_document",
                        new ToolContext(Map.of("userMessage", "Проверка"))
                ))
                .withMessageContaining("не настроены");
    }

    @Test
    void selectsRelevantRowsFromLargeCargoDictionary() {
        ContextRetrievalAugmentationTools.ContextAugmentationResult result =
                tools.loadDocumentReferenceContext(
                        "invoice",
                        new ToolContext(Map.of("userMessage", "Найди груз каменный уголь"))
                );

        assertThat(result.documents())
                .filteredOn(document -> document.filename().equals("cargo.md"))
                .singleElement()
                .satisfies(document -> {
                    assertThat(document.truncated()).isTrue();
                    assertThat(document.matchedRows()).isPositive();
                    assertThat(document.markdown()).containsIgnoringCase("уголь");
                    assertThat(document.markdown()).hasSizeLessThan(60_001);
                });
    }
}
