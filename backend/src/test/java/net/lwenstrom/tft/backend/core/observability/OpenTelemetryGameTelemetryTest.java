package net.lwenstrom.tft.backend.core.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.testing.exporter.InMemoryMetricReader;
import java.util.List;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import org.junit.jupiter.api.Test;

class OpenTelemetryGameTelemetryTest {

    private static final AttributeKey<String> GAME_MODE = AttributeKey.stringKey("game.mode");
    private static final AttributeKey<String> GAME_PHASE = AttributeKey.stringKey("game.phase");
    private static final AttributeKey<String> PLAYER_TYPE = AttributeKey.stringKey("player.type");
    private static final AttributeKey<String> CONNECTION_STATE = AttributeKey.stringKey("connection.state");
    private static final AttributeKey<String> ACTION_TYPE = AttributeKey.stringKey("action.type");
    private static final AttributeKey<String> ACTION_OUTCOME = AttributeKey.stringKey("action.outcome");
    private static final AttributeKey<String> REJECTION_REASON = AttributeKey.stringKey("rejection.reason");
    private static final AttributeKey<String> BROWSER_FAMILY = AttributeKey.stringKey("browser.family");
    private static final AttributeKey<String> OS_FAMILY = AttributeKey.stringKey("os.family");
    private static final AttributeKey<String> DEVICE_TYPE = AttributeKey.stringKey("device.type");
    private static final AttributeKey<String> MESSAGE_DIRECTION = AttributeKey.stringKey("message.direction");
    private static final AttributeKey<String> MESSAGE_TYPE = AttributeKey.stringKey("message.type");
    private static final AttributeKey<String> MESSAGE_OUTCOME = AttributeKey.stringKey("message.outcome");
    private static final AttributeKey<String> BACKPRESSURE_EVENT = AttributeKey.stringKey("backpressure.event");

    @Test
    void recordsCountersActionsAndLoopDurationWithBoundedAttributes() {
        var reader = InMemoryMetricReader.create();
        try (var provider =
                SdkMeterProvider.builder().registerMetricReader(reader).build()) {
            var telemetry = new OpenTelemetryGameTelemetry(provider.get("test"));

            telemetry.roomCreated(GameMode.ONEPIECE);
            telemetry.matchStarted(GameMode.ONEPIECE);
            telemetry.matchCompleted(GameMode.ONEPIECE);
            telemetry.playerConnectionEvent(GameMode.ONEPIECE, "joined");
            telemetry.actionProcessed(GameMode.POKEMON, ActionType.BUY, "rejected", "invalid_action");
            telemetry.gameLoopDuration(0.025);

            assertEquals(1, longSum(reader, "tft.game.rooms.created"));
            assertEquals(1, longSum(reader, "tft.game.matches.started"));
            assertEquals(1, longSum(reader, "tft.game.matches.completed"));
            assertEquals(1, longSum(reader, "tft.game.player.connection.events"));
            var actionPoint = metric(reader, "tft.game.actions.processed")
                    .getLongSumData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals("pokemon", actionPoint.getAttributes().get(GAME_MODE));
            assertEquals("buy", actionPoint.getAttributes().get(ACTION_TYPE));
            assertEquals("rejected", actionPoint.getAttributes().get(ACTION_OUTCOME));
            assertEquals("invalid_action", actionPoint.getAttributes().get(REJECTION_REASON));
            assertEquals(
                    1,
                    metric(reader, "tft.game.loop.duration")
                            .getHistogramData()
                            .getPoints()
                            .iterator()
                            .next()
                            .getCount());
        }
    }

    @Test
    void gaugesIncludeCurrentCountsAndExplicitZerosForKnownCombinations() {
        var reader = InMemoryMetricReader.create();
        try (var provider =
                SdkMeterProvider.builder().registerMetricReader(reader).build()) {
            var telemetry = new OpenTelemetryGameTelemetry(provider.get("test"));
            telemetry.bindRoomSnapshots(
                    () -> List.of(new GameTelemetry.RoomSnapshot(GameMode.ONEPIECE, GamePhase.LOBBY, 2, 1, 1, 4)));

            var roomPoints =
                    metric(reader, "tft.game.rooms.active").getLongGaugeData().getPoints();
            assertEquals(10, roomPoints.size());
            assertTrue(roomPoints.stream()
                    .anyMatch(point -> point.getValue() == 1
                            && "onepiece".equals(point.getAttributes().get(GAME_MODE))
                            && "lobby".equals(point.getAttributes().get(GAME_PHASE))));
            assertTrue(roomPoints.stream()
                    .anyMatch(point -> point.getValue() == 0
                            && "pokemon".equals(point.getAttributes().get(GAME_MODE))
                            && "combat".equals(point.getAttributes().get(GAME_PHASE))));

            var playerPoints =
                    metric(reader, "tft.game.players.active").getLongGaugeData().getPoints();
            assertEquals(8, playerPoints.size());
            assertTrue(playerPoints.stream()
                    .anyMatch(point -> point.getValue() == 2
                            && "onepiece".equals(point.getAttributes().get(GAME_MODE))
                            && "human".equals(point.getAttributes().get(PLAYER_TYPE))
                            && "connected".equals(point.getAttributes().get(CONNECTION_STATE))));
            assertTrue(playerPoints.stream()
                    .anyMatch(point -> point.getValue() == 0
                            && "pokemon".equals(point.getAttributes().get(GAME_MODE))
                            && "bot".equals(point.getAttributes().get(PLAYER_TYPE))));
        }
    }

    @Test
    void recordsActionLatencyAndWebSocketMessageSizeWithBoundedAttributes() {
        var reader = InMemoryMetricReader.create();
        try (var provider =
                SdkMeterProvider.builder().registerMetricReader(reader).build()) {
            var telemetry = new OpenTelemetryGameTelemetry(provider.get("test"));

            telemetry.actionProcessed(GameMode.POKEMON, ActionType.MOVE, "accepted", "none", 0.012);
            telemetry.clientActionAcknowledgementRoundTrip(GameMode.POKEMON, ActionType.MOVE, "rejected", 30.0);
            telemetry.websocketMessage("outbound", "state", "sent", 512);
            telemetry.websocketMessage("outbound", "action_result", "sent", 128);
            telemetry.websocketBackpressure("state", "snapshot_coalesced");
            telemetry.websocketMessage("unbounded-direction", "unbounded-type", "unbounded-outcome", Long.MAX_VALUE);

            var actionPoint = metric(reader, "tft.game.actions.processing.duration")
                    .getHistogramData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals(1, actionPoint.getCount());
            assertEquals("pokemon", actionPoint.getAttributes().get(GAME_MODE));
            assertEquals("move", actionPoint.getAttributes().get(ACTION_TYPE));
            assertEquals("accepted", actionPoint.getAttributes().get(ACTION_OUTCOME));
            assertEquals("none", actionPoint.getAttributes().get(REJECTION_REASON));
            assertTrue(actionPoint.getBoundaries().contains(0.001));
            assertTrue(actionPoint.getBoundaries().contains(10.0));

            var clientActionPoint = metric(reader, "tft.game.actions.client.ack.round_trip.duration")
                    .getHistogramData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals(1, clientActionPoint.getCount());
            assertEquals(30.0, clientActionPoint.getSum());
            assertEquals("pokemon", clientActionPoint.getAttributes().get(GAME_MODE));
            assertEquals("move", clientActionPoint.getAttributes().get(ACTION_TYPE));
            assertEquals("rejected", clientActionPoint.getAttributes().get(ACTION_OUTCOME));
            assertTrue(clientActionPoint.getBoundaries().contains(30.0));
            assertTrue(clientActionPoint.getBoundaries().contains(60.0));

            var messagePoint = metric(reader, "tft.game.websocket.messages").getLongSumData().getPoints().stream()
                    .filter(point -> "state".equals(point.getAttributes().get(MESSAGE_TYPE)))
                    .findFirst()
                    .orElseThrow();
            assertEquals("outbound", messagePoint.getAttributes().get(MESSAGE_DIRECTION));
            assertEquals("sent", messagePoint.getAttributes().get(MESSAGE_OUTCOME));
            assertEquals(1, messagePoint.getValue());
            var sizePoint = metric(reader, "tft.game.websocket.message.size").getHistogramData().getPoints().stream()
                    .filter(point -> "state".equals(point.getAttributes().get(MESSAGE_TYPE))
                            && "sent".equals(point.getAttributes().get(MESSAGE_OUTCOME)))
                    .findFirst()
                    .orElseThrow();
            assertEquals(1, sizePoint.getCount());
            assertEquals(512, sizePoint.getSum());
            assertTrue(sizePoint.getBoundaries().contains(524_288.0));
            assertTrue(metric(reader, "tft.game.websocket.messages").getLongSumData().getPoints().stream()
                    .anyMatch(point -> "other".equals(point.getAttributes().get(MESSAGE_TYPE))));
            assertTrue(metric(reader, "tft.game.websocket.messages").getLongSumData().getPoints().stream()
                    .anyMatch(point ->
                            "action_result".equals(point.getAttributes().get(MESSAGE_TYPE))));
            var backpressurePoint = metric(reader, "tft.game.websocket.backpressure")
                    .getLongSumData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals("state", backpressurePoint.getAttributes().get(MESSAGE_TYPE));
            assertEquals("snapshot_coalesced", backpressurePoint.getAttributes().get(BACKPRESSURE_EVENT));
        }
    }

    @Test
    void clientMetricsAreBoundedDeduplicatedAndZeroedAfterDisconnect() {
        var reader = InMemoryMetricReader.create();
        try (var provider =
                SdkMeterProvider.builder().registerMetricReader(reader).build()) {
            var telemetry = new OpenTelemetryGameTelemetry(provider.get("test"));
            var client = new ClientUserAgent("chrome", "windows", "desktop");

            telemetry.clientConnected("session-1", client);
            telemetry.clientConnected("session-1", client);

            var connectionPoint = metric(reader, "tft.game.client.connections")
                    .getLongSumData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals(1, connectionPoint.getValue());
            assertEquals("chrome", connectionPoint.getAttributes().get(BROWSER_FAMILY));
            assertEquals("windows", connectionPoint.getAttributes().get(OS_FAMILY));
            assertEquals("desktop", connectionPoint.getAttributes().get(DEVICE_TYPE));
            assertTrue(connectionPoint.getAttributes().asMap().values().stream().noneMatch("session-1"::equals));

            var activePoint = metric(reader, "tft.game.clients.active")
                    .getLongGaugeData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals(1, activePoint.getValue());

            telemetry.clientDisconnected("session-1");

            var disconnectedPoint = metric(reader, "tft.game.clients.active")
                    .getLongGaugeData()
                    .getPoints()
                    .iterator()
                    .next();
            assertEquals(0, disconnectedPoint.getValue());
            assertEquals("chrome", disconnectedPoint.getAttributes().get(BROWSER_FAMILY));
        }
    }

    private long longSum(InMemoryMetricReader reader, String name) {
        return metric(reader, name).getLongSumData().getPoints().stream()
                .mapToLong(point -> point.getValue())
                .sum();
    }

    private io.opentelemetry.sdk.metrics.data.MetricData metric(InMemoryMetricReader reader, String name) {
        return reader.collectAllMetrics().stream()
                .filter(metric -> metric.getName().equals(name))
                .findFirst()
                .orElseThrow();
    }
}
