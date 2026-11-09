package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.combat.AbilityCaster;
import net.lwenstrom.tft.backend.core.combat.CombatUtils;
import net.lwenstrom.tft.backend.core.combat.DamageResolver;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.combat.FieldConditionTracker;
import net.lwenstrom.tft.backend.core.combat.StunRules;
import net.lwenstrom.tft.backend.core.combat.TargetSelector;
import net.lwenstrom.tft.backend.core.combat.UnitMover;
import net.lwenstrom.tft.backend.core.model.CombatModifiers;
import net.lwenstrom.tft.backend.core.model.DotEffect;
import net.lwenstrom.tft.backend.core.model.FieldConditionDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionView;
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
    private static final int EXPLOSION_RADIUS = 1;
    private static final int MAX_DEATH_SETTLE_PASSES = 16;
    private static final int DEFAULT_REVIVE_HEALTH_PERCENT = 40;
    private static final String ITEM_EVENT = "ITEM";
    private static final String FIELD_EVENT = "FIELD";
    private static final String FIELD_DAMAGE_EVENT = "FIELD_DAMAGE";

    private DamageResolver damageResolver;

    private Map<String, DamageEntry> damageLog = new HashMap<>();
    private List<GameState.CombatEvent> recentEvents = new ArrayList<>();
    private MatchRuleDeathEffects deathEffects = MatchRuleDeathEffects.NONE;
    private final Set<String> settledDeaths = new HashSet<>();
    private final FieldConditionTracker fieldConditions = new FieldConditionTracker();
    private Map<String, FieldConditionDefinition> fieldConditionDefinitions = Map.of();

    public record RoundFieldCondition(FieldConditionDefinition condition, int durationSeconds) {}

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
        this.damageResolver = new DamageResolver(affinityConfig, fieldConditions);
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
        settledDeaths.clear();
    }

    public void configureDeathEffects(MatchRuleDeathEffects effects) {
        this.deathEffects = effects == null ? MatchRuleDeathEffects.NONE : effects;
    }

    public void configureFieldConditions(Collection<FieldConditionDefinition> definitions) {
        var byId = new LinkedHashMap<String, FieldConditionDefinition>();
        if (definitions != null) {
            definitions.forEach(definition -> byId.put(definition.id(), definition));
        }
        fieldConditionDefinitions = Map.copyOf(byId);
        fieldConditions.reset();
    }

    public void resetFieldConditions() {
        fieldConditions.reset();
    }

    public void beginFieldConditions(List<Player> participants, RoundFieldCondition roundCondition) {
        beginFieldConditions(participants, roundCondition, clock.currentTimeMillis());
    }

    // The round condition starts first so a unit start setter, being newer, overrides it.
    void beginFieldConditions(List<Player> participants, RoundFieldCondition roundCondition, long now) {
        var state =
                fieldConditions.open(participants.stream().map(Player::getId).toList());
        var units = boardUnits(participants);
        if (roundCondition != null && roundCondition.condition() != null) {
            startFieldCondition(
                    state,
                    units,
                    roundCondition.condition(),
                    roundCondition.durationSeconds(),
                    null,
                    now,
                    state::queueEvent);
        }
        selectStartSetter(units).ifPresent(setter -> {
            var start = setter.getStartCondition();
            startFieldCondition(
                    state,
                    units,
                    fieldConditionDefinitions.get(start.conditionId()),
                    start.durationSeconds(),
                    setter.getId(),
                    now,
                    state::queueEvent);
        });
    }

    public void endFieldConditions(List<Player> participants) {
        fieldConditions.close(participants.stream().map(Player::getId).toList());
    }

    public Optional<FieldConditionView> fieldConditionView(String ownerId) {
        return fieldConditions.view(ownerId, clock.currentTimeMillis());
    }

    private Optional<GameUnit> selectStartSetter(List<GameUnit> units) {
        var setters = units.stream()
                .filter(unit -> unit.getCurrentHealth() > 0)
                .filter(unit -> unit.getStartCondition() != null)
                .filter(unit -> fieldConditionDefinitions.containsKey(
                        unit.getStartCondition().conditionId()))
                .toList();
        if (setters.isEmpty()) {
            return Optional.empty();
        }
        var bestCost = setters.stream().mapToInt(GameUnit::getCost).max().orElseThrow();
        var bestStar = setters.stream()
                .filter(unit -> unit.getCost() == bestCost)
                .mapToInt(GameUnit::getStarLevel)
                .max()
                .orElseThrow();
        var tied = setters.stream()
                .filter(unit -> unit.getCost() == bestCost && unit.getStarLevel() == bestStar)
                .toList();
        return Optional.of(tied.size() == 1 ? tied.getFirst() : tied.get(randomProvider.nextInt(tied.size())));
    }

    private void startFieldCondition(
            FieldConditionTracker.State state,
            List<GameUnit> units,
            FieldConditionDefinition condition,
            int durationSeconds,
            String setterId,
            long now,
            Consumer<GameState.CombatEvent> emit) {
        if (condition == null) {
            return;
        }
        var durationMs = Math.max(0, durationSeconds) * 1000L;
        state.start(condition, durationMs, now);
        applyFieldModifiers(state, units);
        emit.accept(new GameState.CombatEvent(now, FIELD_EVENT, setterId, setterId, (int) durationMs, condition.id()));
    }

    private void applyFieldModifiers(FieldConditionTracker.State state, List<GameUnit> units) {
        var active = state.active().orElse(null);
        units.forEach(unit -> unit.getCombatModifiers()
                .setField(
                        active == null ? CombatModifiers.FieldModifiers.NONE : active.modifiersFor(unit.getTraits())));
    }

    private void applyCastFieldCondition(
            GameUnit source,
            String conditionId,
            int durationSeconds,
            boolean extendActive,
            List<Player> participants,
            List<GameUnit> allUnits,
            long currentTime) {
        var condition = fieldConditionDefinitions.get(conditionId);
        if (condition == null) {
            return;
        }
        var state = fieldConditions
                .stateFor(source.getOwnerId())
                .orElseGet(() -> fieldConditions.open(
                        participants.stream().map(Player::getId).toList()));
        var durationMs = Math.max(0, durationSeconds) * 1000L;
        if (extendActive && state.extend(durationMs, currentTime)) {
            var active = state.active().orElseThrow();
            recentEvents.add(new GameState.CombatEvent(
                    currentTime, FIELD_EVENT, source.getId(), source.getId(), (int) durationMs, active.id()));
            return;
        }
        startFieldCondition(
                state, allUnits, condition, durationSeconds, source.getId(), currentTime, recentEvents::add);
    }

    private void updateFieldConditions(List<Player> participants, List<GameUnit> allUnits, long currentTime) {
        if (participants.isEmpty()) {
            return;
        }
        var state = fieldConditions.stateFor(participants.getFirst().getId()).orElse(null);
        if (state == null) {
            return;
        }
        state.drainEvents()
                .forEach(event -> recentEvents.add(new GameState.CombatEvent(
                        currentTime,
                        event.type(),
                        event.sourceId(),
                        event.targetId(),
                        event.value(),
                        event.skillName())));
        if (state.expireIfDue(currentTime)) {
            applyFieldModifiers(state, allUnits);
        }
        if (state.takePeriodicTick(currentTime)) {
            applyFieldDamage(state.active().orElseThrow(), allUnits, currentTime);
        }
    }

    // Field damage is unmitigated: it ignores defense, shields and damage reduction.
    private void applyFieldDamage(FieldConditionDefinition condition, List<GameUnit> allUnits, long currentTime) {
        var periodicDamage = condition.periodicDamage();
        for (var unit : List.copyOf(allUnits)) {
            if (unit.getCurrentHealth() <= 0 || periodicDamage.isImmune(unit.getTraits())) {
                continue;
            }
            var damage = Math.max(1, Math.round(unit.getMaxHealth() * periodicDamage.maxHealthPercent() / 100.0f));
            var previousHealth = unit.getCurrentHealth();
            unit.setCurrentHealth(Math.max(0, previousHealth - damage));
            var actualDamage = previousHealth - unit.getCurrentHealth();
            accumulateDamageTaken(unit, actualDamage);
            recentEvents.add(new GameState.CombatEvent(
                    currentTime, FIELD_DAMAGE_EVENT, unit.getId(), unit.getId(), actualDamage, condition.id()));
            if (unit.getCurrentHealth() <= 0) {
                resolveLethal(unit, unit.getId(), null, allUnits, currentTime);
            }
        }
    }

    private static List<GameUnit> boardUnits(Collection<Player> participants) {
        var units = new ArrayList<GameUnit>();
        participants.forEach(player -> units.addAll(player.getBoardUnits()));
        return units;
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
            applyStartingBonuses(player.getBoardUnits());
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

    public void applyStartingBonuses(List<GameUnit> units) {
        units.forEach(ItemStatApplier::apply);
        traitManager.applyTraits(units);
    }

    public void endCombat(java.util.Collection<Player> players) {
        log.debug("Restoring units for {} players.", players.size());
        fieldConditions.reset();
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

        updateFieldConditions(participants, allUnits, currentTime);

        processDotEffects(allUnits, currentTime);

        settleDeaths(participants, allUnits, currentTime);

        var snapshot = List.copyOf(allUnits);
        for (var unit : snapshot) {
            settleDeaths(participants, allUnits, currentTime);
            if (unit.getCurrentHealth() <= 0) {
                continue;
            }

            // Update temporary buffs
            if (unit instanceof AbstractGameUnit agu) {
                agu.updateBuffs(currentTime);
            }
            applyHeldItemTick(unit, currentTime);

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
                                    healFromDamageDealt(unit, actualDamage, currentTime);
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
                                public void onFieldCondition(
                                        GameUnit source,
                                        String conditionId,
                                        int durationSeconds,
                                        boolean extendActive) {
                                    applyCastFieldCondition(
                                            source,
                                            conditionId,
                                            durationSeconds,
                                            extendActive,
                                            participants,
                                            allUnits,
                                            currentTime);
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

                    var attackDamage = effectiveDamage;
                    var actualDamage = applyAndMeasureDamage(target, () -> target.takeDamage(attackDamage));
                    grantDirectHitMana(target);
                    applyOnHitDot(unit, target, currentTime);
                    if (target.getCurrentHealth() <= 0) {
                        resolveLethal(target, unit.getId(), unit, allUnits, currentTime);
                    }

                    accumulateDamage(unit, actualDamage);
                    accumulateDamageTaken(target, actualDamage);
                    recentEvents.add(new GameState.CombatEvent(
                            currentTime, "DAMAGE", unit.getId(), target.getId(), actualDamage, null));
                    applyOnHitItemStun(unit, target, currentTime);
                    healFromDamageDealt(unit, actualDamage, currentTime);

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

                    float as = Math.max(0.1f, unit.getAttackSpeed());
                    float effectiveAs = as * unit.getAttackSpeedMultiplier();
                    long cooldownMs = (long) (1000 / effectiveAs);

                    // Extra Attack Chance (Swordsman)
                    if (randomProvider.nextDouble() < unit.getEffectiveExtraAttackChance()) {
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

        settleDeaths(participants, allUnits, currentTime);
        flushItemProcs(allUnits, currentTime);

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

    private void settleDeaths(List<Player> participants, List<GameUnit> allUnits, long currentTime) {
        if (!deathEffects.isActive()) {
            return;
        }
        var progressed = true;
        for (var pass = 0; progressed && pass < MAX_DEATH_SETTLE_PASSES; pass++) {
            progressed = false;
            for (var unit : List.copyOf(allUnits)) {
                if (unit.getCurrentHealth() > 0 || settledDeaths.contains(unit.getId())) {
                    continue;
                }
                progressed = true;
                if (reviveUnit(unit)) {
                    continue;
                }
                settledDeaths.add(unit.getId());
                awardKillBounty(unit, participants);
                explode(unit, allUnits, currentTime);
            }
        }
    }

    private void awardKillBounty(GameUnit deadUnit, List<Player> participants) {
        if (deathEffects.killBounty() <= 0) {
            return;
        }
        participants.stream()
                .filter(player -> !player.getId().equals(deadUnit.getOwnerId()))
                .forEach(player -> player.gainGold(deathEffects.killBounty()));
    }

    private void explode(GameUnit deadUnit, List<GameUnit> allUnits, long currentTime) {
        if (deathEffects.explosionPercent() <= 0) {
            return;
        }
        var damage = Math.max(1, deadUnit.getMaxHealth() * deathEffects.explosionPercent() / 100);
        allUnits.stream()
                .filter(target -> target.getCurrentHealth() > 0)
                .filter(target -> CombatUtils.isEnemy(deadUnit, target))
                .filter(target -> CombatUtils.getDistance(deadUnit, target) <= EXPLOSION_RADIUS)
                .forEach(target -> {
                    var actualDamage = applyAndMeasureDamage(target, () -> target.takeAbilityDamage(damage));
                    accumulateDamage(deadUnit, actualDamage);
                    accumulateDamageTaken(target, actualDamage);
                    grantDirectHitMana(target);
                    recentEvents.add(new GameState.CombatEvent(
                            currentTime, "DAMAGE", deadUnit.getId(), target.getId(), actualDamage, "Explosion"));
                    if (target.getCurrentHealth() <= 0) {
                        resolveLethal(target, deadUnit.getId(), deadUnit, allUnits, currentTime);
                    }
                });
    }

    // Damage-over-time kills pass no on-kill beneficiary, so they never grant the on-kill attack damage augment.
    private void resolveLethal(
            GameUnit target, String killerId, GameUnit onKillBeneficiary, List<GameUnit> allUnits, long currentTime) {
        if (reviveUnit(target)) {
            log.info("{} revives!", target.getName());
            return;
        }
        triggerShieldOnDeath(target, allUnits, currentTime);
        if (onKillBeneficiary != null) {
            AugmentManager.applyTeamAttackDamageOnKill(onKillBeneficiary, allUnits);
        }
        recentEvents.add(new GameState.CombatEvent(currentTime, "DEATH", killerId, target.getId(), 0, null));
    }

    private boolean reviveUnit(GameUnit unit) {
        if (!unit.hasRevive() || unit.isReviveUsed()) {
            return false;
        }
        var healthPercent = deathEffects.reviveHealthPercent() > 0
                ? deathEffects.reviveHealthPercent()
                : DEFAULT_REVIVE_HEALTH_PERCENT;
        unit.setReviveUsed(true);
        unit.setCurrentHealth(Math.max(1, unit.getMaxHealth() * healthPercent / 100));
        return true;
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
                if (source != null) {
                    healFromDamageDealt(source, actualDamage, currentTime);
                }

                iterator.remove();
                if (target.getCurrentHealth() > 0 && currentTime + effect.tickIntervalMs() < effect.expiresAt()) {
                    effectsToAdd.add(effect.withNextTickTime(currentTime + effect.tickIntervalMs()));
                }

                if (target.getCurrentHealth() <= 0) {
                    resolveLethal(target, effect.sourceId(), null, allUnits, currentTime);
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

    private void applyHeldItemTick(GameUnit unit, long currentTime) {
        var state = unit.getCombatModifiers().items();
        var regen = state.regenHealAmount(unit.getMaxHealth(), GameConstants.TICK_RATE_MS);
        if (regen > 0) {
            applyItemHeal(unit, regen, state.regenItemName(), currentTime);
        }
        var thresholdHeal = state.takeHealBelowThreshold(unit.getCurrentHealth(), unit.getMaxHealth());
        if (thresholdHeal > 0) {
            applyItemHeal(unit, thresholdHeal, state.healBelowItemName(), currentTime);
        }
    }

    private void applyOnHitItemStun(GameUnit unit, GameUnit target, long currentTime) {
        var state = unit.getCombatModifiers().items();
        if (state.onHitStunChance() <= 0 || target.getCurrentHealth() <= 0) {
            return;
        }
        if (randomProvider.nextDouble() >= state.onHitStunChance()) {
            return;
        }
        var durationMs = state.onHitStunDurationMs();
        if (StunRules.applyStun(target, durationMs / 1000.0f, currentTime)) {
            recentEvents.add(new GameState.CombatEvent(
                    currentTime,
                    ITEM_EVENT,
                    unit.getId(),
                    target.getId(),
                    (int) durationMs,
                    state.onHitStunItemName()));
        }
    }

    private void healFromDamageDealt(GameUnit unit, int damageDealt, long currentTime) {
        var state = unit.getCombatModifiers().items();
        if (state.damageDealtHealRatio() <= 0 || damageDealt <= 0 || unit.getCurrentHealth() <= 0) {
            return;
        }
        var heal = Math.round(damageDealt * state.damageDealtHealRatio());
        if (heal > 0) {
            applyItemHeal(unit, heal, state.damageDealtHealItemName(), currentTime);
        }
    }

    private void applyItemHeal(GameUnit unit, int amount, String itemName, long currentTime) {
        if (unit.getCurrentHealth() <= 0) {
            return;
        }
        var previousHealth = unit.getCurrentHealth();
        unit.setCurrentHealth(Math.min(unit.getMaxHealth(), previousHealth + amount));
        var effectiveHeal = unit.getCurrentHealth() - previousHealth;
        if (effectiveHeal > 0) {
            accumulateHealing(unit, effectiveHeal);
            recentEvents.add(new GameState.CombatEvent(
                    currentTime, "HEAL", unit.getId(), unit.getId(), effectiveHeal, itemName));
        }
    }

    private void flushItemProcs(List<GameUnit> allUnits, long currentTime) {
        for (var unit : allUnits) {
            for (var proc : unit.getCombatModifiers().items().drainProcs()) {
                recentEvents.add(new GameState.CombatEvent(
                        currentTime, ITEM_EVENT, unit.getId(), unit.getId(), proc.value(), proc.itemName()));
            }
        }
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
