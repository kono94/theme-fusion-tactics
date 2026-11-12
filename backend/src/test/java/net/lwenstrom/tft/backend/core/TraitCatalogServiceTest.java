package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.TraitCatalogEntry;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;
import net.lwenstrom.tft.backend.core.model.TraitRosterUnit;
import net.lwenstrom.tft.backend.test.BranchingTestUnits;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class TraitCatalogServiceTest {

    private TraitCatalogService service;

    @BeforeEach
    void setUp() {
        var jsonMapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(TestHelpers.allModeProviders());
        service = new TraitCatalogService(new DataLoader(registry, jsonMapper));
    }

    @Test
    void returnsOneCostOrderedEntryPerPokemonLine() {
        var poison = service.getTraits(GameMode.POKEMON).stream()
                .filter(trait -> trait.id().equals("poison"))
                .findFirst()
                .orElseThrow();

        assertEquals(10, poison.units().size());
        assertEquals(
                10,
                poison.units().stream().map(unit -> unit.lineId()).distinct().count());
        assertEquals(
                poison.units().stream()
                        .sorted(Comparator.comparingInt(TraitRosterUnit::cost)
                                .thenComparingInt(TraitRosterUnit::starLevel)
                                .thenComparing(TraitRosterUnit::name))
                        .toList(),
                poison.units());
    }

    @Test
    void usesTheFirstEvolutionFormThatActuallyHasTheTrait() {
        var flying = service.getTraits(GameMode.POKEMON).stream()
                .filter(trait -> trait.id().equals("flying"))
                .findFirst()
                .orElseThrow();
        var charmanderLine = flying.units().stream()
                .filter(unit -> unit.lineId().equals("charmander"))
                .findFirst()
                .orElseThrow();

        assertEquals(3, charmanderLine.starLevel());
        assertEquals("charizard", charmanderLine.definitionId());
        assertEquals("Charizard", charmanderLine.name());
        assertTrue(charmanderLine.traits().contains("Flying"));
    }

    @Test
    void keepsModeRostersIsolated() {
        var pokemonIds = service.getTraits(GameMode.POKEMON).stream()
                .flatMap(trait -> trait.units().stream())
                .map(unit -> unit.lineId())
                .toList();
        var onePieceIds = service.getTraits(GameMode.ONEPIECE).stream()
                .flatMap(trait -> trait.units().stream())
                .map(unit -> unit.lineId())
                .toList();

        assertTrue(pokemonIds.contains("charmander"));
        assertFalse(pokemonIds.contains("luffy_v1"));
        assertTrue(onePieceIds.contains("luffy_v1"));
        assertFalse(onePieceIds.contains("charmander"));
    }

    @Test
    void rosterListsBranchFormsUnderEveryBranchTrait() {
        var units = BranchingTestUnits.load();
        var traitIds = List.of("normal", "water", "electric", "fire", "psychic", "fighting", "bug", "flying", "poison");
        var traits = traitIds.stream()
                .map(id -> new TraitMetadata(id, id, "", "type", null, "#fff", List.of(), Map.of()))
                .toList();
        var dataLoader = new DataLoader(
                TestHelpers.createMockRegistry(), JsonMapper.builder().build()) {
            @Override
            public List<UnitDefinition> getAllUnits(GameMode mode) {
                return units;
            }

            @Override
            public List<TraitMetadata> getTraitMetadata(GameMode mode) {
                return traits;
            }
        };
        var roster = new TraitCatalogService(dataLoader)
                .getTraits(GameMode.ONEPIECE).stream()
                        .collect(Collectors.toMap(TraitCatalogEntry::id, entry -> entry.units()));

        assertEquals(List.of("eevee"), definitionIds(roster.get("normal")));
        assertEquals(List.of("vaporeon"), definitionIds(roster.get("water")));
        assertEquals(List.of("jolteon"), definitionIds(roster.get("electric")));
        assertEquals(List.of("flareon"), definitionIds(roster.get("fire")));
        assertEquals(2, roster.get("water").getFirst().starLevel());
        assertEquals(1400, roster.get("water").getFirst().maxHealth());
        assertEquals(List.of("ralts"), definitionIds(roster.get("psychic")));
        assertEquals(List.of("gallade"), definitionIds(roster.get("fighting")));
        assertEquals(List.of("beautifly"), definitionIds(roster.get("flying")));
        assertEquals(List.of("dustox"), definitionIds(roster.get("poison")));
        assertEquals(List.of("wurmple"), definitionIds(roster.get("bug")));
    }

    @Test
    void gen23EeveeAppearsUnderEveryBranchType() {
        var traits = service.getTraits(GameMode.POKEMON_GEN23).stream()
                .collect(Collectors.toMap(TraitCatalogEntry::id, entry -> entry.units()));
        var expected = Map.of(
                "normal", "eevee",
                "water", "vaporeon",
                "electric", "jolteon",
                "fire", "flareon",
                "psychic", "espeon",
                "dark", "umbreon",
                "grass", "leafeon",
                "ice", "glaceon");

        expected.forEach((traitId, definitionId) -> {
            var eeveeLine = traits.get(traitId).stream()
                    .filter(unit -> unit.lineId().equals("eevee"))
                    .toList();
            assertEquals(1, eeveeLine.size(), traitId + " should list the Eevee line once");
            assertEquals(definitionId, eeveeLine.getFirst().definitionId());
        });
    }

    @Test
    void gen23VariantGroupWithATraitChoiceIsOnlyListedUnderItsBaseTrait() {
        var unownTraits = service.getTraits(GameMode.POKEMON_GEN23).stream()
                .filter(entry ->
                        entry.units().stream().anyMatch(unit -> unit.lineId().equals("unown")))
                .map(TraitCatalogEntry::id)
                .toList();

        assertEquals(List.of("psychic"), unownTraits);
    }

    private static List<String> definitionIds(List<TraitRosterUnit> units) {
        return units.stream().map(TraitRosterUnit::definitionId).toList();
    }
}
