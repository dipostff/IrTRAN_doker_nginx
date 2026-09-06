package abopijservice.code.aiirtran.controller;

import abopijservice.code.aiirtran.api.AiChatRequest;
import abopijservice.code.aiirtran.api.AiChatResponse;
import abopijservice.code.aiirtran.api.AiStatusResponse;
import abopijservice.code.aiirtran.api.DocumentContext;
import abopijservice.code.aiirtran.api.DocumentContextRequest;
import abopijservice.code.aiirtran.service.IrtranAiAgentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {

    private final IrtranAiAgentService agentService;

    public AiAssistantController(IrtranAiAgentService agentService) {
        this.agentService = agentService;
    }

    @GetMapping("/status")
    public AiStatusResponse status() {
        return agentService.status();
    }

    @PostMapping("/chat")
    public AiChatResponse chat(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AiChatRequest request) {
        return agentService.chat(principalId(jwt), request);
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AiChatRequest request) {
        return agentService.streamChat(principalId(jwt), request);
    }

    @PostMapping("/validate")
    public DocumentContext validate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DocumentContextRequest request) {
        return agentService.validate(principalId(jwt), request);
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> clearSession(@AuthenticationPrincipal Jwt jwt, @PathVariable String sessionId) {
        agentService.clearSession(principalId(jwt), sessionId);
        return ResponseEntity.noContent().build();
    }

    private String principalId(Jwt jwt) {
        if (StringUtils.hasText(jwt.getSubject())) {
            return jwt.getSubject();
        }
        String sessionId = jwt.getClaimAsString("sid");
        if (StringUtils.hasText(sessionId)) {
            return "keycloak-session:" + sessionId;
        }
        throw new IllegalArgumentException("Токен не содержит идентификатор пользователя или сессии");
    }
}
