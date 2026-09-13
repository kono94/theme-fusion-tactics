package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class PlayerUnitTest {
    private long countBenchUnits(Player p) {
        return p.getBench().stream().filter(java.util.Objects::nonNull).count();
    }

    private GameUnit getFirstBenchUnit(Player p) {
        return p.getBench().stream()
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    @Test
    void ghostOwnsItsClonedBoardUnits() {
        var player = TestHelpers.createTestPlayer("Player");
        player.addUnitToBoard(TestHelpers.createDefaultUnitDef(), 0, 0);

        var ghost = player.createGhost();

        assertEquals(ghost.getId(), ghost.getBoardUnits().getFirst().getOwnerId());
    }

    @Test
    void testTakeDamage_ReducesHealth() {
        var player = TestHelpers.createTestPlayer("TestPlayer");
        assertEquals(100, player.getHealth());

        player.takeDamage(30);

        assertEquals(70, player.getHealth());
    }

    @Test
    void testTakeDamage_HealthCapsAt0() {
        var player = TestHelpers.createTestPlayer("TestPlayer");

        player.takeDamage(150);

        assertEquals(0, player.getHealth(), "Health should not go below 0");
    }

    @Test
    void testGainGold_IncreasesGold() {
        var player = TestHelpers.createTestPlayer("TestPlayer");
        int initialGold = player.getGold();

        player.gainGold(5);

        assertEquals(initialGold + 5, player.getGold());
    }

    @Test
    void testGainXp_TriggersLevelUp() {
        var player = TestHelpers.createTestPlayer("TestPlayer");
        assertEquals(1, player.getLevel());

        // Level 1 requires 2 XP to level up
        player.gainXp(2);

        assertEquals(2, player.getLevel(), "Should level up after gaining enough XP");
        assertEquals(0, player.getXp(), "XP should reset after level up");
    }

    @Test
    void testGainXp_MultipleLevelUps() {
        var player = TestHelpers.createTestPlayer("TestPlayer");
        assertEquals(1, player.getLevel());

        // Level 1->2: 2 XP, Level 2->3: 6 XP = 8 XP total
        player.gainXp(10);

        assertEquals(3, player.getLevel(), "Should level up twice");
        assertEquals(2, player.getXp(), "Remaining XP after level ups");
    }

    @Test
    void lateGameXpCurveUsesReducedRequirements() {
        var requirements = List.of(2, 6, 10, 20, 26, 36, 44, 50);

        for (var level = 1; level <= requirements.size(); level++) {
            var player = TestHelpers.createTestPlayer("Level " + level);
            player.setLevel(level);

            assertEquals(requirements.get(level - 1), player.getNextLevelXp());
            player.gainXp(requirements.get(level - 1));
            assertEquals(level + 1, player.getLevel());
            assertEquals(0, player.getXp());
        }
    }

    @Test
    void levelNineDiscardsXpAndReportsNoNextLevel() {
        var player = TestHelpers.createTestPlayer("Max Level");
        player.setLevel(9);

        player.gainXp(100);

        assertEquals(9, player.getLevel());
        assertEquals(0, player.getXp());
        assertEquals(0, player.getNextLevelXp());
    }

    @Test
    void testBuyUnit_DeductsGold() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();

        int goldBefore = player.getGold();
        var unitInShop = player.getShop().get(0);
        int unitCost = unitInShop != null ? unitInShop.cost() : 1;

        player.buyUnit(0);

        assertEquals(goldBefore - unitCost, player.getGold(), "Gold should be deducted by unit cost");
    }

    @Test
    void testBuyUnit_AddsToRoster() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();

        assertEquals(0, countBenchUnits(player));

        player.buyUnit(0);

        assertEquals(1, countBenchUnits(player), "Unit should be added to bench");
    }

    @Test
    void testBuyUnit_RemovesFromShop() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();

        player.buyUnit(0);

        assertNull(player.getShop().get(0), "Bought slot should be null");
    }

    @Test
    void testBuyUnit_InsufficientGold_DoesNotBuy() {
        var units = List.of(TestHelpers.createUnitDef("expensive", "ExpensiveUnit", 50, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(10); // Not enough for 50 cost unit
        player.refreshShop();

        player.buyUnit(0);

        assertEquals(0, countBenchUnits(player), "Should not buy with insufficient gold");
    }

    @Test
    void testRefreshShop_CostsGold() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(10);

        player.refreshShop();

        assertEquals(8, player.getGold(), "Should deduct 2 gold for refresh");
    }

    @Test
    void testRefreshShop_FillsShop() {
        var units = List.of(
                TestHelpers.createUnitDef("u1", "Unit1", 1, 100, 10),
                TestHelpers.createUnitDef("u2", "Unit2", 1, 100, 10),
                TestHelpers.createUnitDef("u3", "Unit3", 1, 100, 10),
                TestHelpers.createUnitDef("u4", "Unit4", 1, 100, 10),
                TestHelpers.createUnitDef("u5", "Unit5", 1, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(10);

        player.refreshShop();

        assertEquals(5, player.getShop().size(), "Shop should have 5 units");
    }

    @Test
    void testRefreshShop_DeterministicWithSeed() {
        var units = List.of(
                TestHelpers.createUnitDef("u1", "Unit1", 1, 100, 10),
                TestHelpers.createUnitDef("u2", "Unit2", 1, 100, 10),
                TestHelpers.createUnitDef("u3", "Unit3", 1, 100, 10),
                TestHelpers.createUnitDef("u4", "Unit4", 1, 100, 10),
                TestHelpers.createUnitDef("u5", "Unit5", 1, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);

        var player1 = createTestPlayer("P1", dataLoader, createSeededRandomProvider(123L));
        player1.setGold(100);
        player1.refreshShop();
        var shop1 =
                player1.getShop().stream().map(u -> u != null ? u.name() : null).toList();

        var player2 = createTestPlayer("P2", dataLoader, createSeededRandomProvider(123L));
        player2.setGold(100);
        player2.refreshShop();
        var shop2 =
                player2.getShop().stream().map(u -> u != null ? u.name() : null).toList();

        assertEquals(shop1, shop2, "Same seed should produce same shop");
    }

    @Test
    void refreshShopExcludesCompletedThreeStarLine() {
        var completed = TestHelpers.createUnitDef("completed", "Completed", 1, 100, 10);
        var available = TestHelpers.createUnitDef("available", "Available", 1, 100, 10);
        var units = List.of(completed, available);
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.getBenchSlots().set(0, new StandardGameUnit(completed, 3));

        player.refreshShopFree();

        assertEquals(5, player.getShop().size());
        assertTrue(player.getShop().stream()
                .allMatch(unit -> unit != null && unit.lineId().equals("available")));
    }

    @Test
    void refreshShopUsesEmptySlotsWhenEveryLineIsCompleted() {
        var completed = TestHelpers.createUnitDef("completed", "Completed", 1, 100, 10);
        var dataLoader = TestHelpers.createMockDataLoader(List.of(completed));
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.getBenchSlots().set(0, new StandardGameUnit(completed, 3));

        player.refreshShopFree();

        assertEquals(5, player.getShop().size());
        assertTrue(player.getShop().stream().allMatch(java.util.Objects::isNull));
    }

    @Test
    void buyUnitDoesNotBuyStaleShopOfferForCompletedLine() {
        var completed = TestHelpers.createUnitDef("completed", "Completed", 1, 100, 10);
        var dataLoader = TestHelpers.createMockDataLoader(List.of(completed));
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.setShop(new java.util.ArrayList<>(List.of(completed)));
        player.getBenchSlots().set(0, new StandardGameUnit(completed, 3));

        player.buyUnit(0);

        assertEquals(100, player.getGold());
        assertEquals(1, countBenchUnits(player));
        assertEquals(3, player.getBench().get(0).getStarLevel());
    }

    @Test
    void testMoveUnit_BenchToBoard() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.setLevel(3); // Allow placing units
        player.refreshShop();
        player.buyUnit(0);

        var unitId = getFirstBenchUnit(player).getId();

        player.moveUnit(unitId, 3, 2);

        assertEquals(0, countBenchUnits(player), "Bench should be empty");
        assertEquals(1, player.getBoardUnits().size(), "Board should have 1 unit");
        assertEquals(3, player.getBoardUnits().get(0).getX());
        assertEquals(2, player.getBoardUnits().get(0).getY());
    }

    @Test
    void testMoveUnit_BenchToBenchSwap() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();
        player.buyUnit(0); // slot 0
        player.buyUnit(1); // slot 1

        var unit1Id = player.getBench().get(0).getId();
        var unit2Id = player.getBench().get(1).getId();

        // Swap slot 0 and 1
        player.moveUnit(unit1Id, 1, -1);

        assertEquals(unit1Id, player.getBench().get(1).getId());
        assertEquals(unit2Id, player.getBench().get(0).getId());
    }

    @Test
    void testMoveUnit_BoardToBenchSpecificSlot() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setLevel(3);
        var def = TestHelpers.createDefaultUnitDef();
        player.addUnitToBoard(def, 3, 2);

        var unitId = player.getBoardUnits().get(0).getId();

        player.moveUnit(unitId, 5, -1); // target bench slot 5

        assertNull(player.getBench().get(0));
        assertEquals(unitId, player.getBench().get(5).getId());
        assertEquals(0, player.getBoardUnits().size());
    }

    @Test
    void testMoveUnit_BoardToBench() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setLevel(3);
        var def = TestHelpers.createDefaultUnitDef();
        player.addUnitToBoard(def, 3, 2);

        var unitId = player.getBoardUnits().get(0).getId();

        player.moveUnit(unitId, 0, -1); // y < 0 means bench, slot 0

        assertEquals(1, countBenchUnits(player), "Unit should be on bench");
        assertEquals(unitId, player.getBench().get(0).getId());
        assertEquals(0, player.getBoardUnits().size(), "Board should be empty");
    }

    @Test
    void testAddUnitToBoard_RespectsLevelCap() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setLevel(1); // Can only have 1 unit on board

        var def = TestHelpers.createDefaultUnitDef();
        player.addUnitToBoard(def, 0, 0);
        player.addUnitToBoard(def, 1, 0); // Should fail

        assertEquals(1, player.getBoardUnits().size(), "Should only have 1 unit at level 1");
    }

    // ========== SELL UNIT TESTS ==========

    @Test
    void testSellUnit_RefundsGold_1Star() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();
        player.buyUnit(0);

        var unit = getFirstBenchUnit(player);
        var goldBefore = player.getGold();

        player.sellUnit(unit.getId(), true);

        assertEquals(goldBefore + 1, player.getGold(), "Should refund 1 gold for 1-star, 1-cost unit");
        assertEquals(0, countBenchUnits(player), "Unit should be removed from bench");
    }

    @Test
    void testSellUnit_RefundsGold_2Star() {
        var units = List.of(TestHelpers.createUnitDef("u1", "TestUnit", 1, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);

        // Buy 3 units to create a 2-star
        player.refreshShop();
        player.buyUnit(0);
        player.refreshShop();
        player.buyUnit(0);
        player.refreshShop();
        player.buyUnit(0);

        // Should now have 1 2-star unit
        var unit = getFirstBenchUnit(player);
        assertEquals(2, unit.getStarLevel(), "Should be 2-star after combining");

        var goldBefore = player.getGold();
        player.sellUnit(unit.getId(), true);

        assertEquals(goldBefore + 3, player.getGold(), "Should refund 3 gold for 2-star, 1-cost unit");
    }

    @Test
    void testSellUnit_RefundsGold_3Star_2Cost() {
        var units = List.of(TestHelpers.createUnitDef("u1", "TestUnit", 2, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(200);

        // Buy 6 units to create a 3-star (3 for each 2-star, then 2 2-stars = 6 total)
        for (var i = 0; i < 6; i++) {
            player.refreshShop();
            player.buyUnit(0);
        }

        // Should now have 1 3-star unit
        assertEquals(1, countBenchUnits(player), "Should have exactly 1 unit after combining to 3-star");
        var unit = getFirstBenchUnit(player);
        assertEquals(3, unit.getStarLevel(), "Should be 3-star after combining");

        var goldBefore = player.getGold();
        player.sellUnit(unit.getId(), true);

        assertEquals(goldBefore + 12, player.getGold(), "Should refund 12 gold for 3-star, 2-cost unit");
    }

    @Test
    void testUpgrade_StopsAt3Star() {
        var units = List.of(TestHelpers.createUnitDef("u1", "TestUnit", 1, 100, 10));
        var dataLoader = TestHelpers.createMockDataLoader(units);
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(200);

        for (var i = 0; i < 9; i++) {
            player.refreshShop();
            player.buyUnit(0);
        }

        assertEquals(1, countBenchUnits(player), "Should keep only the completed 3-star after extra buy attempts");
        assertEquals(
                1,
                player.getBench().stream()
                        .filter(java.util.Objects::nonNull)
                        .filter(unit -> unit.getStarLevel() == 3)
                        .count(),
                "Should have exactly one 3-star unit");
        assertEquals(
                0,
                player.getBench().stream()
                        .filter(java.util.Objects::nonNull)
                        .filter(unit -> unit.getStarLevel() == 2)
                        .count(),
                "Should not acquire extra copies after completing the 3-star line");
    }

    @Test
    void testSellUnit_RemovesFromBoard() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setLevel(3);
        var def = TestHelpers.createDefaultUnitDef();
        player.addUnitToBoard(def, 3, 2);

        var unitId = player.getBoardUnits().get(0).getId();
        var goldBefore = player.getGold();

        player.sellUnit(unitId, true);

        assertEquals(0, player.getBoardUnits().size(), "Board should be empty after selling");
        assertEquals(goldBefore + 1, player.getGold(), "Gold should be refunded");
        assertTrue(player.getGrid().isEmpty(3, 2), "Grid cell should be empty");
    }

    @Test
    void testSellUnit_InvalidId_NoOp() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(10);

        var goldBefore = player.getGold();
        player.sellUnit("non-existent-id", true);

        assertEquals(goldBefore, player.getGold(), "Gold should not change");
    }

    @Test
    void testCalculateSellValue_Formula() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);

        // Create units with different costs and star levels
        var unit1Star1Cost = new StandardGameUnit(TestHelpers.createUnitDef("u1", "Unit", 1, 100, 10));
        unit1Star1Cost.setStarLevel(1);

        var unit2Star1Cost = new StandardGameUnit(TestHelpers.createUnitDef("u2", "Unit", 1, 100, 10));
        unit2Star1Cost.setStarLevel(2);

        var unit3Star1Cost = new StandardGameUnit(TestHelpers.createUnitDef("u3", "Unit", 1, 100, 10));
        unit3Star1Cost.setStarLevel(3);

        var unit3Star2Cost = new StandardGameUnit(TestHelpers.createUnitDef("u4", "Unit", 2, 100, 10));
        unit3Star2Cost.setStarLevel(3);

        assertEquals(1, player.calculateSellValue(unit1Star1Cost), "1-star, 1-cost = 1 gold");
        assertEquals(3, player.calculateSellValue(unit2Star1Cost), "2-star, 1-cost = 3 gold");
        assertEquals(6, player.calculateSellValue(unit3Star1Cost), "3-star, 1-cost = 6 gold");
        assertEquals(12, player.calculateSellValue(unit3Star2Cost), "3-star, 2-cost = 12 gold");
    }

    @Test
    void testMoveUnit_BenchToBenchSwapInCombat() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setGold(100);
        player.refreshShop();
        player.buyUnit(0); // slot 0
        player.buyUnit(1); // slot 1

        var unit1Id = player.getBench().get(0).getId();
        var unit2Id = player.getBench().get(1).getId();

        player.setInCombat(true);

        // Swap slot 0 and 1 - should work in combat
        player.moveUnit(unit1Id, 1, -1);

        assertEquals(unit1Id, player.getBench().get(1).getId());
        assertEquals(unit2Id, player.getBench().get(0).getId());

        // Try to move to board - should be blocked in combat
        player.moveUnit(unit1Id, 0, 0);
        assertNull(player.getGrid().getUnitAt(0, 0).orElse(null));
        assertEquals(unit1Id, player.getBench().get(1).getId());
    }
}
