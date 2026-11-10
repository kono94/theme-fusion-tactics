package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.AugmentOffer;
import net.lwenstrom.tft.backend.core.model.BotPersonality;
import net.lwenstrom.tft.backend.core.model.GameItem;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameState.PlayerState;
import net.lwenstrom.tft.backend.core.model.GameState.UnitStats;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.ItemInstance;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.model.MatchStats;
import net.lwenstrom.tft.backend.core.model.MatchStats.RoundOutcome;
import net.lwenstrom.tft.backend.core.model.MatchStats.RoundResult;
import net.lwenstrom.tft.backend.core.model.SelectedAugment;
import net.lwenstrom.tft.backend.core.model.UnitCombatStats;
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
    private final List<GameItem> inventory = new ArrayList<>();
    private int itemSlotsPerUnit = GameConstants.DEFAULT_ITEM_SLOTS;
    private int rerollCost = GameConstants.REROLL_COST;
    private final List<AugmentOffer> augmentChoices = new ArrayList<>();
    private final List<SelectedAugment> selectedAugments = new ArrayList<>();

    private List<UnitDefinition> shop = new ArrayList<>();
    private boolean shopLocked = false;
    private boolean boardLocked = false;
    private boolean inCombat = false;
    private boolean ghost = false;
    private boolean bot = false;
    private BotPersonality botPersonality;

    private int totalDamageDealt;
    private int totalDamageTaken;
    private int totalHealingDone;
    private int totalShieldingDone;
    private int roundsWon;
    private int roundsLost;
    private int roundsDrawn;
    private final List<RoundResult> roundResults = new ArrayList<>();
    private final Map<String, UnitCombatStats> unitCombatTotals = new LinkedHashMap<>();

    @Setter(AccessLevel.NONE)
    private boolean emergencyDropTriggered = false;

    private final List<PendingUpgrade> pendingUpgrades = new ArrayList<>();
    private final Map<String, String> lockedVariants = new HashMap<>();

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
        if (shopLocked || gold < rerollCost) {
            return;
        }
        gold -= rerollCost;

        refreshShopFree();
    }

    public void refreshShopForNewRound() {
        if (!shopLocked) {
            refreshShopFree();
        }
    }

    public void refreshShopFree() {
        var availableUnits = VariantGroups.collapse(dataLoader.getAllUnits(gameMode).stream()
                .filter(def -> !hasCompletedUnitLine(def.lineId()))
                .toList());
        shop = new ArrayList<>();
        for (var i = 0; i < GameConstants.SHOP_SIZE; i++) {
            shop.add(
                    availableUnits.isEmpty()
                            ? null
                            : resolveVariant(ShopOdds.rollUnit(level, availableUnits, randomProvider)));
        }
    }

    UnitDefinition resolveVariant(UnitDefinition def) {
        if (def == null || def.variantGroup() == null) {
            return def;
        }
        var locked = lockedVariant(def.variantGroup());
        if (locked != null) {
            return locked;
        }
        var variants = dataLoader.getVariants(gameMode, def.variantGroup());
        return variants.isEmpty() ? def : VariantGroups.pickWeighted(variants, randomProvider);
    }

    private UnitDefinition lockedVariant(String variantGroup) {
        var lockedId = lockedVariants.get(variantGroup);
        if (lockedId == null) {
            return null;
        }
        return dataLoader.getVariants(gameMode, variantGroup).stream()
                .filter(variant -> variant.id().equals(lockedId))
                .findFirst()
                .orElse(null);
    }

    private UnitDefinition applyVariantLock(UnitDefinition def) {
        if (def == null || def.variantGroup() == null) {
            return def;
        }
        var locked = lockedVariant(def.variantGroup());
        return locked != null ? locked : def;
    }

    private void lockVariant(UnitDefinition def) {
        if (def.variantGroup() == null) {
            return;
        }
        lockedVariants.putIfAbsent(def.variantGroup(), def.id());
        var locked = lockedVariant(def.variantGroup());
        if (locked == null) {
            return;
        }
        for (var i = 0; i < shop.size(); i++) {
            var offer = shop.get(i);
            if (offer != null
                    && locked.variantGroup().equals(offer.variantGroup())
                    && !offer.id().equals(locked.id())) {
                shop.set(i, locked);
            }
        }
    }

    private void releaseUnusedVariantLocks() {
        lockedVariants.entrySet().removeIf(entry -> {
            var locked = lockedVariant(entry.getKey());
            var lineId = locked != null ? locked.lineId() : entry.getKey();
            return ownedUnits().noneMatch(unit -> unit.getLineId().equals(lineId))
                    && pendingUpgrades.stream()
                            .noneMatch(pending -> pending.lineId().equals(lineId));
        });
    }

    public void resetForMode(GameMode mode) {
        this.gameMode = mode;
        this.shopLocked = false;
        this.boardLocked = false;
        this.inCombat = false;
        this.pendingUpgrades.clear();
        this.lockedVariants.clear();
        this.lootOrbs.clear();
        this.inventory.clear();
        this.augmentChoices.clear();
        this.selectedAugments.clear();
        resetMatchStats();
        this.emergencyDropTriggered = false;
        bench.clearAll();
        removeAllUnits();
        refreshShopFree();
    }

    public void buyUnit(int shopIndex) {
        if (shopIndex < 0 || shopIndex >= shop.size()) return;
        var def = applyVariantLock(shop.get(shopIndex));

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
        lockVariant(def);

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

            var carriedItems = new ArrayList<GameItem>(targetPosUnit.getItems());
            unitsToRemove.stream()
                    .filter(unit -> unit != targetPosUnit)
                    .forEach(unit -> carriedItems.addAll(unit.getItems()));

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

            var def = definitionFor(targetPosUnit);
            if (def != null) {
                var upgraded =
                        new StandardGameUnit(def, starLevel + 1, inheritedBranchId(targetPosUnit, unitsToRemove));
                upgraded.setOwnerId(this.id);
                carriedItems.stream().limit(itemSlotsPerUnit).forEach(upgraded.getItems()::add);
                carriedItems.stream().skip(itemSlotsPerUnit).forEach(inventory::add);

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

    private static String inheritedBranchId(GameUnit survivor, List<GameUnit> mergedUnits) {
        if (survivor.getBranchId() != null) {
            return survivor.getBranchId();
        }
        return mergedUnits.stream()
                .map(GameUnit::getBranchId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    public boolean chooseEvolution(String unitId, String branchId) {
        if (unitId == null || branchId == null) {
            return false;
        }
        var unit = ownedUnits()
                .filter(candidate -> candidate.getId().equals(unitId))
                .findFirst()
                .orElse(null);
        if (unit == null || unit.getBranchId() != null) {
            return false;
        }
        var def = definitionFor(unit);
        if (def == null || !def.isPending(unit.getStarLevel(), null) || !def.offersBranch(branchId)) {
            return false;
        }

        var evolved = new StandardGameUnit(def, unit.getStarLevel(), branchId);
        evolved.setOwnerId(this.id);
        evolved.getItems().addAll(unit.getItems());

        var benchEntry = bench.findUnit(unitId);
        if (benchEntry.isPresent()) {
            bench.set(benchEntry.get().index(), evolved);
            return true;
        }
        var boardIndex = boardUnits.indexOf(unit);
        var x = unit.getX();
        var y = unit.getY();
        var occupant = grid.getUnitAt(x, y).orElse(null);
        if (boardIndex < 0 || !grid.isValid(x, y) || (occupant != null && occupant != unit)) {
            return false;
        }
        grid.removeUnit(unit);
        grid.placeUnit(evolved, x, y);
        boardUnits.set(boardIndex, evolved);
        return true;
    }

    UnitDefinition definitionFor(GameUnit unit) {
        var lineDefinitions = dataLoader.getAllUnits(gameMode).stream()
                .filter(def -> def.lineId().equals(unit.getLineId()))
                .toList();
        return lineDefinitions.stream()
                .filter(def -> def.id().equals(unit.getDefinitionId()))
                .findFirst()
                .orElse(lineDefinitions.isEmpty() ? null : lineDefinitions.getFirst());
    }

    UnitDefinition findLineDefinition(String lineId) {
        return dataLoader.getAllUnits(gameMode).stream()
                .filter(d -> d.lineId().equals(lineId))
                .findFirst()
                .orElse(null);
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
            inventory.addAll(unit.getItems());
            bench.clear(benchEntry.get().index());
            gold += refund;
            releaseUnusedVariantLocks();
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
            inventory.addAll(boardUnit.getItems());
            grid.removeUnit(boardUnit);
            boardUnits.remove(boardUnit);
            gold += refund;
            releaseUnusedVariantLocks();
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
        releaseUnusedVariantLocks();
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
                def = applyVariantLock(def);
                if (def != null) {
                    if (hasCompletedUnitLine(def.lineId())) {
                        gainGold(def.cost());
                        return;
                    }
                    var unit = new StandardGameUnit(def);
                    unit.setOwnerId(this.id);
                    if (addToBenchOrRefund(unit, def.cost())) {
                        lockVariant(def);
                    }
                }
            } else if (orb.type() == LootType.ITEM) {
                dataLoader
                        .getItem(gameMode, orb.contentId())
                        .map(ItemInstance::from)
                        .ifPresent(inventory::add);
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

    public boolean moveItem(String itemInstanceId, String targetUnitId) {
        var from = ownedUnits()
                .map(GameUnit::getItems)
                .filter(items -> findItem(items, itemInstanceId).isPresent())
                .findFirst()
                .orElse(inventory);
        var item = findItem(from, itemInstanceId);
        if (item.isEmpty()) return false;

        var to = inventory;
        if (targetUnitId != null) {
            var target = ownedUnits()
                    .filter(unit -> unit.getId().equals(targetUnitId))
                    .findFirst();
            if (target.isEmpty() || target.get().getItems().size() >= itemSlotsPerUnit) return false;
            to = target.get().getItems();
        }
        if (from == to) return false;

        from.remove(item.get());
        to.add(item.get());
        return true;
    }

    private static Optional<GameItem> findItem(List<GameItem> items, String instanceId) {
        return items.stream()
                .filter(item -> item.getInstanceId().equals(instanceId))
                .findFirst();
    }

    public void collectAllOrbs() {
        new ArrayList<>(lootOrbs).stream().map(LootOrb::id).forEach(this::collectOrb);
    }

    private boolean addToBenchOrRefund(GameUnit unit, int refundAmount) {
        var emptySlot = bench.findFirstEmptySlot();
        if (emptySlot.isPresent()) {
            bench.set(emptySlot.get(), unit);
            checkUpgrade(unit.getLineId(), unit.getStarLevel());
            return true;
        }
        gainGold(refundAmount);
        return false;
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
        addUnitToBoard(def, x, y, starLevel, null);
    }

    public void addUnitToBoard(UnitDefinition def, int x, int y, int starLevel, String branchId) {
        if (boardUnits.size() >= level) return;
        var unit = new StandardGameUnit(def, starLevel, branchId);
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
            cloned.setOwnerId(ghostPlayer.id);
            ghostPlayer.boardUnits.add(cloned);
            ghostPlayer.grid.placeUnit(cloned, cloned.getX(), cloned.getY());
        }
        return ghostPlayer;
    }

    public void recordMatchRound(int round, RoundOutcome outcome, int damageDealt, int healingDone, int shieldingDone) {
        totalDamageDealt += damageDealt;
        totalHealingDone += healingDone;
        totalShieldingDone += shieldingDone;
        recordRoundOutcome(round, outcome);
    }

    public void recordMatchRound(int round, RoundOutcome outcome, List<UnitCombatStats> unitStats) {
        totalDamageDealt +=
                unitStats.stream().mapToInt(UnitCombatStats::damageDealt).sum();
        totalDamageTaken +=
                unitStats.stream().mapToInt(UnitCombatStats::damageTaken).sum();
        totalHealingDone +=
                unitStats.stream().mapToInt(UnitCombatStats::healingDone).sum();
        totalShieldingDone +=
                unitStats.stream().mapToInt(UnitCombatStats::shieldingDone).sum();
        unitStats.forEach(stats -> unitCombatTotals.merge(stats.lineId(), stats, UnitCombatStats::add));
        recordRoundOutcome(round, outcome);
    }

    private void recordRoundOutcome(int round, RoundOutcome outcome) {
        switch (outcome) {
            case WIN -> roundsWon++;
            case LOSS -> roundsLost++;
            case DRAW -> roundsDrawn++;
        }
        roundResults.add(new RoundResult(round, outcome));
    }

    private void resetMatchStats() {
        totalDamageDealt = 0;
        totalDamageTaken = 0;
        totalHealingDone = 0;
        totalShieldingDone = 0;
        roundsWon = 0;
        roundsLost = 0;
        roundsDrawn = 0;
        roundResults.clear();
        unitCombatTotals.clear();
    }

    public MatchStats getMatchStats() {
        return new MatchStats(
                totalDamageDealt,
                totalDamageTaken,
                totalHealingDone,
                totalShieldingDone,
                roundsWon,
                roundsLost,
                roundsDrawn,
                roundResults,
                new ArrayList<>(unitCombatTotals.values()));
    }

    public PlayerState toState() {
        return toState(Map.of());
    }

    public void refreshWildcardTraits() {
        var wildcardIds = dataLoader.getAllUnits(gameMode).stream()
                .filter(UnitDefinition::hasWildcardTrait)
                .map(UnitDefinition::id)
                .collect(Collectors.toSet());
        if (wildcardIds.isEmpty()) {
            return;
        }
        var wildcardUnits = ownedUnits()
                .filter(unit -> wildcardIds.contains(unit.getDefinitionId()))
                .toList();
        for (var unit : wildcardUnits) {
            var baseTraits = definitionFor(unit)
                    .formAt(unit.getStarLevel(), unit.getBranchId())
                    .traits();
            var traits = unit.getTraits();
            traits.clear();
            traits.addAll(baseTraits);
            dominantBoardTrait(unit.getLineId(), baseTraits, wildcardIds).ifPresent(traits::add);
        }
    }

    // Copies the trait carried by the most distinct lines on the board; ties resolve in the mode's trait order.
    private Optional<String> dominantBoardTrait(String ownLineId, List<String> ownTraits, Set<String> wildcardIds) {
        var excluded = new HashSet<String>();
        ownTraits.forEach(trait -> excluded.add(TraitManager.normalizeTraitId(trait)));
        var linesByTrait = new HashMap<String, Set<String>>();
        for (var unit : boardUnits) {
            if (unit.getLineId().equals(ownLineId) || wildcardIds.contains(unit.getDefinitionId())) continue;
            for (var trait : unit.getTraits()) {
                var traitId = TraitManager.normalizeTraitId(trait);
                if (!excluded.contains(traitId)) {
                    linesByTrait
                            .computeIfAbsent(traitId, ignored -> new HashSet<>())
                            .add(unit.getLineId());
                }
            }
        }
        String best = null;
        var bestCount = 0;
        for (var trait : dataLoader.getTraitDefinitions(gameMode)) {
            var count = linesByTrait
                    .getOrDefault(TraitManager.normalizeTraitId(trait.id()), Set.of())
                    .size();
            if (count > bestCount) {
                best = trait.name();
                bestCount = count;
            }
        }
        return Optional.ofNullable(best);
    }

    public PlayerState toState(Map<String, UnitStats> statPreviews) {
        if (!inCombat) {
            refreshWildcardTraits();
        }
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
                ghost,
                bot,
                botPersonality,
                getMatchStats(),
                new ArrayList<>(inventory),
                statPreviews);
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
