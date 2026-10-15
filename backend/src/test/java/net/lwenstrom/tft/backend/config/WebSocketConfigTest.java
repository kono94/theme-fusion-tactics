package net.lwenstrom.tft.backend.config;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

class WebSocketConfigTest {

    @Test
    void registersHostedEndpointWithConfiguredOriginPolicy() {
        var interceptor = mock(ClientUserAgentHandshakeInterceptor.class);
        var origins = new String[] {"http://127.0.0.1:*"};
        var registry = mock(StompEndpointRegistry.class);
        var endpoint = mock(StompWebSocketEndpointRegistration.class);
        when(registry.addEndpoint("/tft-websocket")).thenReturn(endpoint);
        when(endpoint.addInterceptors(interceptor)).thenReturn(endpoint);
        new WebSocketConfig(origins, interceptor, mock(BackpressureWebSocketHandlerDecorator.class))
                .registerStompEndpoints(registry);
        verify(endpoint).setAllowedOriginPatterns(origins);
    }

    @Test
    void configuresBoundedTransportLimitsAndBackpressureDecorator() {
        var handshakeInterceptor = mock(ClientUserAgentHandshakeInterceptor.class);
        var decorator = mock(BackpressureWebSocketHandlerDecorator.class);
        var config = new WebSocketConfig(new String[] {"http://localhost:*"}, handshakeInterceptor, decorator);
        var registration = mock(WebSocketTransportRegistration.class);
        when(registration.setSendTimeLimit(BackpressureWebSocketHandlerDecorator.SEND_TIMEOUT_MILLIS))
                .thenReturn(registration);
        when(registration.setSendBufferSizeLimit(BackpressureWebSocketHandlerDecorator.OUTBOUND_BUFFER_SIZE_LIMIT))
                .thenReturn(registration);

        config.configureWebSocketTransport(registration);

        verify(registration).setSendTimeLimit(BackpressureWebSocketHandlerDecorator.SEND_TIMEOUT_MILLIS);
        verify(registration).setSendBufferSizeLimit(BackpressureWebSocketHandlerDecorator.OUTBOUND_BUFFER_SIZE_LIMIT);
        verify(registration).addDecoratorFactory(decorator);
    }
}
