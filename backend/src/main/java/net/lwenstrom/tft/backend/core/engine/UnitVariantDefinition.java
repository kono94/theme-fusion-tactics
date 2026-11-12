package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;

public record UnitVariantDefinition(
        String id,
        String name,
        List<String> traits,
        AbilityDefinition ability,
        Integer shopWeight,
        Boolean wildcardTrait,
        Integer wildcardTraitStar) {

    public int resolvedShopWeight() {
        return shopWeight == null ? 1 : shopWeight;
    }

    public boolean resolvedWildcardTrait() {
        return Boolean.TRUE.equals(wildcardTrait);
    }
}
