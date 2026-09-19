package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import net.lwenstrom.tft.backend.BackendApplication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(
        classes = BackendApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=jdbc:sqlite:file:action-ack-test?mode=memory&cache=shared&foreign_keys=on",
            "analytics.admin.password=tft123"
        })
class GameActionAcknowledgementWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    private WebSocketStompClient stompClient;

    @AfterEach
    void stopClient() {
        if (stompClient != null) {
            stompClient.stop();
        }
    }

    @Test
    void receivesCorrelatedActionResultThroughTheConfiguredSimpleBroker() throws Exception {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        var session = stompClient
                .connectAsync("ws://localhost:" + port + "/tft-websocket", new StompSessionHandlerAdapter() {})
                .get(Duration.ofSeconds(5).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
        try {
            var roomResult = new CompletableFuture<String>();
            var actionResult = new CompletableFuture<String>();
            session.subscribe("/user/queue/room-result", stringFrameHandler(roomResult));
            session.subscribe("/user/queue/action-result", stringFrameHandler(actionResult));

            var roomId = "ack-" + UUID.randomUUID().toString().substring(0, 20);
            session.send(
                    "/app/create",
                    ("{\"roomId\":\"" + roomId + "\",\"playerName\":\"Host\"}").getBytes(StandardCharsets.UTF_8));
            assertTrue(roomResult
                    .get(Duration.ofSeconds(5).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)
                    .contains("\"accepted\":true"));

            var clientActionId = UUID.randomUUID().toString();
            session.send(
                    "/app/room/" + roomId + "/action",
                    ("{\"type\":\"EXP\",\"playerId\":\"spoofed\",\"clientActionId\":\"" + clientActionId + "\"}")
                            .getBytes(StandardCharsets.UTF_8));

            var result = actionResult.get(Duration.ofSeconds(5).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
            assertTrue(result.contains("\"clientActionId\":\"" + clientActionId + "\""));
            assertTrue(result.contains("\"actionType\":\"EXP\""));
            assertTrue(result.contains("\"outcome\":\"rejected\""));
            assertTrue(result.contains("\"reason\":\"unauthorized\""));
        } finally {
            session.disconnect();
        }
    }

    private StompFrameHandler stringFrameHandler(CompletableFuture<String> result) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                result.complete(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        };
    }
}
