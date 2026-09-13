package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record MatchStats(
        int damageDealt,
        int damageTaken,
        int healingDone,
        int shieldingDone,
        int roundsWon,
        int roundsLost,
        int roundsDrawn,
        List<RoundResult> rounds,
        List<UnitCombatStats> unitStats) {

    public MatchStats {
        rounds = List.copyOf(rounds);
        unitStats = List.copyOf(unitStats);
    }

    public record RoundResult(int round, RoundOutcome outcome) {}

    public enum RoundOutcome {
        WIN,
        LOSS,
        DRAW
    }
}
