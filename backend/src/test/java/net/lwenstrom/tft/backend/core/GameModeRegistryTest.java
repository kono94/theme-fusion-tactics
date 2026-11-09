package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemongen23.PokemonGen23GameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GameModeRegistryTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void onePieceIsTheInitialRoomModeWhenAllModesAreRegistered() {
        var registry =
                new GameModeRegistry(TestHelpers.allModeProviders(jsonMapper).reversed());

        assertEquals(GameMode.ONEPIECE, registry.getDefaultMode());
    }

    @Test
    void focusedRegistryUsesItsOnlyAvailableMode() {
        var registry = new GameModeRegistry(List.of(new PokemonGameModeProvider(jsonMapper)));

        assertEquals(GameMode.POKEMON, registry.getDefaultMode());
    }

    @Test
    void registersTheGen23ModeWithoutChangingTheDefault() {
        var registry = new GameModeRegistry(TestHelpers.allModeProviders(jsonMapper));

        assertEquals(GameMode.ONEPIECE, registry.getDefaultMode());
        assertEquals(
                GameMode.POKEMON_GEN23,
                new GameModeRegistry(List.of(new PokemonGen23GameModeProvider(jsonMapper))).getDefaultMode());
    }

    @Test
    void registryRequiresAtLeastOneModeProvider() {
        assertThrows(IllegalStateException.class, () -> new GameModeRegistry(List.of()));
    }
}
