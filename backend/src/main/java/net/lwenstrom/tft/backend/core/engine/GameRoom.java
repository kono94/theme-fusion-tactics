package net.lwenstrom.tft.backend.core.engine;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.analytics.GameplayAnalyticsRecorder;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.model.AugmentTier;
import net.lwenstrom.tft.backend.core.model.EmergencyDropPayload;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.GameState;
import net.lwenstrom.tft.backend.core.model.GameState.PlayerState;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.model.PlanningPauseReason;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.core.time.Clock;

@Slf4j
public class GameRoom {
    private final String id;
    private final String analyticsMatchKey = UUID.randomUUID().toString();
    private String hostId;
    private volatile GameState currentState;

    private final DataLoader dataLoader;
    private final Map<String, Player> players = new ConcurrentHashMap<>();
    private final Map<String, String> currentMatchups = new ConcurrentHashMap<>();
    private final List<List<Player>> activeCombats = new ArrayList<>();

    private GamePhase phase = GamePhase.LOBBY;
    private long phaseEndTime;
    private int round = 0;

    private long currentPhaseDuration;

    private final GameModeRegistry gameModeRegistry;
    private GameMode gameMode;
    private final Clock clock;
    private final RandomProvider randomProvider;
    private final TraitManager traitManager;
    private final CombatSystem combatSystem;
    private final BotController botController;
    private final GameplayAnalyticsRecorder analyticsRecorder;
    private boolean matchCompletedRecorded;
    private AugmentManager augmentManager;
    private final List<GameState.CombatEvent> lastTickEvents = new ArrayList<>();
    private final Map<String, CombatSystem.DamageEntry> currentRoundDamageLog = new ConcurrentHashMap<>();
    private final List<PendingEmergencyDrop> pendingEmergencyDrops = new ArrayList<>();

    private CombatResultListener combatResultListener;

    @FunctionalInterface
    public interface CombatResultListener {
        void onCombatResult(
                String roomId,
                String winnerId,
                String loserId,
                List<String> participantIds,
                Map<String, CombatSystem.DamageEntry> damageLog);

        default void onEmergencyDrop(String roomId, EmergencyDropPayload payload) {}
    }

    private record PendingEmergencyDrop(String dropId, String playerId) {}

    private record OrbCell(int x, int y) {}

    public synchronized void setCombatResultListener(CombatResultListener listener) {
        this.combatResultListener = listener;
    }

    public GameRoom(
            String id,
            DataLoader dataLoader,
            GameModeRegistry gameModeRegistry,
            Clock clock,
            RandomProvider randomProvider,
            GameMode gameMode) {
        this(id, dataLoader, gameModeRegistry, clock, randomProvider, gameMode, GameplayAnalyticsRecorder.NO_OP);
    }

    public GameRoom(
            String id,
            DataLoader dataLoader,
            GameModeRegistry gameModeRegistry,
            Clock clock,
            RandomProvider randomProvider,
            GameMode gameMode,
            GameplayAnalyticsRecorder analyticsRecorder) {
        this.id = id;
        this.dataLoader = dataLoader;
        this.gameModeRegistry = gameModeRegistry;
        this.clock = clock;
        this.randomProvider = randomProvider;
        this.botController = new BotController(dataLoader, randomProvider);
        this.gameMode = gameMode;
        this.analyticsRecorder = analyticsRecorder;

        this.traitManager = new TraitManager();
        gameModeRegistry.getProvider(this.gameMode).registerTraitEffects(this.traitManager);
        this.combatSystem = new CombatSystem(
                traitManager,
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                randomProvider,
                dataLoader.getAffinityConfig(this.gameMode));
        this.augmentManager = new AugmentManager(dataLoader.getAugments(this.gameMode), randomProvider);

        this.round = 0;

        this.currentState = new GameState(
                id,
                null,
                phase,
                round,
                0,
                0,
                new HashMap<>(),
                new HashMap<>(),
                new ArrayList<>(),
                new HashMap<>(),
                this.gameMode,
                false,
                null,
                null);

        // In LOBBY, no timer runs until startMatch is called
        this.phaseEndTime = Long.MAX_VALUE;
    }

    public String getId() {
        return id;
    }

    public synchronized GameMode getGameMode() {
        return gameMode;
    }

    public synchronized GameState getState() {
        return currentState;
    }

    public synchronized void refreshState() {
        updateGameState(phaseEndTime - clock.currentTimeMillis());
    }

    public synchronized boolean setGameMode(GameMode newMode) {
        if (newMode == null || newMode == gameMode || phase != GamePhase.LOBBY) {
            return false;
        }
        this.gameMode = newMode;
        traitManager.clearEffects();
        gameModeRegistry.getProvider(newMode).registerTraitEffects(traitManager);
        combatSystem.configureAffinity(dataLoader.getAffinityConfig(newMode));
        augmentManager = new AugmentManager(dataLoader.getAugments(newMode), randomProvider);
        players.values().forEach(p -> p.resetForMode(newMode));
        updateGameState(0);
        return true;
    }

    public synchronized boolean isEnded() {
        return phase == GamePhase.END;
    }

    public synchronized boolean canAcceptPlayers() {
        return phase == GamePhase.LOBBY && players.size() < GameConstants.MAX_PLAYERS;
    }

    public synchronized Player addPlayer(String name) {
        return tryAddPlayer(name).orElseThrow(() -> new IllegalStateException("Room is not accepting players"));
    }

    public synchronized Optional<Player> tryAddPlayer(String name) {
        return tryAddPlayer(name, null, null);
    }

    public synchronized Optional<Player> tryAddPlayer(String name, String analyticsClientId, String reconnectToken) {
        if (!canAcceptPlayers()) {
            return Optional.empty();
        }

        var player = new Player(
                name, gameMode, dataLoader, randomProvider, analyticsClientId, hashReconnectToken(reconnectToken));
        players.put(player.getId(), player);

        if (hostId == null) {
            hostId = player.getId();
        }

        player.refreshShop();
        updateGameState(0);
        return Optional.of(player);
    }

    public synchronized void removePlayer(String playerId) {
        players.remove(playerId);
        if (playerId.equals(hostId)) {
            hostId = players.isEmpty() ? null : players.keySet().iterator().next();
        }
        updateGameState(0);
    }

    public synchronized void startMatch() {
        if (phase != GamePhase.LOBBY) {
            return;
        }

        var currentCount = players.size();
        for (int i = 0; i < GameConstants.MAX_PLAYERS - currentCount; i++) {
            addBot();
        }

        recordAnalytics(() ->
                analyticsRecorder.matchStarted(analyticsMatchKey, gameMode, clock.currentTimeMillis(), humanPlayers()));
        startPhase(GamePhase.PLANNING);
    }

    public synchronized boolean startMatchForHost(String playerId) {
        if (!isHost(playerId) || phase != GamePhase.LOBBY) {
            return false;
        }
        startMatch();
        return true;
    }

    public synchronized boolean setGameModeForHost(String playerId, GameMode newMode) {
        return isHost(playerId) && setGameMode(newMode);
    }

    public synchronized Optional<Player> addBotForHost(String playerId) {
        return isHost(playerId) ? addBot() : Optional.empty();
    }

    private boolean isHost(String playerId) {
        return playerId != null && playerId.equals(hostId);
    }

    public synchronized Optional<Player> reconnectPlayer(String reconnectToken) {
        var reconnectTokenHash = hashReconnectToken(reconnectToken);
        if (reconnectTokenHash == null || phase == GamePhase.LOBBY || phase == GamePhase.END) {
            return Optional.empty();
        }
        return players.values().stream()
                .filter(player -> !player.isBot() && !player.isGhost())
                .filter(player -> constantTimeEquals(player.getReconnectTokenHash(), reconnectTokenHash))
                .findFirst()
                .map(player -> {
                    abandonIfGraceExpired(player, clock.currentTimeMillis());
                    player.setDisconnectedAt(null);
                    return player;
                });
    }

    public synchronized void disconnectPlayer(String playerId) {
        var player = players.get(playerId);
        if (player == null) {
            return;
        }
        if (phase == GamePhase.LOBBY) {
            removePlayer(playerId);
            return;
        }
        if (phase != GamePhase.END && player.getDisconnectedAt() == null) {
            player.setDisconnectedAt(clock.currentTimeMillis());
        }
    }

    public synchronized boolean abandonPlayer(String playerId) {
        var player = players.get(playerId);
        if (player == null || player.isBot() || player.isGhost()) {
            return false;
        }
        if (phase == GamePhase.LOBBY) {
            removePlayer(playerId);
            return true;
        }

        if (player.getHealth() > 0) {
            var remainingAlivePlayers = players.values().stream()
                    .filter(otherPlayer -> !otherPlayer.getId().equals(playerId))
                    .filter(otherPlayer -> otherPlayer.getHealth() > 0)
                    .count();
            player.setHealth(0);
            player.setPlace((int) remainingAlivePlayers + 1);
            finalizePlayerPlacement(player);
        }
        player.setDisconnectedAt(null);
        player.setReconnectTokenHash(null);
        if (!player.isAbandoned()) {
            player.setAbandoned(true);
            recordAnalytics(() ->
                    analyticsRecorder.playerAbandoned(analyticsMatchKey, player.getId(), clock.currentTimeMillis()));
        }

        if (phase != GamePhase.END
                && phase != GamePhase.END_CELEBRATION
                && aliveHumanPlayers().isEmpty()) {
            startPhase(GamePhase.END_CELEBRATION);
        } else {
            updateGameState(phaseEndTime - clock.currentTimeMillis());
        }
        return true;
    }

    public synchronized Optional<Player> addBot() {
        if (!canAcceptPlayers()) {
            return Optional.empty();
        }

        var botId = "Bot-" + UUID.randomUUID().toString().substring(0, 4);
        var bot = new Player(botId, gameMode, dataLoader, randomProvider);
        bot.setBot(true);
        players.put(bot.getId(), bot);
        bot.refreshShop();
        updateGameState(phaseEndTime - clock.currentTimeMillis());
        return Optional.of(bot);
    }

    public synchronized Player getPlayer(String id) {
        return players.get(id);
    }

    public synchronized Collection<Player> getPlayers() {
        return List.copyOf(players.values());
    }

    public synchronized void moveUnit(String playerId, String unitId, int x, int y) {
        var p = players.get(playerId);
        if (p != null
                && (phase == GamePhase.PLANNING || (phase == GamePhase.COMBAT && y == -1 && p.hasBenchUnit(unitId)))) {
            p.moveUnit(unitId, x, y);
        }
    }

    public synchronized void collectOrb(String playerId, String orbId) {
        var p = players.get(playerId);
        if (p != null) {
            p.collectOrb(orbId);
        }
    }

    public synchronized boolean readyForCombat(String playerId) {
        var readyPlayer = getSoloTrainingReadyPlayer();
        if (readyPlayer.isEmpty() || !readyPlayer.get().getId().equals(playerId)) {
            return false;
        }

        startPhase(GamePhase.COMBAT);
        return true;
    }

    public synchronized boolean selectAugment(String playerId, String augmentId) {
        if (phase != GamePhase.PLANNING) {
            return false;
        }

        var player = players.get(playerId);
        if (player == null || player.getHealth() <= 0) {
            return false;
        }

        var selected = augmentManager.selectAugment(player, augmentId, round);
        updateGameState(phaseEndTime - clock.currentTimeMillis());
        return selected;
    }

    public synchronized boolean applyAction(String boundPlayerId, GameAction action) {
        if (action == null
                || action.type() == null
                || boundPlayerId == null
                || !boundPlayerId.equals(action.playerId())) {
            return false;
        }

        var player = players.get(boundPlayerId);
        if (player == null || player.getHealth() <= 0) {
            return false;
        }

        if (action.type() == net.lwenstrom.tft.backend.core.model.ActionType.READY_FOR_COMBAT) {
            return readyForCombat(boundPlayerId);
        }
        if (action.type() == net.lwenstrom.tft.backend.core.model.ActionType.SELECT_AUGMENT) {
            return action.augmentId() != null && selectAugment(boundPlayerId, action.augmentId());
        }
        if (phase != GamePhase.PLANNING && phase != GamePhase.COMBAT) {
            return false;
        }
        if (phase == GamePhase.COMBAT && !isAllowedDuringCombat(player, action)) {
            return false;
        }

        var accepted =
                switch (action.type()) {
                    case BUY -> {
                        if (action.shopIndex() == null) yield false;
                        player.buyUnit(action.shopIndex());
                        yield true;
                    }
                    case REROLL -> {
                        player.refreshShop();
                        yield true;
                    }
                    case EXP -> player.buyXp();
                    case MOVE -> {
                        if (action.unitId() == null || action.targetX() == null || action.targetY() == null)
                            yield false;
                        if (action.targetX() < 0
                                || action.targetX() >= GameConstants.GRID_COLS
                                || action.targetY() < -1
                                || action.targetY() >= GameConstants.PLAYER_ROWS) {
                            yield false;
                        }
                        player.moveUnit(action.unitId(), action.targetX(), action.targetY());
                        yield true;
                    }
                    case SELL -> {
                        if (action.unitId() == null) yield false;
                        player.sellUnit(action.unitId(), phase == GamePhase.PLANNING);
                        yield true;
                    }
                    case LOCK -> {
                        player.setShopLocked(!player.isShopLocked());
                        yield true;
                    }
                    case COLLECT_ORB -> {
                        if (action.orbId() == null) yield false;
                        player.collectOrb(action.orbId());
                        yield true;
                    }
                    case READY_FOR_COMBAT, SELECT_AUGMENT -> false;
                };

        if (accepted) {
            updateGameState(phaseEndTime - clock.currentTimeMillis());
        }
        return accepted;
    }

    private boolean isAllowedDuringCombat(Player player, GameAction action) {
        return switch (action.type()) {
            case BUY, REROLL, EXP, LOCK -> true;
            case MOVE ->
                action.unitId() != null
                        && action.targetY() != null
                        && action.targetY() == -1
                        && player.hasBenchUnit(action.unitId());
            case SELL -> action.unitId() != null && player.hasBenchUnit(action.unitId());
            case COLLECT_ORB, READY_FOR_COMBAT, SELECT_AUGMENT -> false;
        };
    }

    public synchronized void tick() {
        markAbandonedPlayers();
        if (phase == GamePhase.LOBBY || phase == GamePhase.END) {
            return;
        }
        if (aliveHumanPlayers().isEmpty() && phase != GamePhase.END_CELEBRATION) {
            finishWhenNoHumansRemain();
            return;
        }

        long now = clock.currentTimeMillis();
        if (isPlanningTimerPaused()) {
            lastTickEvents.clear();
            updateGameState(currentPhaseDuration);
            return;
        }

        if (now >= phaseEndTime) {
            nextPhase();
            return;
        }

        lastTickEvents.clear();
        if (phase == GamePhase.COMBAT) {
            var humanCombatActiveAtStart = hasHumanInvolvedCombat();
            if (humanCombatActiveAtStart) {
                var it = activeCombats.iterator();
                while (it.hasNext()) {
                    var pair = it.next();
                    var result = combatSystem.simulateTick(pair);
                    if (result.events() != null) {
                        lastTickEvents.addAll(result.events());
                    }
                    if (result.ended()) {
                        handleCombatEnd(false, result, pair);
                        it.remove();
                    }
                }
            }

            if (phase == GamePhase.COMBAT && !hasHumanInvolvedCombat()) {
                fastForwardBotCombats(humanCombatActiveAtStart ? now + GameConstants.TICK_RATE_MS : now);
            }

            currentRoundDamageLog.putAll(combatSystem.getDamageLog());

            // If handleCombatEnd triggered a game end, the phase is no longer COMBAT.
            // We should stop processing further COMBAT logic this tick.
            if (phase != GamePhase.COMBAT) {
                return;
            }

            if (activeCombats.isEmpty()) {
                nextPhase();
            }
        }

        updateGameState(phaseEndTime - now);
    }

    private void fastForwardBotCombats(long simulationStartTime) {
        var simulationTime = simulationStartTime;
        while (!activeCombats.isEmpty() && phase == GamePhase.COMBAT && simulationTime < phaseEndTime) {
            var it = activeCombats.iterator();
            while (it.hasNext()) {
                var pair = it.next();
                var result = combatSystem.simulateTick(pair, simulationTime);
                if (result.ended()) {
                    if (result.events() != null) {
                        lastTickEvents.addAll(result.events());
                    }
                    handleCombatEnd(false, result, pair);
                    it.remove();
                }
            }
            simulationTime += GameConstants.TICK_RATE_MS;
        }

        if (phase == GamePhase.COMBAT) {
            activeCombats.forEach(pair -> handleCombatEnd(true, null, pair));
            activeCombats.clear();
        }
    }

    private void nextPhase() {
        if (phase == GamePhase.END) {
            return;
        }

        if (phase == GamePhase.COMBAT && !activeCombats.isEmpty()) {
            for (var pair : activeCombats) {
                handleCombatEnd(true, null, pair);
            }
            activeCombats.clear();
        }

        if (phase == GamePhase.END_CELEBRATION) {
            this.phase = GamePhase.END;
            updateGameState(0);
            return;
        }

        if (phase == GamePhase.PLANNING) {
            startPhase(GamePhase.COMBAT);
        } else {
            startPhase(GamePhase.PLANNING);
        }
    }

    private void startPhase(GamePhase newPhase) {
        this.phase = newPhase;
        log.info("Starting phase: {}", newPhase);

        if (newPhase == GamePhase.END_CELEBRATION && !matchCompletedRecorded) {
            matchCompletedRecorded = true;
            recordAnalytics(() -> analyticsRecorder.matchCompleted(
                    analyticsMatchKey, round, clock.currentTimeMillis(), humanPlayers()));
        }

        if (phase == GamePhase.PLANNING) {
            var alivePlayers =
                    players.values().stream().filter(p -> p.getHealth() > 0).toList();
            if (alivePlayers.size() <= 1) {
                if (alivePlayers.size() == 1) {
                    alivePlayers.get(0).setPlace(1);
                    finalizePlayerPlacement(alivePlayers.get(0));
                }
                log.info("Game ending: only {} player(s) remaining", alivePlayers.size());
                startPhase(GamePhase.END_CELEBRATION);
                return;
            }

            log.info("Starting PLANNING phase. Restoring units.");
            combatSystem.endCombat(players.values());

            players.values().forEach(p -> {
                p.setInCombat(false);
                p.processPendingUpgrades();
            });

            round++;
            players.values().forEach(p -> {
                p.gainGold(GameConstants.BASE_INCOME + Math.min(p.getGold() / 10, GameConstants.MAX_INTEREST));

                // Navigator trait gold
                int navGold = p.getBoardUnits().stream()
                        .filter(u -> u.getGoldBonusMax() > 0)
                        .mapToInt(u -> u.getGoldBonusMin()
                                + randomProvider.nextInt(u.getGoldBonusMax() - u.getGoldBonusMin() + 1))
                        .sum();
                if (navGold > 0) {
                    p.gainGold(navGold);
                    log.info("Player {} gained {} bonus gold from Navigators", p.getName(), navGold);
                }

                p.gainXp(GameConstants.XP_PER_PHASE);
                p.refreshShop();
                if (round % 2 == 0) {
                    spawnLootOrbsForPlayer(p);
                }
            });
            spawnPendingEmergencyDrops();
        }

        this.currentPhaseDuration = calculatePhaseDuration(newPhase, round);
        this.phaseEndTime = clock.currentTimeMillis() + currentPhaseDuration;

        if (phase == GamePhase.PLANNING) {
            generateAugmentChoicesForRound();
            players.values().stream()
                    .filter(Player::isBot)
                    .forEach(player -> botController.plan(player, round, augmentManager));
        }

        if (phase == GamePhase.COMBAT) {
            selectRandomPendingAugments();

            players.values().stream().filter(p -> p.getHealth() > 0).forEach(p -> {
                p.collectAllOrbs();
                p.setInCombat(true);
                p.autoFillBoard();
            });

            recordAnalytics(() -> analyticsRecorder.roundStarted(
                    analyticsMatchKey, round, clock.currentTimeMillis(), aliveHumanPlayers()));

            currentRoundDamageLog.clear();

            activeCombats.clear();
            currentMatchups.clear();

            var alivePlayers = players.values().stream()
                    .filter(p -> p.getHealth() > 0)
                    .collect(Collectors.toCollection(ArrayList::new));

            randomProvider.shuffle(alivePlayers);

            for (int i = 0; i < alivePlayers.size() - 1; i += 2) {
                var p1 = alivePlayers.get(i);
                var p2 = alivePlayers.get(i + 1);
                activeCombats.add(List.of(p1, p2));
                currentMatchups.put(p1.getId(), p2.getId());
                currentMatchups.put(p2.getId(), p1.getId());
            }

            if (alivePlayers.size() % 2 != 0 && alivePlayers.size() > 1) {
                var oddPlayer = alivePlayers.get(alivePlayers.size() - 1);
                var potentialDonors = alivePlayers.stream()
                        .filter(p -> !p.getId().equals(oddPlayer.getId()))
                        .toList();
                var donor = potentialDonors.get(randomProvider.nextInt(potentialDonors.size()));
                var ghost = donor.createGhost();

                activeCombats.add(List.of(oddPlayer, ghost));
                currentMatchups.put(oddPlayer.getId(), ghost.getId());
            }

            combatSystem.clearDamageLog();
            activeCombats.forEach(combat -> {
                combatSystem.startCombat(combat);
                augmentManager.applyCombatEffects(combat);
            });
        }

        updateGameState(currentPhaseDuration);
    }

    private void updateGameState(long timeLeft) {
        var planningPauseReason = getPlanningPauseReason();
        var planningTimerPaused = planningPauseReason != null;
        var planningReadyPlayerId =
                getSoloTrainingReadyPlayer().map(Player::getId).orElse(null);
        var displayedTimeLeft = planningTimerPaused ? currentPhaseDuration : Math.max(0, timeLeft);
        Map<String, PlayerState> playerStates = players.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toState()));

        for (var combat : activeCombats) {
            for (var p : combat) {
                if (!playerStates.containsKey(p.getId())) {
                    playerStates.put(p.getId(), p.toState());
                }
            }
        }

        this.currentState = new GameState(
                id,
                hostId,
                phase,
                round,
                displayedTimeLeft,
                calculatePhaseDuration(phase, round),
                playerStates,
                new HashMap<>(currentMatchups),
                new ArrayList<>(lastTickEvents),
                new HashMap<>(currentRoundDamageLog),
                gameMode,
                planningTimerPaused,
                planningReadyPlayerId,
                planningPauseReason);
    }

    private boolean isPlanningTimerPaused() {
        return getPlanningPauseReason() != null;
    }

    private PlanningPauseReason getPlanningPauseReason() {
        if (getSoloTrainingReadyPlayer().isPresent()) {
            return PlanningPauseReason.SOLO_READY;
        }
        return null;
    }

    private void generateAugmentChoicesForRound() {
        AugmentTier tier = AugmentManager.tierForRound(round);
        if (tier == null) {
            return;
        }

        players.values().stream().filter(player -> player.getHealth() > 0).forEach(player -> {
            var choices = augmentManager.generateOffers(player, tier);
            player.setAugmentChoices(choices);
        });
    }

    private void selectRandomPendingAugments() {
        players.values().stream()
                .filter(player -> player.getHealth() > 0)
                .filter(player -> !player.getAugmentChoices().isEmpty())
                .forEach(player -> {
                    var choices = player.getAugmentChoices();
                    var selected = choices.get(randomProvider.nextInt(choices.size()));
                    augmentManager.selectAugment(player, selected.id(), round);
                });
    }

    private Optional<Player> getSoloTrainingReadyPlayer() {
        if (phase != GamePhase.PLANNING) {
            return Optional.empty();
        }

        var alivePlayers = players.values().stream()
                .filter(player -> player.getHealth() > 0)
                .toList();
        var aliveHumanPlayers = alivePlayers.stream()
                .filter(player -> !player.isBot() && !player.isGhost())
                .toList();
        var hasAliveBot = alivePlayers.stream().anyMatch(Player::isBot);

        if (aliveHumanPlayers.size() == 1 && hasAliveBot) {
            return Optional.of(aliveHumanPlayers.get(0));
        }
        return Optional.empty();
    }

    private void spawnLootOrbsForPlayer(Player player) {
        var orbCount = GameConstants.MIN_ORB_COUNT
                + randomProvider.nextInt(GameConstants.MAX_ORB_COUNT - GameConstants.MIN_ORB_COUNT + 1);
        for (var i = 0; i < orbCount; i++) {
            var cell = new OrbCell(
                    randomProvider.nextInt(GameConstants.GRID_COLS), randomProvider.nextInt(GameConstants.PLAYER_ROWS));
            player.addLootOrb(createLootOrb(player, cell));
        }
    }

    private void spawnPendingEmergencyDrops() {
        var dropsToSpawn = new ArrayList<>(pendingEmergencyDrops);
        pendingEmergencyDrops.clear();

        dropsToSpawn.forEach(drop -> {
            var player = players.get(drop.playerId());
            if (player == null || player.getHealth() <= 0 || player.isBot() || player.isGhost()) {
                return;
            }

            var orbCount = GameConstants.MIN_EMERGENCY_DROP_ORB_COUNT
                    + randomProvider.nextInt(GameConstants.MAX_EMERGENCY_DROP_ORB_COUNT
                            - GameConstants.MIN_EMERGENCY_DROP_ORB_COUNT
                            + 1);
            var orbs = spawnLootOrbs(player, orbCount);
            if (combatResultListener != null) {
                combatResultListener.onEmergencyDrop(
                        id,
                        new EmergencyDropPayload(
                                drop.dropId(),
                                drop.playerId(),
                                round,
                                orbs.stream().map(LootOrb::id).toList()));
            }
        });
    }

    private List<LootOrb> spawnLootOrbs(Player player, int requestedOrbCount) {
        var availableCells = availableLootOrbCells(player);
        randomProvider.shuffle(availableCells);

        var orbCount = Math.min(requestedOrbCount, availableCells.size());
        var spawnedOrbs = new ArrayList<LootOrb>(orbCount);
        for (var i = 0; i < orbCount; i++) {
            var cell = availableCells.get(i);
            var orb = createLootOrb(player, cell);
            player.addLootOrb(orb);
            spawnedOrbs.add(orb);
        }
        return spawnedOrbs;
    }

    private List<OrbCell> availableLootOrbCells(Player player) {
        var occupiedCells = player.getLootOrbs().stream()
                .map(orb -> new OrbCell(orb.x(), orb.y()))
                .collect(Collectors.toSet());
        var availableCells = new ArrayList<OrbCell>();
        for (var y = 0; y < GameConstants.PLAYER_ROWS; y++) {
            for (var x = 0; x < GameConstants.GRID_COLS; x++) {
                var cell = new OrbCell(x, y);
                if (!occupiedCells.contains(cell)) {
                    availableCells.add(cell);
                }
            }
        }
        return availableCells;
    }

    private LootOrb createLootOrb(Player player, OrbCell cell) {
        var type = randomProvider.nextInt(100) < GameConstants.ORB_GOLD_CHANCE_PERCENT ? LootType.GOLD : LootType.UNIT;
        var contentId = "";
        var amount = 0;

        if (type == LootType.GOLD) {
            amount = rollLootGoldAmount();
        } else {
            var units = dataLoader.getAllUnits(gameMode);
            var def = chooseLootUnitDefinitionForPlayer(player, units);
            if (def.isPresent()) {
                contentId = def.get().id();
            } else {
                type = LootType.GOLD;
                amount = rollLootGoldAmount();
            }
        }

        return new LootOrb(UUID.randomUUID().toString(), cell.x(), cell.y(), type, contentId, amount);
    }

    Optional<UnitDefinition> chooseLootUnitDefinitionForPlayer(Player player, List<UnitDefinition> units) {
        var availableUnits = units.stream()
                .filter(def -> !player.hasCompletedUnitLine(def.lineId()))
                .toList();
        if (availableUnits.isEmpty()) {
            return Optional.empty();
        }

        if (randomProvider.nextInt(100) < GameConstants.ORB_OWNED_UNIT_CHANCE_PERCENT) {
            var ownedDef = chooseOwnedLootUnitDefinition(player, availableUnits);
            if (ownedDef.isPresent()) {
                return ownedDef;
            }
        }

        return Optional.of(ShopOdds.rollUnit(player.getLevel() + 1, availableUnits, randomProvider));
    }

    private Optional<UnitDefinition> chooseOwnedLootUnitDefinition(Player player, List<UnitDefinition> units) {
        var eligibleLineIds = getUpgradeableOwnedLineIds(player);
        if (eligibleLineIds.isEmpty()) {
            return Optional.empty();
        }

        var seenLineIds = new HashSet<String>();
        var candidates = units.stream()
                .filter(def -> eligibleLineIds.contains(def.lineId()))
                .filter(def -> seenLineIds.add(def.lineId()))
                .toList();
        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        var totalWeight = candidates.stream()
                .mapToInt(def -> getOwnedLootWeight(def.cost()))
                .sum();
        var roll = randomProvider.nextInt(totalWeight);
        var cumulativeWeight = 0;
        for (var candidate : candidates) {
            cumulativeWeight += getOwnedLootWeight(candidate.cost());
            if (roll < cumulativeWeight) {
                return Optional.of(candidate);
            }
        }
        return Optional.of(candidates.getFirst());
    }

    private List<String> getUpgradeableOwnedLineIds(Player player) {
        return java.util.stream.Stream.concat(player.getBenchSlots().units(), player.getBoardUnits().stream())
                .filter(unit -> unit.getStarLevel() < GameConstants.MAX_STAR_LEVEL)
                .map(GameUnit::getLineId)
                .distinct()
                .toList();
    }

    private int getOwnedLootWeight(int cost) {
        return switch (cost) {
            case 1 -> 10;
            case 2 -> 7;
            case 3 -> 4;
            case 4 -> 2;
            default -> 1;
        };
    }

    private int rollLootGoldAmount() {
        return GameConstants.MIN_ORB_GOLD
                + randomProvider.nextInt(GameConstants.MAX_ORB_GOLD - GameConstants.MIN_ORB_GOLD + 1);
    }

    private long calculatePhaseDuration(GamePhase phase, int round) {
        if (phase == GamePhase.COMBAT) {
            return GameConstants.COMBAT_PHASE_MS;
        }
        if (phase == GamePhase.END_CELEBRATION) {
            return 6000L; // 6 seconds for celebration animation
        }
        return GameConstants.BASE_PLANNING_DURATION_MS + (round - 1) * GameConstants.PLANNING_DURATION_INCREMENT_MS;
    }

    // ========== REFACTORED handleCombatEnd ==========

    private void handleCombatEnd(boolean isTimeout, CombatSystem.CombatResult result, List<Player> participants) {
        var outcome = determineCombatOutcome(isTimeout, result, participants);

        if (!outcome.isDraw() && outcome.loser() != null) {
            applyDamageToLoser(outcome.winner(), outcome.loser());
        }

        recordAnalytics(() -> analyticsRecorder.combatResolved(
                analyticsMatchKey,
                round,
                clock.currentTimeMillis(),
                outcome.winner() != null && !outcome.isDraw() ? outcome.winner().getId() : null,
                outcome.loser() != null && !outcome.isDraw() ? outcome.loser().getId() : null,
                outcome.isDraw(),
                participants));

        checkAndTriggerGameEnd();

        notifyCombatResult(outcome, result, participants);
    }

    private record CombatOutcome(Player winner, Player loser, boolean isDraw) {}

    private CombatOutcome determineCombatOutcome(
            boolean isTimeout, CombatSystem.CombatResult result, List<Player> participants) {
        Player winner = null;
        var draw = false;

        if (isTimeout || result == null) {
            // Timeout: Winner is player with highest total HP on board
            var maxHp = -1;
            for (var p : participants) {
                var totalHp = p.getBoardUnits().stream()
                        .mapToInt(GameUnit::getCurrentHealth)
                        .sum();
                if (totalHp > maxHp) {
                    maxHp = totalHp;
                    winner = p;
                    draw = false;
                } else if (totalHp == maxHp) {
                    draw = true;
                }
            }
        } else {
            if (result.winnerId() != null) {
                winner = participants.stream()
                        .filter(p -> p.getId().equals(result.winnerId()))
                        .findFirst()
                        .orElse(null);
            } else {
                draw = true;
            }
        }

        Player loser = null;
        if (!draw && winner != null) {
            final var finalWinner = winner;
            loser = participants.stream()
                    .filter(p -> !p.getId().equals(finalWinner.getId()))
                    .findFirst()
                    .orElse(null);
        }

        return new CombatOutcome(winner, loser, draw);
    }

    private void applyDamageToLoser(Player winner, Player loser) {
        if (loser == null || winner == null) return;

        var damage = GameConstants.BASE_COMBAT_DAMAGE + winner.getBoardUnits().size() + (round / 3);

        if (!loser.isGhost()) {
            var previousHealth = loser.getHealth();
            loser.takeDamage(damage);
            log.info("Combat ended: {} wins! {} takes {} damage", winner.getName(), loser.getName(), damage);

            if (loser.triggerEmergencyDropIfEligible(previousHealth)) {
                pendingEmergencyDrops.add(
                        new PendingEmergencyDrop(UUID.randomUUID().toString(), loser.getId()));
            }

            if (loser.getHealth() <= 0) {
                var aliveCount = (int)
                        players.values().stream().filter(p -> p.getHealth() > 0).count();
                loser.setPlace(aliveCount + 1);
                finalizePlayerPlacement(loser);
            }
        } else {
            log.info("Combat ended: {} wins against ghost of {}! No damage taken.", winner.getName(), loser.getName());
        }
    }

    private void checkAndTriggerGameEnd() {
        if (aliveHumanPlayers().isEmpty()) {
            finishWhenNoHumansRemain();
            return;
        }
        var alivePlayers =
                players.values().stream().filter(p -> p.getHealth() > 0).toList();
        if (alivePlayers.size() <= 1) {
            if (alivePlayers.size() == 1) {
                alivePlayers.get(0).setPlace(1);
                finalizePlayerPlacement(alivePlayers.get(0));
            }
            startPhase(GamePhase.END_CELEBRATION);
        }
    }

    private void finishWhenNoHumansRemain() {
        var alivePlayers = players.values().stream()
                .filter(player -> player.getHealth() > 0)
                .count();
        humanPlayers().stream()
                .filter(player -> player.getHealth() <= 0)
                .filter(player -> player.getPlace() == null)
                .forEach(player -> {
                    player.setPlace((int) alivePlayers + 1);
                    finalizePlayerPlacement(player);
                });
        startPhase(GamePhase.END_CELEBRATION);
    }

    private void markAbandonedPlayers() {
        var now = clock.currentTimeMillis();
        players.values().stream()
                .filter(player -> !player.isBot() && !player.isGhost())
                .forEach(player -> abandonIfGraceExpired(player, now));
    }

    private void abandonIfGraceExpired(Player player, long now) {
        if (player.isAbandoned() || player.getDisconnectedAt() == null || now - player.getDisconnectedAt() < 60_000L) {
            return;
        }
        player.setAbandoned(true);
        recordAnalytics(() -> analyticsRecorder.playerAbandoned(analyticsMatchKey, player.getId(), now));
    }

    private List<Player> humanPlayers() {
        return players.values().stream()
                .filter(player -> !player.isBot() && !player.isGhost())
                .toList();
    }

    private List<Player> aliveHumanPlayers() {
        return humanPlayers().stream().filter(player -> player.getHealth() > 0).toList();
    }

    private boolean hasHumanInvolvedCombat() {
        return activeCombats.stream().anyMatch(this::hasHumanParticipant);
    }

    private boolean hasHumanParticipant(List<Player> participants) {
        return participants.stream().anyMatch(player -> !player.isBot() && !player.isGhost());
    }

    private static String hashReconnectToken(String reconnectToken) {
        if (reconnectToken == null || reconnectToken.isBlank()) {
            return null;
        }
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(reconnectToken.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static boolean constantTimeEquals(String first, String second) {
        if (first == null || second == null) {
            return false;
        }
        return MessageDigest.isEqual(first.getBytes(StandardCharsets.UTF_8), second.getBytes(StandardCharsets.UTF_8));
    }

    private void recordAnalytics(Runnable operation) {
        try {
            operation.run();
        } catch (RuntimeException exception) {
            log.error("Gameplay analytics recording failed for room {}", id, exception);
        }
    }

    private void finalizePlayerPlacement(Player player) {
        if (player == null || player.isBot() || player.isGhost()) {
            return;
        }
        recordAnalytics(() -> analyticsRecorder.playerPlacementFinalized(
                analyticsMatchKey, round, clock.currentTimeMillis(), player));
    }

    private void notifyCombatResult(
            CombatOutcome outcome, CombatSystem.CombatResult result, List<Player> participants) {
        if (combatResultListener == null) return;

        String winnerId = null;
        String loserId = null;

        if (outcome.winner() != null && !outcome.isDraw()) {
            winnerId = outcome.winner().getId();
            if (outcome.loser() != null) {
                loserId = outcome.loser().getId();
            }
        }

        var participantIds = participants.stream().map(Player::getId).toList();
        var damageLog = result != null ? result.damageLog() : Map.<String, CombatSystem.DamageEntry>of();
        combatResultListener.onCombatResult(id, winnerId, loserId, participantIds, damageLog);
    }

    // ========== END REFACTORED handleCombatEnd ==========
}
