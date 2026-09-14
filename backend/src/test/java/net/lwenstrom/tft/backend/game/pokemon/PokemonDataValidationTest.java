package net.lwenstrom.tft.backend.game.pokemon;

import static org.junit.jupiter.api.Assertions.*;

import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.StandardGameUnit;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.LifestealModifier;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

class PokemonDataValidationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();
    private static final Set<String> REMOVED_CLASS_TRAITS =
            Set.of("Starter", "Striker", "Defender", "Speedster", "Caster", "Support", "Ranger", "Legendary");

    @Test
    void pokemonRosterHasExpectedCostDistributionAndForms() throws Exception {
        var units = loadPokemonUnits();

        assertEquals(55, units.size());
        assertEquals(Map.of(1, 12L, 2, 13L, 3, 11L, 4, 12L, 5, 7L), costDistribution(units));

        var dratini = find(units, "dratini");
        assertEquals("Dragonair", new StandardGameUnit(dratini, 2).getName());
        assertEquals("dragonair", new StandardGameUnit(dratini, 2).getDefinitionId());
        assertEquals("Dragonite", new StandardGameUnit(dratini, 3).getName());
        assertEquals("dragonite", new StandardGameUnit(dratini, 3).getDefinitionId());

        var zubat = find(units, "zubat");
        assertEquals("Crobat", new StandardGameUnit(zubat, 3).getName());
        assertEquals("crobat", new StandardGameUnit(zubat, 3).getDefinitionId());

        units.stream().filter(unit -> unit.cost() >= 4).forEach(unit -> {
            assertTrue(unit.forms().isEmpty(), unit.name() + " should not evolve");
            assertEquals(unit.id(), new StandardGameUnit(unit, 3).getDefinitionId());
        });
    }

    @Test
    void pokemonUnitsHaveRolesDefenseAndEvolutionOverrides() throws Exception {
        var units = loadPokemonUnits();

        assertEquals(
                Map.of(UnitRole.DAMAGE, 30L, UnitRole.TANK, 10L, UnitRole.SUPPORT, 15L),
                units.stream().collect(Collectors.groupingBy(UnitDefinition::role, Collectors.counting())));
        units.forEach(unit -> {
            assertEquals(3, unit.defense().size(), unit.name() + " should have three DEF values");
            assertTrue(unit.defense().stream().allMatch(defense -> defense >= 0));
            unit.forms().forEach(form -> assertNotNull(form.role(), form.name() + " should define its active role"));
        });

        var caterpie = find(units, "caterpie");
        assertEquals(UnitRole.SUPPORT, caterpie.getRole(1));
        assertEquals(UnitRole.TANK, caterpie.getRole(2));
        assertEquals(UnitRole.SUPPORT, caterpie.getRole(3));

        var charmander = find(units, "charmander");
        assertEquals(UnitRole.DAMAGE, charmander.getRole(1));
        assertEquals(UnitRole.DAMAGE, charmander.getRole(2));
        assertEquals(UnitRole.DAMAGE, charmander.getRole(3));
    }

    @Test
    void pokemonRangedUnitLinesUseConfiguredAttackRangesAndReachTheirTargets() throws Exception {
        var units = loadPokemonUnits();
        var expectedRanges = Map.of(
                "bulbasaur", List.of(2, 2, 2),
                "charmander", List.of(2, 2, 2),
                "weedle", List.of(2, 2, 2),
                "poliwag", List.of(3, 3, 3),
                "pikachu", List.of(3, 3, 3),
                "grimer", List.of(2, 2, 2),
                "aerodactyl", List.of(3, 3, 3),
                "mewtwo", List.of(4, 4, 4));

        expectedRanges.forEach((id, expected) -> {
            var unit = find(units, id);
            assertEquals(expected, unit.range(), id + " attack ranges");
            for (var starLevel = 1; starLevel <= 3; starLevel++) {
                var ability = unit.getAbility(starLevel);
                if (ability.type() == AbilityType.DAMAGE
                        || ability.type() == AbilityType.STUN
                        || ability.type() == AbilityType.DEBUFF_DEF) {
                    assertTrue(
                            ability.getRangeForLevel(starLevel) >= unit.getActiveRange(starLevel),
                            id + " " + starLevel + "-star ability must reach its attack range");
                }
            }
        });
    }

    @Test
    void pokemonDamageAbilitiesReachTheirActiveAttackRange() throws Exception {
        for (var unit : loadPokemonUnits()) {
            for (var starLevel = 1; starLevel <= 3; starLevel++) {
                var ability = unit.getAbility(starLevel);
                if (ability.type() == AbilityType.DAMAGE) {
                    assertTrue(
                            ability.getRangeForLevel(starLevel) >= unit.getActiveRange(starLevel),
                            unit.id() + " " + starLevel + "-star damage ability must reach its attack range");
                }
            }
        }
    }

    @Test
    void pokemonDamageAbilityRangeAdjustmentsMatchThePatch() throws Exception {
        var units = loadPokemonUnits();
        assertEquals(List.of(4, 3, 4), find(units, "pidgey").getAbility(1).range());
        assertEquals(List.of(4, 2, 3), find(units, "spearow").getAbility(1).range());
        assertEquals(List.of(3, 2, 3), find(units, "vulpix").getAbility(1).range());
        assertEquals(List.of(1, 1, 3), find(units, "jigglypuff").getAbility(3).range());
        assertEquals(List.of(2, 3, 4), find(units, "horsea").getAbility(3).range());
        assertEquals(List.of(2, 4, 3), find(units, "dratini").getAbility(2).range());
        assertEquals(List.of(1, 3, 3), find(units, "poliwag").getAbility(3).range());
        assertEquals(List.of(2, 3, 3), find(units, "pikachu").getAbility(2).range());
    }

    @Test
    void pokemonSupportKitsUseControlHealingAndDefenseEffects() throws Exception {
        var units = loadPokemonUnits();

        var bulbasaur = find(units, "bulbasaur");
        assertEquals(AbilityType.STUN, bulbasaur.getAbility(1).type());
        assertEquals(AbilityType.DEBUFF_DEF, bulbasaur.getAbility(2).type());
        assertEquals(List.of(8, 16, 28), bulbasaur.getAbility(2).values());

        var oddish = find(units, "oddish");
        assertEquals(AbilityType.HEAL, oddish.getAbility(1).type());
        assertEquals(AbilityType.STUN, oddish.getAbility(3).type());
        assertEquals(List.of(1, 1, 2), oddish.getAbility(3).values());

        var tentacool = find(units, "tentacool");
        assertEquals(AbilityType.DEBUFF_DEF, tentacool.getAbility(1).type());
        assertEquals(AbilityType.DEBUFF_DEF, tentacool.getAbility(2).type());
        assertEquals(List.of(10, 22, 36), tentacool.getAbility(3).values());

        var porygon = find(units, "porygon");
        assertEquals(AbilityType.BUFF_DEF, porygon.ability().type());
        assertEquals(List.of(24, 42, 65), porygon.ability().values());
        assertEquals(List.of(45, 55, 55), porygon.maxMana());

        var caterpie = find(units, "caterpie");
        assertEquals(2.25f, caterpie.getAbility(1).getStunDurationForLevel(1));
        assertEquals(650, caterpie.getAbility(2).getValueForLevel(2));
        assertEquals(List.of(630, 1832, 2200), caterpie.maxHealth());
        assertEquals(List.of(40, 65, 50), caterpie.maxMana());

        var jynx = find(units, "jynx");
        assertEquals(1.5f, jynx.ability().getStunDurationForLevel(1));
        assertEquals(2f, jynx.ability().getStunDurationForLevel(2));
        assertEquals(2f, jynx.ability().getStunDurationForLevel(3));

        var articuno = find(units, "articuno");
        assertEquals(1.25f, articuno.ability().getStunDurationForLevel(1));
        assertEquals(1.25f, articuno.ability().getStunDurationForLevel(2));
        assertEquals(2.25f, articuno.ability().getStunDurationForLevel(3));

        var squirtle = find(units, "squirtle");
        assertEquals(List.of(1020, 1748, 3400), squirtle.maxHealth());
        assertEquals(360, squirtle.getAbility(3).getValueForLevel(3));

        var sandshrew = find(units, "sandshrew");
        assertEquals(List.of(45, 40, 40), sandshrew.maxMana());

        assertEquals(1.5f, find(units, "jigglypuff").getAbility(1).getStunDurationForLevel(1));
        assertEquals(2f, find(units, "slowpoke").getAbility(1).getStunDurationForLevel(1));
        assertEquals(2f, find(units, "abra").getAbility(1).getStunDurationForLevel(1));

        var gengarLifesteal = find(units, "gastly").getAbility(3).modifiers().stream()
                .filter(LifestealModifier.class::isInstance)
                .map(LifestealModifier.class::cast)
                .findFirst()
                .orElseThrow();
        assertEquals(0.5f, gengarLifesteal.lifestealPercent().get(2));
    }

    @Test
    void pokemonDataReferencesOnlyDefinedTraits() throws Exception {
        var units = loadPokemonUnits();
        var traits = loadPokemonTraits().stream()
                .map(trait -> (String) trait.get("name"))
                .collect(Collectors.toSet());

        for (var unit : units) {
            unit.traits().forEach(trait -> assertTrue(traits.contains(trait), unit.name() + " missing trait " + trait));
            unit.forms().forEach(form -> {
                if (form.traits() != null) {
                    form.traits()
                            .forEach(trait ->
                                    assertTrue(traits.contains(trait), form.name() + " missing trait " + trait));
                }
            });
        }
    }

    @Test
    void pokemonSetUsesOnlyTeamScopedTypeTraits() throws Exception {
        var traits = loadPokemonTraits();

        assertEquals(16, traits.size());
        for (var trait : traits) {
            assertEquals("type", trait.get("type"), trait.get("name") + " should be a Pokemon type trait");
            assertEquals("TEAM", trait.get("targetScope"), trait.get("name") + " should buff the whole team");
            assertFalse(REMOVED_CLASS_TRAITS.contains(trait.get("name")), trait.get("name") + " should be removed");
        }
    }

    @Test
    void pokemonUnitsDoNotReferenceRemovedClassTraits() throws Exception {
        var units = loadPokemonUnits();

        for (var unit : units) {
            assertTrue(
                    REMOVED_CLASS_TRAITS.stream().noneMatch(unit.traits()::contains),
                    unit.name() + " still has a removed class trait");
            unit.forms().forEach(form -> {
                if (form.traits() != null) {
                    assertTrue(
                            REMOVED_CLASS_TRAITS.stream().noneMatch(form.traits()::contains),
                            form.name() + " still has a removed class trait");
                }
            });
        }
    }

    @Test
    void pokemonTraitBreakpointsAreReachableByDistinctLines() throws Exception {
        var units = loadPokemonUnits();
        var traits = loadPokemonTraits();
        var possibleLinesByTrait = new HashMap<String, Set<String>>();

        for (var unit : units) {
            collectPossibleTraits(possibleLinesByTrait, unit.lineId(), unit.traits());
            unit.forms().forEach(form -> {
                if (form.traits() != null && !form.traits().isEmpty()) {
                    collectPossibleTraits(possibleLinesByTrait, unit.lineId(), form.traits());
                }
            });
        }

        for (var trait : traits) {
            var traitName = (String) trait.get("name");
            @SuppressWarnings("unchecked")
            var effects = (List<Map<String, Object>>) trait.get("effects");
            var maxBreakpoint = effects.stream()
                    .mapToInt(effect -> ((Number) effect.get("minUnits")).intValue())
                    .max()
                    .orElse(0);
            var possibleLines =
                    possibleLinesByTrait.getOrDefault(traitName, Set.of()).size();
            assertTrue(
                    maxBreakpoint <= possibleLines,
                    traitName + " max breakpoint " + maxBreakpoint + " exceeds possible lines " + possibleLines);
        }
    }

    @Test
    void pokemonBalanceValuesMatchCurrentPatch() throws Exception {
        var traits = loadPokemonTraits();

        var normal = effects(findTrait(traits, "normal"));
        assertTraitValues(
                normal,
                List.of(1, 2, 3, 4, 5, 6, 7, 8),
                "atkBuff",
                List.of(0.02, 0.07, 0.14, 0.19, 0.23, 0.28, 0.34, 0.40));

        var flying = effects(findTrait(traits, "flying"));
        assertTraitValues(
                flying, List.of(1, 2, 3, 4, 5, 6, 7, 8), "as", List.of(0.03, 0.10, 0.20, 0.26, 0.31, 0.37, 0.43, 0.50));
        assertTrue(flying.stream().allMatch(effect -> doubleValue(effect, "hpThreshold") == 0.5));

        var water = effects(findTrait(traits, "water"));
        assertTraitValues(
                water,
                List.of(1, 2, 3, 4, 5, 6, 7, 8),
                "manaGain",
                List.of(0.15, 0.40, 0.65, 0.78, 0.92, 1.03, 1.14, 1.25));

        var poison = effects(findTrait(traits, "poison"));
        assertTraitValues(
                poison,
                List.of(1, 2, 3, 4, 5, 6, 7, 8),
                "damageRatio",
                List.of(0.05, 0.10, 0.18, 0.28, 0.40, 0.52, 0.61, 0.68));
        assertTrue(poison.stream().allMatch(effect -> intValue(effect, "durationMs") == 3000));
        assertTrue(poison.stream().allMatch(effect -> intValue(effect, "tickIntervalMs") == 1000));

        var psychic = effects(findTrait(traits, "psychic"));
        assertTraitValues(
                psychic, List.of(1, 2, 3, 4, 5, 6), "manaPercent", List.of(0.04, 0.14, 0.24, 0.30, 0.36, 0.42));

        var fire = effects(findTrait(traits, "fire"));
        assertTraitValues(fire, List.of(1, 2, 3, 4, 5), "abilityDamage", List.of(0.04, 0.14, 0.22, 0.28, 0.34));

        var fighting = effects(findTrait(traits, "fighting"));
        assertTraitValues(fighting, List.of(1, 2, 3, 4, 5), "atkBuff", List.of(0.05, 0.15, 0.25, 0.33, 0.40));

        var grass = effects(findTrait(traits, "grass"));
        assertEquals(
                List.of(100, 300, 500),
                grass.stream().map(effect -> intValue(effect, "hp")).toList());

        var ground = effects(findTrait(traits, "ground"));
        assertEquals(
                List.of(5, 12, 20, 35),
                ground.stream().map(effect -> intValue(effect, "defense")).toList());

        var ice = effects(findTrait(traits, "ice"));
        assertEquals(
                List.of(5, 14, 25, 34, 44),
                ice.stream().map(effect -> intValue(effect, "defense")).toList());

        assertEquals(
                List.of("bronze", "silver", "gold", "gold", "gold", "gold", "prismatic", "prismatic"),
                normal.stream().map(effect -> effect.get("style")).toList());
        assertEquals(
                List.of("bronze", "silver", "gold", "gold", "prismatic", "prismatic"),
                psychic.stream().map(effect -> effect.get("style")).toList());
        assertEquals(
                List.of("bronze", "silver", "gold", "gold", "prismatic"),
                fire.stream().map(effect -> effect.get("style")).toList());
    }

    @Test
    void raichuThunderCapsTargetsAndThirdStarStun() throws Exception {
        var pikachu = find(loadPokemonUnits(), "pikachu");
        var raichuForms = pikachu.forms().stream()
                .filter(form -> form.definitionId().equals("raichu"))
                .toList();

        assertEquals(2, raichuForms.size());
        raichuForms.forEach(form -> {
            var ability = form.ability();
            assertEquals(
                    List.of(1, 1, 1),
                    ability.modifiers().stream()
                            .filter(net.lwenstrom.tft.backend.core.model.StunModifier.class::isInstance)
                            .map(net.lwenstrom.tft.backend.core.model.StunModifier.class::cast)
                            .findFirst()
                            .orElseThrow()
                            .stunSeconds());
            assertEquals(List.of(3, 3, 3), ability.targetLimit());
            assertEquals(3, ability.getTargetLimitForLevel(3));
        });
    }

    @Test
    void golemAoeDamageUsesTankRoleScaling() throws Exception {
        var geodude = find(loadPokemonUnits(), "geodude");
        var golem = geodude.forms().stream()
                .filter(form -> form.definitionId().equals("golem"))
                .findFirst()
                .orElseThrow();

        assertEquals(List.of(66, 150, 364), golem.ability().values());
    }

    private List<UnitDefinition> loadPokemonUnits() throws Exception {
        InputStream is = getClass().getResourceAsStream("/data/units_pokemon.json");
        assertNotNull(is);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private List<Map<String, Object>> loadPokemonTraits() throws Exception {
        InputStream is = getClass().getResourceAsStream("/data/traits_pokemon.json");
        assertNotNull(is);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private UnitDefinition find(List<UnitDefinition> units, String id) {
        return units.stream()
                .filter(unit -> unit.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing unit " + id));
    }

    private Map<Integer, Long> costDistribution(List<UnitDefinition> units) {
        return units.stream().collect(Collectors.groupingBy(UnitDefinition::cost, Collectors.counting()));
    }

    private void collectPossibleTraits(
            Map<String, Set<String>> possibleLinesByTrait, String lineId, List<String> traits) {
        traits.forEach(trait -> possibleLinesByTrait
                .computeIfAbsent(trait, ignored -> new HashSet<>())
                .add(lineId));
    }

    private Map<String, Object> findTrait(List<Map<String, Object>> traits, String id) {
        return traits.stream()
                .filter(trait -> id.equals(trait.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing trait " + id));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> effects(Map<String, Object> trait) {
        return (List<Map<String, Object>>) trait.get("effects");
    }

    private int minUnits(List<Map<String, Object>> effects, int index) {
        return minUnits(effects.get(index));
    }

    private int minUnits(Map<String, Object> effect) {
        return ((Number) effect.get("minUnits")).intValue();
    }

    private double doubleValue(List<Map<String, Object>> effects, int index, String key) {
        return doubleValue(effects.get(index), key);
    }

    private double doubleValue(Map<String, Object> effect, String key) {
        return ((Number) values(effect).get(key)).doubleValue();
    }

    private void assertTraitValues(
            List<Map<String, Object>> effects, List<Integer> breakpoints, String key, List<Double> expectedValues) {
        assertEquals(breakpoints, effects.stream().map(this::minUnits).toList());
        assertEquals(
                expectedValues,
                effects.stream().map(effect -> doubleValue(effect, key)).toList());
    }

    private int intValue(Map<String, Object> effect, String key) {
        return ((Number) values(effect).get(key)).intValue();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> values(Map<String, Object> effect) {
        return (Map<String, Object>) effect.get("values");
    }
}
