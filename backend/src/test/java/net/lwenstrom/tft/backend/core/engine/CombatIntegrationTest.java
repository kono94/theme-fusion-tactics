package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.KnockbackModifier;
import net.lwenstrom.tft.backend.test.MockUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class CombatIntegrationTest {

    @Test
    void testCombat_TwoPlayers_WinnerDetermined() {
        var testClock = createTestClock();
        var combatSystem = createTestCombatSystem(testClock);
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        // Units placed directly adjacent for reliable combat
        var strongUnit = MockUnit.create("strong", p1.getId())
                .withPosition(3, 3)
                .withHealth(200, 200)
                .withAttackDamage(50)
                .withRange(1);
        var weakUnit = MockUnit.create("weak", p2.getId())
                .withPosition(3, 4)
                .withHealth(50, 50)
                .withAttackDamage(10)
                .withRange(1);

        addUnitToPlayer(p1, strongUnit);
        addUnitToPlayer(p2, weakUnit);

        // Run combat ticks using TestClock instead of System.currentTimeMillis
        for (int i = 0; i < 60; i++) {
            combatSystem.simulateTick(List.of(p1, p2));
            if (weakUnit.getCurrentHealth() <= 0) {
                break;
            }
            testClock.advance(50);
        }

        // Verify combat happened - weak unit should be dead
        assertTrue(weakUnit.getCurrentHealth() <= 0, "Weak unit should be dead");
        assertTrue(strongUnit.getCurrentHealth() > 0, "Strong unit should survive");
    }

    @Test
    void testCombat_UnitsRestoreAfterCombat() {
        // Test at CombatSystem level for reliable position restoration
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var unit1 = MockUnit.create("unit1", p1.getId()).withPosition(3, 2).withHealth(100, 100);
        var unit2 = MockUnit.create("unit2", p2.getId()).withPosition(3, 2).withHealth(100, 100);

        addUnitToPlayer(p1, unit1);
        addUnitToPlayer(p2, unit2);

        int originalY1 = unit1.getY();
        int originalY2 = unit2.getY();

        // Start combat - positions change
        combatSystem.startCombat(List.of(p1, p2));

        int combatY1 = unit1.getY();
        int combatY2 = unit2.getY();

        // Positions should have changed
        assertNotEquals(originalY1, combatY1, "Unit1 Y should change during combat");
        assertNotEquals(originalY2, combatY2, "Unit2 Y should change during combat");

        // End combat - positions restore
        combatSystem.endCombat(List.of(p1, p2));

        assertEquals(originalY1, unit1.getY(), "Unit1 Y should restore after combat");
        assertEquals(originalY2, unit2.getY(), "Unit2 Y should restore after combat");
    }

    @Test
    void testCombat_DeadUnitsIgnored() {
        var combatSystem = createTestCombatSystem();

        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        // Set up units already in combat positions (skip startCombat transformation)
        var aliveUnit = MockUnit.create("alive", p1.getId())
                .withPosition(3, 3)
                .withHealth(100, 100)
                .withAttackDamage(10);
        var deadUnit = MockUnit.create("dead", p2.getId()).withPosition(3, 4).withHealth(0, 100);
        var targetUnit =
                MockUnit.create("target", p2.getId()).withPosition(4, 4).withHealth(50, 100);

        addUnitToPlayer(p1, aliveUnit);
        addUnitToPlayer(p2, deadUnit);
        addUnitToPlayer(p2, targetUnit);

        // Don't call startCombat - test pure combat logic
        for (int i = 0; i < 50; i++) {
            combatSystem.simulateTick(List.of(p1, p2));
        }

        assertEquals(0, deadUnit.getCurrentHealth());
        assertTrue(targetUnit.getCurrentHealth() < 50, "Target should have taken damage");
    }

    @Test
    void testCombat_AbilityDamage_Single() {
        var ability = new AbilityDefinition(
                "TestAbility",
                "Test Description",
                net.lwenstrom.tft.backend.core.model.AbilityType.DAMAGE,
                net.lwenstrom.tft.backend.core.model.AbilityPattern.SINGLE,
                List.of(1),
                java.util.List.of(50, 100, 200),
                null);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        // Set up units in combat positions (skip startCombat)
        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(3, 3)
                .withMana(50, 50)
                .withAbility(ability);
        var target = MockUnit.create("target", p2.getId()).withPosition(3, 4).withHealth(100, 100);
        target.setNextAttackTime(10_000);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        // Run one tick - should cast ability
        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(50, target.getCurrentHealth(), "Target should take 50 ability damage");
        assertEquals(0, caster.getMana(), "Mana should reset after cast");
    }

    @Test
    void testCombat_AbilityDamage_Surround8() {
        var ability = new AbilityDefinition(
                "AOE",
                "AOE Description",
                net.lwenstrom.tft.backend.core.model.AbilityType.DAMAGE,
                net.lwenstrom.tft.backend.core.model.AbilityPattern.SURROUND,
                List.of(1),
                java.util.List.of(25, 50, 100),
                null);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        // Caster at center, enemies in surrounding tiles
        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(3, 3)
                .withMana(50, 50)
                .withAbility(ability);
        var enemy1 = MockUnit.create("e1", p2.getId()).withPosition(2, 2).withHealth(100, 100);
        var enemy2 = MockUnit.create("e2", p2.getId()).withPosition(3, 2).withHealth(100, 100);
        var enemy3 = MockUnit.create("e3", p2.getId()).withPosition(4, 4).withHealth(100, 100);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, enemy1);
        addUnitToPlayer(p2, enemy2);
        addUnitToPlayer(p2, enemy3);

        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(75, enemy1.getCurrentHealth(), "Adjacent enemy at (2,2) should take 25 damage");
        assertEquals(75, enemy2.getCurrentHealth(), "Adjacent enemy at (3,2) should take 25 damage");
        assertEquals(75, enemy3.getCurrentHealth(), "Adjacent enemy at (4,4) should take 25 damage");
    }

    @Test
    void testCombat_KnockbackStopsAtBottomEdge() {
        var ability = createKnockbackAbility(1);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(4, 4)
                .withMana(1, 1)
                .withAbility(ability);
        var target = MockUnit.create("target", p2.getId()).withPosition(4, 5).withHealth(100, 100);
        target.setNextAttackTime(Long.MAX_VALUE);
        target.setNextMoveTime(Long.MAX_VALUE);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(4, target.getX());
        assertEquals(Grid.COMBAT_ROWS - 1, target.getY());
    }

    @Test
    void testCombat_KnockbackKeepsRightEdgeCellValid() {
        var ability = createKnockbackAbility(1);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(7, 2)
                .withMana(1, 1)
                .withAbility(ability);
        var target = MockUnit.create("target", p2.getId()).withPosition(8, 2).withHealth(100, 100);
        target.setNextAttackTime(Long.MAX_VALUE);
        target.setNextMoveTime(Long.MAX_VALUE);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(Grid.COLS - 1, target.getX());
        assertEquals(2, target.getY());
    }

    @Test
    void testCombat_KnockbackStopsBeforeOccupiedCell() {
        var ability = createKnockbackAbility(1);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(4, 3)
                .withMana(1, 1)
                .withAbility(ability);
        var target = MockUnit.create("target", p2.getId()).withPosition(4, 4).withHealth(100, 100);
        var blocker = MockUnit.create("blocker", p2.getId()).withPosition(4, 5).withHealth(100, 100);
        target.setNextAttackTime(Long.MAX_VALUE);
        target.setNextMoveTime(Long.MAX_VALUE);
        blocker.setNextAttackTime(Long.MAX_VALUE);
        blocker.setNextMoveTime(Long.MAX_VALUE);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);
        addUnitToPlayer(p2, blocker);

        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(4, target.getX());
        assertEquals(4, target.getY());
        assertEquals(4, blocker.getX());
        assertEquals(5, blocker.getY());
    }

    @Test
    void testCombat_MultiCellKnockbackStopsAtEdge() {
        var ability = createKnockbackAbility(3);
        var combatSystem = createTestCombatSystem();
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        var caster = MockUnit.create("caster", p1.getId())
                .withPosition(4, 3)
                .withMana(1, 1)
                .withAbility(ability);
        var target = MockUnit.create("target", p2.getId()).withPosition(4, 4).withHealth(100, 100);
        target.setNextAttackTime(Long.MAX_VALUE);
        target.setNextMoveTime(Long.MAX_VALUE);

        addUnitToPlayer(p1, caster);
        addUnitToPlayer(p2, target);

        combatSystem.simulateTick(List.of(p1, p2));

        assertEquals(4, target.getX());
        assertEquals(Grid.COMBAT_ROWS - 1, target.getY());
    }

    @Test
    void testCombat_StunPersistence() {
        var testClock = createTestClock();
        var combatSystem = createTestCombatSystem(testClock);
        var p1 = new Player("P1", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, createMockDataLoader(), createSeededRandomProvider());

        // Stunned unit should not attack
        var stunnedUnit = MockUnit.create("stunned", p1.getId())
                .withPosition(3, 3)
                .withAttackDamage(50)
                .withRange(1);
        stunnedUnit.setStunSecondsRemaining(1.0f); // 1.0 second stun

        var target = MockUnit.create("target", p2.getId()).withPosition(3, 4).withHealth(100, 100);

        addUnitToPlayer(p1, stunnedUnit);
        addUnitToPlayer(p2, target);

        // Run 5 ticks (0.5 seconds)
        for (int i = 0; i < 5; i++) {
            combatSystem.simulateTick(List.of(p1, p2));
            testClock.advance(100); // 100ms per tick
        }

        // Verify still stunned and no damage dealt
        assertTrue(stunnedUnit.getStunSecondsRemaining() > 0.45f, "Should have ~0.5s remaining");
        assertEquals(100, target.getCurrentHealth(), "Target should not have taken damage");

        // Run 6 more ticks (1.1 seconds total)
        for (int i = 0; i < 6; i++) {
            combatSystem.simulateTick(List.of(p1, p2));
            testClock.advance(100);
        }

        // Verify stun is gone
        assertEquals(0, stunnedUnit.getStunSecondsRemaining(), 0.01);

        // Run 1 more tick - should attack now
        combatSystem.simulateTick(List.of(p1, p2));
        assertTrue(target.getCurrentHealth() < 100, "Target should have taken damage after stun expired");
    }

    private void addUnitToPlayer(Player player, MockUnit unit) {
        TestHelpers.addUnitToPlayer(player, unit);
    }

    private AbilityDefinition createKnockbackAbility(int cells) {
        return new AbilityDefinition(
                "Knockback",
                "Knockback",
                AbilityType.DAMAGE,
                AbilityPattern.SINGLE,
                List.of(1, 1, 1),
                List.of(1, 1, 1),
                List.of(new KnockbackModifier(List.of(cells, cells, cells))));
    }
}
