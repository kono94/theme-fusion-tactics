package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class VariantGroupPlayerTest {
    private static final DataLoader DATA_LOADER = new DataLoader(
            new GameModeRegistry(TestHelpers.allModeProviders()),
            JsonMapper.builder().build());
    private static final String GROUP = "unown";

    @Test
    void collapsedPoolGivesTheGroupTheOddsOfASingleUnit() {
        var units = DATA_LOADER.getAllUnits(GameMode.POKEMON_GEN23);
        var collapsed = VariantGroups.collapse(units);

        assertEquals(
                28,
                units.stream().filter(unit -> GROUP.equals(unit.variantGroup())).count());
        assertEquals(
                1,
                collapsed.stream()
                        .filter(unit -> GROUP.equals(unit.variantGroup()))
                        .count());
        var twoCostLines = units.stream()
                .filter(unit -> unit.cost() == 2)
                .map(UnitDefinition::lineId)
                .distinct()
                .count();
        assertEquals(
                twoCostLines,
                collapsed.stream().filter(unit -> unit.cost() == 2).count());
    }

    @Test
    void shopOffersVariedLettersUntilTheFirstPurchaseLocksOne() {
        var player = variantOnlyPlayer();
        var offered = new HashSet<String>();
        for (var i = 0; i < 20; i++) {
            player.refreshShopFree();
            player.getShop().forEach(offer -> offered.add(offer.id()));
        }
        assertTrue(offered.size() > 5, "expected varied letters but saw " + offered);

        player.setGold(100);
        var bought = player.getShop().get(0);
        player.buyUnit(0);

        assertEquals(bought.id(), player.getLockedVariants().get(GROUP));
        for (var i = 0; i < 20; i++) {
            player.refreshShopFree();
            player.getShop().forEach(offer -> assertEquals(bought.id(), offer.id()));
        }
    }

    @Test
    void buyingRewritesOtherSlotsOfTheSameGroup() {
        var player = gen23Player();
        var natu = def("natu");
        player.setShop(
                new ArrayList<>(Arrays.asList(def("unown_c"), def("unown_f"), natu, def("unown_question"), null)));

        player.buyUnit(0);

        assertEquals("unown_c", player.getLockedVariants().get(GROUP));
        assertNull(player.getShop().get(0));
        assertEquals("unown_c", player.getShop().get(1).id());
        assertEquals("natu", player.getShop().get(2).id());
        assertEquals("unown_c", player.getShop().get(3).id());
    }

    @Test
    void buyingAStaleSlotSubstitutesTheLockedVariant() {
        var player = gen23Player();
        player.setShop(new ArrayList<>(Arrays.asList(def("unown_c"), null, null, null, null)));
        player.buyUnit(0);
        player.setShop(new ArrayList<>(Arrays.asList(def("unown_z"), null, null, null, null)));

        player.buyUnit(0);

        assertTrue(owned(player).allMatch(unit -> unit.getDefinitionId().equals("unown_c")));
        assertEquals(2, owned(player).count());
    }

    @Test
    void sellingTheLastCopyReleasesTheLock() {
        var player = gen23Player();
        player.setShop(new ArrayList<>(Arrays.asList(def("unown_c"), def("unown_c"), null, null, null)));
        player.buyUnit(0);
        player.buyUnit(1);
        var units = owned(player).toList();

        player.sellUnit(units.get(0).getId(), true);
        assertEquals("unown_c", player.getLockedVariants().get(GROUP));

        player.sellUnit(units.get(1).getId(), true);
        assertFalse(player.getLockedVariants().containsKey(GROUP));
    }

    @Test
    void resettingTheModeClearsLocks() {
        var player = gen23Player();
        player.setShop(new ArrayList<>(Arrays.asList(def("unown_c"), null, null, null, null)));
        player.buyUnit(0);

        player.resetForMode(GameMode.POKEMON_GEN23);

        assertTrue(player.getLockedVariants().isEmpty());
    }

    @Test
    void mergingThreeCopiesKeepsTheLetter() {
        var player = gen23Player();
        player.setShop(new ArrayList<>(Arrays.asList(def("unown_k"), def("unown_k"), def("unown_k"), null, null)));

        player.buyUnit(0);
        player.buyUnit(1);
        player.buyUnit(2);

        var units = owned(player).toList();
        assertEquals(1, units.size());
        var merged = units.getFirst();
        assertEquals(2, merged.getStarLevel());
        assertEquals("unown_k", merged.getDefinitionId());
        assertEquals("Unown K", merged.getName());
        assertEquals(List.of("Psychic", "Fighting"), List.copyOf(merged.getTraits()));
        assertEquals("unown_k", player.getLockedVariants().get(GROUP));
    }

    @Test
    void wildcardCopiesTheTypeWithTheMostDistinctLines() {
        var player = gen23Player();
        player.setLevel(9);
        player.addUnitToBoard(def("unown_question"), 0, 0);
        var wildcard = player.getBoardUnits().getFirst();

        player.refreshWildcardTraits();
        assertEquals(List.of("Psychic"), List.copyOf(wildcard.getTraits()));

        player.addUnitToBoard(def("natu"), 1, 0);
        player.addUnitToBoard(def("torchic"), 2, 0);
        player.addUnitToBoard(def("cyndaquil"), 3, 0);
        player.addUnitToBoard(def("totodile"), 4, 0);
        player.addUnitToBoard(def("mudkip"), 5, 0);
        player.addUnitToBoard(def("torchic"), 6, 0);
        player.refreshWildcardTraits();
        // Fire and Water tie on two lines (duplicates do not count); Fire comes first in the trait order.
        assertEquals(List.of("Psychic", "Fire"), List.copyOf(wildcard.getTraits()));

        player.addUnitToBoard(def("marill"), 7, 0);
        var state = player.toState();
        var stateWildcard = state.board().stream()
                .filter(unit -> unit.getDefinitionId().equals("unown_question"))
                .findFirst()
                .orElseThrow();
        assertEquals(List.of("Psychic", "Water"), List.copyOf(stateWildcard.getTraits()));
        assertEquals(
                List.of("Psychic", "Water"), List.copyOf(wildcard.cloneUnit().getTraits()));
    }

    @Test
    void wildcardTraitIsAppliedBeforeCombatTraits() {
        var player = gen23Player();
        player.setLevel(9);
        player.addUnitToBoard(def("unown_question"), 0, 0);
        player.addUnitToBoard(def("chikorita"), 1, 0);
        var wildcard = player.getBoardUnits().getFirst();

        TestHelpers.createTestCombatSystem().startCombat(List.of(player));

        assertTrue(wildcard.getTraits().contains("Grass"));
    }

    private static Player gen23Player() {
        var player = new Player("P", GameMode.POKEMON_GEN23, DATA_LOADER, TestHelpers.createSeededRandomProvider());
        player.setGold(100);
        return player;
    }

    private static Player variantOnlyPlayer() {
        var variants = DATA_LOADER.getVariants(GameMode.POKEMON_GEN23, GROUP);
        var dataLoader = TestHelpers.createMockDataLoader(variants);
        var player = new Player("P", GameMode.POKEMON_GEN23, dataLoader, TestHelpers.createSeededRandomProvider());
        player.setLevel(3);
        return player;
    }

    private static UnitDefinition def(String id) {
        return Objects.requireNonNull(DATA_LOADER.getUnitDefinition(GameMode.POKEMON_GEN23, id), id);
    }

    private static Stream<GameUnit> owned(Player player) {
        return Stream.concat(player.getBenchSlots().units(), player.getBoardUnits().stream());
    }
}
