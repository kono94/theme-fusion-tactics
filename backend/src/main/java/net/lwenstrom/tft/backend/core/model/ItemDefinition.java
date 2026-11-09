package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Map;

public record ItemDefinition(
        String id,
        String name,
        String description,
        String icon,
        Map<ItemStat, Integer> statBonuses,
        List<ItemEffect> effects) {

    public ItemDefinition {
        effects = effects == null ? List.of() : List.copyOf(effects);
    }

    public ItemDefinition(String id, String name, String description, String icon, Map<ItemStat, Integer> statBonuses) {
        this(id, name, description, icon, statBonuses, List.of());
    }
}
