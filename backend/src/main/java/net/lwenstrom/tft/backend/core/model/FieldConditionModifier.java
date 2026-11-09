package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record FieldConditionModifier(String conditionId, List<Integer> durationSeconds, Boolean extendActive)
        implements AbilityModifier {
    public FieldConditionModifier {
        extendActive = Boolean.TRUE.equals(extendActive);
    }

    public int getDurationSeconds(int starLevel) {
        if (durationSeconds == null || durationSeconds.isEmpty()) return 0;
        var index = Math.min(Math.max(starLevel, 1) - 1, durationSeconds.size() - 1);
        return durationSeconds.get(index);
    }
}
