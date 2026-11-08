package net.lwenstrom.tft.backend.core.engine;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import net.lwenstrom.tft.backend.core.model.EffectType;
import net.lwenstrom.tft.backend.core.model.TraitTargetScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public final class JsonTraitLoader {
    private static final Logger log = LoggerFactory.getLogger(JsonTraitLoader.class);

    private JsonTraitLoader() {}

    public static void load(String path, TraitManager traitManager, JsonMapper jsonMapper) {
        var traitsArray = readTraits(path, jsonMapper);
        for (var traitNode : traitsArray) {
            var idNode = traitNode.get("id");
            if (idNode == null || idNode.asString().isBlank()) {
                throw new IllegalStateException("Trait without id in " + path);
            }
            var traitId = idNode.asString();
            var effectType =
                    parseEnum(EffectType.class, traitNode, "effectType", EffectType.NONE.name(), traitId, path);
            var targetScope = parseEnum(
                    TraitTargetScope.class, traitNode, "targetScope", TraitTargetScope.SELF.name(), traitId, path);

            List<JsonNode> effects = new ArrayList<>();
            if (traitNode.has("effects")) {
                traitNode.get("effects").forEach(effects::add);
            }

            traitManager.registerEffect(traitId, new GenericTraitApplier(traitId, effectType, targetScope, effects));
            log.debug("Registered trait: {} with effectType: {} and scope: {}", traitId, effectType, targetScope);
        }
        log.info("Loaded {} trait effects from {}", traitsArray.size(), path);
    }

    private static JsonNode readTraits(String path, JsonMapper jsonMapper) {
        try (var inputStream = JsonTraitLoader.class.getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find traits at " + path);
            }
            var traitsArray = jsonMapper.readTree(inputStream);
            if (traitsArray == null || !traitsArray.isArray()) {
                throw new IllegalStateException("Traits file is not a JSON array: " + path);
            }
            return traitsArray;
        } catch (IOException | JacksonException e) {
            throw new IllegalStateException("Failed to read traits from " + path, e);
        }
    }

    private static <E extends Enum<E>> E parseEnum(
            Class<E> type, JsonNode traitNode, String field, String fallback, String traitId, String path) {
        var value = traitNode.has(field) ? traitNode.get(field).asString() : fallback;
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "Unknown " + field + " '" + value + "' for trait " + traitId + " in " + path, e);
        }
    }
}
