package net.lwenstrom.tft.backend.core.model;

import java.util.Map;

public record ItemDefinition(
        String id, String name, String description, String icon, Map<ItemStat, Integer> statBonuses) {}
