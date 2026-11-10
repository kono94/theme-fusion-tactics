package net.lwenstrom.tft.backend.core.engine;

import java.util.HashSet;
import java.util.List;
import net.lwenstrom.tft.backend.core.random.RandomProvider;

final class VariantGroups {
    private VariantGroups() {}

    // Each variant group occupies a single pool slot so it rolls with the odds of one unit of its cost.
    static List<UnitDefinition> collapse(List<UnitDefinition> units) {
        var seenGroups = new HashSet<String>();
        return units.stream()
                .filter(unit -> unit.variantGroup() == null || seenGroups.add(unit.variantGroup()))
                .toList();
    }

    static UnitDefinition pickWeighted(List<UnitDefinition> variants, RandomProvider randomProvider) {
        var totalWeight = variants.stream().mapToInt(UnitDefinition::shopWeight).sum();
        var roll = randomProvider.nextInt(totalWeight);
        for (var variant : variants) {
            roll -= variant.shopWeight();
            if (roll < 0) {
                return variant;
            }
        }
        return variants.getLast();
    }
}
