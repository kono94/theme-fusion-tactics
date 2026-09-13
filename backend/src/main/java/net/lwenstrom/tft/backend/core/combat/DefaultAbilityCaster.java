package net.lwenstrom.tft.backend.core.combat;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.engine.AbstractGameUnit;
import net.lwenstrom.tft.backend.core.engine.AugmentManager;
import net.lwenstrom.tft.backend.core.engine.Grid;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.ConditionalModifier;
import net.lwenstrom.tft.backend.core.model.DotEffect;
import net.lwenstrom.tft.backend.core.model.DotModifier;
import net.lwenstrom.tft.backend.core.model.ExecuteModifier;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.KnockbackModifier;
import net.lwenstrom.tft.backend.core.model.LifestealModifier;
import net.lwenstrom.tft.backend.core.model.ScalingModifier;
import net.lwenstrom.tft.backend.core.model.StunModifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DefaultAbilityCaster implements AbilityCaster {
    private static final float[] STUN_DURATION_MULTIPLIERS = {1.0f, 0.8f, 0.6f};

    private DamageResolver damageResolver = new DamageResolver();

    @Override
    public void setDamageResolver(DamageResolver damageResolver) {
        this.damageResolver = damageResolver == null ? new DamageResolver() : damageResolver;
    }

    @Override
    public boolean castAbility(GameUnit source, List<GameUnit> allUnits, TargetSelector targetSelector) {
        return castAbility(source, allUnits, targetSelector, new CombatStatCallback() {}, System.currentTimeMillis());
    }

    @Override
    public boolean castAbility(
            GameUnit source, List<GameUnit> allUnits, TargetSelector targetSelector, CombatStatCallback callback) {
        return castAbility(source, allUnits, targetSelector, callback, System.currentTimeMillis());
    }

    @Override
    public boolean castAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            TargetSelector targetSelector,
            CombatStatCallback callback,
            long currentTime) {
        AbilityDefinition ability = source.getAbility();
        if (ability == null) {
            return false;
        }
        var targets =
                switch (ability.type()) {
                    case DAMAGE, STUN, DEBUFF_DEF -> resolveEnemyTargets(source, allUnits, targetSelector, ability);
                    default -> List.<GameUnit>of(source);
                };
        if (targets.isEmpty()) {
            return false;
        }

        source.setActiveAbility(ability.name());

        var abilityType = ability.type();
        var value = ability.getValueForLevel(source.getStarLevel());

        switch (abilityType) {
            case DAMAGE -> castDamageAbility(source, allUnits, targets, ability, value, callback, currentTime);
            case STUN ->
                castStunAbility(
                        source,
                        allUnits,
                        targets,
                        ability,
                        ability.getStunDurationForLevel(source.getStarLevel()),
                        callback,
                        currentTime);
            case HEAL -> castHealAbility(source, allUnits, ability, value, callback);
            case BUFF_ATK -> castBuffAtkAbility(source, allUnits, ability, value, callback, currentTime);
            case BUFF_SPD -> castBuffSpdAbility(source, allUnits, ability, value, callback);
            case BUFF_DEF -> castBuffDefAbility(source, allUnits, ability, value, callback);
            case DEBUFF_DEF -> castDebuffDefAbility(source, targets, ability, value, callback);
            case SHIELD -> castShieldAbility(source, allUnits, ability, value, callback);
        }
        return true;
    }

    private void castDamageAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            List<GameUnit> targets,
            AbilityDefinition ability,
            int damage,
            CombatStatCallback callback,
            long currentTime) {
        var totalDamageDealt = 0;
        for (var target : targets) {
            var scaledDamage = (int)
                    (applyScalingModifiers(source, target, ability, damage) * source.getAbilityDamageMultiplier());
            var finalDamage = applyExecuteModifier(source, target, ability, scaledDamage);
            var effectiveDamage = damageResolver.apply(source, target, finalDamage);
            var effectiveHealthBefore = effectiveHealth(target);
            target.takeAbilityDamage(effectiveDamage);
            var actualDamage = Math.max(0, effectiveHealthBefore - effectiveHealth(target));
            if (isFinalKill(target)) {
                AugmentManager.applyTeamAttackDamageOnKill(source, allUnits);
            }
            applyStunAndKnockbackModifiers(source, target, ability, allUnits, currentTime);
            applyDotModifiers(source, target, ability, currentTime);
            totalDamageDealt += effectiveDamage;
            callback.onDamageResolved(source.getId(), source.getName(), target.getId(), effectiveDamage, actualDamage);
            callback.onDirectHit(target);
        }
        applyLifestealModifier(source, ability, totalDamageDealt, callback);
    }

    private boolean isFinalKill(GameUnit target) {
        return target.getCurrentHealth() <= 0 && (!target.hasRevive() || target.isReviveUsed());
    }

    private void castStunAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            List<GameUnit> targets,
            AbilityDefinition ability,
            float stunSeconds,
            CombatStatCallback callback,
            long currentTime) {
        targets.forEach(target -> {
            applyStun(target, stunSeconds, currentTime);
            callback.onSkill(source.getId(), source.getName(), target.getId(), 0);
        });
    }

    private void castHealAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            AbilityDefinition ability,
            int healAmount,
            CombatStatCallback callback) {
        // Apply Doctor heal amplification
        int amplifiedHeal = (int) (healAmount * source.getHealAmplification());
        final int finalHeal = amplifiedHeal;

        // HEAL targets allies board-wide (including self)
        switch (ability.pattern()) {
            case SINGLE -> {
                // Heal lowest-health ally on board
                GameUnit target = findLowestHealthAlly(allUnits, source);
                if (target != null) {
                    var effectiveHeal = healUnit(target, finalHeal);
                    if (effectiveHeal > 0) {
                        callback.onHealing(source.getId(), source.getName(), target.getId(), effectiveHeal);
                    } else {
                        callback.onSkill(source.getId(), source.getName(), target.getId(), 0);
                    }
                }
            }
            case SURROUND, LINE -> {
                // Heal all allies on board
                var targets = allUnits.stream()
                        .filter(u -> u.getCurrentHealth() > 0)
                        .filter(u -> CombatUtils.isAlly(source, u))
                        .toList();
                var hasPositiveEffect = false;
                for (var target : targets) {
                    var effectiveHeal = healUnit(target, finalHeal);
                    if (effectiveHeal > 0) {
                        hasPositiveEffect = true;
                        callback.onHealing(source.getId(), source.getName(), target.getId(), effectiveHeal);
                    }
                }
                if (!hasPositiveEffect) {
                    callback.onSkill(source.getId(), source.getName(), source.getId(), 0);
                }
            }
            default -> {
                // Default: heal self
                var effectiveHeal = healUnit(source, finalHeal);
                if (effectiveHeal > 0) {
                    callback.onHealing(source.getId(), source.getName(), source.getId(), effectiveHeal);
                } else {
                    callback.onSkill(source.getId(), source.getName(), source.getId(), 0);
                }
            }
        }
    }

    private void castBuffAtkAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            AbilityDefinition ability,
            int buffPercent,
            CombatStatCallback callback,
            long currentTime) {
        // Buff all allies' ATK board-wide
        float multiplier = 1.0f + (buffPercent / 100.0f);
        allUnits.stream()
                .filter(u -> u.getCurrentHealth() > 0)
                .filter(u -> CombatUtils.isAlly(source, u))
                .forEach(u -> {
                    u.setAtkBuff(u.getAtkBuff() * multiplier);
                    callback.onSkill(source.getId(), source.getName(), u.getId(), 0);
                });

        // Musician check
        if (source.getAsOnCast() > 0) {
            float musAs = source.getAsOnCast();
            int duration = source.getAsOnCastDuration();
            allUnits.stream()
                    .filter(u -> u.getCurrentHealth() > 0)
                    .filter(u -> CombatUtils.isAlly(source, u))
                    .forEach(u -> {
                        if (u instanceof AbstractGameUnit agu) {
                            agu.applyTemporaryAsBuff(musAs, duration, currentTime);
                        }
                    });
            log.info("Musician {} buffs allies with +{} AS for {}s", source.getName(), musAs, duration);
        }
    }

    private void castBuffSpdAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            AbilityDefinition ability,
            int buffPercent,
            CombatStatCallback callback) {
        // Buff all allies' attack speed board-wide
        float multiplier = 1.0f + (buffPercent / 100.0f);
        allUnits.stream()
                .filter(u -> u.getCurrentHealth() > 0)
                .filter(u -> CombatUtils.isAlly(source, u))
                .forEach(u -> {
                    u.setSpdBuff(u.getSpdBuff() * multiplier);
                    callback.onSkill(source.getId(), source.getName(), u.getId(), 0);
                });
    }

    private void castShieldAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            AbilityDefinition ability,
            int shieldAmount,
            CombatStatCallback callback) {
        switch (ability.pattern()) {
            case SINGLE -> {
                var effectiveAmount = source.addShield(shieldAmount);
                if (effectiveAmount > 0) {
                    callback.onShielding(source.getId(), source.getName(), source.getId(), effectiveAmount);
                } else {
                    callback.onSkill(source.getId(), source.getName(), source.getId(), 0);
                }
            }
            case SURROUND, LINE -> {
                var targets = allUnits.stream()
                        .filter(u -> u.getCurrentHealth() > 0)
                        .filter(u -> CombatUtils.isAlly(source, u))
                        .toList();
                var hasPositiveEffect = false;
                for (var target : targets) {
                    var effectiveAmount = target.addShield(shieldAmount);
                    if (effectiveAmount > 0) {
                        hasPositiveEffect = true;
                        callback.onShielding(source.getId(), source.getName(), target.getId(), effectiveAmount);
                    }
                }
                if (!hasPositiveEffect) {
                    callback.onSkill(source.getId(), source.getName(), source.getId(), 0);
                }
            }
        }
    }

    private void castBuffDefAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            AbilityDefinition ability,
            int defense,
            CombatStatCallback callback) {
        var targets = ability.pattern() == net.lwenstrom.tft.backend.core.model.AbilityPattern.SINGLE
                ? List.of(source)
                : allUnits.stream()
                        .filter(u -> u.getCurrentHealth() > 0)
                        .filter(u -> CombatUtils.isAlly(source, u))
                        .toList();
        targets.forEach(unit -> {
            unit.applyTemporaryDefenseBuff(defense);
            callback.onSkill(source.getId(), source.getName(), unit.getId(), defense);
        });
    }

    private void castDebuffDefAbility(
            GameUnit source,
            List<GameUnit> targets,
            AbilityDefinition ability,
            int defense,
            CombatStatCallback callback) {
        targets.forEach(unit -> {
            unit.applyTemporaryDefenseShred(defense);
            callback.onSkill(source.getId(), source.getName(), unit.getId(), defense);
        });
    }

    private List<GameUnit> resolveEnemyTargets(
            GameUnit source, List<GameUnit> allUnits, TargetSelector selector, AbilityDefinition ability) {
        var target = selector.findTarget(source, allUnits);
        if (target == null) {
            return List.of();
        }
        var range = ability.getRangeForLevel(source.getStarLevel());
        var lineCells = ability.pattern() == net.lwenstrom.tft.backend.core.model.AbilityPattern.LINE
                ? getAimedLineCells(source, target, range)
                : Set.<LineCell>of();
        return allUnits.stream()
                .filter(unit -> unit.getCurrentHealth() > 0 && CombatUtils.isEnemy(source, unit))
                .filter(unit -> switch (ability.pattern()) {
                    case SINGLE -> unit == target && CombatUtils.getDistance(source, unit) <= range;
                    case LINE -> lineCells.contains(new LineCell(unit.getX(), unit.getY()));
                    case SURROUND -> CombatUtils.getDistance(source, unit) <= range;
                })
                .filter(unit -> ability.type() != net.lwenstrom.tft.backend.core.model.AbilityType.DAMAGE
                        || checkConditionalModifiers(source, unit, ability))
                .sorted(Comparator.comparingDouble((GameUnit unit) -> CombatUtils.getDistance(source, unit))
                        .thenComparingInt(GameUnit::getX)
                        .thenComparingInt(GameUnit::getY)
                        .thenComparing(GameUnit::getDefinitionId))
                .limit(ability.getTargetLimitForLevel(source.getStarLevel()))
                .toList();
    }

    private Set<LineCell> getAimedLineCells(GameUnit source, GameUnit target, int range) {
        var cells = new HashSet<LineCell>();
        int distance = (int) CombatUtils.getDistance(source, target);
        if (distance <= 0 || range <= 0) {
            return cells;
        }

        int dx = target.getX() - source.getX();
        int dy = target.getY() - source.getY();
        for (int i = 1; i <= range; i++) {
            int x = source.getX() + (int) Math.round((double) dx * i / distance);
            int y = source.getY() + (int) Math.round((double) dy * i / distance);
            cells.add(new LineCell(x, y));
        }
        return cells;
    }

    private record LineCell(int x, int y) {}

    private GameUnit findLowestHealthAlly(List<GameUnit> allUnits, GameUnit source) {
        return allUnits.stream()
                .filter(u -> u.getCurrentHealth() > 0)
                .filter(u -> CombatUtils.isAlly(source, u))
                .min((a, b) -> Float.compare(
                        (float) a.getCurrentHealth() / a.getMaxHealth(),
                        (float) b.getCurrentHealth() / b.getMaxHealth()))
                .orElse(null);
    }

    private int healUnit(GameUnit unit, int amount) {
        int previousHealth = unit.getCurrentHealth();
        int newHealth = Math.min(unit.getMaxHealth(), unit.getCurrentHealth() + amount);
        unit.setCurrentHealth(newHealth);
        return newHealth - previousHealth;
    }

    // Check all conditional modifiers. Returns false if any condition is not met.
    private boolean checkConditionalModifiers(GameUnit source, GameUnit target, AbilityDefinition ability) {
        for (var modifier : ability.modifiers()) {
            if (modifier instanceof ConditionalModifier conditionalModifier) {
                if (!conditionalModifier.isMet(source, target, source.getStarLevel())) {
                    return false;
                }
            }
        }
        return true;
    }

    // Apply scaling modifiers to the base damage/heal value.
    private int applyScalingModifiers(GameUnit source, GameUnit target, AbilityDefinition ability, int baseValue) {
        var scaledValue = (float) baseValue;

        for (var modifier : ability.modifiers()) {
            if (modifier instanceof ScalingModifier scalingModifier) {
                var multiplier = scalingModifier.calculateMultiplier(source, target, source.getStarLevel());
                scaledValue *= multiplier;
            }
        }

        return (int) scaledValue;
    }

    // Apply execute modifier bonus damage if target is below HP threshold.
    private int applyExecuteModifier(GameUnit source, GameUnit target, AbilityDefinition ability, int baseDamage) {
        var totalDamage = baseDamage;

        for (var modifier : ability.modifiers()) {
            if (modifier instanceof ExecuteModifier executeModifier) {
                var bonusDamage = executeModifier.calculateBonusDamage(target, baseDamage, source.getStarLevel());
                totalDamage += bonusDamage;
            }
        }

        return totalDamage;
    }

    // Apply lifesteal modifier healing to the caster.
    private void applyLifestealModifier(
            GameUnit source, AbilityDefinition ability, int damageDealt, CombatStatCallback callback) {
        for (var modifier : ability.modifiers()) {
            if (modifier instanceof LifestealModifier lifestealModifier) {
                var healAmount = lifestealModifier.calculateHealing(damageDealt, source.getStarLevel());
                if (healAmount > 0) {
                    var effectiveHeal = healUnit(source, healAmount);
                    if (effectiveHeal > 0) {
                        callback.onHealing(source.getId(), source.getName(), source.getId(), effectiveHeal);
                    }
                }
            }
        }
    }

    private void applyStunAndKnockbackModifiers(
            GameUnit source, GameUnit target, AbilityDefinition ability, List<GameUnit> allUnits, long currentTime) {
        if (target == null) return;
        int starLevel = source.getStarLevel();

        for (var modifier : ability.modifiers()) {
            if (modifier instanceof StunModifier stunModifier) {
                int seconds = stunModifier.getStunSeconds(starLevel);
                applyStun(target, seconds, currentTime);
            } else if (modifier instanceof KnockbackModifier knockbackModifier) {
                int cells = knockbackModifier.getCells(starLevel);
                applyKnockback(source, target, cells, allUnits);
            }
        }
    }

    private void applyStun(GameUnit target, float stunSeconds, long currentTime) {
        if (stunSeconds <= 0) {
            return;
        }

        var recentStunCount = target.getRecentStunCount();
        var lastStunAppliedAt = target.getLastStunAppliedAt();
        if (recentStunCount == 0
                || currentTime < lastStunAppliedAt
                || currentTime - lastStunAppliedAt >= GameConstants.STUN_DIMINISHING_RETURNS_RESET_MS) {
            recentStunCount = 0;
        }

        var multiplier = STUN_DURATION_MULTIPLIERS[Math.min(recentStunCount, STUN_DURATION_MULTIPLIERS.length - 1)];
        var diminishedDuration =
                Math.min(stunSeconds, Math.max(GameConstants.MIN_DIMINISHED_STUN_SECONDS, stunSeconds * multiplier));
        target.setStunSecondsRemaining(Math.max(target.getStunSecondsRemaining(), diminishedDuration));
        target.setRecentStunCount(Math.min(recentStunCount + 1, STUN_DURATION_MULTIPLIERS.length));
        target.setLastStunAppliedAt(currentTime);
    }

    private void applyDotModifiers(GameUnit source, GameUnit target, AbilityDefinition ability, long currentTime) {
        if (target == null) return;
        int starLevel = source.getStarLevel();

        for (var modifier : ability.modifiers()) {
            if (modifier instanceof DotModifier dotModifier) {
                int damagePerTick = dotModifier.getDamagePerTick(starLevel);
                int durationSeconds = dotModifier.getDurationSeconds(starLevel);
                int tickIntervalMs = dotModifier.getTickIntervalMs(starLevel);
                if (damagePerTick <= 0 || durationSeconds <= 0 || tickIntervalMs <= 0) {
                    continue;
                }
                target.addDotEffect(new DotEffect(
                        source.getId(),
                        source.getName(),
                        source.getDefinitionId(),
                        source.getLineId(),
                        source.getStarLevel(),
                        source.getOwnerId(),
                        damagePerTick,
                        currentTime + tickIntervalMs,
                        currentTime + durationSeconds * 1000L,
                        tickIntervalMs,
                        dotModifier.dotType().name()));
            }
        }
    }

    private int effectiveHealth(GameUnit unit) {
        return Math.max(0, unit.getCurrentHealth()) + Math.max(0, unit.getShield());
    }

    private void applyKnockback(GameUnit source, GameUnit target, int cells, List<GameUnit> allUnits) {
        if (target == null || cells <= 0) return;
        int dx = Integer.compare(target.getX(), source.getX());
        int dy = Integer.compare(target.getY(), source.getY());
        if (dx == 0 && dy == 0) return;

        int newX = target.getX();
        int newY = target.getY();
        for (int step = 0; step < cells; step++) {
            int candidateX = newX + dx;
            int candidateY = newY + dy;
            if (!Grid.isValidCombatPosition(candidateX, candidateY)
                    || isOccupiedCombatPosition(candidateX, candidateY, target, allUnits)) {
                break;
            }

            newX = candidateX;
            newY = candidateY;
        }
        target.setPosition(newX, newY);
    }

    private boolean isOccupiedCombatPosition(int x, int y, GameUnit target, List<GameUnit> allUnits) {
        return allUnits.stream()
                .filter(unit -> unit != target && unit.getCurrentHealth() > 0)
                .anyMatch(unit -> unit.getX() == x && unit.getY() == y);
    }
}
