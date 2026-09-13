package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.combat.AbilityCaster;
import net.lwenstrom.tft.backend.core.combat.CombatUtils;
import net.lwenstrom.tft.backend.core.combat.DamageResolver;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.combat.TargetSelector;
import net.lwenstrom.tft.backend.core.combat.UnitMover;
import net.lwenstrom.tft.backend.core.model.DotEffect;
import net.lwenstrom.tft.backend.core.model.GameState;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.random.DefaultRandomProvider;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.core.time.Clock;

@Slf4j
public class CombatSystem {

    private final TraitManager traitManager;
    private final Clock clock;
    private final TargetSelector targetSelector;
    private final UnitMover unitMover;
    private final AbilityCaster abilityCaster;
    private final RandomProvider randomProvider;
    private DamageResolver damageResolver;

    private Map<String, DamageEntry> damageLog = new HashMap<>();
    private List<GameState.CombatEvent> recentEvents = new ArrayList<>();

    public record DamageEntry(
            String unitName,
            String definitionId,
            String lineId,
            int starLevel,
            String ownerId,
            int damage,
            int damageTaken,
            int healing,
            int shielding) {}

    public CombatSystem(
            TraitManager traitManager,
            Clock clock,
            TargetSelector targetSelector,
            UnitMover unitMover,
            AbilityCaster abilityCaster) {
        this(
                traitManager,
                clock,
                targetSelector,
                unitMover,
                abilityCaster,
                new DefaultRandomProvider(),
                ElementalAffinityConfig.neutral());
    }

    public CombatSystem(
            TraitManager traitManager,
            Clock clock,
            TargetSelector targetSelector,
            UnitMover unitMover,
            AbilityCaster abilityCaster,
            RandomProvider randomProvider) {
        this(
                traitManager,
                clock,
                targetSelector,
                unitMover,
                abilityCaster,
                randomProvider,
                ElementalAffinityConfig.neutral());
    }

    public CombatSystem(
            TraitManager traitManager,
            Clock clock,
            TargetSelector targetSelector,
            UnitMover unitMover,
            AbilityCaster abilityCaster,
            RandomProvider randomProvider,
            ElementalAffinityConfig affinityConfig) {
        this.traitManager = traitManager;
        this.clock = clock;
        this.targetSelector = targetSelector;
        this.unitMover = unitMover;
        this.abilityCaster = abilityCaster;
        this.randomProvider = randomProvider;
        configureAffinity(affinityConfig);
    }

    public void configureAffinity(ElementalAffinityConfig affinityConfig) {
        this.damageResolver = new DamageResolver(affinityConfig);
        this.abilityCaster.setDamageResolver(this.damageResolver);
    }

    private void accumulateStats(
            String unitId,
            String unitName,
            String definitionId,
            String lineId,
            int starLevel,
            String ownerId,
            int damage,
            int damageTaken,
            int healing,
            int shielding) {
        damageLog.compute(
                unitId,
                (k, v) -> v == null
                        ? new DamageEntry(
                                unitName,
                                definitionId,
                                lineId,
                                starLevel,
                                ownerId,
                                damage,
                                damageTaken,
                                healing,
                                shielding)
                        : new DamageEntry(
                                unitName,
                                definitionId,
                                lineId,
                                starLevel,
                                ownerId,
                                v.damage() + damage,
                                v.damageTaken() + damageTaken,
                                v.healing() + healing,
                                v.shielding() + shielding));
    }

    private void accumulateDamage(GameUnit unit, int damage) {
        accumulateStats(
                unit.getId(),
                unit.getName(),
                unit.getDefinitionId(),
                unit.getLineId(),
                unit.getStarLevel(),
                unit.getOwnerId(),
                damage,
                0,
                0,
                0);
    }

    private void accumulateDamageTaken(GameUnit unit, int damageTaken) {
        accumulateStats(
                unit.getId(),
                unit.getName(),
                unit.getDefinitionId(),
                unit.getLineId(),
                unit.getStarLevel(),
                unit.getOwnerId(),
                0,
                damageTaken,
                0,
                0);
    }

    private void accumulateHealing(GameUnit unit, int healing) {
        accumulateStats(
                unit.getId(),
                unit.getName(),
                unit.getDefinitionId(),
                unit.getLineId(),
                unit.getStarLevel(),
                unit.getOwnerId(),
                0,
                0,
                healing,
                0);
    }

    private void accumulateShielding(GameUnit unit, int shielding) {
        accumulateStats(
                unit.getId(),
                unit.getName(),
                unit.getDefinitionId(),
                unit.getLineId(),
                unit.getStarLevel(),
                unit.getOwnerId(),
                0,
                0,
                0,
                shielding);
    }

    private int applyAndMeasureDamage(GameUnit target, Runnable damageAction) {
        var effectiveHealthBefore = Math.max(0, target.getCurrentHealth()) + Math.max(0, target.getShield());
        damageAction.run();
        var effectiveHealthAfter = Math.max(0, target.getCurrentHealth()) + Math.max(0, target.getShield());
        return Math.max(0, effectiveHealthBefore - effectiveHealthAfter);
    }

    public Map<String, DamageEntry> getDamageLog() {
        return new HashMap<>(damageLog);
    }

    public void clearDamageLog() {
        damageLog.clear();
        recentEvents.clear();
    }

    public void startCombat(java.util.Collection<Player> players) {
        clearDamageLog();

        var orderedPlayers = new ArrayList<Player>(players);

        if (orderedPlayers.isEmpty()) {
            return;
        }

        for (var player : players) {
            for (var unit : player.getBoardUnits()) {
                unit.savePlanningPosition();
            }
            traitManager.applyTraits(player.getBoardUnits());
        }

        if (orderedPlayers.size() > 1) {
            var p1 = orderedPlayers.get(0);
            p1.setCombatSide("TOP");
            for (var unit : p1.getBoardUnits()) {
                int newX = unit.getX();
                int newY = (Grid.PLAYER_ROWS - 1) - unit.getY();
                unit.setPosition(newX, newY);
                log.debug("CombatPos: {} (TOP) -> {},{}", unit.getName(), newX, newY);
            }

            var p2 = orderedPlayers.get(1);
            p2.setCombatSide("BOTTOM");
            for (var u : p2.getBoardUnits()) {
                int newY = Grid.PLAYER_ROWS + u.getY();
                u.setPosition(u.getX(), newY);
                log.debug("CombatPos: {} (BOT) -> {},{}", u.getName(), u.getX(), newY);
            }
        } else {
            var p1 = orderedPlayers.get(0);
            p1.setCombatSide("BOTTOM");
            for (var unit : p1.getBoardUnits()) {
                int newY = Grid.PLAYER_ROWS + unit.getY();
                unit.setPosition(unit.getX(), newY);
            }
        }
    }

    public void endCombat(java.util.Collection<Player> players) {
        log.debug("Restoring units for {} players.", players.size());
        for (var player : players) {
            player.setCombatSide(null);
            for (var unit : player.getBoardUnits()) {
                unit.restorePlanningPosition();
            }
        }
    }

    public CombatResult simulateTick(List<Player> participants) {
        return simulateTick(participants, clock.currentTimeMillis());
    }

    CombatResult simulateTick(List<Player> participants, long currentTime) {
        var allUnits = new ArrayList<GameUnit>();
        participants.forEach(p -> allUnits.addAll(p.getBoardUnits()));
        recentEvents.clear();

        if (allUnits.isEmpty()) {
            log.warn("allUnits is empty in simulateTick");
        }

        processDotEffects(allUnits, currentTime);

        var snapshot = List.copyOf(allUnits);
        for (var unit : snapshot) {
            if (unit.getCurrentHealth() <= 0) {
                continue;
            }

            // Update temporary buffs
            if (unit instanceof AbstractGameUnit agu) {
                agu.updateBuffs(currentTime);
            }

            // Handle stunned units - skip their turn and decrement stun counter
            if (unit.getStunSecondsRemaining() > 0) {
                float remaining = unit.getStunSecondsRemaining() - (GameConstants.TICK_RATE_MS / 1000.0f);
                unit.setStunSecondsRemaining(Math.max(0, remaining));
                continue;
            }

            var attackReady = currentTime >= unit.getNextAttackTime();
            if (attackReady) {
                unit.setActiveAbility(null);
            } else if (unit.getActiveAbility() != null) {
                continue;
            }

            if (unit.getMaxMana() > 0 && unit.getMana() >= unit.getMaxMana()) {
                if (attackReady) {
                    var cast = abilityCaster.castAbility(
                            unit,
                            allUnits,
                            targetSelector,
                            new AbilityCaster.CombatStatCallback() {
                                @Override
                                public void onDamageResolved(
                                        String unitId, String unitName, String targetId, int damage, int actualDamage) {
                                    accumulateDamage(unit, actualDamage);
                                    allUnits.stream()
                                            .filter(target -> target.getId().equals(targetId))
                                            .findFirst()
                                            .ifPresent(target -> accumulateDamageTaken(target, actualDamage));
                                    recentEvents.add(new GameState.CombatEvent(
                                            currentTime,
                                            "SKILL",
                                            unitId,
                                            targetId,
                                            actualDamage,
                                            unit.getAbility().name()));
                                }

                                @Override
                                public void onDirectHit(GameUnit target) {
                                    grantDirectHitMana(target);
                                }

                                @Override
                                public void onHealing(String unitId, String unitName, String targetId, int healing) {
                                    accumulateHealing(unit, healing);
                                    recentEvents.add(new GameState.CombatEvent(
                                            currentTime,
                                            "HEAL",
                                            unitId,
                                            targetId,
                                            healing,
                                            unit.getAbility().name()));
                                }

                                @Override
                                public void onShielding(
                                        String unitId, String unitName, String targetId, int shielding) {
                                    accumulateShielding(unit, shielding);
                                    recentEvents.add(new GameState.CombatEvent(
                                            currentTime,
                                            "SHIELD",
                                            unitId,
                                            targetId,
                                            shielding,
                                            unit.getAbility().name()));
                                }

                                @Override
                                public void onSkill(String unitId, String unitName, String targetId, int value) {
                                    recentEvents.add(new GameState.CombatEvent(
                                            currentTime,
                                            "SKILL",
                                            unitId,
                                            targetId,
                                            value,
                                            unit.getAbility().name()));
                                }
                            },
                            currentTime);
                    if (cast) {
                        unit.setMana(0);
                        unit.setNextAttackTime(currentTime + GameConstants.ABILITY_COOLDOWN_MS);
                        unit.setNextMoveTime(
                                Math.max(unit.getNextMoveTime(), currentTime + GameConstants.ABILITY_COOLDOWN_MS));
                        continue;
                    }
                }
                if (moveIntoAbilityRange(unit, allUnits, currentTime)) {
                    continue;
                }
            }

            var target = targetSelector.findTarget(unit, allUnits);
            if (target != null) {
                var distance = CombatUtils.getDistance(unit, target);
                if (distance <= unit.getRange()) {
                    if (!attackReady) {
                        continue;
                    }
                    // Apply ATK buff multiplier to damage
                    int baseDamage = unit.getAttackDamage();
                    float multiplier = unit.getAtkBuff();

                    // Apply Low HP Damage Bonus (Beast Pirates)
                    if (unit.getLowHpDamageBonus() > 0
                            && (float) unit.getCurrentHealth() / unit.getMaxHealth()
                                    <= unit.getLowHpDamageThreshold()) {
                        multiplier += unit.getLowHpDamageBonus();
                    }

                    // Apply Distance Damage (Sniper)
                    if (unit.getDamagePerCell() > 0) {
                        multiplier += (distance * unit.getDamagePerCell());
                    }

                    int effectiveDamage = (int) (baseDamage * multiplier);
                    effectiveDamage = damageResolver.apply(unit, target, effectiveDamage);
                    log.debug("{} attacks {} for {}", unit.getName(), target.getName(), effectiveDamage);

                    // Handle Revive (Big Mom Pirates)
                    var attackDamage = effectiveDamage;
                    var actualDamage = applyAndMeasureDamage(target, () -> target.takeDamage(attackDamage));
                    grantDirectHitMana(target);
                    applyOnHitDot(unit, target, currentTime);
                    if (target.getCurrentHealth() <= 0) {
                        if (target.hasRevive() && !target.isReviveUsed()) {
                            target.setReviveUsed(true);
                            target.setCurrentHealth((int) (target.getMaxHealth() * 0.4)); // Revive with 40% HP
                            log.info("{} revives!", target.getName());
                        } else {
                            // Trigger Whitebeard Pirates shield on death
                            triggerShieldOnDeath(target, allUnits, currentTime);
                            AugmentManager.applyTeamAttackDamageOnKill(unit, allUnits);
                            recentEvents.add(new GameState.CombatEvent(
                                    currentTime, "DEATH", unit.getId(), target.getId(), 0, null));
                        }
                    }

                    accumulateDamage(unit, actualDamage);
                    accumulateDamageTaken(target, actualDamage);
                    recentEvents.add(new GameState.CombatEvent(
                            currentTime, "DAMAGE", unit.getId(), target.getId(), actualDamage, null));

                    // Lifesteal (Big Mom Pirates)
                    if (unit.getLifesteal() > 0) {
                        int heal = (int) (effectiveDamage * unit.getLifesteal());
                        // Apply Doctor heal amplification
                        heal = (int) (heal * unit.getHealAmplification());

                        int previousHealth = unit.getCurrentHealth();
                        unit.setCurrentHealth(Math.min(unit.getMaxHealth(), unit.getCurrentHealth() + heal));
                        int effectiveHeal = unit.getCurrentHealth() - previousHealth;
                        if (effectiveHeal > 0) {
                            accumulateHealing(unit, effectiveHeal);
                            recentEvents.add(new GameState.CombatEvent(
                                    currentTime, "HEAL", unit.getId(), unit.getId(), effectiveHeal, null));
                        }
                    }

                    // Mana Gain Multiplier (Mage)
                    int manaGain = (int) (GameConstants.MANA_PER_HIT * unit.getManaGainMultiplier());
                    unit.gainMana(manaGain);

                    // Speed buff + Low HP AS (Berserker)
                    float as = Math.max(0.1f, unit.getAttackSpeed());
                    float spdMultiplier = unit.getSpdBuff();
                    if (unit.getLowHpAsBonus() > 0
                            && (float) unit.getCurrentHealth() / unit.getMaxHealth() <= unit.getLowHpAsThreshold()) {
                        spdMultiplier += unit.getLowHpAsBonus();
                    }

                    float effectiveAs = as * spdMultiplier;
                    long cooldownMs = (long) (1000 / effectiveAs);

                    // Extra Attack Chance (Swordsman)
                    if (randomProvider.nextDouble() < unit.getExtraAttackChance()) {
                        log.debug("{} triggers extra attack!", unit.getName());
                        // For simplicity, we just reduce next attack time significantly
                        unit.setNextAttackTime(currentTime + (cooldownMs / 4));
                    } else {
                        unit.setNextAttackTime(currentTime + cooldownMs);
                    }
                } else {
                    unitMover.moveTowards(unit, target, allUnits, currentTime);
                }
            }
        }

        long playersWithUnits = participants.stream()
                .filter(p -> p.getBoardUnits().stream().anyMatch(u -> u.getCurrentHealth() > 0))
                .count();

        if (playersWithUnits <= 1) {
            Player winner = participants.stream()
                    .filter(p -> p.getBoardUnits().stream().anyMatch(u -> u.getCurrentHealth() > 0))
                    .findFirst()
                    .orElse(null);

            return new CombatResult(
                    true, winner != null ? winner.getId() : null, getDamageLog(), new ArrayList<>(recentEvents));
        }

        return new CombatResult(false, null, Map.of(), new ArrayList<>(recentEvents));
    }

    private void grantDirectHitMana(GameUnit target) {
        if (target.getMaxMana() <= 0) {
            return;
        }

        var manaGain = Math.max(1, Math.round(target.getMaxMana() * GameConstants.MANA_ON_DIRECT_HIT_PERCENT));
        target.gainMana(manaGain);
    }

    private boolean moveIntoAbilityRange(GameUnit unit, List<GameUnit> allUnits, long currentTime) {
        var ability = unit.getAbility();
        if (ability == null) {
            return false;
        }
        var targetsEnemy =
                switch (ability.type()) {
                    case DAMAGE, STUN, DEBUFF_DEF -> true;
                    default -> false;
                };
        if (!targetsEnemy) {
            return false;
        }

        var target = targetSelector.findTarget(unit, allUnits);
        var abilityRange = ability.getRangeForLevel(unit.getStarLevel());
        if (target == null || CombatUtils.getDistance(unit, target) <= abilityRange) {
            return false;
        }

        var previousX = unit.getX();
        var previousY = unit.getY();
        unitMover.moveTowards(unit, target, allUnits, abilityRange, currentTime);
        return unit.getX() != previousX || unit.getY() != previousY;
    }

    private void processDotEffects(List<GameUnit> allUnits, long currentTime) {
        for (var target : allUnits) {
            if (target.getCurrentHealth() <= 0 || target.getDotEffects().isEmpty()) {
                continue;
            }

            Iterator<net.lwenstrom.tft.backend.core.model.DotEffect> iterator =
                    target.getDotEffects().iterator();
            var effectsToAdd = new ArrayList<net.lwenstrom.tft.backend.core.model.DotEffect>();
            while (iterator.hasNext()) {
                var effect = iterator.next();
                if (currentTime >= effect.expiresAt()) {
                    iterator.remove();
                    continue;
                }
                if (currentTime < effect.nextTickTime()) {
                    continue;
                }

                var source = allUnits.stream()
                        .filter(unit -> unit.getId().equals(effect.sourceId()))
                        .findFirst()
                        .orElse(null);
                var damage = source == null
                        ? effect.damagePerTick()
                        : damageResolver.apply(source, target, effect.damagePerTick());
                var actualDamage = applyAndMeasureDamage(target, () -> target.takeAbilityDamage(damage));
                accumulateStats(
                        effect.sourceId(),
                        effect.sourceName(),
                        effect.sourceDefinitionId(),
                        effect.sourceLineId(),
                        effect.sourceStarLevel(),
                        effect.sourceOwnerId(),
                        actualDamage,
                        0,
                        0,
                        0);
                accumulateDamageTaken(target, actualDamage);
                recentEvents.add(new GameState.CombatEvent(
                        currentTime, "DAMAGE", effect.sourceId(), target.getId(), actualDamage, effect.skillName()));

                iterator.remove();
                if (target.getCurrentHealth() > 0 && currentTime + effect.tickIntervalMs() < effect.expiresAt()) {
                    effectsToAdd.add(effect.withNextTickTime(currentTime + effect.tickIntervalMs()));
                }

                if (target.getCurrentHealth() <= 0) {
                    if (target.hasRevive() && !target.isReviveUsed()) {
                        target.setReviveUsed(true);
                        target.setCurrentHealth((int) (target.getMaxHealth() * 0.4));
                    } else {
                        triggerShieldOnDeath(target, allUnits, currentTime);
                        recentEvents.add(new GameState.CombatEvent(
                                currentTime, "DEATH", effect.sourceId(), target.getId(), 0, null));
                    }
                    iterator.forEachRemaining(ignored -> {});
                    break;
                }
            }
            target.getDotEffects().addAll(effectsToAdd);
        }
    }

    private void applyOnHitDot(GameUnit source, GameUnit target, long currentTime) {
        float damageRatio = source.getOnHitDotDamageRatio();
        long durationMs = source.getOnHitDotDurationMs();
        long tickIntervalMs = source.getOnHitDotTickIntervalMs();
        if (damageRatio <= 0 || durationMs <= 0 || tickIntervalMs <= 0 || target.getCurrentHealth() <= 0) {
            return;
        }

        int damagePerTick = Math.max(1, Math.round(source.getAttackDamage() * damageRatio));
        String skillName = "Poison";
        target.getDotEffects()
                .removeIf(effect -> effect.sourceId().equals(source.getId()) && skillName.equals(effect.skillName()));
        target.addDotEffect(new DotEffect(
                source.getId(),
                source.getName(),
                source.getDefinitionId(),
                source.getLineId(),
                source.getStarLevel(),
                source.getOwnerId(),
                damagePerTick,
                currentTime + tickIntervalMs,
                currentTime + durationMs + 1,
                tickIntervalMs,
                skillName));
    }

    private void triggerShieldOnDeath(GameUnit deadUnit, List<GameUnit> allUnits, long currentTime) {
        allUnits.stream()
                .filter(u -> u.getCurrentHealth() > 0 && CombatUtils.isAlly(deadUnit, u))
                .filter(GameUnit::hasShieldOnDeath)
                .forEach(u -> {
                    // grant 15% of dead unit's max health as shield
                    int shieldAmount = (int) (deadUnit.getMaxHealth() * 0.15f);
                    var effectiveAmount = u.addShield(shieldAmount);
                    if (effectiveAmount > 0) {
                        accumulateShielding(u, effectiveAmount);
                        recentEvents.add(new GameState.CombatEvent(
                                currentTime, "SHIELD", u.getId(), u.getId(), effectiveAmount, null));
                        log.debug(
                                "{} receives {} shield from {}'s death",
                                u.getName(),
                                effectiveAmount,
                                deadUnit.getName());
                    }
                });
    }

    public record CombatResult(
            boolean ended, String winnerId, Map<String, DamageEntry> damageLog, List<GameState.CombatEvent> events) {}
}
