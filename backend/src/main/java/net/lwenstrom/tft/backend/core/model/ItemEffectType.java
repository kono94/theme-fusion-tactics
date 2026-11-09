package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public enum ItemEffectType {
    REGEN_MAX_HEALTH_PERCENT(ItemEffectCategory.DEFENSIVE, List.of(Parameter.decimal("percentPerSecond", 100))),
    SURVIVE_LETHAL_ONCE(ItemEffectCategory.DEFENSIVE, List.of()),
    ON_HIT_STUN_CHANCE(
            ItemEffectCategory.OFFENSIVE,
            List.of(Parameter.decimal("chance", 1), Parameter.whole("durationMs", 10_000))),
    DAMAGE_DEALT_HEAL_RATIO(ItemEffectCategory.UTILITY, List.of(Parameter.decimal("ratio", 1))),
    HEAL_ONCE_BELOW_HEALTH(
            ItemEffectCategory.DEFENSIVE,
            List.of(Parameter.decimal("threshold", 1), Parameter.decimal("healPercent", 100))),
    STUN_IMMUNITY_CHARGES(ItemEffectCategory.UTILITY, List.of(Parameter.whole("charges", 10))),
    EXTRA_ATTACK_CHANCE(ItemEffectCategory.OFFENSIVE, List.of(Parameter.decimal("chance", 1))),
    MANA_GAIN_MULTIPLIER(ItemEffectCategory.OFFENSIVE, List.of(Parameter.decimal("multiplier", 10)));

    private final ItemEffectCategory category;
    private final List<Parameter> parameters;

    ItemEffectType(ItemEffectCategory category, List<Parameter> parameters) {
        this.category = category;
        this.parameters = parameters;
    }

    public ItemEffectCategory category() {
        return category;
    }

    public List<Parameter> parameters() {
        return parameters;
    }

    public record Parameter(String name, double max, boolean wholeNumber) {
        static Parameter decimal(String name, double max) {
            return new Parameter(name, max, false);
        }

        static Parameter whole(String name, double max) {
            return new Parameter(name, max, true);
        }

        public boolean accepts(Double value) {
            return value != null
                    && Double.isFinite(value)
                    && value > 0
                    && value <= max
                    && (!wholeNumber || value == Math.rint(value));
        }
    }
}
