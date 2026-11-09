package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;

import net.lwenstrom.tft.backend.core.model.CombatModifiers;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class CombatModifiersTest {

    @Test
    void fieldSlotComposesIntoEffectiveStatsAlongsideTraitValues() {
        var unit = new StandardGameUnit(TestHelpers.createDefaultUnitDef());
        unit.setExtraAttackChance(0.1f);
        unit.setDefense(20);
        unit.getCombatModifiers().setField(new CombatModifiers.FieldModifiers(0.15f, 10, 0.05f, 2.0f));

        assertEquals(1.15f, unit.getAttackSpeedMultiplier(), 0.0001f);
        assertEquals(30, unit.getDefense());
        assertEquals(0.15f, unit.getEffectiveExtraAttackChance(), 0.0001f);
        unit.setMaxMana(100);
        unit.gainMana(10);
        assertEquals(20, unit.getMana());
    }

    @Test
    void cloneCopiesAndPlanningRestoreResetsEverySlot() {
        var unit = new StandardGameUnit(TestHelpers.createDefaultUnitDef());
        var field = new CombatModifiers.FieldModifiers(0.15f, 10, 0.05f, 2.0f);
        unit.getCombatModifiers().setField(field);

        var clone = unit.cloneUnit();
        assertEquals(field, clone.getCombatModifiers().field());

        unit.savePlanningPosition();
        unit.restorePlanningPosition();
        assertEquals(
                CombatModifiers.FieldModifiers.NONE, unit.getCombatModifiers().field());
        assertEquals(field, clone.getCombatModifiers().field());
    }
}
