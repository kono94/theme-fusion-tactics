package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderFieldConditionTest {

    @Test
    void rejectsUnitStartConditionsWithUnknownIds() {
        assertStartupFailure(
                "/units/unknown_start_condition_units.json",
                "/data/field_conditions_pokemongen23.json",
                "lotad_test references unknown field condition monsoon");
    }

    @Test
    void rejectsAbilityFieldConditionsWithUnknownIds() {
        assertStartupFailure(
                "/units/unknown_ability_condition_units.json",
                "/data/field_conditions_pokemongen23.json",
                "lotad_test references unknown field condition monsoon");
    }

    @Test
    void rejectsMalformedFieldConditionData() {
        assertStartupFailure(
                "/data/units_pokemongen23.json",
                "/field_conditions/malformed.json",
                "Failed to load field condition data: /field_conditions/malformed.json");
    }

    @Test
    void weatherFrontNeedsASelectableCondition() {
        assertStartupFailure(
                "/units/plain_water_units.json",
                "/field_conditions/does_not_exist.json",
                "Match rule weather-front needs a field condition selectable by rule");
    }

    private static void assertStartupFailure(String unitsPath, String conditionsPath, String expectedMessage) {
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.POKEMON_GEN23;
            }

            @Override
            public String getUnitsPath() {
                return unitsPath;
            }

            @Override
            public String getFieldConditionsPath() {
                return conditionsPath;
            }

            @Override
            public Optional<String> getAffinitiesPath() {
                return Optional.of("/data/affinities_pokemongen23.json");
            }
        };
        var dataLoader = new DataLoader(
                new GameModeRegistry(List.of(provider)), JsonMapper.builder().build());

        var error = assertThrows(RuntimeException.class, dataLoader::loadData);

        var messages = new StringBuilder();
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            messages.append(cause.getMessage()).append('\n');
        }
        assertTrue(messages.toString().contains(expectedMessage), messages.toString());
    }
}
