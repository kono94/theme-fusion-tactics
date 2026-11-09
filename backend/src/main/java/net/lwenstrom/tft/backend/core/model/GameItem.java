package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Map;

public interface GameItem {
    default String getInstanceId() {
        return getId();
    }

    String getId();

    String getName();

    String getDescription();

    Map<ItemStat, Integer> getStatBonuses();

    default List<ItemEffect> getEffects() {
        return List.of();
    }

    default String getIcon() {
        return "";
    }
}
