package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderAffinityTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void providersExposeGenericAffinityResources() {
        var onePiece = new OnePieceGameModeProvider(jsonMapper);
        var pokemon = new PokemonGameModeProvider(jsonMapper);

        assertTrue(onePiece.getAffinitiesPath().isEmpty());
        assertEquals(
                "/data/affinities_pokemon.json", pokemon.getAffinitiesPath().orElseThrow());
    }

    @Test
    void dataLoaderCachesPokemonAndOnePieceAffinityConfigs() {
        var registry = new GameModeRegistry(TestHelpers.allModeProviders(jsonMapper));
        var dataLoader = new DataLoader(registry, jsonMapper);

        assertEquals(
                18, dataLoader.getAffinityConfig(GameMode.POKEMON).elements().size());
        assertEquals(1.0, dataLoader.getAffinityConfig(GameMode.ONEPIECE).defaultMultiplier());
        assertEquals(
                0, dataLoader.getAffinityConfig(GameMode.ONEPIECE).elements().size());
    }
}
