package abopijservice.code.aiirtran.api;

import java.util.List;

public record AiStatusResponse(
        boolean available,
        String model,
        List<String> capabilities,
        String message
) {
}
