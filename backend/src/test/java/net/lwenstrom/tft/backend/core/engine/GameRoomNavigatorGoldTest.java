package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.random.DefaultRandomProvider;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class GameRoomNavigatorGoldTest {

    @Test
    void navigatorGoldIsPaidWhenPlanningStartsAfterCombat() {
        var unitDefinition = TestHelpers.createUnitDef("navigator-unit", "Navigator Unit", 1, 100, 10);
        var room = new GameRoom(
                "navigator-room",
                TestHelpers.createMockDataLoader(List.of(unitDefinition)),
                TestHelpers.createMockRegistry(),
                new TestClock(),
                new DefaultRandomProvider(),
                GameMode.ONEPIECE);
        var navigatorOwner = room.addPlayer("Navigator Owner");
        var opponent = room.addPlayer("Opponent");
        navigatorOwner.addUnitToBoard(unitDefinition, 0, 0);
        opponent.addUnitToBoard(unitDefinition, 0, 0);

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var navigator = navigatorOwner.getBoardUnits().getFirst();
        navigator.setGoldBonusMin(2);
        navigator.setGoldBonusMax(2);
        assertEquals(navigatorOwner.getGold(), opponent.getGold());

        TestHelpers.setPhase(room, GamePhase.PLANNING);

        assertEquals(opponent.getGold() + 2, navigatorOwner.getGold());
    }
}
