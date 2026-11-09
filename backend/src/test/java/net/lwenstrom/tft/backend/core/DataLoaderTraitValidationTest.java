package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.EffectType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderTraitValidationTest {

    @ParameterizedTest
    @CsvSource({
        "missing_min_units.json, missing minUnits",
        "missing_values.json, needs a values object for DEFENSE",
        "descending_min_units.json, strictly ascending",
        "unknown_effect_type.json, NOT_A_REAL_EFFECT",
        "unknown_target_scope.json, NOT_A_REAL_SCOPE",
        "malformed.json, Failed to load trait data",
        "does_not_exist.json, Could not find traits"
    })
    void rejectsInvalidTraitDataAtStartup(String file, String expectedMessage) {
        var dataLoader = loaderWithTraits("/traits/" + file);

        var error = assertThrows(IllegalStateException.class, dataLoader::loadData);

        var messages = messageChain(error);
        assertTrue(messages.contains("/traits/" + file), messages);
        assertTrue(messages.contains(expectedMessage), messages);
    }

    @Test
    void rejectsUnitsReferencingUnknownTraitsAtStartup() {
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.ONEPIECE;
            }

            @Override
            public String getUnitsPath() {
                return "/units/unknown_trait_units.json";
            }
        };
        var dataLoader = new DataLoader(
                new GameModeRegistry(List.of(provider)), JsonMapper.builder().build());

        var error = assertThrows(IllegalStateException.class, dataLoader::loadData);

        assertTrue(error.getMessage().contains("luffy_v1 references unknown trait Not A Trait"), error.getMessage());
    }

    @ParameterizedTest
    @EnumSource(GameMode.class)
    void shippedTraitDataExposesEffectsAndMetadata(GameMode mode) {
        var dataLoader = new DataLoader(
                new GameModeRegistry(TestHelpers.allModeProviders()),
                JsonMapper.builder().build());

        var definitions = dataLoader.getTraitDefinitions(mode);
        var metadata = dataLoader.getTraitMetadata(mode);

        assertFalse(definitions.isEmpty());
        assertTrue(definitions.stream().allMatch(trait -> trait.effectType() != EffectType.NONE));
        assertTrue(metadata.stream()
                .allMatch(trait -> trait.effects().size()
                        == definitions.stream()
                                .filter(definition -> definition.id().equals(trait.id()))
                                .findFirst()
                                .orElseThrow()
                                .effects()
                                .size()));
    }

    private static DataLoader loaderWithTraits(String traitsPath) {
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.ONEPIECE;
            }

            @Override
            public String getTraitsPath() {
                return traitsPath;
            }
        };
        return new DataLoader(
                new GameModeRegistry(List.of(provider)), JsonMapper.builder().build());
    }

    private static String messageChain(Throwable error) {
        var messages = new StringBuilder();
        for (var current = error; current != null; current = current.getCause()) {
            messages.append(current.getMessage()).append('\n');
        }
        return messages.toString();
    }
}
