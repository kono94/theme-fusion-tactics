package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.Map;
import net.lwenstrom.tft.backend.core.model.TraitEffect;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class JsonTraitLoaderTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void registersAnApplierPerTraitWithNormalizedIds() {
        var traitManager = new RecordingTraitManager();

        JsonTraitLoader.load("/traits/valid_traits.json", traitManager, jsonMapper);

        assertEquals(2, traitManager.registered.size());
        assertInstanceOf(GenericTraitApplier.class, traitManager.registered.get("iron_guard"));
        assertInstanceOf(GenericTraitApplier.class, traitManager.registered.get("plain"));
    }

    @Test
    void unknownEffectTypeThrows() {
        var exception = assertThrows(
                IllegalStateException.class,
                () -> JsonTraitLoader.load("/traits/unknown_effect_type.json", new TraitManager(), jsonMapper));

        assertTrue(exception.getMessage().contains("NOT_A_REAL_EFFECT"));
    }

    @Test
    void unknownTargetScopeThrows() {
        assertThrows(
                IllegalStateException.class,
                () -> JsonTraitLoader.load("/traits/unknown_target_scope.json", new TraitManager(), jsonMapper));
    }

    @Test
    void malformedJsonThrows() {
        assertThrows(
                IllegalStateException.class,
                () -> JsonTraitLoader.load("/traits/malformed.json", new TraitManager(), jsonMapper));
    }

    @Test
    void missingResourceThrows() {
        var exception = assertThrows(
                IllegalStateException.class,
                () -> JsonTraitLoader.load("/traits/does_not_exist.json", new TraitManager(), jsonMapper));

        assertTrue(exception.getMessage().contains("/traits/does_not_exist.json"));
    }

    private static final class RecordingTraitManager extends TraitManager {
        private final Map<String, TraitEffect> registered = new LinkedHashMap<>();

        @Override
        public void registerEffect(String traitId, TraitEffect effect) {
            registered.put(normalizeTraitId(traitId), effect);
            super.registerEffect(traitId, effect);
        }
    }
}
