package net.lwenstrom.tft.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOriginPatterns;
    private final ClientUserAgentHandshakeInterceptor clientUserAgentHandshakeInterceptor;

    public WebSocketConfig(
            @Value("${app.websocket.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}")
                    String[] allowedOriginPatterns,
            ClientUserAgentHandshakeInterceptor clientUserAgentHandshakeInterceptor) {
        this.allowedOriginPatterns = allowedOriginPatterns;
        this.clientUserAgentHandshakeInterceptor = clientUserAgentHandshakeInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/tft-websocket")
                .addInterceptors(clientUserAgentHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOriginPatterns);
    }
}
