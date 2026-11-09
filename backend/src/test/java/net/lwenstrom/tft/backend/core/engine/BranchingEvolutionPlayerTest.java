package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemInstance;
import net.lwenstrom.tft.backend.core.model.ItemStat;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.test.BranchingTestUnits;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class BranchingEvolutionPlayerTest {
    private final List<UnitDefinition> units = BranchingTestUnits.load();
    private final UnitDefinition eevee = unit("eevee");
    private final UnitDefinition ralts = unit("ralts");
    private final UnitDefinition wurmple = unit("wurmple");
    private final DataLoader dataLoader = TestHelpers.createMockDataLoader(units);

    @Test
    void choosingOnTheBoardKeepsCellOrderItemsAndOwner() {
        var player = player();
        player.setLevel(3);
        player.addUnitToBoard(ralts, 0, 0);
        player.addUnitToBoard(eevee, 1, 0, 2);
        player.addUnitToBoard(wurmple, 2, 1);
        var pending = player.getBoardUnits().get(1);
        var item = item();
        pending.getItems().add(item);

        assertTrue(player.chooseEvolution(pending.getId(), "jolteon"));

        var evolved = player.getBoardUnits().get(1);
        assertEquals(3, player.getBoardUnits().size());
        assertEquals("jolteon", evolved.getDefinitionId());
        assertEquals("jolteon", evolved.getBranchId());
        assertNull(evolved.getEvolutionOptions());
        assertEquals(2, evolved.getStarLevel());
        assertEquals(1, evolved.getX());
        assertEquals(0, evolved.getY());
        assertSame(evolved, player.getGrid().getUnitAt(1, 0).orElseThrow());
        assertEquals(List.of(item), evolved.getItems());
        assertEquals(player.getId(), evolved.getOwnerId());
        assertEquals("ralts", player.getBoardUnits().get(0).getDefinitionId());
        assertEquals("wurmple", player.getBoardUnits().get(2).getDefinitionId());
    }

    @Test
    void choosingOnTheBenchKeepsTheSlot() {
        var player = player();
        player.getBenchSlots().set(3, owned(player, new StandardGameUnit(wurmple, 2)));

        assertTrue(player.chooseEvolution(player.getBench().get(3).getId(), "cascoon"));

        var evolved = player.getBench().get(3);
        assertEquals("Cascoon", evolved.getName());
        assertEquals("cascoon", evolved.getBranchId());
        assertEquals(1, player.getBenchSlots().count());
    }

    @Test
    void rejectsInvalidBranchesNonPendingAndForeignUnits() {
        var player = player();
        var other = player();
        var pending = owned(player, new StandardGameUnit(eevee, 2));
        var notPending = owned(player, new StandardGameUnit(ralts, 2));
        var chosen = owned(player, new StandardGameUnit(eevee, 2, "flareon"));
        var foreign = owned(other, new StandardGameUnit(eevee, 2));
        player.getBenchSlots().set(0, pending);
        player.getBenchSlots().set(1, notPending);
        player.getBenchSlots().set(2, chosen);
        other.getBenchSlots().set(0, foreign);

        assertFalse(player.chooseEvolution(pending.getId(), "umbreon"));
        assertFalse(player.chooseEvolution(pending.getId(), "gallade"));
        assertFalse(player.chooseEvolution(pending.getId(), null));
        assertFalse(player.chooseEvolution(notPending.getId(), "gardevoir"));
        assertFalse(player.chooseEvolution(chosen.getId(), "vaporeon"));
        assertFalse(player.chooseEvolution(foreign.getId(), "vaporeon"));
        assertFalse(player.chooseEvolution("missing", "vaporeon"));
        assertSame(pending, player.getBench().get(0));
        assertSame(foreign, other.getBench().get(0));
    }

    @Test
    void upgradeInheritsTheSurvivorsBranchAndCarriesItToThreeStars() {
        var player = player();
        player.setLevel(3);
        player.addUnitToBoard(wurmple, 0, 0, 2, "silcoon");
        player.getBenchSlots().set(0, owned(player, new StandardGameUnit(wurmple, 1)));
        player.getBenchSlots().set(1, owned(player, new StandardGameUnit(wurmple, 1)));

        buy(player, wurmple);

        var upgraded = player.getBoardUnits().getFirst();
        assertEquals(3, upgraded.getStarLevel());
        assertEquals("silcoon", upgraded.getBranchId());
        assertEquals("Beautifly", upgraded.getName());
        assertEquals(0, upgraded.getX());
        assertNull(upgraded.getEvolutionOptions());
        assertEquals(0, player.getBenchSlots().count());
    }

    @Test
    void upgradeFallsBackToTheFirstChosenBranchAmongMergedUnits() {
        var player = player();
        player.getBenchSlots().set(0, owned(player, new StandardGameUnit(wurmple, 2)));
        player.getBenchSlots().set(1, owned(player, new StandardGameUnit(wurmple, 2, "cascoon")));
        player.getBenchSlots().set(2, owned(player, new StandardGameUnit(wurmple, 1)));
        player.getBenchSlots().set(3, owned(player, new StandardGameUnit(wurmple, 1)));

        buy(player, wurmple);

        var upgraded = player.getBenchSlots()
                .units()
                .filter(unit -> unit.getStarLevel() == 3)
                .findFirst()
                .orElseThrow();
        assertEquals("cascoon", upgraded.getBranchId());
        assertEquals("Dustox", upgraded.getName());
        var leftover = player.getBenchSlots()
                .units()
                .filter(unit -> unit.getStarLevel() == 2)
                .toList();
        assertEquals(1, leftover.size());
        assertTrue(leftover.getFirst().isEvolutionPending());
    }

    @Test
    void upgradeOfUnchosenUnitsStaysPending() {
        var player = player();
        player.getBenchSlots().set(0, owned(player, new StandardGameUnit(eevee, 1)));
        player.getBenchSlots().set(1, owned(player, new StandardGameUnit(eevee, 1)));

        buy(player, eevee);

        var upgraded = singleBenchUnit(player);
        assertEquals(2, upgraded.getStarLevel());
        assertNull(upgraded.getBranchId());
        assertEquals("Eevee", upgraded.getName());
        assertEquals(3, upgraded.getEvolutionOptions().size());
    }

    @Test
    void roomAcceptsEvolutionChoicesOnlyDuringPlanning() {
        var room = TestHelpers.createTestGameRoom(dataLoader);
        var player = room.addPlayer("P1");
        room.addPlayer("P2");
        var pending = owned(player, new StandardGameUnit(eevee, 2));
        player.getBenchSlots().set(5, pending);

        assertFalse(room.applyAction(player.getId(), choose(player, pending.getId(), "vaporeon")));

        TestHelpers.setPhase(room, GamePhase.PLANNING);
        player.setLevel(1);
        player.addUnitToBoard(ralts, 0, 0);
        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var benchPending = player.getBench().get(5);
        assertSame(pending, benchPending);
        assertFalse(room.applyAction(player.getId(), choose(player, pending.getId(), "vaporeon")));

        TestHelpers.setPhase(room, GamePhase.PLANNING);
        assertFalse(room.applyAction(player.getId(), choose(player, pending.getId(), null)));
        assertFalse(room.applyAction(player.getId(), choose(player, pending.getId(), "gallade")));
        assertTrue(room.applyAction(player.getId(), choose(player, pending.getId(), "vaporeon")));
        assertEquals("Vaporeon", player.getBench().get(5).getName());
        assertEquals(
                "vaporeon",
                room.getState().players().get(player.getId()).bench().get(5).getBranchId());
    }

    @Test
    void autoPickRunsAfterOrbCollectionAndNoPendingUnitEntersCombat() {
        var room = TestHelpers.createTestGameRoom(dataLoader);
        var first = room.addPlayer("P1");
        var second = room.addPlayer("P2");
        var third = room.addPlayer("P3");
        TestHelpers.setPhase(room, GamePhase.PLANNING);
        first.setLevel(3);
        first.addUnitToBoard(wurmple, 0, 0);
        first.addUnitToBoard(wurmple, 1, 0);
        first.addLootOrb(new LootOrb("orb", 4, 1, LootType.UNIT, "wurmple", 1));
        second.getBenchSlots().set(0, owned(second, new StandardGameUnit(eevee, 2)));
        third.setLevel(1);
        third.addUnitToBoard(ralts, 0, 0, 3);
        third.getBenchSlots().set(4, owned(third, new StandardGameUnit(eevee, 3)));

        TestHelpers.setPhase(room, GamePhase.COMBAT);

        assertTrue(first.getLootOrbs().isEmpty());
        var merged = first.getBoardUnits().getFirst();
        assertEquals(2, merged.getStarLevel());
        assertTrue(Set.of("silcoon", "cascoon").contains(merged.getBranchId()));
        assertEquals("eevee", second.getBoardUnits().getFirst().getLineId());
        assertNotNull(second.getBoardUnits().getFirst().getBranchId());
        assertTrue(Set.of("gardevoir", "gallade")
                .contains(third.getBoardUnits().getFirst().getBranchId()));
        room.getPlayers()
                .forEach(player -> player.getBoardUnits()
                        .forEach(unit ->
                                assertFalse(unit.isEvolutionPending(), unit.getName() + " entered combat pending")));
        room.getState()
                .players()
                .values()
                .forEach(state -> state.board()
                        .forEach(unit ->
                                assertNull(unit.getEvolutionOptions(), unit.getName() + " entered combat pending")));
        assertTrue(third.getBench().get(4).isEvolutionPending());
    }

    @Test
    void botsResolvePendingBoardAndBenchUnits() {
        var random = TestHelpers.createSeededRandomProvider();
        var controller = new BotController(dataLoader, random);
        var bot = new Player("bot", GameMode.ONEPIECE, dataLoader, random);
        bot.setBot(true);
        bot.setLevel(1);
        bot.addUnitToBoard(wurmple, 0, 0, 2);
        bot.getBenchSlots().set(0, owned(bot, new StandardGameUnit(eevee, 2)));
        bot.getBenchSlots().set(1, owned(bot, new StandardGameUnit(ralts, 3)));

        controller.plan(bot, 1, new AugmentManager(List.of(), random));

        var owned = Stream.concat(
                        bot.getBoardUnits().stream(), bot.getBenchSlots().units())
                .toList();
        assertEquals(3, owned.size());
        owned.forEach(unit -> {
            assertFalse(unit.isEvolutionPending(), unit.getName());
            assertNotNull(unit.getBranchId(), unit.getName());
        });
    }

    @Test
    void pendingUnitsSerializeTheirBranchAndOptions() {
        var mapper = JsonMapper.builder().build();
        var pending = mapper.readTree(mapper.writeValueAsString(new StandardGameUnit(wurmple, 2)));
        var chosen = mapper.readTree(mapper.writeValueAsString(new StandardGameUnit(wurmple, 2, "silcoon")));

        assertTrue(pending.get("branchId").isNull());
        var options = pending.get("evolutionOptions");
        assertEquals(2, options.size());
        assertEquals("silcoon", options.get(0).get("branchId").asString());
        assertEquals("Silcoon", options.get(0).get("name").asString());
        assertEquals(
                "beautifly",
                options.get(0).get("laterForms").get(0).get("definitionId").asString());
        assertEquals(3, options.get(0).get("laterForms").get(0).get("starLevel").asInt());
        assertEquals("silcoon", chosen.get("branchId").asString());
        assertTrue(chosen.get("evolutionOptions") == null
                || chosen.get("evolutionOptions").isNull());
        assertFalse(pending.has("evolutionPending"));
    }

    private UnitDefinition unit(String id) {
        return units.stream().filter(unit -> unit.id().equals(id)).findFirst().orElseThrow();
    }

    private Player player() {
        return TestHelpers.createTestPlayer("P", dataLoader);
    }

    private static GameUnit owned(Player player, GameUnit unit) {
        unit.setOwnerId(player.getId());
        return unit;
    }

    private static void buy(Player player, UnitDefinition definition) {
        player.setGold(100);
        player.setShop(new ArrayList<>(List.of(definition)));
        player.buyUnit(0);
    }

    private static GameUnit singleBenchUnit(Player player) {
        var units = player.getBenchSlots().units().toList();
        assertEquals(1, units.size());
        return units.getFirst();
    }

    private static GameAction choose(Player player, String unitId, String branchId) {
        return new GameAction(
                ActionType.CHOOSE_EVOLUTION,
                player.getId(),
                unitId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                branchId);
    }

    private static ItemInstance item() {
        return ItemInstance.from(new ItemDefinition(
                "axe", "Axe", "+40% ATK", "/items/axe.svg", Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 40)));
    }
}
