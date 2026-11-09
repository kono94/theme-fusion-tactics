package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ItemInstance(
        String instanceId,
        String id,
        String name,
        String description,
        String icon,
        Map<ItemStat, Integer> statBonuses,
        List<ItemEffect> effects)
        implements GameItem {

    public ItemInstance {
        effects = effects == null ? List.of() : List.copyOf(effects);
    }

    public static ItemInstance from(ItemDefinition definition) {
        return new ItemInstance(
                UUID.randomUUID().toString(),
                definition.id(),
                definition.name(),
                definition.description(),
                definition.icon(),
                definition.statBonuses(),
                definition.effects());
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

    @Override
    public List<ItemEffect> getEffects() {
        return effects;
    }
}
