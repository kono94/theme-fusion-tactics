package net.lwenstrom.tft.backend.core.simulation;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.engine.AugmentManager;
import net.lwenstrom.tft.backend.core.engine.CombatSystem;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.SelectedAugment;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.core.time.Clock;
import net.lwenstrom.tft.backend.test.SeededRandomProvider;

public class CombatSimulator {
    private final DataLoader dataLoader;
    private final GameModeRegistry gameModeRegistry;
    private final Map<GameMode, TraitManager> traitManagers = new ConcurrentHashMap<>();

    public CombatSimulator(DataLoader dataLoader, GameModeRegistry gameModeRegistry) {
        this.dataLoader = dataLoader;
        this.gameModeRegistry = gameModeRegistry;
    }

    public CombatSimulationResult simulate(CombatSimulationRequest request) {
        var wins = new int[2];
        var draws = 0;
        var totalDuration = 0L;
        var totalBoardOneHealth = 0L;
        var totalBoardTwoHealth = 0L;
        var unitStats = new HashMap<String, MutableUnitStats>();
        var traitManager = traitManagers.computeIfAbsent(request.mode(), mode -> {
            var manager = new TraitManager();
            gameModeRegistry.getProvider(mode).registerTraitEffects(manager);
            return manager;
        });

        for (var run = 0; run < request.runs(); run++) {
            var randomProvider = new SeededRandomProvider(request.seed() + run);
            var clock = new ManualClock();
            var combatSystem = new CombatSystem(
                    traitManager,
                    clock,
                    new NearestEnemyTargetSelector(),
                    new BfsUnitMover(clock),
                    new DefaultAbilityCaster(),
                    randomProvider,
                    dataLoader.getAffinityConfig(request.mode()));
            var boardOne = createPlayer(request.boardOne(), request, randomProvider);
            var boardTwo = createPlayer(request.boardTwo(), request, randomProvider);

            combatSystem.startCombat(List.of(boardOne, boardTwo));
            applyAugments(request.boardOne(), boardOne, request, randomProvider);
            applyAugments(request.boardTwo(), boardTwo, request, randomProvider);

            CombatSystem.CombatResult result = null;
            var elapsed = 0L;
            while (elapsed <= request.maxDurationMs()) {
                result = combatSystem.simulateTick(List.of(boardOne, boardTwo));
                if (result.ended()) {
                    break;
                }
                clock.advance(request.tickMs());
                elapsed += request.tickMs();
            }

            var boardOneHealth = remainingHealth(boardOne);
            var boardTwoHealth = remainingHealth(boardTwo);
            if (result != null && result.ended() && result.winnerId() != null) {
                if (result.winnerId().equals(boardOne.getId())) {
                    wins[0]++;
                } else {
                    wins[1]++;
                }
            } else if (boardOneHealth == boardTwoHealth) {
                draws++;
            } else if (boardOneHealth > boardTwoHealth) {
                wins[0]++;
            } else {
                wins[1]++;
            }

            totalDuration += elapsed;
            totalBoardOneHealth += boardOneHealth;
            totalBoardTwoHealth += boardTwoHealth;
            recordUnitStats(unitStats, combatSystem.getDamageLog());
        }

        return new CombatSimulationResult(
                request.mode(),
                request.boardOne().name(),
                request.boardTwo().name(),
                request.runs(),
                wins[0],
                wins[1],
                draws,
                average(totalDuration, request.runs()),
                average(totalBoardOneHealth, request.runs()),
                average(totalBoardTwoHealth, request.runs()),
                toStats(unitStats));
    }

    private Player createPlayer(BoardSpec boardSpec, CombatSimulationRequest request, RandomProvider randomProvider) {
        var player = new Player(boardSpec.name(), request.mode(), dataLoader, randomProvider);
        player.setLevel(Math.max(boardSpec.level(), boardSpec.units().size()));
        for (var unitSpec : boardSpec.units()) {
            var def = dataLoader.findUnitDefinition(request.mode(), unitSpec.definitionId());
            if (def == null) {
                throw new IllegalArgumentException(
                        "Unknown unit for " + request.mode() + ": " + unitSpec.definitionId());
            }
            player.addUnitToBoard(def, unitSpec.x(), unitSpec.y(), unitSpec.starLevel());
        }
        return player;
    }

    private void applyAugments(
            BoardSpec boardSpec, Player player, CombatSimulationRequest request, RandomProvider randomProvider) {
        if (boardSpec.augmentIds().isEmpty()) {
            return;
        }

        var augmentManager = new AugmentManager(dataLoader.getAugments(request.mode()), randomProvider);
        for (var augmentId : boardSpec.augmentIds()) {
            findAugment(request, augmentId).ifPresent(definition -> {
                var tier = boardSpec.augmentTier();
                var tierIndex = tier.ordinal();
                player.addSelectedAugment(new SelectedAugment(
                        definition.id(),
                        definition.name(),
                        definition.descriptions().get(tierIndex),
                        tier,
                        definition.effectType(),
                        definition.values().get(tierIndex),
                        0,
                        definition.image()));
            });
        }
        augmentManager.applyCombatEffects(List.of(player));
    }

    private java.util.Optional<AugmentDefinition> findAugment(CombatSimulationRequest request, String augmentId) {
        return dataLoader.getAugments(request.mode()).stream()
                .filter(augment -> augment.id().equals(augmentId))
                .findFirst();
    }

    private int remainingHealth(Player player) {
        return player.getBoardUnits().stream()
                .filter(unit -> unit.getCurrentHealth() > 0)
                .mapToInt(GameUnit::getCurrentHealth)
                .sum();
    }

    private void recordUnitStats(
            Map<String, MutableUnitStats> unitStats, Map<String, CombatSystem.DamageEntry> damageLog) {
        damageLog
                .values()
                .forEach(entry -> unitStats
                        .computeIfAbsent(
                                entry.definitionId(),
                                ignored -> new MutableUnitStats(entry.definitionId(), entry.unitName()))
                        .add(entry));
    }

    private Map<String, UnitCombatStats> toStats(Map<String, MutableUnitStats> mutableStats) {
        var stats = new HashMap<String, UnitCombatStats>();
        mutableStats.forEach((definitionId, value) -> stats.put(definitionId, value.toStats()));
        return Map.copyOf(stats);
    }

    private double average(long total, int count) {
        return count == 0 ? 0 : (double) total / count;
    }

    private static final class ManualClock implements Clock {
        private long currentTime;

        @Override
        public long currentTimeMillis() {
            return currentTime;
        }

        private void advance(long ms) {
            currentTime += ms;
        }
    }

    private static final class MutableUnitStats {
        private final String definitionId;
        private final String unitName;
        private int appearances;
        private int damage;
        private int healing;
        private int shielding;

        private MutableUnitStats(String definitionId, String unitName) {
            this.definitionId = definitionId;
            this.unitName = unitName;
        }

        private void add(CombatSystem.DamageEntry entry) {
            appearances++;
            damage += entry.damage();
            healing += entry.healing();
            shielding += entry.shielding();
        }

        private UnitCombatStats toStats() {
            return new UnitCombatStats(
                    definitionId,
                    unitName,
                    appearances,
                    appearances == 0 ? 0 : (double) damage / appearances,
                    appearances == 0 ? 0 : (double) healing / appearances,
                    appearances == 0 ? 0 : (double) shielding / appearances);
        }
    }
}
