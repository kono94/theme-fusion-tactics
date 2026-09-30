package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.DotModifier;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.core.model.MatchRuleEffectType;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

class MatchRuleCombatTest {

    @Test
    void volatileDeathsDamageAdjacentEnemies() {
        var fixture = killFixture();
        fixture.combatSystem().configureDeathEffects(new MatchRuleDeathEffects(25, 0, 0));
        var carry = fixture.attacker().getBoardUnits().getFirst();
        var healthBefore = carry.getCurrentHealth();

        fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertEquals(healthBefore - 50, carry.getCurrentHealth());
    }

    @Test
    void lethalExplosionsUseExistingRevivesBeforeResolvingCombat() {
        var fixture = killFixture();
        fixture.combatSystem().configureDeathEffects(new MatchRuleDeathEffects(25, 0, 0));
        var carry = fixture.attacker().getBoardUnits().getFirst();
        carry.setCurrentHealth(40);
        carry.setHasRevive(true);

        var result = fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertEquals(400, carry.getCurrentHealth());
        assertTrue(carry.isReviveUsed());
        assertFalse(result.ended());
        assertFalse(result.events().stream()
                .anyMatch(event -> event.type().equals("DEATH") && carry.getId().equals(event.targetId())));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void explosionKillsOnlyTriggerShieldsAndAttackBonusesAfterFinalDeath(boolean hasRevive) {
        var fixture = killFixture();
        fixture.combatSystem().configureDeathEffects(new MatchRuleDeathEffects(25, 0, 0));
        fixture.attacker().getBoardUnits().getFirst().setCurrentHealth(40);
        fixture.attacker().getBoardUnits().getFirst().setHasRevive(hasRevive);
        fixture.attacker().addUnitToBoard(TestHelpers.createUnitDef("ally", "Ally", 1, 500, 0), 8, 0);
        var ally = fixture.attacker().getBoardUnits().getLast();
        ally.setPosition(8, 2);
        ally.setShieldOnDeath(true);
        fixture.defender().getBoardUnits().getFirst().setTeamAttackDamageOnKill(10);
        var enemyAlly = fixture.defender().getBoardUnits().getLast();
        enemyAlly.setMaxHealth(2000);
        enemyAlly.setCurrentHealth(2000);

        fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertEquals(hasRevive ? 0 : 150, ally.getShield());
        assertEquals(hasRevive ? 0 : 10, enemyAlly.getAttackDamage());
    }

    @ParameterizedTest
    @EnumSource(DotModifier.DotType.class)
    void glassCannonsBoostsDirectAbilityDamageAndDotTicks(DotModifier.DotType dotType) {
        var ability = new AbilityDefinition(
                "Damage and DOT",
                "Damage and DOT",
                AbilityType.DAMAGE,
                AbilityPattern.SINGLE,
                List.of(5, 5, 5),
                List.of(100, 100, 100),
                List.of(new DotModifier(dotType, List.of(10, 10, 10), List.of(3, 3, 3), List.of(1000, 1000, 1000))));
        var attacker = TestHelpers.createTestPlayer("Attacker");
        var defender = TestHelpers.createTestPlayer("Defender");
        attacker.addUnitToBoard(TestHelpers.createUnitDefWithAbility("caster", "Caster", 1, 1000, 50, ability), 0, 0);
        defender.addUnitToBoard(TestHelpers.createUnitDef("target", "Target", 1, 1000, 0), 0, 0);
        var combat = TestHelpers.createTestCombatSystem(TestHelpers.createTestClock());
        var participants = List.of(attacker, defender);
        var manager = new MatchRuleManager(List.of(new MatchRuleDefinition(
                "glass-cannons",
                "Glass Cannons",
                "More damage, less health.",
                "/icon.png",
                MatchRuleEffectType.DAMAGE_FOR_HEALTH,
                List.of(40, 25))));
        manager.select("glass-cannons");
        manager.resolveForMatch(TestHelpers.createSeededRandomProvider());
        var source = attacker.getBoardUnits().getFirst();
        var target = defender.getBoardUnits().getFirst();
        for (var fight = 0; fight < 2; fight++) {
            combat.startCombat(participants);
            participants.forEach(player -> manager.applyCombatEffects(player.getBoardUnits()));
            source.setAttackDamage(0);
            source.setMana(source.getMaxMana());
            var healthBefore = target.getCurrentHealth();
            var startTime = fight * 5000L;

            combat.simulateTick(participants, startTime);

            assertEquals(140, healthBefore - target.getCurrentHealth());
            var healthAfterCast = target.getCurrentHealth();
            combat.simulateTick(participants, startTime + 1000L);
            assertEquals(14, healthAfterCast - target.getCurrentHealth());
            assertEquals(154, combat.getDamageLog().get(source.getId()).damage());
            combat.endCombat(participants);
        }
    }

    @Test
    void deathsDoNotExplodeWithoutTheRule() {
        var fixture = killFixture();
        var carry = fixture.attacker().getBoardUnits().getFirst();
        var healthBefore = carry.getCurrentHealth();

        fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertEquals(healthBefore, carry.getCurrentHealth());
    }

    @Test
    void killBountyPaysTheOpposingPlayerPerDefeatedUnit() {
        var fixture = killFixture();
        fixture.combatSystem().configureDeathEffects(new MatchRuleDeathEffects(0, 2, 0));
        var goldBefore = fixture.attacker().getGold();

        fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertEquals(goldBefore + 2, fixture.attacker().getGold());
    }

    @Test
    void secondWindRevivesUnitsThatDiedFromNonBasicAttackDamage() {
        var fixture = killFixture();
        fixture.combatSystem().configureDeathEffects(new MatchRuleDeathEffects(0, 0, 40));
        var target = fixture.defender().getBoardUnits().getFirst();
        fixture.attacker().getBoardUnits().getFirst().setAttackDamage(1);
        target.setHasRevive(true);
        target.setCurrentHealth(0);

        fixture.combatSystem().simulateTick(List.of(fixture.attacker(), fixture.defender()));

        assertTrue(target.getCurrentHealth() > 0);
        assertTrue(target.isReviveUsed());
    }

    private record Fixture(CombatSystem combatSystem, Player attacker, Player defender) {}

    private Fixture killFixture() {
        var attacker = TestHelpers.createTestPlayer("Attacker");
        var defender = TestHelpers.createTestPlayer("Defender");
        attacker.setLevel(2);
        defender.setLevel(2);
        attacker.addUnitToBoard(TestHelpers.createUnitDef("carry", "Carry", 1, 1000, 300), 0, 0);
        defender.addUnitToBoard(TestHelpers.createUnitDef("target", "Target", 1, 200, 0), 0, 0);
        defender.addUnitToBoard(TestHelpers.createUnitDef("buddy", "Buddy", 1, 200, 0), 1, 0);
        var combatSystem = TestHelpers.createTestCombatSystem(TestHelpers.createTestClock());
        combatSystem.startCombat(List.of(attacker, defender));
        return new Fixture(combatSystem, attacker, defender);
    }
}
