package net.lwenstrom.tft.backend.core.observability;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.metrics.ObservableLongGauge;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import org.springframework.stereotype.Component;

@Component
public class OpenTelemetryGameTelemetry implements GameTelemetry {

    private static final AttributeKey<String> GAME_MODE = AttributeKey.stringKey("game.mode");
    private static final AttributeKey<String> GAME_PHASE = AttributeKey.stringKey("game.phase");
    private static final AttributeKey<String> PLAYER_TYPE = AttributeKey.stringKey("player.type");
    private static final AttributeKey<String> CONNECTION_STATE = AttributeKey.stringKey("connection.state");
    private static final AttributeKey<String> CONNECTION_EVENT = AttributeKey.stringKey("connection.event");
    private static final AttributeKey<String> ACTION_TYPE = AttributeKey.stringKey("action.type");
    private static final AttributeKey<String> ACTION_OUTCOME = AttributeKey.stringKey("action.outcome");
    private static final AttributeKey<String> REJECTION_REASON = AttributeKey.stringKey("rejection.reason");
    private static final AttributeKey<String> BROWSER_FAMILY = AttributeKey.stringKey("browser.family");
    private static final AttributeKey<String> OS_FAMILY = AttributeKey.stringKey("os.family");
    private static final AttributeKey<String> DEVICE_TYPE = AttributeKey.stringKey("device.type");

    private final AtomicReference<Supplier<List<RoomSnapshot>>> roomSnapshots = new AtomicReference<>(List::of);
    private final Map<String, ClientUserAgent> activeClientConnections = new ConcurrentHashMap<>();
    private final Set<ClientKey> knownClients = ConcurrentHashMap.newKeySet();
    private final LongCounter roomsCreated;
    private final LongCounter matchesStarted;
    private final LongCounter matchesCompleted;
    private final LongCounter playerConnectionEvents;
    private final LongCounter actionsProcessed;
    private final LongCounter clientConnections;
    private final DoubleHistogram gameLoopDuration;

    @SuppressWarnings("unused")
    private final ObservableLongGauge activeRooms;

    @SuppressWarnings("unused")
    private final ObservableLongGauge activePlayers;

    @SuppressWarnings("unused")
    private final ObservableLongGauge activeClients;

    public OpenTelemetryGameTelemetry() {
        this(GlobalOpenTelemetry.getMeter("net.lwenstrom.tft.game"));
    }

    OpenTelemetryGameTelemetry(Meter meter) {
        roomsCreated = meter.counterBuilder("tft.game.rooms.created")
                .setDescription("Number of game rooms created")
                .setUnit("{room}")
                .build();
        matchesStarted = meter.counterBuilder("tft.game.matches.started")
                .setDescription("Number of matches started")
                .setUnit("{match}")
                .build();
        matchesCompleted = meter.counterBuilder("tft.game.matches.completed")
                .setDescription("Number of matches completed")
                .setUnit("{match}")
                .build();
        playerConnectionEvents = meter.counterBuilder("tft.game.player.connection.events")
                .setDescription("Number of player connection lifecycle events")
                .setUnit("{event}")
                .build();
        actionsProcessed = meter.counterBuilder("tft.game.actions.processed")
                .setDescription("Number of player actions processed")
                .setUnit("{action}")
                .build();
        clientConnections = meter.counterBuilder("tft.game.client.connections")
                .setDescription("Number of WebSocket client connections by bounded client classification")
                .setUnit("{connection}")
                .build();
        gameLoopDuration = meter.histogramBuilder("tft.game.loop.duration")
                .setDescription("Duration of one scheduled game loop")
                .setUnit("s")
                .build();

        activeRooms = meter.gaugeBuilder("tft.game.rooms.active")
                .ofLongs()
                .setDescription("Current active game rooms")
                .setUnit("{room}")
                .buildWithCallback(measurement -> recordRoomGauges(measurement));
        activePlayers = meter.gaugeBuilder("tft.game.players.active")
                .ofLongs()
                .setDescription("Current game players by type and connection state")
                .setUnit("{player}")
                .buildWithCallback(measurement -> recordPlayerGauges(measurement));
        activeClients = meter.gaugeBuilder("tft.game.clients.active")
                .ofLongs()
                .setDescription("Current WebSocket clients by bounded browser, operating system, and device type")
                .setUnit("{client}")
                .buildWithCallback(measurement -> recordClientGauges(measurement));
    }

    @Override
    public void bindRoomSnapshots(Supplier<List<RoomSnapshot>> snapshots) {
        roomSnapshots.set(snapshots);
    }

    @Override
    public void roomCreated(GameMode gameMode) {
        roomsCreated.add(1, modeAttributes(gameMode));
    }

    @Override
    public void matchStarted(GameMode gameMode) {
        matchesStarted.add(1, modeAttributes(gameMode));
    }

    @Override
    public void matchCompleted(GameMode gameMode) {
        matchesCompleted.add(1, modeAttributes(gameMode));
    }

    @Override
    public void playerConnectionEvent(GameMode gameMode, String event) {
        playerConnectionEvents.add(
                1,
                Attributes.builder()
                        .put(GAME_MODE, modeValue(gameMode))
                        .put(PLAYER_TYPE, "human")
                        .put(CONNECTION_EVENT, event)
                        .build());
    }

    @Override
    public void actionProcessed(GameMode gameMode, ActionType actionType, String outcome, String reason) {
        actionsProcessed.add(
                1,
                Attributes.builder()
                        .put(GAME_MODE, modeValue(gameMode))
                        .put(
                                ACTION_TYPE,
                                actionType == null
                                        ? "unknown"
                                        : actionType.name().toLowerCase(Locale.ROOT))
                        .put(ACTION_OUTCOME, outcome)
                        .put(REJECTION_REASON, reason)
                        .build());
    }

    @Override
    public void gameLoopDuration(double durationSeconds) {
        gameLoopDuration.record(durationSeconds);
    }

    @Override
    public void clientConnected(String connectionId, ClientUserAgent client) {
        if (connectionId == null || connectionId.isBlank()) return;

        var classifiedClient = client == null ? ClientUserAgent.UNKNOWN : client;
        if (activeClientConnections.putIfAbsent(connectionId, classifiedClient) != null) return;

        var key = ClientKey.from(classifiedClient);
        knownClients.add(key);
        clientConnections.add(1, clientAttributes(key));
    }

    @Override
    public void clientDisconnected(String connectionId) {
        if (connectionId != null) {
            activeClientConnections.remove(connectionId);
        }
    }

    private void recordRoomGauges(io.opentelemetry.api.metrics.ObservableLongMeasurement measurement) {
        var counts = snapshots().stream()
                .collect(Collectors.groupingBy(
                        snapshot -> new RoomKey(snapshot.gameMode(), snapshot.phase()), Collectors.counting()));
        for (var mode : GameMode.values()) {
            for (var phase : GamePhase.values()) {
                measurement.record(
                        counts.getOrDefault(new RoomKey(mode, phase), 0L),
                        Attributes.of(GAME_MODE, modeValue(mode), GAME_PHASE, phaseValue(phase)));
            }
        }
    }

    private void recordPlayerGauges(io.opentelemetry.api.metrics.ObservableLongMeasurement measurement) {
        var snapshots = snapshots();
        for (var mode : GameMode.values()) {
            var modeSnapshots = snapshots.stream()
                    .filter(snapshot -> snapshot.gameMode() == mode)
                    .toList();
            recordPlayers(measurement, mode, "human", "connected", sum(modeSnapshots, PlayerCount.CONNECTED));
            recordPlayers(
                    measurement, mode, "human", "reconnect_grace", sum(modeSnapshots, PlayerCount.RECONNECT_GRACE));
            recordPlayers(measurement, mode, "human", "abandoned", sum(modeSnapshots, PlayerCount.ABANDONED));
            recordPlayers(measurement, mode, "bot", "not_applicable", sum(modeSnapshots, PlayerCount.BOT));
        }
    }

    private void recordClientGauges(io.opentelemetry.api.metrics.ObservableLongMeasurement measurement) {
        var counts = activeClientConnections.values().stream()
                .collect(Collectors.groupingBy(ClientKey::from, Collectors.counting()));
        knownClients.forEach(key -> measurement.record(counts.getOrDefault(key, 0L), clientAttributes(key)));
    }

    private void recordPlayers(
            io.opentelemetry.api.metrics.ObservableLongMeasurement measurement,
            GameMode mode,
            String playerType,
            String connectionState,
            long count) {
        measurement.record(
                count,
                Attributes.of(GAME_MODE, modeValue(mode), PLAYER_TYPE, playerType, CONNECTION_STATE, connectionState));
    }

    private long sum(List<RoomSnapshot> snapshots, PlayerCount playerCount) {
        return snapshots.stream().mapToLong(playerCount::count).sum();
    }

    private List<RoomSnapshot> snapshots() {
        try {
            return roomSnapshots.get().get();
        } catch (RuntimeException exception) {
            return List.of();
        }
    }

    private Attributes modeAttributes(GameMode gameMode) {
        return Attributes.of(GAME_MODE, modeValue(gameMode));
    }

    private Attributes clientAttributes(ClientKey client) {
        return Attributes.of(
                BROWSER_FAMILY, client.browserFamily(), OS_FAMILY, client.osFamily(), DEVICE_TYPE, client.deviceType());
    }

    private String modeValue(GameMode gameMode) {
        return gameMode == null ? "unknown" : gameMode.getValue();
    }

    private String phaseValue(GamePhase phase) {
        return phase.name().toLowerCase(Locale.ROOT);
    }

    private record RoomKey(GameMode gameMode, GamePhase phase) {}

    private record ClientKey(String browserFamily, String osFamily, String deviceType) {
        private static ClientKey from(ClientUserAgent client) {
            return new ClientKey(client.browserFamily(), client.osFamily(), client.deviceType());
        }
    }

    private enum PlayerCount {
        CONNECTED {
            @Override
            long count(RoomSnapshot snapshot) {
                return snapshot.connectedHumans();
            }
        },
        RECONNECT_GRACE {
            @Override
            long count(RoomSnapshot snapshot) {
                return snapshot.reconnectGraceHumans();
            }
        },
        ABANDONED {
            @Override
            long count(RoomSnapshot snapshot) {
                return snapshot.abandonedHumans();
            }
        },
        BOT {
            @Override
            long count(RoomSnapshot snapshot) {
                return snapshot.bots();
            }
        };

        abstract long count(RoomSnapshot snapshot);
    }
}
