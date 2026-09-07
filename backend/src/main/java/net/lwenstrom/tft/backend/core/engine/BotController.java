package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.core.random.RandomProvider;

public final class BotController {
    static final int MAX_ACTIONS = 40;
    private final DataLoader dataLoader;
    private final RandomProvider random;
    private final Map<String, Integer> lastPlanningRound = new HashMap<>();

    public BotController(DataLoader dataLoader, RandomProvider random) {
        this.dataLoader = dataLoader;
        this.random = random;
    }

    public int plan(Player player, int round, AugmentManager augments) {
        if (!player.isBot()
                || player.isGhost()
                || player.getHealth() <= 0
                || player.isInCombat()
                || round <= lastPlanningRound.getOrDefault(player.getId(), 0)) return 0;
        lastPlanningRound.put(player.getId(), round);
        player.collectAllOrbs();
        var offers = player.getAugmentChoices();
        if (!offers.isEmpty()) {
            augments.selectAugment(
                    player, offers.get(random.nextInt(offers.size())).id(), round);
        }
        var evaluator = new BotTeamEvaluator(dataLoader.getTraitMetadata(player.getGameMode()));
        var reserve = player.getHealth() <= 30 ? 0 : Math.min(30, round * 5);
        var rerollLimit = player.getHealth() <= 30 ? 4 : 2;
        var actions = 0;
        var rerolls = 0;
        while (actions < MAX_ACTIONS) {
            arrangeBoard(player, evaluator);
            var purchase = choosePurchase(player, evaluator, reserve);
            if (purchase != null) {
                if (player.getBenchSlots().findFirstEmptySlot().isEmpty()) {
                    var sale = reserveToSell(player, purchase);
                    if (sale == null || actions + 2 > MAX_ACTIONS) break;
                    player.sellUnit(sale.getId(), false);
                    actions++;
                }
                player.buyUnit(purchase.shopIndex());
                actions++;
                continue;
            }
            var xpPurchases = purchasesToLevel(player);
            if (!player.getBenchSlots().isEmpty()
                    && xpPurchases > 0
                    && actions + xpPurchases <= MAX_ACTIONS
                    && player.getGold() - xpPurchases * GameConstants.XP_BUY_COST >= reserve) {
                for (var i = 0; i < xpPurchases; i++) {
                    player.buyXp();
                    actions++;
                }
                continue;
            }
            if (rerolls >= rerollLimit
                    || player.getGold() - GameConstants.REROLL_COST < reserve
                    || player.isShopLocked()
                    || player.getBenchSlots().findFirstEmptySlot().isEmpty()
                    || !canAffordRerolledUnit(player, reserve)) break;
            player.refreshShop();
            rerolls++;
            actions++;
        }
        arrangeBoard(player, evaluator);
        positionBoard(player);
        return actions;
    }

    private boolean canAffordRerolledUnit(Player player, int reserve) {
        var budget = player.getGold()
                - GameConstants.REROLL_COST
                - (player.getBoardUnits().size() < player.getLevel() ? 0 : reserve);
        return dataLoader.getAllUnits(player.getGameMode()).stream()
                .anyMatch(
                        definition -> definition.cost() <= budget && !player.hasCompletedUnitLine(definition.lineId()));
    }

    private int purchasesToLevel(Player player) {
        if (player.getLevel() >= GameConstants.MAX_PLAYER_LEVEL) return 0;
        return (player.getNextLevelXp() - player.getXp() + GameConstants.XP_BUY_AMOUNT - 1)
                / GameConstants.XP_BUY_AMOUNT;
    }

    private Purchase choosePurchase(Player player, BotTeamEvaluator evaluator, int reserve) {
        var purchases = new ArrayList<Purchase>();
        for (var index = 0; index < player.getShop().size(); index++) {
            var definition = player.getShop().get(index);
            if (definition == null
                    || player.hasCompletedUnitLine(definition.lineId())
                    || definition.cost() > player.getGold()) continue;
            var candidate = new StandardGameUnit(definition);
            var deployed = player.getBoardUnits().stream()
                    .anyMatch(unit -> unit.getLineId().equals(definition.lineId()));
            var oneStarCopies = owned(player)
                    .filter(unit -> unit.getLineId().equals(definition.lineId()))
                    .filter(unit -> unit.getStarLevel() == 1)
                    .count();
            var fillsSlot = player.getBoardUnits().size() < player.getLevel();
            if (!fillsSlot && player.getGold() - definition.cost() < reserve) continue;
            var improvedScore = bestAdditionScore(player.getBoardUnits(), candidate, player.getLevel(), evaluator);
            var improves = improvedScore.compareTo(evaluator.score(player.getBoardUnits())) > 0;
            var priority = deployed && oneStarCopies >= GameConstants.COPIES_TO_UPGRADE_TO_TWO_STAR - 1
                    ? 4
                    : fillsSlot ? 3 : improves ? 2 : deployed ? 1 : 0;
            if (priority == 0) continue;
            var purchase = new Purchase(index, definition.lineId(), priority, improvedScore);
            if (player.getBenchSlots().findFirstEmptySlot().isEmpty() && reserveToSell(player, purchase) == null)
                continue;
            purchases.add(purchase);
        }
        random.shuffle(purchases);
        return purchases.stream()
                .max(Comparator.comparingInt(Purchase::priority).thenComparing(Purchase::score))
                .orElse(null);
    }

    private GameUnit reserveToSell(Player player, Purchase purchase) {
        var deployed = player.getBoardUnits().stream().map(GameUnit::getLineId).toList();
        return player.getBenchSlots()
                .units()
                .filter(unit -> !unit.getLineId().equals(purchase.lineId()))
                .filter(unit ->
                        !deployed.contains(unit.getLineId()) || (purchase.priority() > 1 && unit.getStarLevel() == 1))
                .min(Comparator.comparingInt((GameUnit unit) -> deployed.contains(unit.getLineId()) ? 1 : 0)
                        .thenComparingInt(GameUnit::getStarLevel)
                        .thenComparingInt(GameUnit::getCost))
                .orElse(null);
    }

    private Stream<GameUnit> owned(Player player) {
        return Stream.concat(
                player.getBoardUnits().stream(), player.getBenchSlots().units());
    }

    private BotTeamEvaluator.Score bestAdditionScore(
            List<GameUnit> board, GameUnit candidate, int capacity, BotTeamEvaluator evaluator) {
        var best = evaluator.score(board);
        if (board.size() < capacity) {
            var expanded = new ArrayList<>(board);
            expanded.add(candidate);
            return evaluator.score(expanded);
        }
        for (var index = 0; index < board.size(); index++) {
            var replacement = new ArrayList<>(board);
            replacement.set(index, candidate);
            var score = evaluator.score(replacement);
            if (score.compareTo(best) > 0) best = score;
        }
        return best;
    }

    private void arrangeBoard(Player player, BotTeamEvaluator evaluator) {
        for (var pass = 0; pass < GameConstants.MAX_BENCH_SIZE + GameConstants.MAX_PLAYER_LEVEL; pass++) {
            var board = player.getBoardUnits();
            var bestScore = evaluator.score(board);
            GameUnit incoming = null;
            GameUnit outgoing = null;
            var candidates = new ArrayList<>(player.getBenchSlots().units().toList());
            random.shuffle(candidates);
            for (var candidate : candidates) {
                if (board.size() < player.getLevel()) {
                    var expanded = new ArrayList<>(board);
                    expanded.add(candidate);
                    var score = evaluator.score(expanded);
                    if (score.compareTo(bestScore) > 0) {
                        bestScore = score;
                        incoming = candidate;
                        outgoing = null;
                    }
                } else {
                    for (var index = 0; index < board.size(); index++) {
                        var replacement = new ArrayList<>(board);
                        replacement.set(index, candidate);
                        var score = evaluator.score(replacement);
                        if (score.compareTo(bestScore) > 0) {
                            bestScore = score;
                            incoming = candidate;
                            outgoing = board.get(index);
                        }
                    }
                }
            }
            if (incoming == null) return;
            if (outgoing != null) player.moveUnit(incoming.getId(), outgoing.getX(), outgoing.getY());
            else {
                var cell = emptyCell(board);
                player.moveUnit(incoming.getId(), cell % Grid.COLS, cell / Grid.COLS);
            }
        }
    }

    private int emptyCell(List<GameUnit> board) {
        for (var cell = 0; cell < Grid.COLS * Grid.PLAYER_ROWS; cell++) {
            var x = cell % Grid.COLS;
            var y = cell / Grid.COLS;
            if (board.stream().noneMatch(unit -> unit.getX() == x && unit.getY() == y)) return cell;
        }
        throw new IllegalStateException("No legal bot board position");
    }

    private void positionBoard(Player player) {
        var units = new ArrayList<>(player.getBoardUnits());
        units.sort(Comparator.comparingInt(
                        (GameUnit unit) -> unit.getRole() == UnitRole.TANK ? 0 : unit.getRange() == 1 ? 1 : 2)
                .thenComparing(GameUnit::getDefinitionId));
        var front = 0;
        var back = 0;
        int[] columns = {4, 3, 5, 2, 6, 1, 7, 0, 8};
        for (var unit : units) {
            var frontline = unit.getRole() == UnitRole.TANK || unit.getRange() == 1;
            player.moveUnit(unit.getId(), columns[frontline ? front++ : back++], frontline ? 0 : Grid.PLAYER_ROWS - 1);
        }
    }

    private record Purchase(int shopIndex, String lineId, int priority, BotTeamEvaluator.Score score) {}
}
