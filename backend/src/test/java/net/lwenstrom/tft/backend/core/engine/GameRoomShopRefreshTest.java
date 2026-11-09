package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.List;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.random.DefaultRandomProvider;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class GameRoomShopRefreshTest {

    private final GameRoom room = new GameRoom(
            "shop-refresh-room",
            TestHelpers.createMockDataLoader(List.of(TestHelpers.createUnitDef("unit", "Unit", 1, 100, 10))),
            TestHelpers.createMockRegistry(),
            new TestClock(),
            new DefaultRandomProvider(),
            GameMode.ONEPIECE);

    @Test
    void joiningPlayersAndBotsKeepStartingGold() {
        var player = room.addPlayer("Player");
        var bot = room.addBot().orElseThrow();

        assertEquals(GameConstants.STARTING_GOLD, player.getGold());
        assertEquals(GameConstants.STARTING_GOLD, bot.getGold());
        assertEquals(GameConstants.SHOP_SIZE, player.getShop().size());
    }

    @Test
    void newRoundShopRefreshIsFree() {
        var player = room.addPlayer("Player");
        room.addPlayer("Opponent");
        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var goldBeforePlanning = player.getGold();

        TestHelpers.setPhase(room, GamePhase.PLANNING);

        var income = GameConstants.BASE_INCOME + Math.min(goldBeforePlanning / 10, GameConstants.MAX_INTEREST);
        assertEquals(goldBeforePlanning + income, player.getGold());
    }

    @Test
    void lockedShopIsNotRefreshedForNewRound() {
        var player = room.addPlayer("Player");
        room.addPlayer("Opponent");
        player.setShopLocked(true);
        var lockedShop = player.getShop();
        TestHelpers.setPhase(room, GamePhase.COMBAT);

        TestHelpers.setPhase(room, GamePhase.PLANNING);

        assertSame(lockedShop, player.getShop());
    }
}
