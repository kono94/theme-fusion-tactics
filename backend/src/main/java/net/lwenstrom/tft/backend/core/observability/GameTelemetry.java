package net.lwenstrom.tft.backend.core.observability;

import java.util.List;
import java.util.function.Supplier;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;

public interface GameTelemetry {

    GameTelemetry NO_OP = new GameTelemetry() {};

    default void bindRoomSnapshots(Supplier<List<RoomSnapshot>> snapshots) {}

    default void roomCreated(GameMode gameMode) {}

    default void matchStarted(GameMode gameMode) {}

    default void matchCompleted(GameMode gameMode) {}

    default void playerConnectionEvent(GameMode gameMode, String event) {}

    default void actionProcessed(GameMode gameMode, ActionType actionType, String outcome, String reason) {}

    default void actionProcessed(
            GameMode gameMode, ActionType actionType, String outcome, String reason, double durationSeconds) {
        actionProcessed(gameMode, actionType, outcome, reason);
        actionProcessingDuration(gameMode, actionType, outcome, reason, durationSeconds);
    }

    default void actionProcessingDuration(
            GameMode gameMode, ActionType actionType, String outcome, String reason, double durationSeconds) {}

    default void clientActionAcknowledgementRoundTrip(
            GameMode gameMode, ActionType actionType, String outcome, double durationSeconds) {}

    default void gameLoopDuration(double durationSeconds) {}

    default void websocketMessage(String direction, String messageType, String outcome, long payloadBytes) {}

    default void websocketBackpressure(String messageType, String event) {}

    default void clientConnected(String connectionId, ClientUserAgent client) {}

    default void clientDisconnected(String connectionId) {}

    record RoomSnapshot(
            GameMode gameMode,
            GamePhase phase,
            long connectedHumans,
            long reconnectGraceHumans,
            long abandonedHumans,
            long bots) {}
}
