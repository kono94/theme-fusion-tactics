package net.lwenstrom.tft.backend.core.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.random.RandomProvider;

final class EvolutionPicker {
    private EvolutionPicker() {}

    static void resolvePendingBoardUnits(Player player, BotTeamEvaluator evaluator, RandomProvider random) {
        var board = player.getBoardUnits();
        for (var index = 0; index < board.size(); index++) {
            var unit = board.get(index);
            if (!unit.isEvolutionPending()) continue;
            var boardIndex = index;
            pick(player, unit, evaluator, random, candidate -> {
                var resulting = new ArrayList<>(player.getBoardUnits());
                resulting.set(boardIndex, candidate);
                return resulting;
            });
        }
    }

    static void resolvePendingUnits(Player player, BotTeamEvaluator evaluator, RandomProvider random) {
        resolvePendingBoardUnits(player, evaluator, random);
        for (var unit : player.getBenchSlots().units().toList()) {
            if (!unit.isEvolutionPending()) continue;
            pick(player, unit, evaluator, random, candidate -> {
                var resulting = new ArrayList<>(player.getBoardUnits());
                resulting.add(candidate);
                return resulting;
            });
        }
    }

    private static void pick(
            Player player,
            GameUnit unit,
            BotTeamEvaluator evaluator,
            RandomProvider random,
            Function<GameUnit, List<GameUnit>> resultingBoard) {
        var def = player.definitionFor(unit);
        if (def == null) return;
        var best = new ArrayList<String>();
        BotTeamEvaluator.Score bestScore = null;
        for (var branchId : def.variantsAt(unit.getStarLevel())) {
            var candidate = new StandardGameUnit(def, unit.getStarLevel(), branchId);
            var score = evaluator.score(resultingBoard.apply(candidate));
            var comparison = bestScore == null ? 1 : evaluator.compare(score, bestScore);
            if (comparison > 0) {
                best.clear();
                bestScore = score;
            }
            if (comparison >= 0) best.add(branchId);
        }
        if (best.isEmpty()) return;
        // The RNG is only consulted on ties so seeded runs without branching lines never draw extra numbers.
        var chosen = best.size() == 1 ? best.get(0) : best.get(random.nextInt(best.size()));
        player.chooseEvolution(unit.getId(), chosen);
    }
}
