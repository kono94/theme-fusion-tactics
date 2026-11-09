package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.combat.StunRules;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.GameState;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemEffect;
import net.lwenstrom.tft.backend.core.model.ItemEffectType;
import net.lwenstrom.tft.backend.core.model.ItemInstance;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class HeldItemEffectsTest {
    private static final long IDLE = 1_000_000L;

    private final TestClock clock = TestHelpers.createTestClock();
    private final List<GameState.CombatEvent> events = new ArrayList<>();
    private Player holderPlayer;
    private Player enemyPlayer;
    private GameUnit holder;
    private GameUnit enemy;
    private CombatSystem combatSystem;

    private static ItemInstance item(String name, ItemEffectType type, Map<String, Double> values) {
        return ItemInstance.from(new ItemDefinition(
                name, name, name, "/items/" + name + ".png", Map.of(), List.of(new ItemEffect(type, values))));
    }

    private void setUp(UnitDefinition holderDef, UnitDefinition enemyDef, double roll, ItemInstance... items) {
        var dataLoader = TestHelpers.createMockDataLoader(List.of(holderDef, enemyDef));
        holderPlayer = TestHelpers.createTestPlayer("Holder", dataLoader);
        enemyPlayer = TestHelpers.createTestPlayer("Enemy", dataLoader);
        holderPlayer.addUnitToBoard(holderDef, 0, 0);
        enemyPlayer.addUnitToBoard(enemyDef, 0, 0);
        holder = holderPlayer.getBoardUnits().getFirst();
        enemy = enemyPlayer.getBoardUnits().getFirst();
        holder.getItems().addAll(List.of(items));
        combatSystem = new CombatSystem(
                new TraitManager(),
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                new FixedRandomProvider(roll));
        combatSystem.startCombat(List.of(holderPlayer, enemyPlayer));
    }

    private void tick(int count) {
        for (var i = 0; i < count; i++) {
            events.addAll(combatSystem
                    .simulateTick(List.of(holderPlayer, enemyPlayer))
                    .events());
            clock.advance(GameConstants.TICK_RATE_MS);
        }
    }

    private List<GameState.CombatEvent> events(String type, String skillName) {
        return events.stream()
                .filter(event -> event.type().equals(type) && skillName.equals(event.skillName()))
                .toList();
    }

    private static UnitDefinition unit(String id, int health, int attack) {
        return TestHelpers.createUnitDef(id, id, 1, health, attack);
    }

    @Test
    void leftoversRegeneratesMaxHealthEverySecondAndRecordsHealing() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item("Leftovers", ItemEffectType.REGEN_MAX_HEALTH_PERCENT, Map.of("percentPerSecond", 1.5)));
        holder.setCurrentHealth(500);
        holder.setNextAttackTime(IDLE);
        enemy.setNextAttackTime(IDLE);

        tick(9);
        assertEquals(500, holder.getCurrentHealth());
        tick(1);

        assertEquals(515, holder.getCurrentHealth());
        assertEquals(1, events("HEAL", "Leftovers").size());
        assertEquals(15, combatSystem.getDamageLog().get(holder.getId()).healing());
    }

    @Test
    void focusBandLeavesTheHolderAtOneHealthOnceBeforeRevive() {
        setUp(
                unit("holder", 100, 10),
                unit("enemy", 1000, 999),
                0.99,
                item("Focus Band", ItemEffectType.SURVIVE_LETHAL_ONCE, Map.of()));
        holder.setNextAttackTime(IDLE);
        holder.setHasRevive(true);

        tick(1);

        assertEquals(1, holder.getCurrentHealth());
        assertFalse(holder.isReviveUsed());
        var save = events("ITEM", "Focus Band");
        assertEquals(1, save.size());
        assertEquals(holder.getId(), save.getFirst().sourceId());

        holder.takeDamage(999);
        assertEquals(0, holder.getCurrentHealth());
        tick(1);
        assertEquals(1, events("ITEM", "Focus Band").size());
    }

    @Test
    void kingsRockFlinchesTheTargetThroughStunRules() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.0,
                item("King's Rock", ItemEffectType.ON_HIT_STUN_CHANCE, Map.of("chance", 0.15, "durationMs", 600.0)));
        enemy.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(0.6f - GameConstants.TICK_RATE_MS / 1000.0f, enemy.getStunSecondsRemaining(), 0.001f);
        assertEquals(1, enemy.getRecentStunCount());
        var flinch = events("ITEM", "King's Rock");
        assertEquals(1, flinch.size());
        assertEquals(holder.getId(), flinch.getFirst().sourceId());
        assertEquals(enemy.getId(), flinch.getFirst().targetId());
        assertEquals(600, flinch.getFirst().value());
    }

    @Test
    void kingsRockDoesNotFlinchWhenTheRollMisses() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.5,
                item("King's Rock", ItemEffectType.ON_HIT_STUN_CHANCE, Map.of("chance", 0.15, "durationMs", 600.0)));
        enemy.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(0f, enemy.getStunSecondsRemaining());
        assertTrue(events("ITEM", "King's Rock").isEmpty());
    }

    @Test
    void shellBellHealsFromBasicAttackDamage() {
        setUp(
                unit("holder", 500, 100),
                unit("enemy", 1000, 10),
                0.99,
                item("Shell Bell", ItemEffectType.DAMAGE_DEALT_HEAL_RATIO, Map.of("ratio", 0.15)));
        holder.setCurrentHealth(400);
        enemy.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(415, holder.getCurrentHealth());
        assertEquals(15, combatSystem.getDamageLog().get(holder.getId()).healing());
        assertEquals(1, events("HEAL", "Shell Bell").size());
    }

    @Test
    void shellBellHealsFromAbilityDamage() {
        var ability = new AbilityDefinition(
                "Blast",
                "Deal damage",
                AbilityType.DAMAGE,
                AbilityPattern.SINGLE,
                List.of(1, 1, 1),
                List.of(200, 200, 200),
                List.of());
        setUp(
                TestHelpers.createUnitDefWithAbility("holder", "Holder", 1, 500, 10, ability),
                unit("enemy", 1000, 10),
                0.99,
                item("Shell Bell", ItemEffectType.DAMAGE_DEALT_HEAL_RATIO, Map.of("ratio", 0.15)));
        holder.setCurrentHealth(400);
        holder.setMana(10);
        enemy.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(430, holder.getCurrentHealth());
        assertEquals(30, combatSystem.getDamageLog().get(holder.getId()).healing());
    }

    @Test
    void sitrusBerryHealsOnceBelowTheThreshold() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item(
                        "Sitrus Berry",
                        ItemEffectType.HEAL_ONCE_BELOW_HEALTH,
                        Map.of("threshold", 0.5, "healPercent", 30.0)));
        holder.setNextAttackTime(IDLE);
        enemy.setNextAttackTime(IDLE);
        holder.setCurrentHealth(600);

        tick(1);
        assertEquals(600, holder.getCurrentHealth());

        holder.setCurrentHealth(400);
        tick(1);
        assertEquals(700, holder.getCurrentHealth());

        holder.setCurrentHealth(300);
        tick(1);
        assertEquals(300, holder.getCurrentHealth());
        assertEquals(1, events("HEAL", "Sitrus Berry").size());
        assertEquals(300, combatSystem.getDamageLog().get(holder.getId()).healing());
    }

    @Test
    void lumBerryBlocksTheFirstStunWithoutCountingTowardDiminishingReturns() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item("Lum Berry", ItemEffectType.STUN_IMMUNITY_CHARGES, Map.of("charges", 1.0)));
        holder.setNextAttackTime(IDLE);
        enemy.setNextAttackTime(IDLE);

        assertFalse(StunRules.applyStun(holder, 2.0f, 0));
        assertEquals(0f, holder.getStunSecondsRemaining());
        assertEquals(0, holder.getRecentStunCount());

        assertTrue(StunRules.applyStun(holder, 2.0f, 0));
        assertEquals(2.0f, holder.getStunSecondsRemaining(), 0.001f);
        holder.setStunSecondsRemaining(0);
        assertTrue(StunRules.applyStun(holder, 2.0f, 0));
        assertEquals(1.6f, holder.getStunSecondsRemaining(), 0.001f);

        tick(1);
        var block = events("ITEM", "Lum Berry");
        assertEquals(1, block.size());
        assertEquals(holder.getId(), block.getFirst().targetId());
    }

    @Test
    void quickClawAddsToTheTraitExtraAttackChance() {
        var quickClaw = item("Quick Claw", ItemEffectType.EXTRA_ATTACK_CHANCE, Map.of("chance", 0.15));
        setUp(unit("holder", 1000, 10), unit("enemy", 1000, 10), 0.3, quickClaw);
        enemy.setNextAttackTime(IDLE);
        holder.setExtraAttackChance(0.2f);

        tick(1);

        assertEquals(250, holder.getNextAttackTime());
        assertEquals(0.2f, holder.getExtraAttackChance(), 0.0001f);
    }

    @Test
    void traitExtraAttackChanceAloneMissesTheSameRoll() {
        setUp(unit("holder", 1000, 10), unit("enemy", 1000, 10), 0.3);
        enemy.setNextAttackTime(IDLE);
        holder.setExtraAttackChance(0.2f);

        tick(1);

        assertEquals(1000, holder.getNextAttackTime());
    }

    @Test
    void choiceBandMultipliesWithTheTraitManaGain() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item("Choice Band", ItemEffectType.MANA_GAIN_MULTIPLIER, Map.of("multiplier", 0.5)));
        enemy.setNextAttackTime(IDLE);
        holder.setManaGainMultiplier(1.5f);

        tick(1);

        assertEquals(Math.round(GameConstants.MANA_PER_HIT * 1.5f * 0.5f), holder.getMana());
    }

    @Test
    void choiceBandHalvesBaseManaGain() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item("Choice Band", ItemEffectType.MANA_GAIN_MULTIPLIER, Map.of("multiplier", 0.5)));
        enemy.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(GameConstants.MANA_PER_HIT / 2, holder.getMana());
    }

    @Test
    void stateIsCopiedForClonesAndResetBetweenCombats() {
        setUp(
                unit("holder", 1000, 10),
                unit("enemy", 1000, 10),
                0.99,
                item("Focus Band", ItemEffectType.SURVIVE_LETHAL_ONCE, Map.of()),
                item("Lum Berry", ItemEffectType.STUN_IMMUNITY_CHARGES, Map.of("charges", 2.0)));
        assertEquals(1, holder.getHeldItemState().remainingSurviveLethalCharges());
        assertEquals(2, holder.getHeldItemState().remainingStunImmunityCharges());

        StunRules.applyStun(holder, 1.0f, 0);
        var clone = holder.cloneUnit();
        assertEquals(1, clone.getHeldItemState().remainingStunImmunityCharges());
        holder.takeDamage(5000);
        assertEquals(0, holder.getHeldItemState().remainingSurviveLethalCharges());
        assertEquals(1, clone.getHeldItemState().remainingSurviveLethalCharges());

        combatSystem.endCombat(List.of(holderPlayer, enemyPlayer));
        assertEquals(0, holder.getHeldItemState().remainingSurviveLethalCharges());
        assertEquals(1.0f, holder.getHeldItemState().manaGainMultiplier());

        var ghost = holderPlayer.createGhost();
        combatSystem.startCombat(List.of(ghost, enemyPlayer));
        var ghostUnit = ghost.getBoardUnits().getFirst();
        assertEquals(1, ghostUnit.getHeldItemState().remainingSurviveLethalCharges());
        assertEquals(2, ghostUnit.getHeldItemState().remainingStunImmunityCharges());
        assertEquals(0, holder.getHeldItemState().remainingSurviveLethalCharges());
    }

    @Test
    void unitsWithoutItemEffectsKeepTheirPreviousCombatBehavior() {
        setUp(unit("holder", 1000, 10), unit("enemy", 1000, 999), 0.99);
        holder.setNextAttackTime(IDLE);

        tick(1);

        assertEquals(1000 - 999, holder.getCurrentHealth());
        assertTrue(events.stream().noneMatch(event -> event.type().equals("ITEM")));
    }

    private static final class FixedRandomProvider implements RandomProvider {
        private final double roll;
        private final Random random = new Random(0);

        private FixedRandomProvider(double roll) {
            this.roll = roll;
        }

        @Override
        public <T> void shuffle(List<T> list) {
            Collections.shuffle(list, random);
        }

        @Override
        public int nextInt(int bound) {
            return 0;
        }

        @Override
        public double nextDouble() {
            return roll;
        }

        @Override
        public Random getRandom() {
            return random;
        }
    }
}
