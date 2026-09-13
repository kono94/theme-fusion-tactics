package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.lwenstrom.tft.backend.core.model.EffectType;
import net.lwenstrom.tft.backend.core.model.TraitTargetScope;
import net.lwenstrom.tft.backend.test.MockUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GenericTraitApplierTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void defaultScopeAppliesOnlyToTraitHolders() throws Exception {
        var effects = effects("""
                [{"minUnits":1,"values":{"manaGain":0.30}}]
                """);
        var applier = new GenericTraitApplier("water", EffectType.MANA_GAIN, effects);
        var water = MockUnit.create("water", "P1").withTraits(Set.of("Water"));
        var normal = MockUnit.create("normal", "P1").withTraits(Set.of("Normal"));

        applier.apply(1, List.of(water, normal));

        assertEquals(1.3f, water.getManaGainMultiplier(), 0.001f);
        assertEquals(1.0f, normal.getManaGainMultiplier(), 0.001f);
    }

    @Test
    void teamScopeAppliesToEveryUnitOnTeam() throws Exception {
        var effects = effects("""
                [{"minUnits":1,"values":{"manaGain":0.30}}]
                """);
        var applier = new GenericTraitApplier("water", EffectType.MANA_GAIN, TraitTargetScope.TEAM, effects);
        var water = MockUnit.create("water", "P1").withTraits(Set.of("Water"));
        var normal = MockUnit.create("normal", "P1").withTraits(Set.of("Normal"));

        applier.apply(1, List.of(water, normal));

        assertEquals(1.3f, water.getManaGainMultiplier(), 0.001f);
        assertEquals(1.3f, normal.getManaGainMultiplier(), 0.001f);
    }

    @Test
    void startManaPercentScalesWithEachUnitsMaxMana() throws Exception {
        var effects = effects("""
                [{"minUnits":1,"values":{"manaPercent":0.25}}]
                """);
        var applier = new GenericTraitApplier("psychic", EffectType.START_MANA_PERCENT, TraitTargetScope.TEAM, effects);
        var lowMana = MockUnit.create("low", "P1").withTraits(Set.of("Psychic")).withMana(0, 60);
        var highMana =
                MockUnit.create("high", "P1").withTraits(Set.of("Normal")).withMana(0, 100);

        applier.apply(1, List.of(lowMana, highMana));

        assertEquals(15, lowMana.getMana());
        assertEquals(25, highMana.getMana());
    }

    @Test
    void overlappingAbilityDamageTraitsStackMultiplicatively() throws Exception {
        var fire = new GenericTraitApplier("fire", EffectType.ABILITY_DAMAGE, TraitTargetScope.TEAM, effects("""
                        [{"minUnits":1,"values":{"abilityDamage":0.20}}]
                        """));
        var dragon = new GenericTraitApplier("dragon", EffectType.ABILITY_DAMAGE, TraitTargetScope.TEAM, effects("""
                        [{"minUnits":1,"values":{"abilityDamage":0.25}}]
                        """));
        var unit = MockUnit.create("unit", "P1");

        fire.apply(1, List.of(unit));
        dragon.apply(1, List.of(unit));

        assertEquals(1.5f, unit.getAbilityDamageMultiplier(), 0.001f);
    }

    @Test
    void defensiveTraitsAddAndCapAtFortyPercent() throws Exception {
        var applier =
                new GenericTraitApplier("ground", EffectType.DAMAGE_REDUCTION, TraitTargetScope.TEAM, effects("""
                        [{"minUnits":1,"values":{"damageReduction":25}}]
                        """));
        var unit = new StandardGameUnit(TestHelpers.createUnitDef("unit", "Unit", 1, 100, 10));

        applier.apply(1, List.of(unit));
        applier.apply(1, List.of(unit));

        assertEquals(40, unit.getDamageReduction());
    }

    @Test
    void selectsTheHighestMatchingBreakpoint() throws Exception {
        var applier = new GenericTraitApplier("poison", EffectType.ON_HIT_DOT, TraitTargetScope.TEAM, effects("""
                [
                  {"minUnits":1,"values":{"damageRatio":0.05}},
                  {"minUnits":2,"values":{"damageRatio":0.10}},
                  {"minUnits":3,"values":{"damageRatio":0.18}},
                  {"minUnits":4,"values":{"damageRatio":0.30}},
                  {"minUnits":5,"values":{"damageRatio":0.45}},
                  {"minUnits":6,"values":{"damageRatio":0.60}}
                ]
                """));
        var fiveUnitTarget = MockUnit.create("five", "P1");
        var sixUnitTarget = MockUnit.create("six", "P1");

        applier.apply(5, List.of(fiveUnitTarget));
        applier.apply(6, List.of(sixUnitTarget));

        assertEquals(0.45f, fiveUnitTarget.getOnHitDotDamageRatio(), 0.001f);
        assertEquals(0.60f, sixUnitTarget.getOnHitDotDamageRatio(), 0.001f);
    }

    private List<JsonNode> effects(String json) throws Exception {
        var result = new ArrayList<JsonNode>();
        var array = jsonMapper.readTree(json);
        for (var effect : array) {
            result.add(effect);
        }
        return result;
    }
}
