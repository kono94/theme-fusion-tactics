package net.lwenstrom.tft.backend.config;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import net.lwenstrom.tft.backend.core.observability.GameTelemetry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;
import org.springframework.web.socket.handler.WebSocketSessionDecorator;

@Component
public class BackpressureWebSocketHandlerDecorator implements WebSocketHandlerDecoratorFactory {

    static final int OUTBOUND_BUFFER_SIZE_LIMIT = 512 * 1024;
    static final int SEND_TIMEOUT_MILLIS = 10_000;

    private final GameTelemetry telemetry;
    private final int sendTimeoutMillis;

    @Autowired
    public BackpressureWebSocketHandlerDecorator(GameTelemetry telemetry) {
        this(telemetry, SEND_TIMEOUT_MILLIS);
    }

    BackpressureWebSocketHandlerDecorator(GameTelemetry telemetry, int sendTimeoutMillis) {
        this.telemetry = telemetry;
        this.sendTimeoutMillis = sendTimeoutMillis;
    }

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new Handler(handler, telemetry, sendTimeoutMillis);
    }

    private static final class Handler extends WebSocketHandlerDecorator {

        private final GameTelemetry telemetry;
        private final int sendTimeoutMillis;
        private final Map<String, LatestOnlyWebSocketSession> sessions = new ConcurrentHashMap<>();

        private Handler(WebSocketHandler delegate, GameTelemetry telemetry, int sendTimeoutMillis) {
            super(delegate);
            this.telemetry = telemetry;
            this.sendTimeoutMillis = sendTimeoutMillis;
        }

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            var decorated =
                    new LatestOnlyWebSocketSession(session, telemetry, OUTBOUND_BUFFER_SIZE_LIMIT, sendTimeoutMillis);
            sessions.put(session.getId(), decorated);
            try {
                getDelegate().afterConnectionEstablished(decorated);
            } catch (Exception exception) {
                sessions.remove(session.getId(), decorated);
                decorated.close(CloseStatus.SERVER_ERROR);
                throw exception;
            }
        }

        @Override
        public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
            telemetry.websocketMessage(
                    "inbound", MessageClassifier.classifyInbound(message), "received", payloadBytes(message));
            getDelegate().handleMessage(session, message);
        }

        @Override
        public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
            getDelegate().handleTransportError(session, exception);
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
            try {
                getDelegate().afterConnectionClosed(session, closeStatus);
            } finally {
                var decorated = sessions.remove(session.getId());
                if (decorated != null) {
                    decorated.close(closeStatus);
                }
            }
        }

        @Override
        public boolean supportsPartialMessages() {
            return getDelegate().supportsPartialMessages();
        }
    }

    private static final class LatestOnlyWebSocketSession extends WebSocketSessionDecorator {

        private final GameTelemetry telemetry;
        private final int bufferSizeLimit;
        private final int sendTimeoutMillis;
        private final Object monitor = new Object();
        private final ArrayDeque<QueuedMessage> messages = new ArrayDeque<>();
        private int bufferSize;
        private volatile boolean closed;

        private LatestOnlyWebSocketSession(
                WebSocketSession delegate, GameTelemetry telemetry, int bufferSizeLimit, int sendTimeoutMillis) {
            super(delegate);
            this.telemetry = telemetry;
            this.bufferSizeLimit = bufferSizeLimit;
            this.sendTimeoutMillis = sendTimeoutMillis;
            Thread.ofVirtual().name("tft-websocket-sender").start(this::sendQueuedMessages);
        }

        @Override
        public void sendMessage(WebSocketMessage<?> message) {
            var messageType = MessageClassifier.classifyOutbound(message);
            var payloadBytes = payloadBytes(message);
            var snapshot = MessageClassifier.isStateSnapshot(message);
            var closeRequired = false;
            synchronized (monitor) {
                if (closed || !getDelegate().isOpen()) {
                    telemetry.websocketMessage("outbound", messageType, "dropped", payloadBytes);
                    return;
                }

                if (payloadBytes > bufferSizeLimit) {
                    telemetry.websocketBackpressure(messageType, snapshot ? "snapshot_dropped" : "critical_overflow");
                    closeRequired = !snapshot;
                } else {
                    var replacedSnapshot = snapshot ? removePendingSnapshot() : null;
                    if (replacedSnapshot != null) {
                        telemetry.websocketBackpressure(replacedSnapshot.messageType, "snapshot_coalesced");
                    }

                    if (!makeRoomFor(payloadBytes)) {
                        telemetry.websocketBackpressure(
                                messageType, snapshot ? "snapshot_dropped" : "critical_overflow");
                        closeRequired = !snapshot;
                    } else {
                        messages.addLast(new QueuedMessage(message, messageType, payloadBytes, snapshot));
                        bufferSize += payloadBytes;
                        monitor.notifyAll();
                    }
                }
            }
            if (closeRequired) {
                closeForOverflow();
            }
        }

        @Override
        public boolean isOpen() {
            return !closed && getDelegate().isOpen();
        }

        @Override
        public void close(CloseStatus status) throws IOException {
            synchronized (monitor) {
                if (closed) {
                    return;
                }
                closed = true;
                messages.clear();
                bufferSize = 0;
                monitor.notifyAll();
            }
            getDelegate().close(status);
        }

        private QueuedMessage removePendingSnapshot() {
            var iterator = messages.iterator();
            while (iterator.hasNext()) {
                var queued = iterator.next();
                if (!queued.snapshot) {
                    continue;
                }
                iterator.remove();
                bufferSize -= queued.payloadBytes;
                return queued;
            }
            return null;
        }

        private boolean makeRoomFor(int payloadBytes) {
            while (bufferSize + payloadBytes > bufferSizeLimit) {
                var iterator = messages.iterator();
                QueuedMessage oldestSnapshot = null;
                while (iterator.hasNext()) {
                    var queued = iterator.next();
                    if (queued.snapshot) {
                        oldestSnapshot = queued;
                        iterator.remove();
                        break;
                    }
                }
                if (oldestSnapshot == null) {
                    return false;
                }
                bufferSize -= oldestSnapshot.payloadBytes;
                telemetry.websocketBackpressure(oldestSnapshot.messageType, "snapshot_dropped");
            }
            return true;
        }

        private void closeForOverflow() {
            telemetry.websocketBackpressure("other", "session_closed");
            try {
                close(CloseStatus.SESSION_NOT_RELIABLE);
            } catch (IOException ignored) {
                // The transport is already unreliable; its close callback will clean up the session.
            }
        }

        private void sendQueuedMessages() {
            while (true) {
                QueuedMessage queued;
                synchronized (monitor) {
                    while (messages.isEmpty() && !closed) {
                        try {
                            monitor.wait();
                        } catch (InterruptedException exception) {
                            Thread.currentThread().interrupt();
                            return;
                        }
                    }
                    if (closed) {
                        return;
                    }
                    queued = messages.removeFirst();
                    bufferSize -= queued.payloadBytes;
                }

                if (!sendToDelegate(queued)) {
                    return;
                }
            }
        }

        private boolean sendToDelegate(QueuedMessage queued) {
            var failure = new AtomicReference<Throwable>();
            var sender = Thread.ofVirtual().name("tft-websocket-write").start(() -> {
                try {
                    getDelegate().sendMessage(queued.message);
                } catch (Exception exception) {
                    failure.set(exception);
                }
            });
            try {
                sender.join(sendTimeoutMillis);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                telemetry.websocketMessage("outbound", queued.messageType, "send_timeout", queued.payloadBytes);
                sender.interrupt();
                closeAfterSendFailure();
                return false;
            }
            if (sender.isAlive()) {
                telemetry.websocketMessage("outbound", queued.messageType, "send_timeout", queued.payloadBytes);
                sender.interrupt();
                closeAfterSendFailure();
                return false;
            }
            if (failure.get() != null) {
                telemetry.websocketMessage("outbound", queued.messageType, "send_error", queued.payloadBytes);
                closeAfterSendFailure();
                return false;
            }
            telemetry.websocketMessage("outbound", queued.messageType, "sent", queued.payloadBytes);
            return true;
        }

        private void closeAfterSendFailure() {
            try {
                close(CloseStatus.SESSION_NOT_RELIABLE);
            } catch (IOException ignored) {
                // The transport has already reported a send failure.
            }
        }

        private static final class QueuedMessage {

            private final WebSocketMessage<?> message;
            private final String messageType;
            private final int payloadBytes;
            private final boolean snapshot;

            private QueuedMessage(WebSocketMessage<?> message, String messageType, int payloadBytes, boolean snapshot) {
                this.message = message;
                this.messageType = messageType;
                this.payloadBytes = payloadBytes;
                this.snapshot = snapshot;
            }
        }
    }

    private static final class MessageClassifier {

        private static final String ROOM_TOPIC_PREFIX = "/topic/room/";

        private MessageClassifier() {}

        private static String classifyInbound(WebSocketMessage<?> message) {
            var command = stompCommand(message);
            if (command == null) {
                return "other";
            }
            if (!"SEND".equals(command)) {
                return command.toLowerCase(java.util.Locale.ROOT);
            }
            var destination = stompHeader(message, "destination");
            if (destination != null && destination.endsWith("/action")) {
                return "action";
            }
            if (destination != null && destination.endsWith("/mode")) {
                return "room_mode";
            }
            if (destination != null
                    && (destination.endsWith("/create")
                            || destination.endsWith("/join")
                            || destination.endsWith("/leave")
                            || destination.endsWith("/abandon")
                            || destination.endsWith("/start"))) {
                return "room_lifecycle";
            }
            return "send";
        }

        private static String classifyOutbound(WebSocketMessage<?> message) {
            var command = stompCommand(message);
            if (!"MESSAGE".equals(command)) {
                return command == null ? "other" : command.toLowerCase(java.util.Locale.ROOT);
            }
            var destination = stompHeader(message, "destination");
            if (destination != null && destination.endsWith("/event")) {
                return "event";
            }
            if (destination != null && destination.startsWith(ROOM_TOPIC_PREFIX)) {
                return "state";
            }
            if (destination != null && destination.endsWith("/room-result")) {
                return "room_result";
            }
            if (destination != null && destination.endsWith("/action-result")) {
                return "action_result";
            }
            return "message";
        }

        private static boolean isStateSnapshot(WebSocketMessage<?> message) {
            return "state".equals(classifyOutbound(message));
        }

        private static String stompCommand(WebSocketMessage<?> message) {
            if (message == null || !(message.getPayload() instanceof String payload)) {
                return null;
            }
            var newline = payload.indexOf('\n');
            var command = newline >= 0 ? payload.substring(0, newline) : payload;
            return command.isBlank() ? null : command.trim().toUpperCase(java.util.Locale.ROOT);
        }

        private static String stompHeader(WebSocketMessage<?> message, String name) {
            if (message == null || !(message.getPayload() instanceof String payload)) {
                return null;
            }
            var prefix = "\n" + name + ":";
            var start = payload.indexOf(prefix);
            if (start < 0) {
                return null;
            }
            start += prefix.length();
            var end = payload.indexOf('\n', start);
            return (end < 0 ? payload.substring(start) : payload.substring(start, end)).trim();
        }
    }

    private static int payloadBytes(WebSocketMessage<?> message) {
        return message == null ? 0 : message.getPayloadLength();
    }
}
