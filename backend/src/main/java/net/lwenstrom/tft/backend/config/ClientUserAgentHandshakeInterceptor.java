package net.lwenstrom.tft.backend.config;

import java.util.Map;
import net.lwenstrom.tft.backend.core.observability.ClientUserAgent;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
public class ClientUserAgentHandshakeInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler webSocketHandler,
            Map<String, Object> attributes) {
        var userAgent = request.getHeaders().getFirst(HttpHeaders.USER_AGENT);
        attributes.put(ClientUserAgent.SESSION_ATTRIBUTE, ClientUserAgent.classify(userAgent));
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler webSocketHandler,
            Exception exception) {}
}
