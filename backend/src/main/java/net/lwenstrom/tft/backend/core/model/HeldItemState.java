package net.lwenstrom.tft.backend.core.model;

import java.util.ArrayList;
import java.util.List;

public final class HeldItemState {
    private static final long REGEN_INTERVAL_MS = 1000L;

    public record Proc(String itemName, int value) {}

    private float regenPercentPerSecond;
    private String regenItemName;
    private int surviveLethalCharges;
    private String surviveLethalItemName;
    private float onHitStunChance;
    private long onHitStunDurationMs;
    private String onHitStunItemName;
    private float damageDealtHealRatio;
    private String damageDealtHealItemName;
    private float healBelowThreshold;
    private float healBelowPercent;
    private String healBelowItemName;
    private int stunImmunityCharges;
    private String stunImmunityItemName;
    private float extraAttackChance;
    private float manaGainMultiplier = 1.0f;

    private long regenElapsedMs;
    private int surviveLethalUsed;
    private boolean healBelowUsed;
    private int stunImmunityUsed;
    private final List<Proc> pendingProcs = new ArrayList<>();

    private HeldItemState() {}

    public static HeldItemState none() {
        return new HeldItemState();
    }

    public static HeldItemState from(List<GameItem> items) {
        var state = new HeldItemState();
        for (var item : items) {
            for (var effect : item.getEffects()) {
                state.add(item.getName(), effect);
            }
        }
        return state;
    }

    private void add(String itemName, ItemEffect effect) {
        switch (effect.type()) {
            case REGEN_MAX_HEALTH_PERCENT -> {
                regenPercentPerSecond += (float) effect.value("percentPerSecond");
                regenItemName = firstName(regenItemName, itemName);
            }
            case SURVIVE_LETHAL_ONCE -> {
                surviveLethalCharges++;
                surviveLethalItemName = firstName(surviveLethalItemName, itemName);
            }
            case ON_HIT_STUN_CHANCE -> {
                onHitStunChance = Math.min(1.0f, onHitStunChance + (float) effect.value("chance"));
                onHitStunDurationMs = Math.max(onHitStunDurationMs, Math.round(effect.value("durationMs")));
                onHitStunItemName = firstName(onHitStunItemName, itemName);
            }
            case DAMAGE_DEALT_HEAL_RATIO -> {
                damageDealtHealRatio += (float) effect.value("ratio");
                damageDealtHealItemName = firstName(damageDealtHealItemName, itemName);
            }
            case HEAL_ONCE_BELOW_HEALTH -> {
                healBelowThreshold = Math.max(healBelowThreshold, (float) effect.value("threshold"));
                healBelowPercent += (float) effect.value("healPercent");
                healBelowItemName = firstName(healBelowItemName, itemName);
            }
            case STUN_IMMUNITY_CHARGES -> {
                stunImmunityCharges += (int) Math.round(effect.value("charges"));
                stunImmunityItemName = firstName(stunImmunityItemName, itemName);
            }
            case EXTRA_ATTACK_CHANCE -> extraAttackChance += (float) effect.value("chance");
            case MANA_GAIN_MULTIPLIER -> manaGainMultiplier *= (float) effect.value("multiplier");
        }
    }

    private static String firstName(String current, String candidate) {
        return current != null ? current : candidate;
    }

    public HeldItemState copy() {
        var copy = new HeldItemState();
        copy.regenPercentPerSecond = regenPercentPerSecond;
        copy.regenItemName = regenItemName;
        copy.surviveLethalCharges = surviveLethalCharges;
        copy.surviveLethalItemName = surviveLethalItemName;
        copy.onHitStunChance = onHitStunChance;
        copy.onHitStunDurationMs = onHitStunDurationMs;
        copy.onHitStunItemName = onHitStunItemName;
        copy.damageDealtHealRatio = damageDealtHealRatio;
        copy.damageDealtHealItemName = damageDealtHealItemName;
        copy.healBelowThreshold = healBelowThreshold;
        copy.healBelowPercent = healBelowPercent;
        copy.healBelowItemName = healBelowItemName;
        copy.stunImmunityCharges = stunImmunityCharges;
        copy.stunImmunityItemName = stunImmunityItemName;
        copy.extraAttackChance = extraAttackChance;
        copy.manaGainMultiplier = manaGainMultiplier;
        copy.regenElapsedMs = regenElapsedMs;
        copy.surviveLethalUsed = surviveLethalUsed;
        copy.healBelowUsed = healBelowUsed;
        copy.stunImmunityUsed = stunImmunityUsed;
        copy.pendingProcs.addAll(pendingProcs);
        return copy;
    }

    public float extraAttackChance() {
        return extraAttackChance;
    }

    public float manaGainMultiplier() {
        return manaGainMultiplier;
    }

    public float onHitStunChance() {
        return onHitStunChance;
    }

    public long onHitStunDurationMs() {
        return onHitStunDurationMs;
    }

    public String onHitStunItemName() {
        return onHitStunItemName;
    }

    public float damageDealtHealRatio() {
        return damageDealtHealRatio;
    }

    public String damageDealtHealItemName() {
        return damageDealtHealItemName;
    }

    public String regenItemName() {
        return regenItemName;
    }

    public String healBelowItemName() {
        return healBelowItemName;
    }

    public int remainingSurviveLethalCharges() {
        return surviveLethalCharges - surviveLethalUsed;
    }

    public int remainingStunImmunityCharges() {
        return stunImmunityCharges - stunImmunityUsed;
    }

    public boolean tryConsumeSurviveLethal() {
        if (surviveLethalUsed >= surviveLethalCharges) {
            return false;
        }
        surviveLethalUsed++;
        pendingProcs.add(new Proc(surviveLethalItemName, 1));
        return true;
    }

    public boolean tryConsumeStunImmunity() {
        if (stunImmunityUsed >= stunImmunityCharges) {
            return false;
        }
        stunImmunityUsed++;
        pendingProcs.add(new Proc(stunImmunityItemName, 0));
        return true;
    }

    public int regenHealAmount(int maxHealth, long elapsedMs) {
        if (regenPercentPerSecond <= 0) {
            return 0;
        }
        regenElapsedMs += elapsedMs;
        var intervals = regenElapsedMs / REGEN_INTERVAL_MS;
        regenElapsedMs %= REGEN_INTERVAL_MS;
        return Math.round(maxHealth * regenPercentPerSecond / 100.0f * intervals);
    }

    public int takeHealBelowThreshold(int currentHealth, int maxHealth) {
        if (healBelowThreshold <= 0
                || healBelowUsed
                || currentHealth <= 0
                || currentHealth >= maxHealth * healBelowThreshold) {
            return 0;
        }
        healBelowUsed = true;
        return Math.max(1, Math.round(maxHealth * healBelowPercent / 100.0f));
    }

    public List<Proc> drainProcs() {
        if (pendingProcs.isEmpty()) {
            return List.of();
        }
        var procs = List.copyOf(pendingProcs);
        pendingProcs.clear();
        return procs;
    }
}
