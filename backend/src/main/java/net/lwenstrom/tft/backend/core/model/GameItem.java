package net.lwenstrom.tft.backend.core.model;

import java.util.Map;

public interface GameItem {
    default String getInstanceId() {
        return getId();
    }

    String getId();

    String getName();

    String getDescription();

    Map<ItemStat, Integer> getStatBonuses();

    default String getIcon() {
        return "";
    }
}
