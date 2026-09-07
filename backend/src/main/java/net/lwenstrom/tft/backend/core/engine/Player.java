package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.AugmentOffer;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameState.PlayerState;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.model.SelectedAugment;
import net.lwenstrom.tft.backend.core.random.RandomProvider;

@Getter
@Setter
public class Player {
    private final String id;
    private String name;
    private String analyticsClientId;
    private String reconnectTokenHash;
    private Long disconnectedAt;
    private boolean abandoned;
    private Integer place; // Null if still playing, 1-8 if finished
    private String combatSide; // "TOP" or "BOTTOM" during combat, null otherwise

    private int health = 100;
    private int gold = GameConstants.STARTING_GOLD;
    private int level = 1;
    private int xp = 0;

    private final RandomProvider randomProvider;
    private final Grid grid = new Grid();

    private final Bench bench = new Bench();
    private final List<GameUnit> boardUnits = new ArrayList<>();
    private final List<LootOrb> lootOrbs = new ArrayList<>();
    private final List<AugmentOffer> augmentChoices = new ArrayList<>();
    private final List<SelectedAugment> selectedAugments = new ArrayList<>();

    private List<UnitDefinition> shop = new ArrayList<>();
    private boolean shopLocked = false;
    private boolean boardLocked = false;
    private boolean inCombat = false;
    private boolean ghost = false;
    private boolean bot = false;

    @Setter(AccessLevel.NONE)
    private boolean emergencyDropTriggered = false;

    private final List<PendingUpgrade> pendingUpgrades = new ArrayList<>();

    private record PendingUpgrade(String lineId, int starLevel) {}

    private final DataLoader dataLoader;
    private GameMode gameMode;

    public Player(String name, GameMode gameMode, DataLoader dataLoader, RandomProvider randomProvider) {
        this(name, gameMode, dataLoader, randomProvider, null, null);
    }

    public Player(
            String name,
            GameMode gameMode,
            DataLoader dataLoader,
            RandomProvider randomProvider,
            String analyticsClientId,
            String reconnectTokenHash) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.gameMode = gameMode;
        this.dataLoader = dataLoader;
        this.randomProvider = randomProvider;
        this.analyticsClientId = analyticsClientId == null || analyticsClientId.isBlank()
                ? UUID.randomUUID().toString()
                : analyticsClientId;
        this.reconnectTokenHash = reconnectTokenHash;
    }

    public void refreshShop() {
        if (shopLocked || gold < GameConstants.REROLL_COST) {
            return;
        }
        gold -= GameConstants.REROLL_COST;

        refreshShopFree();
    }

    public void refreshShopFree() {
        var availableUnits = dataLoader.getAllUnits(gameMode).stream()
                .filter(def -> !hasCompletedUnitLine(def.lineId()))
                .toList();
        shop = new ArrayList<>();
        for (var i = 0; i < GameConstants.SHOP_SIZE; i++) {
            shop.add(availableUnits.isEmpty() ? null : ShopOdds.rollUnit(level, availableUnits, randomProvider));
        }
    }

    public void resetForMode(GameMode mode) {
        this.gameMode = mode;
        this.shopLocked = false;
        this.boardLocked = false;
        this.inCombat = false;
        this.pendingUpgrades.clear();
        this.lootOrbs.clear();
        this.augmentChoices.clear();
        this.selectedAugments.clear();
        this.emergencyDropTriggered = false;
        bench.clearAll();
        removeAllUnits();
        refreshShopFree();
    }

    public void buyUnit(int shopIndex) {
        if (shopIndex < 0 || shopIndex >= shop.size()) return;
        var def = shop.get(shopIndex);

        if (def == null) return;
        if (hasCompletedUnitLine(def.lineId())) return;
        if (gold < def.cost()) return;

        var emptySlot = bench.findFirstEmptySlot();
        if (emptySlot.isEmpty()) return;

        gold -= def.cost();
        var newUnit = new StandardGameUnit(def);
        newUnit.setOwnerId(this.id);
        bench.set(emptySlot.get(), newUnit);
        shop.set(shopIndex, null);

        if (inCombat) {
            pendingUpgrades.add(new PendingUpgrade(def.lineId(), 1));
        } else {
            checkUpgrade(def.lineId(), 1);
        }
    }

    private void checkUpgrade(String lineId, int starLevel) {
        var requiredCopies = getRequiredCopiesForUpgrade(starLevel);
        if (requiredCopies == 0) {
            return;
        }

        var candidates = new ArrayList<GameUnit>();
        candidates.addAll(bench.units()
                .filter(u -> u.getLineId().equals(lineId) && u.getStarLevel() == starLevel)
                .toList());
        candidates.addAll(boardUnits.stream()
                .filter(u -> u.getLineId().equals(lineId) && u.getStarLevel() == starLevel)
                .toList());

        if (candidates.size() >= requiredCopies) {
            var unitsToRemove = candidates.subList(0, requiredCopies);
            var targetPosUnit = unitsToRemove.stream()
                    .filter(boardUnits::contains)
                    .findFirst()
                    .orElse(unitsToRemove.get(0));

            int x = targetPosUnit.getX();
            int y = targetPosUnit.getY();

            for (var u : unitsToRemove) {
                if (boardUnits.contains(u)) {
                    grid.removeUnit(u);
                }
            }
            for (var u : unitsToRemove) {
                bench.removeUnit(u);
            }
            boardUnits.removeAll(unitsToRemove);

            var def = dataLoader.getAllUnits(gameMode).stream()
                    .filter(d -> d.lineId().equals(lineId))
                    .findFirst()
                    .orElse(null);

            if (def != null) {
                var upgraded = new StandardGameUnit(def, starLevel + 1);
                upgraded.setOwnerId(this.id);

                if (boardUnits.contains(targetPosUnit) || (y >= 0 && grid.isEmpty(x, y))) {
                    if (grid.isValid(x, y) && grid.isEmpty(x, y)) {
                        grid.placeUnit(upgraded, x, y);
                        boardUnits.add(upgraded);
                    } else {
                        addToBench(upgraded);
                    }
                } else {
                    addToBench(upgraded);
                }

                checkUpgrade(lineId, starLevel + 1);
            }
        }
    }

    private int getRequiredCopiesForUpgrade(int starLevel) {
        return switch (starLevel) {
            case 1 -> GameConstants.COPIES_TO_UPGRADE_TO_TWO_STAR;
            case 2 -> GameConstants.COPIES_TO_UPGRADE_TO_THREE_STAR;
            default -> 0;
        };
    }

    public void gainGold(int amount) {
        this.gold += amount;
    }

    public void setAugmentChoices(List<AugmentOffer> choices) {
        this.augmentChoices.clear();
        this.augmentChoices.addAll(choices);
    }

    public void clearAugmentChoices() {
        this.augmentChoices.clear();
    }

    public void addSelectedAugment(SelectedAugment augment) {
        this.selectedAugments.add(augment);
    }

    public void sellUnit(String unitId, boolean allowBoardSell) {
        var benchEntry = bench.findUnit(unitId);
        if (benchEntry.isPresent()) {
            var unit = benchEntry.get().unit();
            var refund = calculateSellValue(unit);
            bench.clear(benchEntry.get().index());
            gold += refund;
            return;
        }

        if (!allowBoardSell) {
            return;
        }
        var boardUnit = boardUnits.stream()
                .filter(u -> u.getId().equals(unitId))
                .findFirst()
                .orElse(null);
        if (boardUnit != null) {
            var refund = calculateSellValue(boardUnit);
            grid.removeUnit(boardUnit);
            boardUnits.remove(boardUnit);
            gold += refund;
        }
    }

    boolean hasBenchUnit(String unitId) {
        return unitId != null && bench.findUnit(unitId).isPresent();
    }

    public int calculateSellValue(GameUnit unit) {
        var cost = unit.getCost();
        var starLevel = unit.getStarLevel();
        var copyCount =
                switch (starLevel) {
                    case 1 -> 1;
                    case 2 -> GameConstants.COPIES_TO_UPGRADE_TO_TWO_STAR;
                    default -> GameConstants.THREE_STAR_SELL_COPY_COUNT;
                };
        return cost * copyCount;
    }

    public void setInCombat(boolean inCombat) {
        this.inCombat = inCombat;
    }

    public void processPendingUpgrades() {
        var upgradesToProcess = new ArrayList<>(pendingUpgrades);
        pendingUpgrades.clear();
        for (var pending : upgradesToProcess) {
            checkUpgrade(pending.lineId(), pending.starLevel());
        }
    }

    public void addLootOrb(LootOrb orb) {
        this.lootOrbs.add(orb);
    }

    public void collectOrb(String orbId) {
        var orb =
                lootOrbs.stream().filter(o -> o.id().equals(orbId)).findFirst().orElse(null);

        if (orb != null) {
            lootOrbs.remove(orb);
            if (orb.type() == LootType.GOLD) {
                gainGold(orb.amount());
            } else if (orb.type() == LootType.UNIT) {
                var def = dataLoader.getAllUnits(gameMode).stream()
                        .filter(unit -> unit.id().equals(orb.contentId())
                                || unit.lineId().equals(orb.contentId())
                                || unit.name().equals(orb.contentId()))
                        .findFirst()
                        .orElse(null);
                if (def != null) {
                    if (hasCompletedUnitLine(def.lineId())) {
                        gainGold(def.cost());
                        return;
                    }
                    var unit = new StandardGameUnit(def);
                    unit.setOwnerId(this.id);
                    addToBenchOrRefund(unit, def.cost());
                }
            }
        }
    }

    boolean hasCompletedUnitLine(String lineId) {
        return ownedUnits()
                .anyMatch(
                        unit -> unit.getLineId().equals(lineId) && unit.getStarLevel() >= GameConstants.MAX_STAR_LEVEL);
    }

    private Stream<GameUnit> ownedUnits() {
        return Stream.concat(bench.units(), boardUnits.stream());
    }

    public void collectAllOrbs() {
        new ArrayList<>(lootOrbs).stream().map(LootOrb::id).forEach(this::collectOrb);
    }

    private void addToBenchOrRefund(GameUnit unit, int refundAmount) {
        var emptySlot = bench.findFirstEmptySlot();
        if (emptySlot.isPresent()) {
            bench.set(emptySlot.get(), unit);
            checkUpgrade(unit.getLineId(), unit.getStarLevel());
        } else {
            gainGold(refundAmount);
        }
    }

    private void addToBench(GameUnit unit) {
        bench.findFirstEmptySlot().ifPresent(slot -> bench.set(slot, unit));
    }

    public boolean buyXp() {
        if (level >= GameConstants.MAX_PLAYER_LEVEL || gold < GameConstants.XP_BUY_COST) return false;
        gainGold(-GameConstants.XP_BUY_COST);
        gainXp(GameConstants.XP_BUY_AMOUNT);
        return true;
    }

    public void gainXp(int amount) {
        if (level >= GameConstants.MAX_PLAYER_LEVEL) {
            xp = 0;
            return;
        }
        this.xp += amount;
        checkLevelUp();
    }

    public void takeDamage(int amount) {
        this.health = Math.max(0, this.health - amount);
    }

    public boolean triggerEmergencyDropIfEligible(int previousHealth) {
        if (emergencyDropTriggered
                || bot
                || ghost
                || previousHealth <= GameConstants.EMERGENCY_DROP_HEALTH_THRESHOLD
                || health <= 0
                || health > GameConstants.EMERGENCY_DROP_HEALTH_THRESHOLD) {
            return false;
        }
        emergencyDropTriggered = true;
        return true;
    }

    private void checkLevelUp() {
        while (level < GameConstants.MAX_PLAYER_LEVEL) {
            int xpNeeded = getXpNeededForLevel(this.level);
            if (this.xp >= xpNeeded) {
                this.xp -= xpNeeded;
                this.level++;
            } else {
                break;
            }
        }
        if (level >= GameConstants.MAX_PLAYER_LEVEL) {
            xp = 0;
        }
    }

    private int getXpNeededForLevel(int currentLevel) {
        return switch (currentLevel) {
            case 1 -> 2;
            case 2 -> 6;
            case 3 -> 10;
            case 4 -> 20;
            case 5 -> 26;
            case 6 -> 36;
            case 7 -> 44;
            case 8 -> 50;
            default -> 0;
        };
    }

    public int getNextLevelXp() {
        return getXpNeededForLevel(this.level);
    }

    public void setLevel(int level) {
        this.level = Math.clamp(level, 1, GameConstants.MAX_PLAYER_LEVEL);
        if (this.level >= GameConstants.MAX_PLAYER_LEVEL) {
            xp = 0;
        }
    }

    // ========== MOVE UNIT REFACTORED ==========

    public void moveUnit(String unitId, int x, int y) {
        if (boardLocked) return;
        if (y >= 0 && !grid.isValid(x, y)) return;

        var benchEntry = bench.findUnit(unitId);
        if (benchEntry.isPresent()) {
            handleBenchUnitMove(benchEntry.get(), x, y);
            return;
        }

        findBoardUnit(unitId).ifPresent(unit -> handleBoardUnitMove(unit, x, y));
    }

    private void handleBenchUnitMove(Bench.BenchEntry entry, int x, int y) {
        if (y >= 0) {
            moveBenchToBoard(entry, x, y);
        } else {
            swapBenchSlots(entry.index(), x);
        }
    }

    private void handleBoardUnitMove(GameUnit unit, int x, int y) {
        if (inCombat) return;

        if (y < 0) {
            moveBoardToBench(unit, x);
        } else if (grid.isValid(x, y)) {
            moveBoardToBoard(unit, x, y);
        }
    }

    private void moveBenchToBoard(Bench.BenchEntry entry, int x, int y) {
        if (inCombat) return;

        var benchUnit = entry.unit();
        var fromBenchIdx = entry.index();
        var targetUnit = grid.getUnitAt(x, y).orElse(null);

        if (targetUnit != null) {
            // Swap: Board unit goes to bench, bench unit goes to board
            grid.removeUnit(targetUnit);
            boardUnits.remove(targetUnit);
            targetUnit.setPosition(-1, -1);
            bench.set(fromBenchIdx, targetUnit);

            grid.placeUnit(benchUnit, x, y);
            boardUnits.add(benchUnit);
        } else {
            // Empty cell - standard move
            if (boardUnits.size() >= level) return; // Cap

            bench.clear(fromBenchIdx);
            grid.placeUnit(benchUnit, x, y);
            boardUnits.add(benchUnit);
        }
    }

    private void swapBenchSlots(int fromIdx, int toIdx) {
        if (toIdx >= 0 && toIdx < GameConstants.MAX_BENCH_SIZE && toIdx != fromIdx) {
            bench.swap(fromIdx, toIdx);
        }
    }

    private void moveBoardToBench(GameUnit unit, int targetSlot) {
        int targetBenchIdx = targetSlot;
        if (targetBenchIdx < 0 || targetBenchIdx >= GameConstants.MAX_BENCH_SIZE) {
            targetBenchIdx = bench.findFirstEmptySlot().orElse(-1);
        }

        if (targetBenchIdx == -1) return;

        var targetBenchUnit = bench.getOrNull(targetBenchIdx);
        if (targetBenchUnit != null) {
            // Swap: Bench unit goes to board at unit's position
            int oldX = unit.getX();
            int oldY = unit.getY();

            grid.removeUnit(unit);
            boardUnits.remove(unit);
            unit.setPosition(-1, -1);
            bench.set(targetBenchIdx, unit);

            grid.placeUnit(targetBenchUnit, oldX, oldY);
            boardUnits.add(targetBenchUnit);
        } else {
            // Place in empty bench slot
            grid.removeUnit(unit);
            boardUnits.remove(unit);
            unit.setPosition(-1, -1);
            bench.set(targetBenchIdx, unit);
        }
    }

    private void moveBoardToBoard(GameUnit unit, int x, int y) {
        if (unit.getX() == x && unit.getY() == y) return;
        int oldX = unit.getX();
        int oldY = unit.getY();

        var targetUnit = grid.getUnitAt(x, y).orElse(null);

        grid.removeUnit(unit);

        if (targetUnit != null) {
            // Swap: Move target to old position
            grid.removeUnit(targetUnit);
            grid.placeUnit(targetUnit, oldX, oldY);
        }

        grid.placeUnit(unit, x, y);
    }

    private java.util.Optional<GameUnit> findBoardUnit(String unitId) {
        return boardUnits.stream().filter(u -> u.getId().equals(unitId)).findFirst();
    }

    // ========== END MOVE UNIT REFACTORED ==========

    public void autoFillBoard() {
        int missingCapacity = this.level - this.boardUnits.size();
        if (missingCapacity <= 0) return;

        for (int i = 0; i < GameConstants.MAX_BENCH_SIZE && missingCapacity > 0; i++) {
            var unit = bench.getOrNull(i);
            if (unit != null) {
                boolean placed = false;
                for (int y = GameConstants.PLAYER_ROWS - 1; y >= 0 && !placed; y--) {
                    for (int x = 0; x < GameConstants.GRID_COLS && !placed; x++) {
                        if (grid.isEmpty(x, y)) {
                            bench.clear(i);
                            grid.placeUnit(unit, x, y);
                            boardUnits.add(unit);
                            placed = true;
                            missingCapacity--;
                        }
                    }
                }
            }
        }
    }

    public void removeAllUnits() {
        new ArrayList<>(boardUnits).forEach(u -> {
            grid.removeUnit(u);
            boardUnits.remove(u);
        });
    }

    public void addUnitToBoard(UnitDefinition def, int x, int y) {
        addUnitToBoard(def, x, y, 1);
    }

    public void addUnitToBoard(UnitDefinition def, int x, int y, int starLevel) {
        if (boardUnits.size() >= level) return;
        var unit = new StandardGameUnit(def, starLevel);
        unit.setOwnerId(this.id);
        if (grid.isValid(x, y) && grid.isEmpty(x, y)) {
            grid.placeUnit(unit, x, y);
            boardUnits.add(unit);
        }
    }

    public Player createGhost() {
        var ghostPlayer = new Player(this.name, this.gameMode, this.dataLoader, this.randomProvider);
        ghostPlayer.setGhost(true);
        ghostPlayer.setBot(this.bot);
        ghostPlayer.setHealth(this.health);
        ghostPlayer.setLevel(this.level);
        ghostPlayer.selectedAugments.addAll(this.selectedAugments);

        for (var unit : this.boardUnits) {
            var cloned = unit.cloneUnit();
            ghostPlayer.boardUnits.add(cloned);
            ghostPlayer.grid.placeUnit(cloned, cloned.getX(), cloned.getY());
        }
        return ghostPlayer;
    }

    public PlayerState toState() {
        return new PlayerState(
                id,
                name,
                health,
                gold,
                level,
                xp,
                getNextLevelXp(),
                place,
                combatSide,
                bench.toList(),
                new ArrayList<>(boardUnits),
                new ArrayList<>(shop),
                new ArrayList<>(lootOrbs),
                new ArrayList<>(augmentChoices),
                new ArrayList<>(selectedAugments),
                ghost);
    }

    // Legacy getter for backward compatibility with tests
    public List<GameUnit> getBench() {
        return bench.toList();
    }

    // Direct bench access for internal operations
    public Bench getBenchSlots() {
        return bench;
    }
}
