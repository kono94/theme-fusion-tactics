package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.model.CustomEffectHandler;
import net.lwenstrom.tft.backend.core.model.EffectType;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.TraitDefinition;
import net.lwenstrom.tft.backend.core.model.TraitEffect;
import net.lwenstrom.tft.backend.core.model.TraitTargetScope;
import tools.jackson.databind.JsonNode;

public class GenericTraitApplier implements TraitEffect {

    private final String traitId;
    private final EffectType effectType;
    private final TraitTargetScope targetScope;
    private final List<TraitDefinition.Breakpoint> effects;
    private final Map<String, CustomEffectHandler> customHandlers;

    public GenericTraitApplier(TraitDefinition definition) {
        this(definition.id(), definition.effectType(), definition.targetScope(), definition.effects(), Map.of());
    }

    public GenericTraitApplier(String traitId, EffectType effectType, List<TraitDefinition.Breakpoint> effects) {
        this(traitId, effectType, TraitTargetScope.SELF, effects, Map.of());
    }

    public GenericTraitApplier(
            String traitId,
            EffectType effectType,
            TraitTargetScope targetScope,
            List<TraitDefinition.Breakpoint> effects) {
        this(traitId, effectType, targetScope, effects, Map.of());
    }

    public GenericTraitApplier(
            String traitId,
            EffectType effectType,
            TraitTargetScope targetScope,
            List<TraitDefinition.Breakpoint> effects,
            Map<String, CustomEffectHandler> customHandlers) {
        this.traitId = traitId;
        this.effectType = effectType;
        this.targetScope = targetScope == null ? TraitTargetScope.SELF : targetScope;
        this.effects = List.copyOf(effects);
        this.customHandlers = customHandlers;
    }

    @Override
    public void apply(int count, List<GameUnit> units) {
        TraitDefinition.Breakpoint activeEffect = null;
        for (var effect : effects) {
            if (count >= effect.minUnits()) {
                activeEffect = effect;
            }
        }

        if (activeEffect == null || activeEffect.values() == null) {
            return;
        }

        var values = activeEffect.values();
        var recipients = getRecipients(units);

        switch (effectType) {
            case HP -> applyHp(recipients, values);
            case HP_AND_AS -> applyHpAndAs(recipients, values);
            case AS -> applyAs(recipients, values);
            case DEFENSE -> applyDefense(recipients, values);
            case DAMAGE_REDUCTION -> applyDamageReduction(recipients, values);
            case ATK_BUFF -> applyAtkBuff(recipients, values);
            case START_MANA -> applyStartMana(recipients, values);
            case START_MANA_PERCENT -> applyStartManaPercent(recipients, values);
            case ABILITY_DAMAGE -> applyAbilityDamage(recipients, values);
            case LOW_HP_DAMAGE -> applyLowHpDamage(recipients, values);
            case LIFESTEAL -> applyLifesteal(recipients, values);
            case EXTRA_ATTACK_CHANCE -> applyExtraAttackChance(recipients, values);
            case ON_HIT_DOT -> applyOnHitDot(recipients, values);
            case MANA_GAIN -> applyManaGain(recipients, values);
            case LOW_HP_AS -> applyLowHpAs(recipients, values);
            case DISTANCE_DAMAGE -> applyDistanceDamage(recipients, values);
            case GOLD_ON_WIN -> applyGoldOnWin(recipients, values);
            case HEAL_AMP -> applyHealAmp(recipients, values);
            case AS_ON_CAST -> applyAsOnCast(recipients, values);
            case CUSTOM -> applyCustom(count, recipients, activeEffect);
            case NONE -> {}
        }
    }

    private void applyCustom(int count, List<GameUnit> units, TraitDefinition.Breakpoint effect) {
        if (effect.customHandler() == null) {
            return;
        }
        var handler = customHandlers.get(effect.customHandler());
        if (handler != null) {
            handler.apply(count, units, effect.values());
        }
    }

    private void applyAbilityDamage(List<GameUnit> units, JsonNode values) {
        float multiplier = values.has("abilityDamage")
                ? (float) values.get("abilityDamage").asDouble()
                : 0f;
        for (GameUnit unit : units) {
            unit.setAbilityDamageMultiplier(unit.getAbilityDamageMultiplier() * (1.0f + multiplier));
        }
    }

    private void applyLowHpDamage(List<GameUnit> units, JsonNode values) {
        float bonus =
                values.has("damageBonus") ? (float) values.get("damageBonus").asDouble() : 0f;
        float threshold =
                values.has("hpThreshold") ? (float) values.get("hpThreshold").asDouble() : 0f;
        for (GameUnit unit : units) {
            unit.setLowHpDamageBonus(bonus);
            unit.setLowHpDamageThreshold(threshold);
        }
    }

    private void applyLifesteal(List<GameUnit> units, JsonNode values) {
        float lifesteal =
                values.has("lifesteal") ? (float) values.get("lifesteal").asDouble() : 0f;
        boolean canRevive = values.has("revive") && values.get("revive").asBoolean();
        for (GameUnit unit : units) {
            unit.setLifesteal(lifesteal);
            if (canRevive) unit.setHasRevive(true);
        }
    }

    private void applyExtraAttackChance(List<GameUnit> units, JsonNode values) {
        float chance = values.has("chance") ? (float) values.get("chance").asDouble() : 0f;
        for (GameUnit unit : units) {
            unit.setExtraAttackChance(chance);
        }
    }

    private void applyOnHitDot(List<GameUnit> units, JsonNode values) {
        float damageRatio =
                values.has("damageRatio") ? (float) values.get("damageRatio").asDouble() : 0f;
        long durationMs = values.has("durationMs") ? values.get("durationMs").asLong() : 2000L;
        long tickIntervalMs =
                values.has("tickIntervalMs") ? values.get("tickIntervalMs").asLong() : 1000L;
        for (GameUnit unit : units) {
            unit.setOnHitDotDamageRatio(damageRatio);
            unit.setOnHitDotDurationMs(durationMs);
            unit.setOnHitDotTickIntervalMs(tickIntervalMs);
        }
    }

    private void applyManaGain(List<GameUnit> units, JsonNode values) {
        float multiplier =
                values.has("manaGain") ? (float) values.get("manaGain").asDouble() : 0f;
        for (GameUnit unit : units) {
            unit.setManaGainMultiplier(1.0f + multiplier);
        }
    }

    private void applyLowHpAs(List<GameUnit> units, JsonNode values) {
        float bonus = values.has("as") ? (float) values.get("as").asDouble() : 0f;
        float threshold =
                values.has("hpThreshold") ? (float) values.get("hpThreshold").asDouble() : 0f;
        for (GameUnit unit : units) {
            unit.setLowHpAsBonus(bonus);
            unit.setLowHpAsThreshold(threshold);
        }
    }

    private void applyDistanceDamage(List<GameUnit> units, JsonNode values) {
        float bonus = values.has("damagePerCell")
                ? (float) values.get("damagePerCell").asDouble()
                : 0f;
        for (GameUnit unit : units) {
            unit.setDamagePerCell(bonus);
        }
    }

    private void applyGoldOnWin(List<GameUnit> units, JsonNode values) {
        int min = values.has("goldMin") ? values.get("goldMin").asInt() : 0;
        int max = values.has("goldMax") ? values.get("goldMax").asInt() : 0;
        for (GameUnit unit : units) {
            unit.setGoldBonusMin(min);
            unit.setGoldBonusMax(max);
        }
    }

    private void applyHealAmp(List<GameUnit> units, JsonNode values) {
        float amp = values.has("healAmp") ? (float) values.get("healAmp").asDouble() : 0f;
        for (GameUnit unit : units) {
            unit.setHealAmplification(1.0f + amp);
        }
    }

    private void applyAsOnCast(List<GameUnit> units, JsonNode values) {
        float as = values.has("as") ? (float) values.get("as").asDouble() : 0f;
        int duration = values.has("duration") ? values.get("duration").asInt() : 0;
        for (GameUnit unit : units) {
            unit.setAsOnCast(as);
            unit.setAsOnCastDuration(duration);
        }
    }

    private void applyHp(List<GameUnit> units, JsonNode values) {
        int bonusHp = values.has("hp") ? values.get("hp").asInt() : 0;
        if (bonusHp <= 0) return;

        for (GameUnit unit : units) {
            unit.setMaxHealth(unit.getMaxHealth() + bonusHp);
            unit.setCurrentHealth(unit.getCurrentHealth() + bonusHp);
        }
    }

    private void applyHpAndAs(List<GameUnit> units, JsonNode values) {
        int bonusHp = values.has("hp") ? values.get("hp").asInt() : 0;
        float bonusAs = values.has("as") ? (float) values.get("as").asDouble() : 0f;

        for (GameUnit unit : units) {
            if (bonusHp > 0) {
                unit.setMaxHealth(unit.getMaxHealth() + bonusHp);
                unit.setCurrentHealth(unit.getCurrentHealth() + bonusHp);
            }
            if (bonusAs > 0) {
                unit.setAttackSpeed(unit.getAttackSpeed() + bonusAs);
            }
        }
    }

    private void applyAs(List<GameUnit> units, JsonNode values) {
        float bonusAs = values.has("as") ? (float) values.get("as").asDouble() : 0f;
        if (bonusAs <= 0) return;

        for (GameUnit unit : units) {
            unit.setAttackSpeed(unit.getAttackSpeed() * (1.0f + bonusAs));
        }
    }

    private void applyDamageReduction(List<GameUnit> units, JsonNode values) {
        int reduction =
                values.has("damageReduction") ? values.get("damageReduction").asInt() : 0;
        if (reduction <= 0) return;

        for (GameUnit unit : units) {
            unit.setDamageReduction(Math.min(40, unit.getDamageReduction() + reduction));
        }
    }

    private void applyDefense(List<GameUnit> units, JsonNode values) {
        int bonusDefense = values.has("defense") ? values.get("defense").asInt() : 0;
        if (bonusDefense <= 0) return;

        units.forEach(unit -> unit.setDefense(unit.getDefense() + bonusDefense));
    }

    private void applyAtkBuff(List<GameUnit> units, JsonNode values) {
        float atkBuff = values.has("atkBuff") ? (float) values.get("atkBuff").asDouble() : 0f;
        boolean shieldOnDeath =
                values.has("shieldOnDeath") && values.get("shieldOnDeath").asBoolean();

        for (GameUnit unit : units) {
            if (atkBuff > 0) {
                unit.setAtkBuff(unit.getAtkBuff() * (1.0f + atkBuff));
            }
            if (shieldOnDeath) {
                unit.setShieldOnDeath(true);
            }
        }
    }

    private void applyStartMana(List<GameUnit> units, JsonNode values) {
        int bonusMana = values.has("mana") ? values.get("mana").asInt() : 0;
        if (bonusMana <= 0) return;

        for (GameUnit unit : units) {
            unit.setMana(Math.min(unit.getMaxMana(), unit.getMana() + bonusMana));
        }
    }

    private void applyStartManaPercent(List<GameUnit> units, JsonNode values) {
        float manaPercent =
                values.has("manaPercent") ? (float) values.get("manaPercent").asDouble() : 0f;
        if (manaPercent <= 0) return;

        for (GameUnit unit : units) {
            int bonusMana = Math.round(unit.getMaxMana() * manaPercent);
            unit.setMana(Math.min(unit.getMaxMana(), unit.getMana() + bonusMana));
        }
    }

    private List<GameUnit> getRecipients(List<GameUnit> units) {
        if (targetScope == TraitTargetScope.TEAM) {
            return units;
        }
        return units.stream().filter(this::hasTrait).toList();
    }

    private boolean hasTrait(GameUnit unit) {
        return unit.getTraits().stream()
                .anyMatch(t -> TraitManager.normalizeTraitId(t).equals(traitId));
    }
}
