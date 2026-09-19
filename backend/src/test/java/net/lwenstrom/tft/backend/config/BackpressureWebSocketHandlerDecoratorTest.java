package net.lwenstrom.tft.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import net.lwenstrom.tft.backend.core.observability.GameTelemetry;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

class BackpressureWebSocketHandlerDecoratorTest {

    @Test
    void coalescesPendingRoomSnapshotsWhilePreservingTheNewestFrame() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-1");
        when(rawSession.isOpen()).thenReturn(true);
        var firstSendStarted = new CountDownLatch(1);
        var releaseFirstSend = new CountDownLatch(1);
        var sentPayloads = new CopyOnWriteArrayList<String>();
        doAnswer(invocation -> {
                    var message = invocation.getArgument(0, WebSocketMessage.class);
                    sentPayloads.add((String) message.getPayload());
                    if (sentPayloads.size() == 1) {
                        firstSendStarted.countDown();
                        releaseFirstSend.await(2, TimeUnit.SECONDS);
                    }
                    return null;
                })
                .when(rawSession)
                .sendMessage(any());

        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);
        var decoratedSession = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);

        var first = stateMessage("first");
        var second = stateMessage("second");
        var newest = stateMessage("newest");
        decoratedSession.sendMessage(first);
        assertTrue(firstSendStarted.await(2, TimeUnit.SECONDS));
        decoratedSession.sendMessage(second);
        decoratedSession.sendMessage(newest);
        releaseFirstSend.countDown();

        awaitPayloadCount(sentPayloads, 2);
        assertEquals(List.of(first.getPayload(), newest.getPayload()), sentPayloads);
        assertTrue(telemetry.backpressureEvents.contains("snapshot_coalesced"));

        decorator.afterConnectionClosed(rawSession, CloseStatus.NORMAL);
    }

    @Test
    void placesNewestSnapshotAfterAnAlreadyQueuedEvent() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-order");
        when(rawSession.isOpen()).thenReturn(true);
        var firstSendStarted = new CountDownLatch(1);
        var releaseFirstSend = new CountDownLatch(1);
        var sentPayloads = new CopyOnWriteArrayList<String>();
        doAnswer(invocation -> {
                    var message = invocation.getArgument(0, WebSocketMessage.class);
                    sentPayloads.add((String) message.getPayload());
                    if (sentPayloads.size() == 1) {
                        firstSendStarted.countDown();
                        releaseFirstSend.await(2, TimeUnit.SECONDS);
                    }
                    return null;
                })
                .when(rawSession)
                .sendMessage(any());

        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);
        var decoratedSession = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);

        var first = stateMessage("first");
        var event = new TextMessage("MESSAGE\ndestination:/topic/room/abc/event\n\n{}\u0000");
        var newest = stateMessage("newest");
        decoratedSession.sendMessage(first);
        assertTrue(firstSendStarted.await(2, TimeUnit.SECONDS));
        decoratedSession.sendMessage(event);
        decoratedSession.sendMessage(newest);
        releaseFirstSend.countDown();

        awaitPayloadCount(sentPayloads, 3);
        assertEquals(List.of(first.getPayload(), event.getPayload(), newest.getPayload()), sentPayloads);
        decorator.afterConnectionClosed(rawSession, CloseStatus.NORMAL);
    }

    @Test
    void closesWhenCriticalFramesCannotFitTheBoundedQueue() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-critical");
        when(rawSession.isOpen()).thenReturn(true);
        var firstSendStarted = new CountDownLatch(1);
        var releaseFirstSend = new CountDownLatch(1);
        doAnswer(invocation -> {
                    firstSendStarted.countDown();
                    releaseFirstSend.await(2, TimeUnit.SECONDS);
                    return null;
                })
                .when(rawSession)
                .sendMessage(any());

        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);
        var decoratedSession = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);

        var criticalFrame =
                new TextMessage("MESSAGE\ndestination:/topic/room/abc/event\n\n" + "x".repeat(300_000) + "\u0000");
        decoratedSession.sendMessage(criticalFrame);
        assertTrue(firstSendStarted.await(2, TimeUnit.SECONDS));
        decoratedSession.sendMessage(criticalFrame);
        decoratedSession.sendMessage(criticalFrame);

        org.mockito.Mockito.verify(rawSession).close(CloseStatus.SESSION_NOT_RELIABLE);
        assertTrue(telemetry.backpressureEvents.contains("critical_overflow"));
        releaseFirstSend.countDown();
        decorator.afterConnectionClosed(rawSession, CloseStatus.SESSION_NOT_RELIABLE);
    }

    @Test
    void closesAndRecordsSendFailure() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-error");
        when(rawSession.isOpen()).thenReturn(true);
        doAnswer(invocation -> {
                    throw new IOException("send failed");
                })
                .when(rawSession)
                .sendMessage(any());

        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);
        var decoratedSession = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);
        decoratedSession.sendMessage(new TextMessage("MESSAGE\ndestination:/topic/room/abc/event\n\n{}\u0000"));

        awaitOutcome(telemetry, "send_error");
        org.mockito.Mockito.verify(rawSession).close(CloseStatus.SESSION_NOT_RELIABLE);
        decorator.afterConnectionClosed(rawSession, CloseStatus.SESSION_NOT_RELIABLE);
    }

    @Test
    void closesWhenRawSendExceedsTheConfiguredStallTimeout() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-timeout");
        when(rawSession.isOpen()).thenReturn(true);
        doAnswer(invocation -> {
                    Thread.sleep(500);
                    return null;
                })
                .when(rawSession)
                .sendMessage(any());

        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry, 25).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);
        var decoratedSession = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);
        decoratedSession.sendMessage(new TextMessage("MESSAGE\ndestination:/topic/room/abc/event\n\n{}\u0000"));

        awaitOutcome(telemetry, "send_timeout");
        org.mockito.Mockito.verify(rawSession).close(CloseStatus.SESSION_NOT_RELIABLE);
        decorator.afterConnectionClosed(rawSession, CloseStatus.SESSION_NOT_RELIABLE);
    }

    @Test
    void classifiesInboundActionsAndOutboundEventsWithBoundedTelemetryValues() throws Exception {
        var telemetry = new RecordingTelemetry();
        var rawSession = mock(WebSocketSession.class);
        when(rawSession.getId()).thenReturn("session-2");
        when(rawSession.isOpen()).thenReturn(true);
        var handler = mock(WebSocketHandler.class);
        var decorator = new BackpressureWebSocketHandlerDecorator(telemetry).decorate(handler);
        decorator.afterConnectionEstablished(rawSession);

        decorator.handleMessage(rawSession, new TextMessage("SEND\ndestination:/app/room/abc/action\n\n{}\u0000"));
        decorator.handleMessage(rawSession, new TextMessage("UNSUBSCRIBE\nid:room-state\n\n\u0000"));
        var session = (WebSocketSession) org.mockito.Mockito.mockingDetails(handler).getInvocations().stream()
                .findFirst()
                .orElseThrow()
                .getArgument(0);
        session.sendMessage(new TextMessage("MESSAGE\ndestination:/topic/room/abc/event\n\n{}\u0000"));

        assertTrue(telemetry.messages.contains("inbound:action:received"));
        assertTrue(telemetry.messages.contains("inbound:unsubscribe:received"));
        awaitPayloadCount(telemetry.outboundMessages, 1);
        assertTrue(telemetry.messages.contains("outbound:event:sent"));
        decorator.afterConnectionClosed(rawSession, CloseStatus.NORMAL);
    }

    private TextMessage stateMessage(String state) {
        return new TextMessage("MESSAGE\ndestination:/topic/room/abc\n\n{\"state\":\"" + state + "\"}\u0000");
    }

    private void awaitPayloadCount(List<String> payloads, int count) throws InterruptedException {
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (payloads.size() < count && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertEquals(count, payloads.size());
    }

    private void awaitOutcome(RecordingTelemetry telemetry, String outcome) throws InterruptedException {
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (!telemetry.messages.stream().anyMatch(message -> message.endsWith(":" + outcome))
                && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertTrue(telemetry.messages.stream().anyMatch(message -> message.endsWith(":" + outcome)));
    }

    private static final class RecordingTelemetry implements GameTelemetry {

        private final List<String> messages = new CopyOnWriteArrayList<>();
        private final List<String> outboundMessages = new CopyOnWriteArrayList<>();
        private final List<String> backpressureEvents = new CopyOnWriteArrayList<>();

        @Override
        public void websocketMessage(String direction, String messageType, String outcome, long payloadBytes) {
            messages.add(direction + ":" + messageType + ":" + outcome);
            if ("outbound".equals(direction) && "sent".equals(outcome)) {
                outboundMessages.add(messageType);
            }
        }

        @Override
        public void websocketBackpressure(String messageType, String event) {
            backpressureEvents.add(event);
        }
    }
}
