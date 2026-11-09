package net.lwenstrom.tft.backend.game.pokemongen23;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.StandardGameUnit;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

class PokemonGen23DataValidationTest {
    private static final Path PROMPT_DOC =
            Path.of("..", "frontend", "public", "assets", "units", "pokemongen23", "ICON_GENERATION_PROMPT.md");
    private static final Pattern QUADRANT_ROW = Pattern.compile("^\\| \\d+ \\|.*");
    private static final Pattern QUOTED_ID = Pattern.compile("`([a-z0-9_]+)`");
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
    void definitionIdsAreUniquePerLineAndDisjointFromOtherModes() {
        var gen23 = definitionIdsByLine(loadUnits("units_pokemongen23.json"));
        var owners = new HashMap<String, String>();
        gen23.forEach((lineId, ids) -> ids.forEach(id -> {
            var previous = owners.put(id, lineId);
            assertTrue(previous == null || previous.equals(lineId), id + " is used by two lines");
        }));

        var otherModes = new HashSet<String>();
        definitionIdsByLine(loadUnits("units_pokemon.json")).values().forEach(otherModes::addAll);
        definitionIdsByLine(loadUnits("units_onepiece.json")).values().forEach(otherModes::addAll);

        var overlap = new HashSet<>(owners.keySet());
        overlap.retainAll(otherModes);
        assertTrue(overlap.isEmpty(), "Definition ids shared with other modes: " + overlap);
    }

    @Test
    void definitionIdsMatchTheSpritePromptQuadrantMap() throws IOException {
        var promptIds = new HashSet<String>();
        for (var line : Files.readAllLines(PROMPT_DOC)) {
            if (QUADRANT_ROW.matcher(line).matches()) {
                var matcher = QUOTED_ID.matcher(line);
                while (matcher.find()) {
                    promptIds.add(matcher.group(1));
                }
            }
        }
        var dataIds = new HashSet<String>();
        definitionIdsByLine(loadUnits("units_pokemongen23.json")).values().forEach(dataIds::addAll);

        assertEquals(140, promptIds.size());
        assertEquals(promptIds, dataIds);
    }

    @Test
    void unitsReferenceOnlyDefinedTeamTypeTraits() {
        var traits = loadTraits();
        assertEquals(17, traits.size());
        traits.forEach(trait -> {
            assertEquals("type", trait.get("type"), trait.get("name") + " should be a type trait");
            assertEquals("TEAM", trait.get("targetScope"), trait.get("name") + " should buff the whole team");
        });
        assertEquals("LOW_HP_DAMAGE", findTrait(traits, "dark").get("effectType"));
        assertEquals("DAMAGE_REDUCTION", findTrait(traits, "steel").get("effectType"));
        assertFalse(traits.stream().anyMatch(trait -> "fairy".equals(trait.get("id"))));

        var names = traits.stream().map(trait -> (String) trait.get("name")).collect(Collectors.toSet());
        for (var unit : loadUnits("units_pokemongen23.json")) {
            unit.traits().forEach(trait -> assertTrue(names.contains(trait), unit.name() + " missing " + trait));
            unit.forms()
                    .forEach(form -> form.traits()
                            .forEach(trait -> assertTrue(names.contains(trait), form.name() + " missing " + trait)));
        }
    }

    @Test
    void everyTraitBreakpointIsReachableByDistinctLines() {
        var possibleLines = new HashMap<String, Set<String>>();
        for (var unit : loadUnits("units_pokemongen23.json")) {
            unit.traits()
                    .forEach(trait -> possibleLines
                            .computeIfAbsent(trait, ignored -> new HashSet<>())
                            .add(unit.lineId()));
            unit.forms()
                    .forEach(form -> form.traits()
                            .forEach(trait -> possibleLines
                                    .computeIfAbsent(trait, ignored -> new HashSet<>())
                                    .add(unit.lineId())));
        }

        for (var trait : loadTraits()) {
            var name = (String) trait.get("name");
            @SuppressWarnings("unchecked")
            var effects = (List<Map<String, Object>>) trait.get("effects");
            var maxBreakpoint = effects.stream()
                    .mapToInt(effect -> ((Number) effect.get("minUnits")).intValue())
                    .max()
                    .orElse(0);
            var lines = possibleLines.getOrDefault(name, Set.of()).size();
            assertTrue(maxBreakpoint <= lines, name + " breakpoint " + maxBreakpoint + " exceeds " + lines + " lines");
        }
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
        assertEquals("umbreon", eevee.getDefinitionId(3, "umbreon"));
        assertEquals(List.of("Dark"), eevee.getTraits(3, "umbreon"));
        assertTrue(eevee.getMaxHealth(2, "vaporeon") > eevee.getMaxHealth(2, "jolteon"));
        assertTrue(eevee.getAttackSpeed(2, "jolteon") > eevee.getAttackSpeed(2, "vaporeon"));
        assertEquals(UnitRole.TANK, eevee.getRole(2, "vaporeon"));
        assertEquals(UnitRole.DAMAGE, eevee.getRole(2, "espeon"));

        var ralts = find(units, "ralts");
        assertEquals(3, ralts.branchPoint());
        assertEquals(List.of("gardevoir", "gallade"), ralts.branchIdsAt(3));
        assertFalse(ralts.isPending(2, null));
        assertEquals("kirlia", ralts.getDefinitionId(2, null));
        assertEquals(UnitRole.SUPPORT, ralts.getRole(3, "gardevoir"));
        assertEquals(UnitRole.DAMAGE, ralts.getRole(3, "gallade"));
        assertEquals(List.of("Psychic", "Fighting"), ralts.getTraits(3, "gallade"));

        var wurmple = find(units, "wurmple");
        assertEquals(2, wurmple.branchPoint());
        assertEquals(List.of("silcoon", "cascoon"), wurmple.branchIdsAt(2));
        assertEquals("beautifly", wurmple.getDefinitionId(3, "silcoon"));
        assertEquals("dustox", wurmple.getDefinitionId(3, "cascoon"));
        assertEquals(List.of("Bug", "Poison"), wurmple.getTraits(3, "cascoon"));

        var snorunt = find(units, "snorunt");
        assertEquals(2, snorunt.branchPoint());
        assertEquals(List.of("glalie", "froslass"), snorunt.branchIdsAt(2));
        assertEquals("froslass", snorunt.getDefinitionId(3, "froslass"));
        assertEquals(UnitRole.TANK, snorunt.getRole(3, "glalie"));
        assertEquals(List.of("Ice", "Ghost"), snorunt.getTraits(3, "froslass"));
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
                    var ability = unit.getAbility(starLevel, branchId);
                    assertValidAbility(label, ability);
                    if (ability.type() == AbilityType.DAMAGE) {
                        assertTrue(
                                ability.getRangeForLevel(starLevel) >= unit.getActiveRange(starLevel, branchId),
                                label + " damage ability must reach its attack range");
                    }
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

    private Map<String, Set<String>> definitionIdsByLine(List<UnitDefinition> units) {
        var result = new HashMap<String, Set<String>>();
        for (var unit : units) {
            var ids = result.computeIfAbsent(unit.lineId(), ignored -> new HashSet<>());
            ids.add(unit.id());
            unit.forms().forEach(form -> ids.add(form.definitionId()));
        }
        return result;
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
