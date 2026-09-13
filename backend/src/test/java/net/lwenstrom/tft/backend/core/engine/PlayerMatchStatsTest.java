package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.MatchStats.RoundOutcome;
import net.lwenstrom.tft.backend.core.model.UnitCombatStats;
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

    @Test
    void aggregatesUnitLinesAcrossRoundsAndKeepsTheHighestStarForm() {
        var player = TestHelpers.createTestPlayer("Player");

        player.recordMatchRound(
                1, RoundOutcome.WIN, List.of(new UnitCombatStats("hero", "hero-v1", "Hero", 1, 100, 75, 10, 20)));
        player.recordMatchRound(
                2,
                RoundOutcome.LOSS,
                List.of(new UnitCombatStats("hero", "hero-v2", "Hero Plus", 2, 250, 125, 30, 40)));

        var stats = player.toState().matchStats();
        assertEquals(350, stats.damageDealt());
        assertEquals(200, stats.damageTaken());
        assertEquals(40, stats.healingDone());
        assertEquals(60, stats.shieldingDone());
        assertEquals(
                List.of(new UnitCombatStats("hero", "hero-v2", "Hero Plus", 2, 350, 200, 40, 60)), stats.unitStats());
    }
}
