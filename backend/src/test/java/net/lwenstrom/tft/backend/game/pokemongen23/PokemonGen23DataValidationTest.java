package net.lwenstrom.tft.backend.game.pokemongen23;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.StandardGameUnit;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

class PokemonGen23DataValidationTest {
    private static final Set<String> BRANCHING_LINES = Set.of("eevee", "ralts", "wurmple", "snorunt");

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void rosterHasSixtySixLinesWithTheExpectedCostDistribution() {
        var units = loadUnits("units_pokemongen23.json");

        assertEquals(66, units.size());
        assertEquals(
                Map.of(1, 14L, 2, 16L, 3, 13L, 4, 14L, 5, 9L),
                units.stream().collect(Collectors.groupingBy(UnitDefinition::cost, Collectors.counting())));
        assertEquals(66, units.stream().map(UnitDefinition::lineId).distinct().count());
        var definitionIds = new HashSet<String>();
        units.forEach(unit -> {
            definitionIds.add(unit.id());
            unit.forms().forEach(form -> definitionIds.add(form.definitionId()));
        });
        assertEquals(140, definitionIds.size());
    }

    @Test
    void highCostUnitsAreSingleForm() {
        loadUnits("units_pokemongen23.json").stream()
                .filter(unit -> unit.cost() >= 4)
                .forEach(unit -> {
                    assertTrue(unit.forms().isEmpty(), unit.name() + " should not evolve");
                    assertEquals(unit.id(), new StandardGameUnit(unit, 3).getDefinitionId());
                });
    }

    @Test
    void traitsAreSeventeenTeamScopedTypes() {
        var traits = loadTraits();
        assertEquals(17, traits.size());
        traits.forEach(trait -> {
            assertEquals("type", trait.get("type"), trait.get("name") + " should be a type trait");
            assertEquals("TEAM", trait.get("targetScope"), trait.get("name") + " should buff the whole team");
        });
        assertEquals("LOW_HP_DAMAGE", findTrait(traits, "dark").get("effectType"));
        assertEquals("DAMAGE_REDUCTION", findTrait(traits, "steel").get("effectType"));
        assertFalse(traits.stream().anyMatch(trait -> "fairy".equals(trait.get("id"))));
    }

    @Test
    void onlyTheFourBranchingLinesBranchAtTheirIntendedStars() {
        var units = loadUnits("units_pokemongen23.json");
        var branching = units.stream()
                .filter(unit -> unit.branchPoint() > 0)
                .map(UnitDefinition::lineId)
                .collect(Collectors.toSet());
        assertEquals(BRANCHING_LINES, branching);

        var eevee = find(units, "eevee");
        assertEquals(3, eevee.cost());
        assertEquals(2, eevee.branchPoint());
        assertEquals(
                List.of("vaporeon", "jolteon", "flareon", "espeon", "umbreon", "leafeon", "glaceon"),
                eevee.branchIdsAt(2));
        assertTrue(eevee.isPending(2, null));
        assertEquals("umbreon", eevee.formAt(3, "umbreon").definitionId());
        assertEquals(List.of("Dark"), eevee.formAt(3, "umbreon").traits());
        assertTrue(eevee.formAt(2, "vaporeon").maxHealth()
                > eevee.formAt(2, "jolteon").maxHealth());
        assertTrue(eevee.formAt(2, "jolteon").attackSpeed()
                > eevee.formAt(2, "vaporeon").attackSpeed());
        assertEquals(UnitRole.TANK, eevee.formAt(2, "vaporeon").role());
        assertEquals(UnitRole.DAMAGE, eevee.formAt(2, "espeon").role());

        var ralts = find(units, "ralts");
        assertEquals(3, ralts.branchPoint());
        assertEquals(List.of("gardevoir", "gallade"), ralts.branchIdsAt(3));
        assertFalse(ralts.isPending(2, null));
        assertEquals("kirlia", ralts.formAt(2, null).definitionId());
        assertEquals(UnitRole.SUPPORT, ralts.formAt(3, "gardevoir").role());
        assertEquals(UnitRole.DAMAGE, ralts.formAt(3, "gallade").role());
        assertEquals(List.of("Psychic", "Fighting"), ralts.formAt(3, "gallade").traits());

        var wurmple = find(units, "wurmple");
        assertEquals(2, wurmple.branchPoint());
        assertEquals(List.of("silcoon", "cascoon"), wurmple.branchIdsAt(2));
        assertEquals("beautifly", wurmple.formAt(3, "silcoon").definitionId());
        assertEquals("dustox", wurmple.formAt(3, "cascoon").definitionId());
        assertEquals(List.of("Bug", "Poison"), wurmple.formAt(3, "cascoon").traits());

        var snorunt = find(units, "snorunt");
        assertEquals(2, snorunt.branchPoint());
        assertEquals(List.of("glalie", "froslass"), snorunt.branchIdsAt(2));
        assertEquals("froslass", snorunt.formAt(3, "froslass").definitionId());
        assertEquals(UnitRole.TANK, snorunt.formAt(3, "glalie").role());
        assertEquals(List.of("Ice", "Ghost"), snorunt.formAt(3, "froslass").traits());
    }

    @Test
    void everyLineHasThreeValueStatsAndValidAbilitiesForEveryBranch() {
        for (var unit : loadUnits("units_pokemongen23.json")) {
            assertThreeValues(unit.id(), unit.maxHealth(), unit.maxMana(), unit.attackDamage(), unit.defense());
            assertEquals(3, unit.attackSpeed().size(), unit.id() + " attack speed");
            assertEquals(3, unit.range().size(), unit.id() + " range");
            unit.forms().forEach(form -> assertNotNull(form.role(), form.name() + " should define its role"));

            for (var branchId : branchesOf(unit)) {
                for (var starLevel = 1; starLevel <= 3; starLevel++) {
                    if (unit.isPending(starLevel, branchId)) continue;
                    var label = unit.id() + "/" + branchId + " " + starLevel + "-star";
                    assertValidAbility(label, unit.formAt(starLevel, branchId).ability());
                }
            }
        }
    }

    @Test
    void everyCostTierOffersDamageLines() {
        var units = loadUnits("units_pokemongen23.json");
        for (var cost = 1; cost <= 5; cost++) {
            var tier = cost;
            var damageLines = units.stream()
                    .filter(unit -> unit.cost() == tier && unit.role() == UnitRole.DAMAGE)
                    .count();
            assertTrue(damageLines >= 5, "cost " + cost + " has only " + damageLines + " damage lines");
        }
    }

    private static List<String> branchesOf(UnitDefinition unit) {
        var branches = new ArrayList<String>();
        branches.add(null);
        if (unit.branchPoint() > 0) {
            branches.addAll(unit.branchIdsAt(unit.branchPoint()));
        }
        return branches;
    }

    @SafeVarargs
    private static void assertThreeValues(String label, List<Integer>... arrays) {
        for (var array : arrays) {
            assertEquals(3, array.size(), label + " stat arrays must have three values");
        }
    }

    private static void assertValidAbility(String label, AbilityDefinition ability) {
        assertNotNull(ability, label + " ability");
        assertNotNull(ability.name(), label + " ability name");
        assertNotNull(ability.type(), label + " ability type");
        assertNotNull(ability.pattern(), label + " ability pattern");
        assertEquals(3, ability.values().size(), label + " ability values");
        assertEquals(3, ability.range().size(), label + " ability range");
        assertTrue(ability.description().contains("$value"), label + " description should show its values");
    }

    private List<UnitDefinition> loadUnits(String file) {
        var is = getClass().getResourceAsStream("/data/" + file);
        assertNotNull(is, file);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private List<Map<String, Object>> loadTraits() {
        var is = getClass().getResourceAsStream("/data/traits_pokemongen23.json");
        assertNotNull(is);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private static Map<String, Object> findTrait(List<Map<String, Object>> traits, String id) {
        return traits.stream()
                .filter(trait -> id.equals(trait.get("id")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing trait " + id));
    }

    private static UnitDefinition find(List<UnitDefinition> units, String id) {
        return units.stream()
                .filter(unit -> unit.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing unit " + id));
    }
}
