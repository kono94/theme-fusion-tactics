package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;

class DefenseAndRoleTest {

    @Test
    void roleUsesStarFormOverrideAndFallsBackToBaseRole() {
        var definition = new UnitDefinition(
                "caterpie",
                "Caterpie",
                1,
                UnitRole.SUPPORT,
                ints(100),
                ints(100),
                ints(10),
                ints(0),
                ints(5),
                floats(1.0f),
                ints(1),
                List.of("Bug"),
                null,
                "caterpie",
                List.of(
                        new UnitFormDefinition(2, "metapod", "Metapod", UnitRole.TANK, null, null, null),
                        new UnitFormDefinition(3, "butterfree", "Butterfree", null, null, null, null)));

        assertEquals(UnitRole.SUPPORT, definition.formAt(1, null).role());
        assertEquals(UnitRole.TANK, definition.formAt(2, null).role());
        assertEquals(UnitRole.SUPPORT, definition.formAt(3, null).role());
        assertEquals(UnitRole.TANK, new StandardGameUnit(definition, 2).getRole());
    }

    @Test
    void definitionRequiresRoleAndThreeDefenseValues() {
        assertThrows(NullPointerException.class, () -> definitionWith(null, ints(5)));
        assertThrows(IllegalArgumentException.class, () -> definitionWith(UnitRole.DAMAGE, List.of(5, 10)));
        assertThrows(IllegalArgumentException.class, () -> definitionWith(UnitRole.DAMAGE, List.of(5, -1, 10)));
    }

    @Test
    void defenseMitigatesBeforePercentageReductionsAndShields() {
        var unit = new StandardGameUnit(definitionWith(UnitRole.TANK, ints(100)));
        unit.setDamageReduction(10);
        unit.setAbilityDamageReduction(20);
        unit.setShield(20);

        unit.takeAbilityDamage(100);

        assertEquals(84, unit.getCurrentHealth());
        assertEquals(0, unit.getShield());
    }

    @Test
    void shieldCapUsesLowerOfHalfMaxHealthAndCurrentHealth() {
        var unit = new StandardGameUnit(definitionWith(UnitRole.TANK, ints(100)));
        unit.setCurrentHealth(40);

        assertEquals(40, unit.addShield(75));
        assertEquals(40, unit.getShield());
        assertEquals(0, unit.addShield(10));
    }

    @Test
    void temporaryDefenseAbilitiesKeepOnlyStrongestValueAndResetAfterCombat() {
        var buffAbility = ability(AbilityType.BUFF_DEF, AbilityPattern.SINGLE, 20);
        var shredAbility = ability(AbilityType.DEBUFF_DEF, AbilityPattern.SINGLE, 15);
        var source = new StandardGameUnit(definitionWithAbility("source", buffAbility));
        var shredder = new StandardGameUnit(definitionWithAbility("shredder", shredAbility));
        var target = new StandardGameUnit(definitionWith(UnitRole.DAMAGE, ints(100)));
        source.setOwnerId("ally");
        shredder.setOwnerId("enemy");
        target.setOwnerId("ally");
        source.savePlanningPosition();
        target.savePlanningPosition();
        var caster = new DefaultAbilityCaster();
        var targetSelector = new NearestEnemyTargetSelector();

        caster.castAbility(source, List.of(source, shredder), targetSelector);
        caster.castAbility(source, List.of(source, shredder), targetSelector);
        assertEquals(30, source.getDefense());

        caster.castAbility(shredder, List.of(shredder, target), targetSelector);
        caster.castAbility(shredder, List.of(shredder, target), targetSelector);
        assertEquals(85, target.getDefense());
        target.applyTemporaryDefenseShred(25);
        target.applyTemporaryDefenseShred(5);
        assertEquals(75, target.getDefense());
        assertEquals(75, target.cloneUnit().getDefense());
        target.applyTemporaryDefenseShred(200);
        assertEquals(0, target.getDefense());

        source.restorePlanningPosition();
        target.restorePlanningPosition();
        assertEquals(10, source.getDefense());
        assertEquals(100, target.getDefense());
    }

    private UnitDefinition definitionWith(UnitRole role, List<Integer> defense) {
        return new UnitDefinition(
                "unit",
                "Unit",
                1,
                role,
                ints(100),
                ints(100),
                ints(10),
                ints(0),
                defense,
                floats(1.0f),
                ints(1),
                List.of(),
                null);
    }

    private UnitDefinition definitionWithAbility(String id, AbilityDefinition ability) {
        return new UnitDefinition(
                id,
                id,
                1,
                UnitRole.SUPPORT,
                ints(100),
                ints(100),
                ints(10),
                ints(0),
                ints(10),
                floats(1.0f),
                ints(1),
                List.of(),
                ability);
    }

    private AbilityDefinition ability(AbilityType type, AbilityPattern pattern, int value) {
        return new AbilityDefinition(type.name(), type.name(), type, pattern, ints(1), ints(value), List.of());
    }

    private List<Integer> ints(int value) {
        return List.of(value, value, value);
    }

    private List<Float> floats(float value) {
        return List.of(value, value, value);
    }
}
