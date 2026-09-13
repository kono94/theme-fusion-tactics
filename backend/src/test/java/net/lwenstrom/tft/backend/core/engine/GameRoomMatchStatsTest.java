package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.MatchStats.RoundOutcome;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class GameRoomMatchStatsTest {
    @Test
    void recordsOneResultForEachRealParticipant() {
        var strongUnit = TestHelpers.createUnitDef("strong", "Strong", 1, 500, 100);
        var clock = new TestClock();
        var room = TestHelpers.createTestGameRoom(TestHelpers.createMockDataLoader(List.of(strongUnit)), clock);
        var first = room.addPlayer("First");
        var second = room.addPlayer("Second");
        first.setLevel(2);
        first.addUnitToBoard(strongUnit, 4, 0);
        second.setHealth(3);

        room.startMatch();
        room.getPlayers().stream().filter(Player::isBot).forEach(bot -> bot.setHealth(0));
        clock.advance(room.getState().timeRemainingMs() + 1);
        room.tick();
        clock.advance(room.getState().timeRemainingMs() + 1);
        room.tick();

        var firstStats = room.getState().players().get(first.getId()).matchStats();
        var secondStats = room.getState().players().get(second.getId()).matchStats();
        assertEquals(
                List.of(RoundOutcome.WIN),
                firstStats.rounds().stream().map(round -> round.outcome()).toList());
        assertEquals(
                List.of(RoundOutcome.LOSS),
                secondStats.rounds().stream().map(round -> round.outcome()).toList());
        assertEquals(1, firstStats.unitStats().size());
        assertEquals("strong", firstStats.unitStats().getFirst().lineId());
        assertEquals(firstStats.damageDealt(), firstStats.unitStats().getFirst().damageDealt());
        assertEquals(
                secondStats.damageTaken(),
                secondStats.unitStats().stream()
                        .mapToInt(stats -> stats.damageTaken())
                        .sum());
    }
}
