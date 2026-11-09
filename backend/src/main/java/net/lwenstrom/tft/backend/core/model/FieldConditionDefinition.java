package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public record FieldConditionDefinition(
        String id,
        String name,
        String description,
        String icon,
        Map<String, Double> elementDamageMultipliers,
        PeriodicDamage periodicDamage,
        Map<String, Float> traitAttackSpeedBonus,
        Map<String, Integer> traitDefenseBonus,
        Boolean selectableByRule,
        Boolean clearsField) {

    public record PeriodicDamage(float maxHealthPercent, long intervalMs, List<String> immuneTraits) {
        public PeriodicDamage {
            immuneTraits = immuneTraits == null ? List.of() : List.copyOf(immuneTraits);
        }

        public boolean isImmune(Set<String> traits) {
            return traits != null && traits.stream().anyMatch(trait -> containsIgnoreCase(immuneTraits, trait));
        }
    }

    public FieldConditionDefinition {
        elementDamageMultipliers = elementDamageMultipliers == null ? Map.of() : Map.copyOf(elementDamageMultipliers);
        traitAttackSpeedBonus = traitAttackSpeedBonus == null ? Map.of() : Map.copyOf(traitAttackSpeedBonus);
        traitDefenseBonus = traitDefenseBonus == null ? Map.of() : Map.copyOf(traitDefenseBonus);
        selectableByRule = Boolean.TRUE.equals(selectableByRule);
        clearsField = Boolean.TRUE.equals(clearsField);
    }

    public double elementMultiplier(String element) {
        return valueFor(elementDamageMultipliers, element, 1.0);
    }

    public boolean affectsElementDamage() {
        return !elementDamageMultipliers.isEmpty();
    }

    public CombatModifiers.FieldModifiers modifiersFor(Set<String> traits) {
        if (traits == null || traits.isEmpty()) {
            return CombatModifiers.FieldModifiers.NONE;
        }
        var attackSpeedBonus = (float) traits.stream()
                .mapToDouble(trait -> valueFor(traitAttackSpeedBonus, trait, 0.0f))
                .sum();
        var defenseBonus = traits.stream()
                .mapToInt(trait -> valueFor(traitDefenseBonus, trait, 0))
                .sum();
        if (attackSpeedBonus == 0.0f && defenseBonus == 0) {
            return CombatModifiers.FieldModifiers.NONE;
        }
        return new CombatModifiers.FieldModifiers(attackSpeedBonus, defenseBonus, 0.0f, 1.0f);
    }

    public void validate() {
        if (isBlank(id) || isBlank(name) || isBlank(description) || isBlank(icon)) {
            throw invalid("id, name, description and icon are required");
        }
        if (clearsField
                && (!elementDamageMultipliers.isEmpty()
                        || periodicDamage != null
                        || !traitAttackSpeedBonus.isEmpty()
                        || !traitDefenseBonus.isEmpty()
                        || selectableByRule)) {
            throw invalid("a clearing condition has no effects and cannot be selected by rule");
        }
        if (elementDamageMultipliers.values().stream().anyMatch(value -> value == null || value <= 0)) {
            throw invalid("element damage multipliers must be greater than 0");
        }
        if (traitAttackSpeedBonus.values().stream().anyMatch(value -> value == null)
                || traitDefenseBonus.values().stream().anyMatch(value -> value == null)) {
            throw invalid("trait bonuses must not be null");
        }
        if (periodicDamage != null
                && (periodicDamage.maxHealthPercent() <= 0
                        || periodicDamage.maxHealthPercent() > 100
                        || periodicDamage.intervalMs() <= 0)) {
            throw invalid("periodic damage needs a percent in (0, 100] and a positive interval");
        }
    }

    public FieldConditionView toView(Long remainingMs) {
        return new FieldConditionView(id, name, description, icon, remainingMs);
    }

    private IllegalStateException invalid(String reason) {
        return new IllegalStateException("Invalid field condition " + id + ": " + reason);
    }

    private static <T> T valueFor(Map<String, T> values, String key, T fallback) {
        if (key == null) {
            return fallback;
        }
        return values.entrySet().stream()
                .filter(entry -> normalize(entry.getKey()).equals(normalize(key)))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(fallback);
    }

    private static boolean containsIgnoreCase(List<String> values, String value) {
        return value != null
                && values.stream().anyMatch(candidate -> normalize(candidate).equals(normalize(value)));
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
