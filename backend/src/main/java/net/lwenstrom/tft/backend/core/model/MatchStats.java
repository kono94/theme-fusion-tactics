package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record MatchStats(
        int damageDealt,
        int healingDone,
        int shieldingDone,
        int roundsWon,
        int roundsLost,
        int roundsDrawn,
        List<RoundResult> rounds) {

    public MatchStats {
        rounds = List.copyOf(rounds);
    }

    public record RoundResult(int round, RoundOutcome outcome) {}

    public enum RoundOutcome {
        WIN,
        LOSS,
        DRAW
    }
}
