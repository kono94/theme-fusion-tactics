package net.lwenstrom.tft.backend.core.engine;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.analytics.GameplayAnalyticsRecorder;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.observability.ClientUserAgent;
import net.lwenstrom.tft.backend.core.observability.GameTelemetry;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.core.time.Clock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GameEngine {

    private final DataLoader dataLoader;
    private final GameModeRegistry gameModeRegistry;
    private final Clock clock;
    private final RandomProvider randomProvider;
    private final GameplayAnalyticsRecorder analyticsRecorder;
    private final GameTelemetry telemetry;
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    public GameEngine(
            DataLoader dataLoader, GameModeRegistry gameModeRegistry, Clock clock, RandomProvider randomProvider) {
        this(dataLoader, gameModeRegistry, clock, randomProvider, GameplayAnalyticsRecorder.NO_OP, GameTelemetry.NO_OP);
    }

    public GameEngine(
            DataLoader dataLoader,
            GameModeRegistry gameModeRegistry,
            Clock clock,
            RandomProvider randomProvider,
            GameplayAnalyticsRecorder analyticsRecorder) {
        this(dataLoader, gameModeRegistry, clock, randomProvider, analyticsRecorder, GameTelemetry.NO_OP);
    }

    @Autowired
    public GameEngine(
            DataLoader dataLoader,
            GameModeRegistry gameModeRegistry,
            Clock clock,
            RandomProvider randomProvider,
            GameplayAnalyticsRecorder analyticsRecorder,
            GameTelemetry telemetry) {
        this.dataLoader = dataLoader;
        this.gameModeRegistry = gameModeRegistry;
        this.clock = clock;
        this.randomProvider = randomProvider;
        this.analyticsRecorder = analyticsRecorder;
        this.telemetry = telemetry;
        telemetry.bindRoomSnapshots(this::telemetrySnapshots);
    }

    public GameRoom createRoom() {
        return createRoom(UUID.randomUUID().toString());
    }

    public GameRoom createRoom(String id) {
        return tryCreateRoom(id).orElseThrow(() -> new IllegalStateException("Room already exists: " + id));
    }

    public Optional<GameRoom> tryCreateRoom(String id) {
        var room = new GameRoom(
                id,
                dataLoader,
                gameModeRegistry,
                clock,
                randomProvider,
                gameModeRegistry.getDefaultMode(),
                analyticsRecorder,
                telemetry);
        if (rooms.putIfAbsent(room.getId(), room) != null) {
            return Optional.empty();
        }
        telemetry.roomCreated(room.getGameMode());
        return Optional.of(room);
    }

    public GameRoom getRoom(String id) {
        return rooms.get(id);
    }

    public Collection<GameRoom> getActiveRooms() {
        return rooms.values();
    }

    public void removeRoom(String id) {
        rooms.remove(id);
    }

    public void tick() {
        var startedAt = System.nanoTime();
        try {
            rooms.values().forEach(GameRoom::tick);
            rooms.entrySet().removeIf(entry -> entry.getValue().isEnded());
        } finally {
            telemetry.gameLoopDuration((System.nanoTime() - startedAt) / 1_000_000_000.0);
        }
    }

    public void recordAction(GameMode gameMode, ActionType actionType, String outcome, String reason) {
        telemetry.actionProcessed(gameMode, actionType, outcome, reason);
    }

    public void recordAction(
            GameMode gameMode, ActionType actionType, String outcome, String reason, double durationSeconds) {
        telemetry.actionProcessed(gameMode, actionType, outcome, reason, durationSeconds);
    }

    public void recordClientActionAcknowledgementRoundTrip(
            GameMode gameMode, ActionType actionType, String outcome, double durationSeconds) {
        telemetry.clientActionAcknowledgementRoundTrip(gameMode, actionType, outcome, durationSeconds);
    }

    public void clientConnected(String connectionId, ClientUserAgent client) {
        telemetry.clientConnected(connectionId, client);
    }

    public void clientDisconnected(String connectionId) {
        telemetry.clientDisconnected(connectionId);
    }

    private java.util.List<GameTelemetry.RoomSnapshot> telemetrySnapshots() {
        return rooms.values().stream().map(GameRoom::telemetrySnapshot).toList();
    }
}
