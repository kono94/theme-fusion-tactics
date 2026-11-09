package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemEffect;
import net.lwenstrom.tft.backend.core.model.ItemEffectType;
import net.lwenstrom.tft.backend.core.model.ItemInstance;
import net.lwenstrom.tft.backend.core.model.ItemStat;
import net.lwenstrom.tft.backend.core.model.UnitRole;
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
    void equipsAvailableItemOnOwnedBoardUnit() {
        var bot = bot(0);
        bot.addUnitToBoard(unit, 0, 0);
        var item = ItemInstance.from(new ItemDefinition(
                "axe", "Axe", "+40% ATK", "/items/axe.svg", Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 40)));
        bot.getInventory().add(item);

        controller.plan(bot, 1, augments);

        assertTrue(bot.getInventory().isEmpty());
        assertEquals(item, bot.getBoardUnits().getFirst().getItems().getFirst());
    }

    private static UnitDefinition roleUnit(String id, UnitRole role) {
        return new UnitDefinition(
                id,
                id,
                1,
                role,
                List.of(100, 100, 100),
                List.of(100, 100, 100),
                List.of(10, 10, 10),
                List.of(0, 0, 0),
                List.of(0, 0, 0),
                List.of(1.0f, 1.0f, 1.0f),
                List.of(1, 1, 1),
                List.of(),
                null);
    }

    private static ItemInstance effectItem(String id, Map<ItemStat, Integer> stats, ItemEffect effect) {
        return ItemInstance.from(new ItemDefinition(id, id, id, "/items/" + id + ".png", stats, List.of(effect)));
    }

    @Test
    void neverEquipsManaPenaltyItemsOnSupports() {
        var support = roleUnit("support", UnitRole.SUPPORT);
        var bot = bot(0);
        bot.addUnitToBoard(support, 0, 0);
        var choiceBand = effectItem(
                "choice_band",
                Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 55),
                new ItemEffect(ItemEffectType.MANA_GAIN_MULTIPLIER, Map.of("multiplier", 0.5)));
        bot.getInventory().add(choiceBand);

        controller.plan(bot, 1, augments);

        assertEquals(List.of(choiceBand), bot.getInventory());
        assertTrue(bot.getBoardUnits().getFirst().getItems().isEmpty());
    }

    @Test
    void effectCategoriesSteerItemsTowardMatchingRoles() {
        var tank = roleUnit("tank", UnitRole.TANK);
        var damage = roleUnit("damage", UnitRole.DAMAGE);
        var bot = bot(0);
        bot.setLevel(2);
        bot.addUnitToBoard(tank, 0, 0);
        bot.addUnitToBoard(damage, 1, 0);
        var focusBand = effectItem(
                "focus_band",
                Map.of(ItemStat.DEFENSE_FLAT, 20),
                new ItemEffect(ItemEffectType.SURVIVE_LETHAL_ONCE, Map.of()));
        var quickClaw = effectItem(
                "quick_claw",
                Map.of(ItemStat.ATTACK_SPEED_PERCENT, 15),
                new ItemEffect(ItemEffectType.EXTRA_ATTACK_CHANCE, Map.of("chance", 0.15)));
        bot.getInventory().addAll(List.of(focusBand, quickClaw));

        controller.plan(bot, 1, augments);

        var units = bot.getBoardUnits();
        var tankUnit = units.stream()
                .filter(u -> u.getRole() == UnitRole.TANK)
                .findFirst()
                .orElseThrow();
        var damageUnit = units.stream()
                .filter(u -> u.getRole() == UnitRole.DAMAGE)
                .findFirst()
                .orElseThrow();
        assertEquals(List.of(focusBand), tankUnit.getItems());
        assertEquals(List.of(quickClaw), damageUnit.getItems());
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
