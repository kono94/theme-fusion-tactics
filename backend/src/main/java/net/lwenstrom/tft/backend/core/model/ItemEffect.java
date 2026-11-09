package net.lwenstrom.tft.backend.core.model;

import java.util.Map;

public record ItemEffect(ItemEffectType type, Map<String, Double> values) {
    public ItemEffect {
        values = values == null ? Map.of() : Map.copyOf(values);
    }

    public double value(String name) {
        return values.getOrDefault(name, 0.0);
    }
}
