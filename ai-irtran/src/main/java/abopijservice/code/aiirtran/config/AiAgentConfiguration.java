package abopijservice.code.aiirtran.config;

import abopijservice.code.aiirtran.tool.IrtranDocumentTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration(proxyBeanMethods = false)
public class AiAgentConfiguration {

    @Bean
    ChatMemory chatMemory(@Value("${irtran.ai.memory-window:24}") int memoryWindow) {
        return MessageWindowChatMemory.builder()
                .maxMessages(Math.max(8, memoryWindow))
                .build();
    }

    @Bean
    ChatClient irtranChatClient(
            ChatClient.Builder builder,
            ChatMemory chatMemory,
            IrtranDocumentTools documentTools,
            @Value("classpath:/prompts/irtran-system-prompt.txt") Resource systemPrompt
    ) throws IOException {
        return builder
                .defaultSystem(systemPrompt.getContentAsString(StandardCharsets.UTF_8))
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .defaultTools(documentTools)
                .build();
    }
}
