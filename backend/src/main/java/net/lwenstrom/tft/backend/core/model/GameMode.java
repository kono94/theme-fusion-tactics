package net.lwenstrom.tft.backend.core.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum GameMode {
    ONEPIECE("onepiece"),
    POKEMON("pokemon"),
    POKEMON_GEN23("pokemongen23");

    private final String value;

    GameMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static GameMode fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Game mode is required");
        }
        return Arrays.stream(GameMode.values())
                .filter(mode -> mode.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported game mode: " + value));
    }
}
