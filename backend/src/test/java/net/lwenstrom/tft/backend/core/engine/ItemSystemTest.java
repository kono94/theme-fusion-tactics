package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.AugmentEffectType;
import net.lwenstrom.tft.backend.core.model.AugmentTier;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemInstance;
import net.lwenstrom.tft.backend.core.model.ItemStat;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.model.SelectedAugment;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ItemSystemTest {
    private static ItemDefinition item(String id, Map<ItemStat, Integer> bonuses) {
        return new ItemDefinition(id, id, id, "/items/" + id + ".svg", bonuses);
    }

    @Test
    void bothModesLoadEightDistinctItems() {
        var mapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(mapper), new PokemonGameModeProvider(mapper)));
        var loader = new DataLoader(registry, mapper);

        assertEquals(8, loader.getItems(GameMode.ONEPIECE).size());
        assertEquals(8, loader.getItems(GameMode.POKEMON).size());
        assertNotEquals(
                loader.getItems(GameMode.ONEPIECE).getFirst().name(),
                loader.getItems(GameMode.POKEMON).getFirst().name());
    }

    @Test
    void largeAndMixedProfilesAddBonusesBeforeApplyingThem() {
        var mapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(mapper), new PokemonGameModeProvider(mapper)));
        var loader = new DataLoader(registry, mapper);
        var catalog = loader.getItems(GameMode.ONEPIECE);
        var axe = catalog.stream()
                .filter(item -> item.id().equals("onepiece_axe"))
                .findFirst()
                .orElseThrow();
        var flag = catalog.stream()
                .filter(item -> item.id().equals("onepiece_flag"))
                .findFirst()
                .orElseThrow();
        assertEquals(1, axe.statBonuses().size());
        assertEquals(3, flag.statBonuses().size());

        var unit = new StandardGameUnit(TestHelpers.createUnitDef("profile", "Profile", 1, 100, 20));
        var baseHealth = unit.getMaxHealth();
        var baseAttack = unit.getAttackDamage();
        var baseSpeed = unit.getAttackSpeed();
        unit.getItems().addAll(List.of(ItemInstance.from(axe), ItemInstance.from(flag)));
        ItemStatApplier.apply(unit);

        assertEquals(baseHealth + Math.round(baseHealth * .15f), unit.getMaxHealth());
        assertEquals(baseAttack + Math.round(baseAttack * .55f), unit.getAttackDamage());
        assertEquals(baseSpeed * 1.12f, unit.getAttackSpeed(), .001f);
    }

    @Test
    void scheduledRewardCanBeEquippedInBothModes() {
        var mapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(mapper), new PokemonGameModeProvider(mapper)));
        var loader = new DataLoader(registry, mapper);
        for (var mode : List.of(GameMode.ONEPIECE, GameMode.POKEMON)) {
            var room = new GameRoom(
                    "item-" + mode,
                    loader,
                    registry,
                    TestHelpers.createTestClock(),
                    TestHelpers.createSeededRandomProvider(),
                    mode);
            var player = room.addPlayer("Owner");
            var starter = loader.getAllUnits(mode).getFirst();
            var partner = loader.getAllUnits(mode).stream()
                    .filter(candidate -> !candidate.lineId().equals(starter.lineId()))
                    .filter(candidate -> candidate.traits().stream().anyMatch(starter.traits()::contains))
                    .findFirst()
                    .orElseThrow();
            player.addUnitToBoard(starter, 0, 0);
            player.addUnitToBoard(partner, 1, 0);
            room.startMatch();
            TestHelpers.setPhase(room, GamePhase.COMBAT);
            TestHelpers.setPhase(room, GamePhase.PLANNING);

            var itemOrb = player.getLootOrbs().stream()
                    .filter(orb -> orb.type() == LootType.ITEM)
                    .findFirst()
                    .orElseThrow();
            assertTrue(room.applyAction(
                    player.getId(),
                    new GameAction(
                            ActionType.COLLECT_ORB, player.getId(), null, itemOrb.id(), null, null, null, null)));
            for (var orb : List.copyOf(player.getLootOrbs())) {
                assertTrue(room.applyAction(
                        player.getId(),
                        new GameAction(
                                ActionType.COLLECT_ORB, player.getId(), null, orb.id(), null, null, null, null)));
            }
            var owned = player.getInventory().getFirst();
            assertEquals(itemOrb.contentId(), owned.getId());
            var unit = player.getBoardUnits().getFirst();
            assertTrue(
                    room.applyAction(player.getId(), itemAction(player.getId(), owned.getInstanceId(), unit.getId())));
            assertEquals(owned, unit.getItems().getFirst());
            var preview =
                    room.getState().players().get(player.getId()).statPreviews().get(unit.getId());
            TestHelpers.setPhase(room, GamePhase.COMBAT);
            assertTrue(
                    player.getBoardUnits().stream().anyMatch(candidate -> candidate == unit),
                    mode + " unit was replaced before combat");
            assertEquals(owned, unit.getItems().getFirst(), mode + " item was removed before combat");
            assertEquals(preview.maxHealth(), unit.getMaxHealth());
            assertEquals(preview.attackDamage(), unit.getAttackDamage());
            assertEquals(preview.defense(), unit.getDefense());
            assertEquals(preview.attackSpeed(), unit.getAttackSpeed(), .001f);
            assertEquals(
                    preview.abilityDamageMultiplier(),
                    unit.getAbilityDamageMultiplier(),
                    .001f,
                    mode + " " + owned.getId());
        }
    }

    @Test
    void duplicateCopiesMoveIndependentlyAndSellingReturnsEquipment() {
        var definition = TestHelpers.createDefaultUnitDef();
        var player = TestHelpers.createTestPlayer("Owner");
        player.addUnitToBoard(definition, 0, 0);
        var unit = player.getBoardUnits().getFirst();
        var first = ItemInstance.from(item("axe", Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 40)));
        var second = ItemInstance.from(item("axe", Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 40)));
        player.getInventory().addAll(List.of(first, second));

        assertNotEquals(first.instanceId(), second.instanceId());
        assertTrue(player.moveItem(first.instanceId(), unit.getId()));
        assertTrue(player.moveItem(second.instanceId(), unit.getId()));
        assertFalse(player.moveItem(first.instanceId(), "someone-else"));
        assertFalse(player.moveItem(first.instanceId(), unit.getId()));
        assertEquals(2, unit.getItems().size());
        player.sellUnit(unit.getId(), true);
        assertEquals(2, player.getInventory().size());
    }

    @Test
    void roomRejectsForeignFullAndCombatTransfers() {
        var definition = TestHelpers.createDefaultUnitDef();
        var room = TestHelpers.createTestGameRoom(TestHelpers.createMockDataLoader(List.of(definition)));
        var player = room.addPlayer("Owner");
        var other = room.addPlayer("Other");
        assertTrue(room.configureItemSlotsPerUnit(1));
        player.addUnitToBoard(definition, 0, 0);
        other.addUnitToBoard(definition, 0, 0);
        var first = ItemInstance.from(item("a", Map.of(ItemStat.DEFENSE_FLAT, 10)));
        var second = ItemInstance.from(item("b", Map.of(ItemStat.DEFENSE_FLAT, 10)));
        player.getInventory().addAll(List.of(first, second));
        room.startMatch();
        assertFalse(room.configureItemSlotsPerUnit(2));
        var target = player.getBoardUnits().getFirst().getId();
        assertFalse(room.applyAction(other.getId(), itemAction(player.getId(), first.instanceId(), target)));
        assertFalse(room.applyAction(
                player.getId(),
                itemAction(
                        player.getId(),
                        first.instanceId(),
                        other.getBoardUnits().getFirst().getId())));
        assertTrue(room.applyAction(player.getId(), itemAction(player.getId(), first.instanceId(), target)));
        assertFalse(room.applyAction(player.getId(), itemAction(player.getId(), second.instanceId(), target)));
        TestHelpers.setPhase(room, GamePhase.COMBAT);
        assertFalse(room.applyAction(player.getId(), itemAction(player.getId(), first.instanceId(), null)));
        TestHelpers.setPhase(room, GamePhase.PLANNING);
        assertTrue(room.applyAction(player.getId(), itemAction(player.getId(), first.instanceId(), null)));
    }

    private static GameAction itemAction(String playerId, String itemInstanceId, String targetUnitId) {
        return new GameAction(
                ActionType.MOVE_ITEM, playerId, null, null, null, null, null, null, null, itemInstanceId, targetUnitId);
    }

    @Test
    void combinationKeepsTwoItemsAndReturnsTheExcess() {
        var definition = TestHelpers.createDefaultUnitDef();
        var player = TestHelpers.createTestPlayer("Owner");
        player.setGold(100);
        player.setShop(new ArrayList<>(List.of(definition, definition, definition)));
        player.buyUnit(0);
        var first = player.getBench().stream()
                .filter(unit -> unit != null)
                .findFirst()
                .orElseThrow();
        var a = ItemInstance.from(item("a", Map.of(ItemStat.DEFENSE_FLAT, 10)));
        var b = ItemInstance.from(item("b", Map.of(ItemStat.DEFENSE_FLAT, 10)));
        var c = ItemInstance.from(item("c", Map.of(ItemStat.DEFENSE_FLAT, 10)));
        first.getItems().addAll(List.of(a, b));
        player.buyUnit(1);
        var second = player.getBench().stream()
                .filter(unit -> unit != null && unit != first)
                .findFirst()
                .orElseThrow();
        second.getItems().add(c);
        player.buyUnit(2);

        var upgraded = player.getBench().stream()
                .filter(unit -> unit != null)
                .findFirst()
                .orElseThrow();
        assertEquals(2, upgraded.getStarLevel());
        assertEquals(List.of(a, b), upgraded.getItems());
        assertEquals(List.of(c), player.getInventory());
    }

    @Test
    void previewMatchesCombatAfterItemsAndAugmentsAndGhostKeepsItems() {
        var definition = TestHelpers.createUnitDef("preview", "Preview", 1, 100, 20);
        var item = item("axe", Map.of(ItemStat.ATTACK_DAMAGE_PERCENT, 40, ItemStat.ABILITY_DAMAGE_PERCENT, 40));
        var loader = TestHelpers.createMockDataLoader(
                List.of(definition), TestHelpers.createDefaultAugments(), List.of(item));
        var room = TestHelpers.createTestGameRoom(loader);
        var player = room.addPlayer("Owner");
        player.addUnitToBoard(definition, 0, 0);
        var unit = player.getBoardUnits().getFirst();
        var copy = ItemInstance.from(item);
        player.getInventory().add(copy);
        assertTrue(player.moveItem(copy.instanceId(), unit.getId()));
        player.addSelectedAugment(new SelectedAugment(
                "atk", "ATK", "+5 ATK", AugmentTier.SILVER, AugmentEffectType.TEAM_ATTACK_DAMAGE, 5, 1, null));
        room.startMatch();
        var preview =
                room.getState().players().get(player.getId()).statPreviews().get(unit.getId());
        assertEquals(33, preview.attackDamage());
        assertEquals(1.4f, preview.abilityDamageMultiplier(), .001f);
        assertEquals(
                copy.id(),
                player.createGhost()
                        .getBoardUnits()
                        .getFirst()
                        .getItems()
                        .getFirst()
                        .getId());

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        assertEquals(preview.attackDamage(), unit.getAttackDamage());
        assertEquals(preview.abilityDamageMultiplier(), unit.getAbilityDamageMultiplier(), .001f);
        TestHelpers.setPhase(room, GamePhase.PLANNING);
        assertEquals(20, unit.getAttackDamage());
    }

    @Test
    void scheduledRoundsContainOneItemOrb() {
        var definition = TestHelpers.createDefaultUnitDef();
        var loader = TestHelpers.createMockDataLoader(
                List.of(definition),
                TestHelpers.createDefaultAugments(),
                List.of(item("coat", Map.of(ItemStat.MAX_HEALTH_PERCENT, 40))));
        var room = TestHelpers.createTestGameRoom(loader);
        var player = room.addPlayer("Owner");
        room.startMatch();
        for (var nextRound = 2; nextRound <= 10; nextRound++) {
            TestHelpers.setPhase(room, GamePhase.COMBAT);
            TestHelpers.setPhase(room, GamePhase.PLANNING);
            var itemOrbs = player.getLootOrbs().stream()
                    .filter(orb -> orb.type() == LootType.ITEM)
                    .count();
            assertEquals(
                    nextRound == 2 || nextRound == 4 || nextRound == 6 || nextRound == 10 ? 1 : 0,
                    itemOrbs,
                    "round " + nextRound);
        }
    }
}
