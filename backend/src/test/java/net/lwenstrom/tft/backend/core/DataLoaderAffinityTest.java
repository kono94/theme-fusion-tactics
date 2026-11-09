package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemongen23.PokemonGen23GameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderAffinityTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void providersExposeGenericAffinityResources() {
        var onePiece = new OnePieceGameModeProvider();
        var pokemon = new PokemonGameModeProvider();

        assertTrue(onePiece.getAffinitiesPath().isEmpty());
        assertEquals(
                "/data/affinities_pokemon.json", pokemon.getAffinitiesPath().orElseThrow());
        assertEquals(
                "/data/affinities_pokemongen23.json",
                new PokemonGen23GameModeProvider().getAffinitiesPath().orElseThrow());
    }

    @Test
    void dataLoaderCachesPokemonAndOnePieceAffinityConfigs() {
        var registry = new GameModeRegistry(TestHelpers.allModeProviders());
        var dataLoader = new DataLoader(registry, jsonMapper);

        assertEquals(
                18, dataLoader.getAffinityConfig(GameMode.POKEMON).elements().size());
        assertEquals(
                17,
                dataLoader.getAffinityConfig(GameMode.POKEMON_GEN23).elements().size());
        assertEquals(1.0, dataLoader.getAffinityConfig(GameMode.ONEPIECE).defaultMultiplier());
        assertEquals(
                0, dataLoader.getAffinityConfig(GameMode.ONEPIECE).elements().size());
    }
}
