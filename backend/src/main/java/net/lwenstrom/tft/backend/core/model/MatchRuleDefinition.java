package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record MatchRuleDefinition(
        String id, String name, String description, String icon, MatchRuleEffectType effectType, List<Integer> values) {

    public ActiveMatchRule toActive() {
        return new ActiveMatchRule(id, name, description, icon);
    }

    public int value(int index) {
        return values.get(index);
    }
}
