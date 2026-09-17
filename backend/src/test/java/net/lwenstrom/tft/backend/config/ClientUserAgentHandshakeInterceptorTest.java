package net.lwenstrom.tft.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import net.lwenstrom.tft.backend.core.observability.ClientUserAgent;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

class ClientUserAgentHandshakeInterceptorTest {

    @Test
    void storesOnlyTheBoundedClassificationInSessionAttributes() {
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36";
        var headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, userAgent);
        var request = mock(ServerHttpRequest.class);
        when(request.getHeaders()).thenReturn(headers);
        var attributes = new HashMap<String, Object>();

        var accepted = new ClientUserAgentHandshakeInterceptor()
                .beforeHandshake(request, mock(ServerHttpResponse.class), mock(WebSocketHandler.class), attributes);

        assertTrue(accepted);
        assertEquals(
                new ClientUserAgent("chrome", "windows", "desktop"), attributes.get(ClientUserAgent.SESSION_ATTRIBUTE));
        assertFalse(attributes.containsValue(userAgent));
    }
}
