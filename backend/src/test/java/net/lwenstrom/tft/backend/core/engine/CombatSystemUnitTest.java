package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.createMockDataLoader;
import static net.lwenstrom.tft.backend.test.TestHelpers.createSeededRandomProvider;
import static net.lwenstrom.tft.backend.test.TestHelpers.createTestClock;
import static net.lwenstrom.tft.backend.test.TestHelpers.createTestCombatSystem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.combat.CombatUtils;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.combat.TargetSelector;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityModifier;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.DotModifier;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.test.MockUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CombatSystemUnitTest {

    private CombatSystem combatSystem;
    private TargetSelector targetSelector;

    @BeforeEach
    void setUp() {
        combatSystem = createTestCombatSystem();
        targetSelector = new NearestEnemyTargetSelector();
    }

    @Test
    void testFindNearestEnemy_ReturnsClosest() {
        var source = MockUnit.create("source", "P1").withPosition(0, 0);
        var nearEnemy = MockUnit.create("near", "P2").withPosition(1, 1);
        var farEnemy = MockUnit.create("far", "P2").withPosition(5, 5);

        List<GameUnit> candidates = List.of(source, nearEnemy, farEnemy);

        var result = targetSelector.findTarget(source, candidates);

        assertEquals("near", result.getId(), "Should return the closest enemy");
    }

    @Test
    void testFindNearestEnemy_IgnoresDead() {
        var source = MockUnit.create("source", "P1").withPosition(0, 0);
        var deadEnemy = MockUnit.create("dead", "P2").withPosition(1, 1).withHealth(0, 100);
        var aliveEnemy = MockUnit.create("alive", "P2").withPosition(5, 5);

        List<GameUnit> candidates = List.of(source, deadEnemy, aliveEnemy);

        var result = targetSelector.findTarget(source, candidates);

        assertEquals("alive", result.getId(), "Should ignore dead units");
    }

    @Test
    void testFindNearestEnemy_IgnoresAllies() {
        var source = MockUnit.create("source", "P1").withPosition(0, 0);
        var ally = MockUnit.create("ally", "P1").withPosition(1, 1);
        var enemy = MockUnit.create("enemy", "P2").withPosition(5, 5);

        List<GameUnit> candidates = List.of(source, ally, enemy);

        var result = targetSelector.findTarget(source, candidates);

        assertEquals("enemy", result.getId(), "Should ignore allies");
    }

    @Test
    void testFindNearestEnemy_ReturnsNull_WhenNoEnemies() {
        var source = MockUnit.create("source", "P1").withPosition(0, 0);
        var ally = MockUnit.create("ally", "P1").withPosition(1, 1);

        List<GameUnit> candidates = List.of(source, ally);

        var result = targetSelector.findTarget(source, candidates);

        assertNull(result, "Should return null when no enemies exist");
    }

    @Test
    void testGetDistance_CalculatesChebyshev() {
        var u1 = MockUnit.create("u1", "P1").withPosition(0, 0);
        var u2 = MockUnit.create("u2", "P2").withPosition(3, 4);

        var distance = CombatUtils.getDistance(u1, u2);

        assertEquals(4.0, distance, 0.001, "Distance should be 4 (max of 3 and 4)");
    }

    @Test
    void testIsEnemy_SameOwner_False() {
        var u1 = MockUnit.create("u1", "P1");
        var u2 = MockUnit.create("u2", "P1");

        var result = CombatUtils.isEnemy(u1, u2);

        assertFalse(result, "Same owner should not be enemies");
    }

    @Test
    void testIsEnemy_DifferentOwner_True() {
        var u1 = MockUnit.create("u1", "P1");
        var u2 = MockUnit.create("u2", "P2");

        var result = CombatUtils.isEnemy(u1, u2);

        assertTrue(result, "Different owners should be enemies");
    }

    @Test
    void testIsEnemy_NullOwner_True() {
        var u1 = MockUnit.create("u1", "P1");
        var u2 = MockUnit.create("u2", null);

        var result = CombatUtils.isEnemy(u1, u2);

        assertTrue(result, "Null owner should be treated as enemy (monster)");
    }

    @Test
    void testSimulateTick_UnitAttacksInRange() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var attacker = MockUnit.create("attacker", p1.getId())
                .withPosition(3, 0)
                .withAttackDamage(25)
                .withRange(1);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 0).withHealth(100, 100);

        addUnitToPlayer(p1, attacker);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));

        int attackerY = attacker.getY();
        int targetY = target.getY();
        int distance = Math.abs(attackerY - targetY);
        assertEquals(1, distance, "Units should be adjacent after combat positioning");

        for (int i = 0; i < 20; i++) {
            combatSystem.simulateTick(List.of(p1, p2));
        }

        assertTrue(target.getCurrentHealth() < 100, "Target should have taken damage");
    }

    @Test
    void simulateTick_ReturnsEventsFromTheFinalCombatTick() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var attacker = MockUnit.create("attacker", p1.getId())
                .withPosition(3, 0)
                .withAttackDamage(200)
                .withRange(1);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 0).withHealth(100, 100);
        target.setNextAttackTime(10_000);
        addUnitToPlayer(p1, attacker);
        addUnitToPlayer(p2, target);
        combatSystem.startCombat(List.of(p1, p2));

        var result = combatSystem.simulateTick(List.of(p1, p2));

        assertTrue(result.ended());
        assertTrue(result.events().stream().anyMatch(event -> event.type().equals("DAMAGE")));
        assertTrue(result.events().stream().anyMatch(event -> event.type().equals("DEATH")));
    }

    @Test
    void testSimulateTick_BasicAttackGivesAttackerAndDefenderMana() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var attacker = MockUnit.create("attacker", p1.getId())
                .withPosition(3, 0)
                .withMana(0, 100)
                .withRange(1);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 0).withHealth(100, 100);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, attacker);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(10, attacker.getMana(), "Attacker should gain existing flat mana from attacking");
        assertEquals(5, target.getMana(), "Defender should gain 5% max mana from the direct hit");
    }

    @Test
    void testSimulateTick_DefenderDirectHitManaClampsAtMax() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var attacker = MockUnit.create("attacker", p1.getId())
                .withPosition(3, 0)
                .withAttackDamage(10)
                .withRange(1);
        var target = MockUnit.create("target", p2.getId())
                .withPosition(3, 0)
                .withHealth(100, 100)
                .withMana(98, 100);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, attacker);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(100, target.getMana(), "Defender mana gain should clamp at max mana");
    }

    @Test
    void testSimulateTick_ZeroMaxManaDefenderDoesNotGainDirectHitMana() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var attacker = MockUnit.create("attacker", p1.getId())
                .withPosition(3, 0)
                .withAttackDamage(10)
                .withRange(1);
        var target = MockUnit.create("target", p2.getId())
                .withPosition(3, 0)
                .withHealth(100, 100)
                .withMana(0, 0);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, attacker);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(0, target.getMana(), "Units with zero max mana should not gain direct-hit mana");
    }

    @Test
    void testSimulateTick_DirectDamageAbilityGrantsTargetMana() {
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var ability = damageAbility(List.of());

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(3, 0)
                .withAbility(ability)
                .withMana(10, 10);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 0).withHealth(100, 100);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(5, target.getMana(), "Direct damage abilities should grant target direct-hit mana");
    }

    @Test
    void testSimulateTick_DotTickDoesNotGrantAdditionalTargetMana() {
        var clock = createTestClock();
        var combatSystem = createTestCombatSystem(clock);
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var dot = new DotModifier(
                DotModifier.DotType.BURN, List.of(25, 25, 25), List.of(3, 3, 3), List.of(1000, 1000, 1000));
        var ability = damageAbility(List.of(dot));

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(3, 0)
                .withAbility(ability)
                .withMana(10, 10);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 0).withHealth(100, 100);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        combatSystem.startCombat(List.of(p1, p2));
        combatSystem.simulateTick(List.of(p1, p2));
        var manaAfterDirectHit = target.getMana();
        caster.setNextAttackTime(10_000);

        clock.advance(1000);
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(5, manaAfterDirectHit);
        assertEquals(manaAfterDirectHit, target.getMana(), "DOT ticks should not grant additional target mana");
    }

    private AbilityDefinition damageAbility(List<AbilityModifier> modifiers) {
        return new AbilityDefinition(
                "Direct Hit",
                "Deal damage",
                AbilityType.DAMAGE,
                AbilityPattern.SINGLE,
                List.of(1, 1, 1),
                List.of(40, 40, 40),
                modifiers);
    }

    private void addUnitToPlayer(Player player, GameUnit unit) {
        TestHelpers.addUnitToPlayer(player, unit);
    }

    @Test
    void emptyCastsRetainManaAndAllowMovementThenCastOnceInRange() {
        for (var pattern : AbilityPattern.values()) {
            var system = createTestCombatSystem();
            var p1 = new Player("caster", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
            var p2 = new Player("enemy", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
            var ability = new AbilityDefinition(
                    "short spell", "", AbilityType.DAMAGE, pattern, List.of(1), List.of(20), List.of());
            var caster = MockUnit.create("caster", p1.getId())
                    .withPosition(0, 0)
                    .withMana(100, 100)
                    .withAbility(ability);
            var target = MockUnit.create("enemy", p2.getId()).withPosition(4, 0).withHealth(1000, 1000);
            target.setStunSecondsRemaining(10);
            TestHelpers.addUnitToPlayer(p1, caster);
            TestHelpers.addUnitToPlayer(p2, target);
            system.simulateTick(List.of(p1, p2), 0);
            assertEquals(100, caster.getMana());
            assertNull(caster.getActiveAbility());
            assertEquals(1, caster.getX());
            target.setPosition(2, 0);
            system.simulateTick(List.of(p1, p2), 100);
            assertEquals(0, caster.getMana());
            assertEquals(980, target.getCurrentHealth());
            system.simulateTick(List.of(p1, p2), 200);
            assertEquals(980, target.getCurrentHealth());
            assertEquals(1, caster.getX(), "Cast recovery prevents movement");
        }
    }

    @Test
    void basicAttackCooldownDoesNotPreventMovement() {
        var p1 = new Player("a", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("b", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var mover = MockUnit.create("a", p1.getId()).withPosition(0, 0);
        var target = MockUnit.create("b", p2.getId()).withPosition(4, 0);
        mover.setNextAttackTime(1000);
        target.setStunSecondsRemaining(10);
        TestHelpers.addUnitToPlayer(p1, mover);
        TestHelpers.addUnitToPlayer(p2, target);
        combatSystem.simulateTick(List.of(p1, p2), 0);
        assertEquals(1, mover.getX());
    }
}
