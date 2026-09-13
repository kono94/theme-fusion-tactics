package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Map;

public record TraitCatalogEntry(
        String id,
        String name,
        String description,
        String type,
        TraitTargetScope targetScope,
        String iconColor,
        List<TraitMetadata.TraitEffect> effects,
        Map<String, Object> extras,
        List<TraitRosterUnit> units) {

    public static TraitCatalogEntry from(TraitMetadata metadata, List<TraitRosterUnit> units) {
        return new TraitCatalogEntry(
                metadata.id(),
                metadata.name(),
                metadata.description(),
                metadata.type(),
                metadata.targetScope(),
                metadata.iconColor(),
                metadata.effects(),
                metadata.extras(),
                units);
    }
}
