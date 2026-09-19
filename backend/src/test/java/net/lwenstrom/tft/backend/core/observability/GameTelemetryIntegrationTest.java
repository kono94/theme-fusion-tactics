package net.lwenstrom.tft.backend.core.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.GameController;
import net.lwenstrom.tft.backend.core.TraitCatalogService;
import net.lwenstrom.tft.backend.core.analytics.GameplayAnalyticsRecorder;
import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

class GameTelemetryIntegrationTest {

    private TestClock clock;
    private RecordingGameTelemetry telemetry;
    private GameEngine gameEngine;
    private GameController controller;

    @BeforeEach
    void setUp() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var registry = TestHelpers.createMockRegistry();
        clock = TestHelpers.createTestClock();
        telemetry = new RecordingGameTelemetry();
        gameEngine = new GameEngine(
                dataLoader,
                registry,
                clock,
                TestHelpers.createSeededRandomProvider(),
                GameplayAnalyticsRecorder.NO_OP,
                telemetry);
        controller = new GameController(
                mock(SimpMessagingTemplate.class), gameEngine, new TraitCatalogService(dataLoader), registry);
    }

    @Test
    void recordsOnlySuccessfulRoomCreationAndMeasuresTheGameLoop() {
        assertTrue(gameEngine.tryCreateRoom("same-room").isPresent());
        assertTrue(gameEngine.tryCreateRoom("same-room").isEmpty());

        gameEngine.tick();

        assertEquals(1, telemetry.roomsCreated);
        assertEquals(1, telemetry.loopDurations.size());
        assertTrue(telemetry.loopDurations.getFirst() >= 0);
        assertEquals(1, telemetry.snapshots.get().size());
    }

    @Test
    void recordsLifecycleConnectionsAbandonmentAndCompletion() {
        var room = gameEngine.createRoom("lifecycle-room");
        var first = room.tryAddPlayer("First", "browser-1", "token-1").orElseThrow();
        room.tryAddPlayer("Second", "browser-2", "token-2").orElseThrow();
        room.startMatch();

        room.disconnectPlayer(first.getId());
        assertTrue(room.reconnectPlayer("token-1").isPresent());
        room.disconnectPlayer(first.getId());
        clock.advance(60_000L);
        room.tick();
        room.getPlayers().forEach(player -> player.setHealth(0));
        room.tick();

        assertEquals(1, telemetry.matchesStarted);
        assertEquals(1, telemetry.matchesCompleted);
        assertEquals(
                List.of("joined", "joined", "disconnected", "reconnected", "disconnected", "abandoned"),
                telemetry.connectionEvents);
    }

    @Test
    void classifiesAcceptedAndRejectedActionsWithoutIdentifiers() {
        controller.createRoom(new GameController.RoomRequest("action-room", "Host"), "host-session");
        var room = gameEngine.getRoom("action-room");
        var host = room.getPlayers().stream().findFirst().orElseThrow();
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        host.setGold(20);
        var goldBeforeAction = host.getGold();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.BUY, host.getId(), null, null, null, null, null, null),
                "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, "spoofed", null, null, null, null, null, null),
                "host-session");
        controller.handleAction(
                "missing-room",
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(goldBeforeAction - 4, host.getGold());
        assertEquals(
                List.of(
                        new ActionRecord(GameMode.ONEPIECE, ActionType.EXP, "accepted", "none"),
                        new ActionRecord(GameMode.ONEPIECE, ActionType.BUY, "rejected", "invalid_action"),
                        new ActionRecord(GameMode.ONEPIECE, ActionType.EXP, "rejected", "unauthorized"),
                        new ActionRecord(null, ActionType.EXP, "rejected", "room_missing")),
                telemetry.actions);
        assertEquals(4, telemetry.actionDurations.size());
        assertTrue(telemetry.actionDurations.stream().allMatch(duration -> duration >= 0));
    }

    @Test
    void recordsOnlyBoundedActionAcknowledgementTelemetryFromBoundSessions() {
        controller.createRoom(new GameController.RoomRequest("ack-room", "Host"), "host-session");

        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "accepted", 240.0),
                "host-session");
        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "rejected", 60_000.0),
                "host-session");
        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "accepted", 60_001.0),
                "host-session");
        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "spoofed", 100.0),
                "host-session");
        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "accepted", Double.NaN),
                "host-session");
        controller.recordClientActionAcknowledgement(
                new GameController.ClientActionAcknowledgementTelemetry(ActionType.REROLL, "accepted", 100.0),
                "unknown-session");

        assertEquals(
                List.of(
                        new ClientActionAcknowledgementRecord(GameMode.ONEPIECE, ActionType.REROLL, "accepted", 0.240),
                        new ClientActionAcknowledgementRecord(GameMode.ONEPIECE, ActionType.REROLL, "rejected", 60.0)),
                telemetry.clientActionAcknowledgements);
    }

    @Test
    void recordsClassifiedWebSocketClientsAcrossSessionEvents() {
        var client = new ClientUserAgent("firefox", "linux", "desktop");
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.CONNECT);
        accessor.setSessionId("client-session");
        accessor.setSessionAttributes(Map.of(ClientUserAgent.SESSION_ATTRIBUTE, client));
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        controller.handleSessionConnect(new SessionConnectEvent(this, message));
        controller.handleSessionDisconnect(
                new SessionDisconnectEvent(this, message, "client-session", CloseStatus.NORMAL));

        assertEquals(List.of(new ClientConnection("client-session", client)), telemetry.connectedClients);
        assertEquals(List.of("client-session"), telemetry.disconnectedClients);
    }

    private static final class RecordingGameTelemetry implements GameTelemetry {
        private java.util.function.Supplier<List<RoomSnapshot>> snapshots = List::of;
        private final List<Double> loopDurations = new ArrayList<>();
        private final List<String> connectionEvents = new ArrayList<>();
        private final List<ClientConnection> connectedClients = new ArrayList<>();
        private final List<String> disconnectedClients = new ArrayList<>();
        private final List<ActionRecord> actions = new ArrayList<>();
        private final List<Double> actionDurations = new ArrayList<>();
        private final List<ClientActionAcknowledgementRecord> clientActionAcknowledgements = new ArrayList<>();
        private int roomsCreated;
        private int matchesStarted;
        private int matchesCompleted;

        @Override
        public void bindRoomSnapshots(java.util.function.Supplier<List<RoomSnapshot>> snapshots) {
            this.snapshots = snapshots;
        }

        @Override
        public void roomCreated(GameMode gameMode) {
            roomsCreated++;
        }

        @Override
        public void matchStarted(GameMode gameMode) {
            matchesStarted++;
        }

        @Override
        public void matchCompleted(GameMode gameMode) {
            matchesCompleted++;
        }

        @Override
        public void playerConnectionEvent(GameMode gameMode, String event) {
            connectionEvents.add(event);
        }

        @Override
        public void actionProcessed(GameMode gameMode, ActionType actionType, String outcome, String reason) {
            actions.add(new ActionRecord(gameMode, actionType, outcome, reason));
        }

        @Override
        public void actionProcessed(
                GameMode gameMode, ActionType actionType, String outcome, String reason, double durationSeconds) {
            actionProcessed(gameMode, actionType, outcome, reason);
            actionDurations.add(durationSeconds);
        }

        @Override
        public void clientActionAcknowledgementRoundTrip(
                GameMode gameMode, ActionType actionType, String outcome, double durationSeconds) {
            clientActionAcknowledgements.add(
                    new ClientActionAcknowledgementRecord(gameMode, actionType, outcome, durationSeconds));
        }

        @Override
        public void gameLoopDuration(double durationSeconds) {
            loopDurations.add(durationSeconds);
        }

        @Override
        public void clientConnected(String connectionId, ClientUserAgent client) {
            connectedClients.add(new ClientConnection(connectionId, client));
        }

        @Override
        public void clientDisconnected(String connectionId) {
            disconnectedClients.add(connectionId);
        }
    }

    private record ActionRecord(GameMode gameMode, ActionType actionType, String outcome, String reason) {}

    private record ClientActionAcknowledgementRecord(
            GameMode gameMode, ActionType actionType, String outcome, double durationSeconds) {}

    private record ClientConnection(String connectionId, ClientUserAgent client) {}
}
