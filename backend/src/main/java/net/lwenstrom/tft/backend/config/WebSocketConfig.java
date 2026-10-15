package net.lwenstrom.tft.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOriginPatterns;
    private final ClientUserAgentHandshakeInterceptor clientUserAgentHandshakeInterceptor;
    private final BackpressureWebSocketHandlerDecorator backpressureWebSocketHandlerDecorator;

    public WebSocketConfig(
            @Value("${app.websocket.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}")
                    String[] allowedOriginPatterns,
            ClientUserAgentHandshakeInterceptor clientUserAgentHandshakeInterceptor,
            BackpressureWebSocketHandlerDecorator backpressureWebSocketHandlerDecorator) {
        this.allowedOriginPatterns = allowedOriginPatterns;
        this.clientUserAgentHandshakeInterceptor = clientUserAgentHandshakeInterceptor;
        this.backpressureWebSocketHandlerDecorator = backpressureWebSocketHandlerDecorator;
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

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration
                .setSendTimeLimit(BackpressureWebSocketHandlerDecorator.SEND_TIMEOUT_MILLIS)
                .setSendBufferSizeLimit(BackpressureWebSocketHandlerDecorator.OUTBOUND_BUFFER_SIZE_LIMIT)
                .addDecoratorFactory(backpressureWebSocketHandlerDecorator);
    }
}
