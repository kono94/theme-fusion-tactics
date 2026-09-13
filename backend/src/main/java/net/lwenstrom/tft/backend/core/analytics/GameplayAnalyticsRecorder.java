package net.lwenstrom.tft.backend.core.analytics;

import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitCombatStats;

public interface GameplayAnalyticsRecorder {
    GameplayAnalyticsRecorder NO_OP = new GameplayAnalyticsRecorder() {};

    default void matchStarted(String roomId, GameMode mode, long occurredAt, List<Player> players) {}

    default void roundStarted(String roomId, int round, long occurredAt, List<Player> players) {}

    default void combatResolved(
            String roomId,
            int round,
            long occurredAt,
            String winnerId,
            String loserId,
            boolean draw,
            List<Player> participants) {}

    default void combatResolved(
            String roomId,
            int round,
            long occurredAt,
            String winnerId,
            String loserId,
            boolean draw,
            List<Player> participants,
            Map<String, List<UnitCombatStats>> unitStatsByPlayer) {
        combatResolved(roomId, round, occurredAt, winnerId, loserId, draw, participants);
    }

    default void playerAbandoned(String roomId, String playerId, long occurredAt) {}

    default void playerPlacementFinalized(String roomId, int finalRound, long occurredAt, Player player) {}

    default void matchCompleted(String roomId, int finalRound, long occurredAt, List<Player> players) {}
}
