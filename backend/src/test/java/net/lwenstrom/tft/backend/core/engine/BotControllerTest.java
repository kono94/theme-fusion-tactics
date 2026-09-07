package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class BotControllerTest {
    private final UnitDefinition unit = TestHelpers.createUnitDef("a", "A", 1, 100, 10);
    private final net.lwenstrom.tft.backend.core.DataLoader loader = TestHelpers.createMockDataLoader(List.of(unit));
    private final net.lwenstrom.tft.backend.core.random.RandomProvider random =
            TestHelpers.createSeededRandomProvider();
    private final BotController controller = new BotController(loader, random);
    private final AugmentManager augments = new AugmentManager(List.of(), random);

    private Player bot(int gold) {
        var player = new Player("bot", GameMode.ONEPIECE, loader, random);
        player.setBot(true);
        player.setGold(gold);
        return player;
    }

    @Test
    void upgradesRequireSixPurchasedCopiesAndCompletedLinesDisappear() {
        var bot = bot(100);
        bot.setHealth(30);
        bot.setLevel(GameConstants.MAX_PLAYER_LEVEL);
        bot.setShop(new ArrayList<>(List.of(unit, unit, unit, unit, unit)));
        var actions = controller.plan(bot, 1, augments);
        assertEquals(1, bot.getBoardUnits().size());
        assertEquals(3, bot.getBoardUnits().getFirst().getStarLevel());
        var rerolls = actions - 6;
        assertEquals(100 - 6 - rerolls * GameConstants.REROLL_COST, bot.getGold());
        bot.refreshShopFree();
        assertTrue(bot.getShop().stream().allMatch(definition -> definition == null));
        assertTrue(actions <= BotController.MAX_ACTIONS);
    }

    @Test
    void preservesGoldAndNeverRepeatsPlanning() {
        var bot = bot(0);
        bot.setShop(new ArrayList<>(List.of(unit)));
        assertEquals(0, controller.plan(bot, 1, augments));
        assertTrue(bot.getBoardUnits().isEmpty());
        bot.setGold(10);
        assertEquals(0, controller.plan(bot, 1, augments));
        assertTrue(bot.getBoardUnits().isEmpty());
        controller.plan(bot, 2, augments);
        assertFalse(bot.getBoardUnits().isEmpty());
        assertTrue(bot.getGold() >= 0);
    }

    @Test
    void fillsSlotsBelowReserveButSavesAfterwards() {
        var bot = bot(3);
        bot.setShop(new ArrayList<>(List.of(unit, unit, unit)));
        controller.plan(bot, 6, augments);
        assertEquals(1, bot.getBoardUnits().size());
        assertEquals(2, bot.getGold());
    }

    @Test
    void fullBenchCanSellUnrelatedReserveForImmediateUpgrade() {
        var other = TestHelpers.createUnitDef("other", "Other", 1, 100, 10);
        var bot = bot(50);
        bot.setShop(new ArrayList<>(List.of(unit, unit)));
        bot.buyUnit(0);
        bot.moveUnit(bot.getBench().getFirst().getId(), 0, 0);
        bot.buyUnit(1);
        for (var index = 1; index < 9; index++) {
            bot.getBenchSlots().set(index, new StandardGameUnit(other));
        }
        bot.setShop(new ArrayList<>(List.of(unit)));
        controller.plan(bot, 1, augments);
        assertEquals(2, bot.getBoardUnits().getFirst().getStarLevel());
        assertTrue(bot.getBench().size() <= 9);
        assertTrue(bot.getGold() >= 0);
    }

    @Test
    void normalXpPurchaseIsSharedAndRejectsMaxLevelAndInsufficientGold() {
        var bot = bot(3);
        assertFalse(bot.buyXp());
        bot.setGold(4);
        assertTrue(bot.buyXp());
        assertEquals(0, bot.getGold());
        bot.setLevel(GameConstants.MAX_PLAYER_LEVEL);
        bot.setGold(100);
        assertFalse(bot.buyXp());
        controller.plan(bot, 1, augments);
        assertEquals(GameConstants.MAX_PLAYER_LEVEL, bot.getLevel());
    }

    @Test
    void eliminatedGhostAndCombatPlayersDoNotAct() {
        var bot = bot(100);
        bot.setShop(new ArrayList<>(List.of(unit)));
        bot.setHealth(0);
        assertEquals(0, controller.plan(bot, 1, augments));
        bot.setHealth(100);
        bot.setGhost(true);
        assertEquals(0, controller.plan(bot, 1, augments));
        bot.setGhost(false);
        bot.setInCombat(true);
        assertEquals(0, controller.plan(bot, 1, augments));
        assertEquals(100, bot.getGold());
    }

    @Test
    void unitsPersistWhenNoPurchasesArePossible() {
        var bot = bot(5);
        bot.setShop(new ArrayList<>(List.of(unit)));
        controller.plan(bot, 1, augments);
        var ids = Stream.concat(
                        bot.getBoardUnits().stream(), bot.getBenchSlots().units())
                .map(u -> u.getId())
                .toList();
        bot.setGold(0);
        controller.plan(bot, 2, augments);
        assertEquals(
                ids,
                Stream.concat(bot.getBoardUnits().stream(), bot.getBenchSlots().units())
                        .map(u -> u.getId())
                        .toList());
    }
}
