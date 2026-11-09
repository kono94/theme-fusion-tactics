package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemEffect;
import net.lwenstrom.tft.backend.core.model.ItemEffectType;
import net.lwenstrom.tft.backend.core.model.ItemStat;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderItemEffectTest {

    private static ItemDefinition item(ItemEffect... effects) {
        return new ItemDefinition(
                "test_item",
                "Test Item",
                "Test",
                "/items/test.png",
                Map.of(ItemStat.DEFENSE_FLAT, 10),
                Arrays.asList(effects));
    }

    private static void assertInvalid(String messagePart, ItemEffect effect) {
        var exception = assertThrows(IllegalStateException.class, () -> DataLoader.validateItemEffects(item(effect)));
        assertTrue(
                exception.getMessage().contains(messagePart),
                () -> "Expected '" + messagePart + "' in: " + exception.getMessage());
    }

    @Test
    void acceptsEveryEffectWithValidParameters() {
        assertDoesNotThrow(() -> DataLoader.validateItemEffects(item(
                new ItemEffect(ItemEffectType.REGEN_MAX_HEALTH_PERCENT, Map.of("percentPerSecond", 1.5)),
                new ItemEffect(ItemEffectType.SURVIVE_LETHAL_ONCE, Map.of()),
                new ItemEffect(ItemEffectType.ON_HIT_STUN_CHANCE, Map.of("chance", 0.15, "durationMs", 600.0)),
                new ItemEffect(ItemEffectType.DAMAGE_DEALT_HEAL_RATIO, Map.of("ratio", 0.15)),
                new ItemEffect(ItemEffectType.HEAL_ONCE_BELOW_HEALTH, Map.of("threshold", 0.5, "healPercent", 30.0)),
                new ItemEffect(ItemEffectType.STUN_IMMUNITY_CHARGES, Map.of("charges", 1.0)),
                new ItemEffect(ItemEffectType.EXTRA_ATTACK_CHANCE, Map.of("chance", 0.15)),
                new ItemEffect(ItemEffectType.MANA_GAIN_MULTIPLIER, Map.of("multiplier", 0.5)))));
    }

    @Test
    void rejectsMissingTypeMissingParametersAndUnknownParameters() {
        assertInvalid("effect type is missing", new ItemEffect(null, Map.of()));
        assertInvalid("expects parameters", new ItemEffect(ItemEffectType.ON_HIT_STUN_CHANCE, Map.of("chance", 0.2)));
        assertInvalid("expects parameters", new ItemEffect(ItemEffectType.SURVIVE_LETHAL_ONCE, Map.of("chance", 0.2)));
    }

    @Test
    void rejectsOutOfRangeValues() {
        assertInvalid("chance", new ItemEffect(ItemEffectType.EXTRA_ATTACK_CHANCE, Map.of("chance", 1.5)));
        assertInvalid("ratio", new ItemEffect(ItemEffectType.DAMAGE_DEALT_HEAL_RATIO, Map.of("ratio", -0.1)));
        assertInvalid("multiplier", new ItemEffect(ItemEffectType.MANA_GAIN_MULTIPLIER, Map.of("multiplier", 0.0)));
        assertInvalid("whole number", new ItemEffect(ItemEffectType.STUN_IMMUNITY_CHARGES, Map.of("charges", 1.5)));
        assertInvalid(
                "threshold",
                new ItemEffect(ItemEffectType.HEAL_ONCE_BELOW_HEALTH, Map.of("threshold", 2.0, "healPercent", 30.0)));
    }

    @Test
    void rejectsNullParameterValues() {
        var values = new HashMap<String, Double>();
        values.put("ratio", null);
        assertThrows(
                RuntimeException.class,
                () -> DataLoader.validateItemEffects(
                        item(new ItemEffect(ItemEffectType.DAMAGE_DEALT_HEAL_RATIO, values))));
    }

    @Test
    void gen23ItemsLoadWithOneEffectEachWhileOtherModesStayStatOnly() {
        var mapper = JsonMapper.builder().build();
        var loader = new DataLoader(new GameModeRegistry(TestHelpers.allModeProviders()), mapper);

        var gen23 = loader.getItems(GameMode.POKEMON_GEN23);
        assertTrue(gen23.stream().allMatch(item -> item.effects().size() == 1));
        assertEquals(
                List.of(ItemEffectType.values()),
                gen23.stream().map(item -> item.effects().getFirst().type()).toList());
        assertTrue(loader.getItems(GameMode.ONEPIECE).stream()
                .allMatch(item -> item.effects().isEmpty()));
        assertTrue(loader.getItems(GameMode.POKEMON).stream()
                .allMatch(item -> item.effects().isEmpty()));
    }
}
