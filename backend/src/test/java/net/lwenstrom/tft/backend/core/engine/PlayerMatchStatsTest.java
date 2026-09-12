package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import net.lwenstrom.tft.backend.core.model.MatchStats.RoundOutcome;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class PlayerMatchStatsTest {
    @Test
    void accumulatesCombatTotalsAndRoundHistory() {
        var player = TestHelpers.createTestPlayer("Player");

        player.recordMatchRound(1, RoundOutcome.WIN, 120, 10, 30);
        player.recordMatchRound(2, RoundOutcome.LOSS, 80, 20, 5);
        player.recordMatchRound(3, RoundOutcome.DRAW, 50, 0, 15);

        var stats = player.toState().matchStats();
        assertEquals(250, stats.damageDealt());
        assertEquals(30, stats.healingDone());
        assertEquals(50, stats.shieldingDone());
        assertEquals(1, stats.roundsWon());
        assertEquals(1, stats.roundsLost());
        assertEquals(1, stats.roundsDrawn());
        assertEquals(
                java.util.List.of(RoundOutcome.WIN, RoundOutcome.LOSS, RoundOutcome.DRAW),
                stats.rounds().stream().map(round -> round.outcome()).toList());
    }
}
