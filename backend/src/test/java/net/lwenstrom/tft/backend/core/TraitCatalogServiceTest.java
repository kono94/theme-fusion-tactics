package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Comparator;
import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.TraitRosterUnit;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class TraitCatalogServiceTest {

    private TraitCatalogService service;

    @BeforeEach
    void setUp() {
        var jsonMapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(jsonMapper), new PokemonGameModeProvider(jsonMapper)));
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
}
