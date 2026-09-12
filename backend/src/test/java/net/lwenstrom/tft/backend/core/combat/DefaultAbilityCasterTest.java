package net.lwenstrom.tft.backend.core.combat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import net.lwenstrom.tft.backend.core.engine.StandardGameUnit;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.StunModifier;
import net.lwenstrom.tft.backend.test.MockUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class DefaultAbilityCasterTest {

    @Test
    void primaryStunAbilitySupportsFractionalDurations() {
        var ability = new AbilityDefinition(
                "Silk Pin",
                "Stuns for $value seconds.",
                AbilityType.STUN,
                AbilityPattern.SINGLE,
                List.of(3, 3, 3),
                List.of(1, 1, 2),
                List.of(),
                List.of(),
                List.of(1.5f, 1.5f, 2.5f));
        var source = MockUnit.create("source", "P1").withAbility(ability);
        var target = MockUnit.create("target", "P2");

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        List.of(source, target),
                        (unit, ignored) -> target,
                        new AbilityCaster.CombatStatCallback() {},
                        0L);

        assertEquals(1.5f, target.getStunSecondsRemaining());
        assertEquals(
                "Stuns for <span class=\"active\">1.5</span>/<span class=\"inactive\">1.5</span>/<span class=\"inactive\">2.5</span> seconds.",
                ability.getFormattedDescription(1));
    }

    @Test
    void repeatedStunsRefreshWithDiminishingReturnsAndResetAfterFourSeconds() {
        var ability = new AbilityDefinition(
                "Pin Down",
                "Stuns for $value seconds.",
                AbilityType.STUN,
                AbilityPattern.SINGLE,
                List.of(0, 0, 0),
                List.of(1, 1, 1),
                List.of(),
                List.of(),
                List.of(2.0f, 2.0f, 2.0f));
        var source = MockUnit.create("source", "P1").withAbility(ability);
        var target = MockUnit.create("target", "P2");
        var caster = new DefaultAbilityCaster();
        var units = List.<GameUnit>of(source, target);
        var callback = new AbilityCaster.CombatStatCallback() {};

        caster.castAbility(source, units, (unit, ignored) -> target, callback, 0L);
        assertEquals(2.0f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0.5f);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 1000L);
        assertEquals(1.6f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0.5f);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 2000L);
        assertEquals(1.2f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0.5f);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 3000L);
        assertEquals(1.2f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0.5f);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 7000L);
        assertEquals(2.0f, target.getStunSecondsRemaining());
    }

    @Test
    void repeatedShortStunsRespectTheMinimumDuration() {
        var ability = new AbilityDefinition(
                "Quick Pin",
                "Stuns for $value seconds.",
                AbilityType.STUN,
                AbilityPattern.SINGLE,
                List.of(0, 0, 0),
                List.of(1, 1, 1),
                List.of(),
                List.of(),
                List.of(0.4f, 0.4f, 0.4f));
        var source = MockUnit.create("source", "P1").withAbility(ability);
        var target = MockUnit.create("target", "P2");
        var caster = new DefaultAbilityCaster();
        var units = List.<GameUnit>of(source, target);
        var callback = new AbilityCaster.CombatStatCallback() {};

        caster.castAbility(source, units, (unit, ignored) -> target, callback, 0L);
        assertEquals(0.4f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 1000L);
        assertEquals(0.32f, target.getStunSecondsRemaining(), 0.0001f);

        target.setStunSecondsRemaining(0);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 2000L);
        assertEquals(0.25f, target.getStunSecondsRemaining());

        target.setStunSecondsRemaining(0);
        caster.castAbility(source, units, (unit, ignored) -> target, callback, 3000L);
        assertEquals(0.25f, target.getStunSecondsRemaining());
    }

    @Test
    void lineDamageAbilityHitsOffAxisSelectedTarget() {
        var ability = lineDamageAbility();
        var source = MockUnit.create("source", "P1").withPosition(0, 5).withAbility(ability);
        var target = MockUnit.create("target", "P2").withPosition(3, 3);
        var onBeam = MockUnit.create("on-beam", "P2").withPosition(2, 4);
        var offBeam = MockUnit.create("off-beam", "P2").withPosition(3, 4);
        var allUnits = new ArrayList<GameUnit>(List.of(source, target, onBeam, offBeam));
        var damagedTargets = new ArrayList<String>();

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        allUnits,
                        (unit, ignored) -> target,
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onDamage(String unitId, String unitName, String targetId, int damage) {
                                damagedTargets.add(targetId);
                            }
                        },
                        0L);

        assertEquals(75, target.getCurrentHealth());
        assertEquals(75, onBeam.getCurrentHealth());
        assertEquals(100, offBeam.getCurrentHealth());
        assertEquals(List.of("on-beam", "target"), damagedTargets);
    }

    @Test
    void lineDamageAbilityStillPiercesAlignedTargets() {
        var ability = lineDamageAbility();
        var source = MockUnit.create("source", "P1").withPosition(1, 5).withAbility(ability);
        var target = MockUnit.create("target", "P2").withPosition(1, 3);
        var behindTarget = MockUnit.create("behind-target", "P2").withPosition(1, 1);
        var offLine = MockUnit.create("off-line", "P2").withPosition(2, 3);
        var allUnits = new ArrayList<GameUnit>(List.of(source, target, behindTarget, offLine));

        new DefaultAbilityCaster()
                .castAbility(
                        source, allUnits, (unit, ignored) -> target, new AbilityCaster.CombatStatCallback() {}, 0L);

        assertEquals(75, target.getCurrentHealth());
        assertEquals(75, behindTarget.getCurrentHealth());
        assertEquals(100, offLine.getCurrentHealth());
    }

    @Test
    void surroundDamageAbilityRespectsTargetLimit() {
        var ability = new AbilityDefinition(
                "Limited Thunder",
                "Hits limited targets.",
                AbilityType.DAMAGE,
                AbilityPattern.SURROUND,
                List.of(2, 2, 2),
                List.of(10, 10, 10),
                List.of(new StunModifier(List.of(1, 1, 1))),
                List.of(3, 3, 3));
        var source = MockUnit.create("source", "P1").withPosition(3, 3).withAbility(ability);
        var enemies = List.of(
                MockUnit.create("enemy-a", "P2").withPosition(2, 3),
                MockUnit.create("enemy-b", "P2").withPosition(3, 2),
                MockUnit.create("enemy-c", "P2").withPosition(3, 4),
                MockUnit.create("enemy-d", "P2").withPosition(4, 3),
                MockUnit.create("enemy-e", "P2").withPosition(5, 3));
        var allUnits = new java.util.ArrayList<net.lwenstrom.tft.backend.core.model.GameUnit>();
        allUnits.add(source);
        allUnits.addAll(enemies);

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        allUnits,
                        (unit, ignored) -> enemies.getFirst(),
                        new AbilityCaster.CombatStatCallback() {},
                        0L);

        assertEquals(
                3,
                enemies.stream().filter(enemy -> enemy.getCurrentHealth() == 90).count());
        assertEquals(
                3,
                enemies.stream()
                        .filter(enemy -> enemy.getStunSecondsRemaining() == 1)
                        .count());
        assertEquals(
                2,
                enemies.stream()
                        .filter(enemy -> enemy.getCurrentHealth() == 100)
                        .count());
        assertEquals(
                2,
                enemies.stream()
                        .filter(enemy -> enemy.getStunSecondsRemaining() == 0)
                        .count());
    }

    @Test
    void healAbilityEmitsPositiveCallbackForEffectiveHealing() {
        var source = MockUnit.create("source", "P1").withHealth(60, 100).withAbility(healAbility());
        var healingFeedback = new ArrayList<Integer>();
        var skillFeedback = new ArrayList<String>();

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        List.of(source),
                        (unit, ignored) -> source,
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onHealing(String unitId, String unitName, String targetId, int healing) {
                                healingFeedback.add(healing);
                            }

                            @Override
                            public void onSkill(String unitId, String unitName, String targetId, int value) {
                                skillFeedback.add(targetId + ":" + value);
                            }
                        },
                        0L);

        assertEquals(85, source.getCurrentHealth());
        assertEquals(List.of(25), healingFeedback);
        assertEquals(List.of(), skillFeedback);
    }

    @Test
    void fullHealthHealEmitsOneSkillCallbackWithoutChangingHealth() {
        var source = MockUnit.create("source", "P1").withAbility(healAbility());
        var healingFeedback = new ArrayList<Integer>();
        var skillFeedback = new ArrayList<String>();

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        List.of(source),
                        (unit, ignored) -> source,
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onHealing(String unitId, String unitName, String targetId, int healing) {
                                healingFeedback.add(healing);
                            }

                            @Override
                            public void onSkill(String unitId, String unitName, String targetId, int value) {
                                skillFeedback.add(targetId + ":" + value);
                            }
                        },
                        0L);

        assertEquals(100, source.getCurrentHealth());
        assertEquals(List.of(), healingFeedback);
        assertEquals(List.of("source:0"), skillFeedback);
    }

    @Test
    void shieldAbilityEmitsPositiveCallbackForEffectiveShielding() {
        var source = createShieldUnit();
        var shieldingFeedback = new ArrayList<Integer>();
        var skillFeedback = new ArrayList<String>();

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        List.of(source),
                        (unit, ignored) -> source,
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onShielding(String unitId, String unitName, String targetId, int shielding) {
                                shieldingFeedback.add(shielding);
                            }

                            @Override
                            public void onSkill(String unitId, String unitName, String targetId, int value) {
                                skillFeedback.add(targetId + ":" + value);
                            }
                        },
                        0L);

        assertEquals(25, source.getShield());
        assertEquals(List.of(25), shieldingFeedback);
        assertEquals(List.of(), skillFeedback);
    }

    @Test
    void shieldAtCapEmitsOneSkillCallbackWithoutChangingShield() {
        var source = createShieldUnit();
        source.setShield(50);
        var shieldingFeedback = new ArrayList<Integer>();
        var skillFeedback = new ArrayList<String>();

        new DefaultAbilityCaster()
                .castAbility(
                        source,
                        List.of(source),
                        (unit, ignored) -> source,
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onShielding(String unitId, String unitName, String targetId, int shielding) {
                                shieldingFeedback.add(shielding);
                            }

                            @Override
                            public void onSkill(String unitId, String unitName, String targetId, int value) {
                                skillFeedback.add(targetId + ":" + value);
                            }
                        },
                        0L);

        assertEquals(50, source.getShield());
        assertEquals(List.of(), shieldingFeedback);
        assertEquals(List.of(source.getId() + ":0"), skillFeedback);
    }

    private AbilityDefinition healAbility() {
        return new AbilityDefinition(
                "Rejuvenate",
                "Heals.",
                AbilityType.HEAL,
                AbilityPattern.SINGLE,
                List.of(1, 1, 1),
                List.of(25, 25, 25),
                List.of());
    }

    private StandardGameUnit createShieldUnit() {
        var ability = new AbilityDefinition(
                "Barrier",
                "Shields.",
                AbilityType.SHIELD,
                AbilityPattern.SINGLE,
                List.of(1, 1, 1),
                List.of(25, 25, 25),
                List.of());
        return new StandardGameUnit(TestHelpers.createUnitDefWithAbility("shield", "Shield", 1, 100, 10, ability));
    }

    private AbilityDefinition lineDamageAbility() {
        return new AbilityDefinition(
                "Beam",
                "Hits a line.",
                AbilityType.DAMAGE,
                AbilityPattern.LINE,
                List.of(7, 7, 7),
                List.of(25, 25, 25),
                List.of());
    }
}
