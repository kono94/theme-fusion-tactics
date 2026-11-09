package net.lwenstrom.tft.backend.core.combat;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.FieldConditionDefinition;
import net.lwenstrom.tft.backend.core.model.GameUnit;

public final class DamageResolver {
    private final ElementalAffinityConfig affinityConfig;
    private final FieldConditionTracker fieldConditions;

    public DamageResolver() {
        this(ElementalAffinityConfig.neutral());
    }

    public DamageResolver(ElementalAffinityConfig affinityConfig) {
        this(affinityConfig, null);
    }

    public DamageResolver(ElementalAffinityConfig affinityConfig, FieldConditionTracker fieldConditions) {
        this.affinityConfig = affinityConfig == null ? ElementalAffinityConfig.neutral() : affinityConfig;
        this.fieldConditions = fieldConditions;
    }

    public ElementalAffinityConfig affinityConfig() {
        return affinityConfig;
    }

    public int apply(GameUnit source, GameUnit target, int baseDamage) {
        if (baseDamage <= 0) {
            return baseDamage;
        }
        return Math.max(1, (int) Math.round(baseDamage * getMultiplier(source, target)));
    }

    public double getMultiplier(GameUnit source, GameUnit target) {
        var condition = activeElementCondition(source);
        if (condition != null) {
            return getFieldMultiplier(source, target, condition);
        }
        var attackingElements = getConfiguredElements(source);
        var defendingElements = getConfiguredElements(target);
        return attackingElements.isEmpty() || defendingElements.isEmpty()
                ? 1.0
                : affinityConfig.multiplier(attackingElements, defendingElements);
    }

    // The attacker uses whichever of its elements is best against the target once the field multiplier is applied.
    private double getFieldMultiplier(GameUnit source, GameUnit target, FieldConditionDefinition condition) {
        var defendingElements = getConfiguredElements(target);
        return source.getTraits().stream()
                .filter(trait -> affinityConfig.containsElement(trait) || condition.elementMultiplier(trait) != 1.0)
                .distinct()
                .mapToDouble(element -> affinityFor(element, defendingElements) * condition.elementMultiplier(element))
                .max()
                .orElse(1.0);
    }

    private double affinityFor(String element, List<String> defendingElements) {
        return defendingElements.isEmpty() || !affinityConfig.containsElement(element)
                ? 1.0
                : affinityConfig.multiplier(List.of(element), defendingElements);
    }

    private FieldConditionDefinition activeElementCondition(GameUnit source) {
        if (fieldConditions == null || source == null || source.getTraits() == null) {
            return null;
        }
        return fieldConditions
                .activeFor(source.getOwnerId())
                .filter(FieldConditionDefinition::affectsElementDamage)
                .orElse(null);
    }

    private List<String> getConfiguredElements(GameUnit unit) {
        if (unit == null || unit.getTraits() == null) {
            return List.of();
        }
        return unit.getTraits().stream()
                .filter(affinityConfig::containsElement)
                .distinct()
                .toList();
    }
}
