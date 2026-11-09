package net.lwenstrom.tft.backend.core.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class GameModeTest {

    @Test
    void parsesSupportedModesCaseInsensitivelyAndTrimsWhitespace() {
        assertEquals(GameMode.ONEPIECE, GameMode.fromString(" onepiece "));
        assertEquals(GameMode.POKEMON, GameMode.fromString("POKEMON"));
        assertEquals(GameMode.POKEMON_GEN23, GameMode.fromString("pokemongen23"));
        assertEquals("pokemongen23", GameMode.POKEMON_GEN23.getValue());
    }

    @Test
    void declaresModesInLobbyOrder() {
        assertEquals(List.of(GameMode.ONEPIECE, GameMode.POKEMON, GameMode.POKEMON_GEN23), List.of(GameMode.values()));
    }

    @Test
    void enumNamesCanonicalizeToTheirWireValues() {
        for (var mode : GameMode.values()) {
            assertEquals(mode.getValue(), mode.name().replace("_", "").toLowerCase(Locale.ROOT));
        }
    }

    @Test
    void rejectsUnsupportedModesInsteadOfFallingBack() {
        assertThrows(IllegalArgumentException.class, () -> GameMode.fromString("legacy-mode"));
        assertThrows(IllegalArgumentException.class, () -> GameMode.fromString(""));
        assertThrows(IllegalArgumentException.class, () -> GameMode.fromString(null));
    }
}
