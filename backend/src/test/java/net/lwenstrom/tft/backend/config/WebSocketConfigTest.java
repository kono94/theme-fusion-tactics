package net.lwenstrom.tft.backend.config;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

class WebSocketConfigTest {

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
