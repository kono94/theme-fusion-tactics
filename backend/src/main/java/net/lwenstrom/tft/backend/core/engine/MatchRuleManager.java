package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import java.util.Optional;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.model.ActiveMatchRule;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.core.model.MatchRuleEffectType;
import net.lwenstrom.tft.backend.core.random.RandomProvider;

public class MatchRuleManager {
    public static final String RANDOM = "RANDOM";
    public static final String NONE = "NONE";

    private final List<MatchRuleDefinition> definitions;
    private String selection = RANDOM;
    private MatchRuleDefinition active;

    public MatchRuleManager(List<MatchRuleDefinition> definitions) {
        this.definitions = definitions == null ? List.of() : List.copyOf(definitions);
    }

    public String getSelection() {
        return selection;
    }

    public boolean select(String newSelection) {
        if (newSelection == null) {
            return false;
        }
        var valid = RANDOM.equals(newSelection)
                || NONE.equals(newSelection)
                || definitions.stream().anyMatch(definition -> definition.id().equals(newSelection));
        if (!valid) {
            return false;
        }
        selection = newSelection;
        return true;
    }

    public void resolveForMatch(RandomProvider randomProvider) {
        active = switch (selection) {
            case NONE -> null;
            case RANDOM -> definitions.isEmpty() ? null : definitions.get(randomProvider.nextInt(definitions.size()));
            default ->
                definitions.stream()
                        .filter(definition -> definition.id().equals(selection))
                        .findFirst()
                        .orElse(null);
        };
    }

    public Optional<ActiveMatchRule> activeRule() {
        return Optional.ofNullable(active).map(MatchRuleDefinition::toActive);
    }

    public void applyEconomy(Player player) {
        effect(MatchRuleEffectType.STARTING_LEVEL)
                .ifPresent(rule -> player.setLevel(Math.max(player.getLevel(), rule.value(0))));
        player.setRerollCost(rerollCost());
    }

    public int rerollCost() {
        return effect(MatchRuleEffectType.REROLL_COST)
                .map(rule -> rule.value(0))
                .orElse(GameConstants.REROLL_COST);
    }

    public boolean spawnsLootEveryRound() {
        return effect(MatchRuleEffectType.LOOT_EVERY_ROUND).isPresent();
    }

    public void applyCombatEffects(List<GameUnit> units) {
        if (active == null) {
            return;
        }
        switch (active.effectType()) {
            case DAMAGE_FOR_HEALTH -> units.forEach(unit -> applyDamageForHealth(unit, active));
            case STARTING_MANA_PERCENT ->
                units.stream()
                        .filter(unit -> unit.getMaxMana() > 0)
                        .forEach(unit -> unit.setMana(Math.min(
                                unit.getMaxMana(), unit.getMana() + unit.getMaxMana() * active.value(0) / 100)));
            case SECOND_WIND ->
                units.stream().filter(unit -> !unit.hasRevive()).forEach(unit -> {
                    unit.setHasRevive(true);
                    unit.setReviveUsed(false);
                });
            case STARTING_LEVEL, REROLL_COST, LOOT_EVERY_ROUND, DEATH_EXPLOSION, KILL_BOUNTY, AFFINITY_STRENGTH -> {}
        }
    }

    public MatchRuleDeathEffects deathEffects() {
        if (active == null) {
            return MatchRuleDeathEffects.NONE;
        }
        return switch (active.effectType()) {
            case DEATH_EXPLOSION -> new MatchRuleDeathEffects(active.value(0), 0, 0);
            case KILL_BOUNTY -> new MatchRuleDeathEffects(0, active.value(0), 0);
            case SECOND_WIND -> new MatchRuleDeathEffects(0, 0, active.value(0));
            default -> MatchRuleDeathEffects.NONE;
        };
    }

    public ElementalAffinityConfig adjustAffinity(ElementalAffinityConfig config) {
        return effect(MatchRuleEffectType.AFFINITY_STRENGTH)
                .map(rule -> scaleAffinity(config, rule.value(0)))
                .orElse(config);
    }

    private Optional<MatchRuleDefinition> effect(MatchRuleEffectType type) {
        return Optional.ofNullable(active).filter(rule -> rule.effectType() == type);
    }

    private static void applyDamageForHealth(GameUnit unit, MatchRuleDefinition rule) {
        var damageFactor = 1.0f + rule.value(0) / 100.0f;
        var healthFactor = 1.0f - rule.value(1) / 100.0f;
        unit.setAttackDamage(Math.round(unit.getAttackDamage() * damageFactor));
        unit.setAbilityDamageMultiplier(unit.getAbilityDamageMultiplier() * damageFactor);
        unit.setAbilityDotDamageMultiplier(unit.getAbilityDotDamageMultiplier() * damageFactor);
        unit.setMaxHealth(Math.max(1, Math.round(unit.getMaxHealth() * healthFactor)));
        unit.setCurrentHealth(Math.max(1, Math.round(unit.getCurrentHealth() * healthFactor)));
    }

    private static ElementalAffinityConfig scaleAffinity(ElementalAffinityConfig config, int factor) {
        return new ElementalAffinityConfig(
                config.defaultMultiplier(),
                1.0 + (config.strongMultiplier() - 1.0) * factor,
                Math.max(0.25, 1.0 + (config.resistedMultiplier() - 1.0) * factor),
                config.elements(),
                config.relationships());
    }
}
