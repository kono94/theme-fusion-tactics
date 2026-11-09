package net.lwenstrom.tft.backend.core.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import tools.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TraitDefinition(
        String id,
        String name,
        String description,
        String type,
        TraitTargetScope targetScope,
        String iconColor,
        EffectType effectType,
        List<Breakpoint> effects) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Breakpoint(
            Integer minUnits, String description, String style, JsonNode values, String customHandler) {}

    public TraitMetadata metadata() {
        var breakpoints = effects.stream()
                .map(effect -> new TraitMetadata.TraitEffect(effect.minUnits(), effect.description(), effect.style()))
                .toList();
        return new TraitMetadata(id, name, description, type, targetScope, iconColor, breakpoints, null);
    }

    public void validate() {
        requireText("id", id);
        requireText("name", name);
        requireText("description", description);
        requireText("type", type);
        requireText("iconColor", iconColor);
        if (targetScope == null) {
            throw invalid("targetScope is missing");
        }
        if (effectType == null) {
            throw invalid("effectType is missing");
        }
        if (effects == null || effects.isEmpty()) {
            throw invalid("effects are missing");
        }
        var previousMinUnits = 0;
        for (var effect : effects) {
            if (effect == null || effect.minUnits() == null) {
                throw invalid("an effect is missing minUnits");
            }
            if (effect.minUnits() <= previousMinUnits) {
                throw invalid("effect minUnits must be at least 1 and strictly ascending but got " + effect.minUnits()
                        + " after " + previousMinUnits);
            }
            previousMinUnits = effect.minUnits();
            if (effect.description() == null || effect.style() == null) {
                throw invalid("effect at " + effect.minUnits() + " units needs a description and style");
            }
            if (effectType != EffectType.NONE
                    && (effect.values() == null || !effect.values().isObject())) {
                throw invalid("effect at " + effect.minUnits() + " units needs a values object for " + effectType);
            }
        }
    }

    private void requireText(String field, String value) {
        if (value == null || value.isBlank()) {
            throw invalid(field + " is missing");
        }
    }

    private IllegalStateException invalid(String reason) {
        return new IllegalStateException("Invalid trait " + id + ": " + reason);
    }
}
