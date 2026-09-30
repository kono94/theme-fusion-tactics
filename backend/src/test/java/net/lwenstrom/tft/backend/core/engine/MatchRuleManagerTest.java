package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.core.model.MatchRuleEffectType;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class MatchRuleManagerTest {

    @Test
    void selectionDefaultsToRandomAndRejectsUnknownRules() {
        var manager = manager(rule("head-start", MatchRuleEffectType.STARTING_LEVEL, 4));

        assertEquals(MatchRuleManager.RANDOM, manager.getSelection());
        assertFalse(manager.select("missing"));
        assertFalse(manager.select(null));
        assertTrue(manager.select("head-start"));
        assertTrue(manager.select(MatchRuleManager.NONE));
        assertEquals(MatchRuleManager.NONE, manager.getSelection());
    }

    @Test
    void randomSelectionResolvesToOneOfTheAvailableRules() {
        var manager = manager(
                rule("a", MatchRuleEffectType.STARTING_LEVEL, 4), rule("b", MatchRuleEffectType.REROLL_COST, 1));

        manager.resolveForMatch(TestHelpers.createSeededRandomProvider());

        assertTrue(manager.activeRule().isPresent());
        assertTrue(List.of("a", "b").contains(manager.activeRule().get().id()));
    }

    @Test
    void noneSelectionLeavesNoActiveRule() {
        var manager = manager(rule("a", MatchRuleEffectType.STARTING_LEVEL, 4));
        manager.select(MatchRuleManager.NONE);

        manager.resolveForMatch(TestHelpers.createSeededRandomProvider());

        assertTrue(manager.activeRule().isEmpty());
    }

    @Test
    void randomSelectionWithoutRulesLeavesNoActiveRule() {
        var manager = manager();

        manager.resolveForMatch(TestHelpers.createSeededRandomProvider());

        assertTrue(manager.activeRule().isEmpty());
    }

    @Test
    void headStartRaisesPlayersToTheConfiguredLevel() {
        var manager = resolved(rule("head-start", MatchRuleEffectType.STARTING_LEVEL, 4));
        var player = TestHelpers.createTestPlayer("Player");

        manager.applyEconomy(player);

        assertEquals(4, player.getLevel());
        assertEquals(GameConstants.REROLL_COST, player.getRerollCost());
    }

    @Test
    void cheapRerollsLowerTheRerollCost() {
        var manager = resolved(rule("cheap-rerolls", MatchRuleEffectType.REROLL_COST, 1));
        var player = TestHelpers.createTestPlayer("Player");
        manager.applyEconomy(player);
        var goldBefore = player.getGold();

        player.refreshShop();

        assertEquals(1, player.getRerollCost());
        assertEquals(goldBefore - 1, player.getGold());
    }

    @Test
    void lootRainSpawnsOrbsEveryRound() {
        assertTrue(resolved(rule("loot-rain", MatchRuleEffectType.LOOT_EVERY_ROUND, 1))
                .spawnsLootEveryRound());
        assertFalse(resolved(rule("head-start", MatchRuleEffectType.STARTING_LEVEL, 4))
                .spawnsLootEveryRound());
    }

    @Test
    void glassCannonsTradeHealthForDamage() {
        var manager = resolved(rule("glass-cannons", MatchRuleEffectType.DAMAGE_FOR_HEALTH, 40, 25));
        var player = TestHelpers.createTestPlayer("Player");
        player.addUnitToBoard(TestHelpers.createUnitDef("unit", "Unit", 1, 200, 100), 0, 0);
        var unit = player.getBoardUnits().getFirst();
        var abilityMultiplier = unit.getAbilityDamageMultiplier();

        manager.applyCombatEffects(player.getBoardUnits());

        assertEquals(140, unit.getAttackDamage());
        assertEquals(150, unit.getMaxHealth());
        assertEquals(150, unit.getCurrentHealth());
        assertEquals(abilityMultiplier * 1.4f, unit.getAbilityDamageMultiplier(), 0.001f);
    }

    @Test
    void manaSurgeFillsHalfOfTheManaBar() {
        var manager = resolved(rule("mana-surge", MatchRuleEffectType.STARTING_MANA_PERCENT, 50));
        var player = TestHelpers.createTestPlayer("Player");
        player.addUnitToBoard(TestHelpers.createUnitDef("unit", "Unit", 1, 200, 10), 0, 0);
        var unit = player.getBoardUnits().getFirst();
        var startingMana = unit.getMana();

        manager.applyCombatEffects(player.getBoardUnits());

        assertEquals(startingMana + unit.getMaxMana() / 2, unit.getMana());
    }

    @Test
    void secondWindGrantsAReviveToEveryUnit() {
        var manager = resolved(rule("second-wind", MatchRuleEffectType.SECOND_WIND, 40));
        var player = TestHelpers.createTestPlayer("Player");
        player.addUnitToBoard(TestHelpers.createUnitDef("unit", "Unit", 1, 200, 10), 0, 0);
        var unit = player.getBoardUnits().getFirst();

        manager.applyCombatEffects(player.getBoardUnits());

        assertTrue(unit.hasRevive());
        assertFalse(unit.isReviveUsed());
        assertEquals(40, manager.deathEffects().reviveHealthPercent());
    }

    @Test
    void deathEffectsExposeExplosionAndBounty() {
        assertEquals(
                25,
                resolved(rule("volatile", MatchRuleEffectType.DEATH_EXPLOSION, 25))
                        .deathEffects()
                        .explosionPercent());
        assertEquals(
                2,
                resolved(rule("bounty", MatchRuleEffectType.KILL_BOUNTY, 2))
                        .deathEffects()
                        .killBounty());
        assertFalse(resolved(rule("head-start", MatchRuleEffectType.STARTING_LEVEL, 4))
                .deathEffects()
                .isActive());
    }

    @Test
    void typeMasterDoublesAffinityDeviations() {
        var manager = resolved(rule("type-master", MatchRuleEffectType.AFFINITY_STRENGTH, 2));
        var config = new ElementalAffinityConfig(1.0, 1.25, 0.8, List.of("fire"), List.of());

        var adjusted = manager.adjustAffinity(config);

        assertEquals(1.5, adjusted.strongMultiplier(), 0.0001);
        assertEquals(0.6, adjusted.resistedMultiplier(), 0.0001);
    }

    private static MatchRuleManager manager(MatchRuleDefinition... rules) {
        return new MatchRuleManager(List.of(rules));
    }

    private static MatchRuleManager resolved(MatchRuleDefinition rule) {
        var manager = manager(rule);
        manager.select(rule.id());
        manager.resolveForMatch(TestHelpers.createSeededRandomProvider());
        return manager;
    }

    private static MatchRuleDefinition rule(String id, MatchRuleEffectType type, Integer... values) {
        return new MatchRuleDefinition(id, id, id + " description", "/icon.png", type, List.of(values));
    }
}
