package net.lwenstrom.tft.backend.core.model;

import java.util.Map;
import java.util.UUID;

public record ItemInstance(
        String instanceId, String id, String name, String description, String icon, Map<ItemStat, Integer> statBonuses)
        implements GameItem {

    public static ItemInstance from(ItemDefinition definition) {
        return new ItemInstance(
                UUID.randomUUID().toString(),
                definition.id(),
                definition.name(),
                definition.description(),
                definition.icon(),
                definition.statBonuses());
    }

    @Override
    public String getInstanceId() {
        return instanceId;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public String getDescription() {
        return description;
    }

    @Override
    public String getIcon() {
        return icon;
    }

    @Override
    public Map<ItemStat, Integer> getStatBonuses() {
        return statBonuses;
    }
}
