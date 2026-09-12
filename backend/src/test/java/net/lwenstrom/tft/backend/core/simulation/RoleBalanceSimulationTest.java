package net.lwenstrom.tft.backend.core.simulation;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;
import java.util.stream.IntStream;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;

class RoleBalanceSimulationTest {
    private static final List<Integer> BOARD_SIZES = List.of(3, 4, 5, 6, 7);
    private static final Map<Integer, Double> MIN_BALANCED_WIN_RATE = Map.of(4, 0.50, 5, 0.60, 6, 0.65, 7, 0.65);
    private static final Map<Integer, List<UnitRole>> BALANCED_LAYOUTS = Map.of(
            3, List.of(UnitRole.DAMAGE, UnitRole.TANK, UnitRole.SUPPORT),
            4, List.of(UnitRole.DAMAGE, UnitRole.DAMAGE, UnitRole.TANK, UnitRole.SUPPORT),
            5, List.of(UnitRole.DAMAGE, UnitRole.DAMAGE, UnitRole.TANK, UnitRole.TANK, UnitRole.SUPPORT),
            6,
                    List.of(
                            UnitRole.DAMAGE,
                            UnitRole.DAMAGE,
                            UnitRole.DAMAGE,
                            UnitRole.TANK,
                            UnitRole.TANK,
                            UnitRole.SUPPORT),
            7,
                    List.of(
                            UnitRole.DAMAGE,
                            UnitRole.DAMAGE,
                            UnitRole.DAMAGE,
                            UnitRole.TANK,
                            UnitRole.TANK,
                            UnitRole.SUPPORT,
                            UnitRole.SUPPORT));

    @Test
    void balancedBoardsBeatDamageOnlyBoardsAtTargetRate() throws IOException {
        assumeTrue(Boolean.getBoolean("simulation.role-report"));

        var fixture = SimulationTestSupport.createFixture();
        var runsPerMode = Integer.getInteger("simulation.runs", 100_000);
        var seed = Long.getLong("simulation.seed", 42L);
        var summaries = new ConcurrentHashMap<SummaryKey, Summary>();
        var unitSummaries = new ConcurrentHashMap<UnitSummaryKey, Summary>();

        for (var mode : GameMode.values()) {
            var definitions = fixture.dataLoader().getAllUnits(mode);
            IntStream.range(0, runsPerMode).parallel().forEach(index -> {
                var boardSize = BOARD_SIZES.get(index % BOARD_SIZES.size());
                var starLevel = 1 + (index / BOARD_SIZES.size()) % 3;
                var random = new Random(seed + index * 104_729L + mode.ordinal() * 1_000_003L);
                var matchup = createMatchup(definitions, boardSize, starLevel, random, index);
                var result = fixture.simulator()
                        .simulate(new CombatSimulationRequest(
                                mode, matchup.balanced(), matchup.damageOnly(), 1, random.nextLong()));
                var balancedWins = result.boardOneWins();
                var damageWins = result.boardTwoWins();
                var draws = result.draws();
                summaries
                        .computeIfAbsent(new SummaryKey(mode, boardSize), ignored -> new Summary())
                        .record(balancedWins, damageWins, draws);
                matchup.balancedUnits().forEach(unit -> unitSummaries
                        .computeIfAbsent(
                                new UnitSummaryKey(
                                        mode, unit.lineId(), unit.name(), unit.cost(), unit.starLevel(), unit.role()),
                                ignored -> new Summary())
                        .record(balancedWins, damageWins, draws));
            });
        }

        writeReport(summaries, unitSummaries, runsPerMode, seed);
        assertTargetRates(summaries);
    }

    private Matchup createMatchup(
            List<UnitDefinition> definitions, int boardSize, int starLevel, Random random, int index) {
        var balancedDefinitions = new ArrayList<UnitDefinition>();
        var damageDefinitions = new ArrayList<UnitDefinition>();
        var balancedIds = new HashSet<String>();
        var damageIds = new HashSet<String>();

        for (var role : BALANCED_LAYOUTS.get(boardSize)) {
            var roleCandidates = definitions.stream()
                    .filter(definition -> definition.getRole(starLevel) == role)
                    .filter(definition -> !balancedIds.contains(definition.lineId()))
                    .filter(definition ->
                            hasDamageCandidateAtCost(definitions, definition.cost(), starLevel, damageIds))
                    .toList();
            var balanced = roleCandidates.get(random.nextInt(roleCandidates.size()));
            var damageCandidates = definitions.stream()
                    .filter(definition -> definition.cost() == balanced.cost())
                    .filter(definition -> definition.getRole(starLevel) == UnitRole.DAMAGE)
                    .filter(definition -> !damageIds.contains(definition.lineId()))
                    .toList();
            var damage = damageCandidates.get(random.nextInt(damageCandidates.size()));

            balancedDefinitions.add(balanced);
            damageDefinitions.add(damage);
            balancedIds.add(balanced.lineId());
            damageIds.add(damage.lineId());
        }

        return new Matchup(
                new BoardSpec("Balanced " + index, boardSize, positionBalancedUnits(balancedDefinitions, starLevel)),
                new BoardSpec("Damage " + index, boardSize, positionDamageUnits(damageDefinitions, starLevel)),
                balancedDefinitions.stream()
                        .map(definition -> new SelectedUnit(
                                definition.lineId(),
                                definition.getName(starLevel),
                                definition.cost(),
                                starLevel,
                                definition.getRole(starLevel)))
                        .toList());
    }

    private boolean hasDamageCandidateAtCost(
            List<UnitDefinition> definitions, int cost, int starLevel, Set<String> selectedIds) {
        return definitions.stream()
                .anyMatch(definition -> definition.cost() == cost
                        && definition.getRole(starLevel) == UnitRole.DAMAGE
                        && !selectedIds.contains(definition.lineId()));
    }

    private List<UnitSpec> positionBalancedUnits(List<UnitDefinition> definitions, int starLevel) {
        var specs = new ArrayList<UnitSpec>();
        var frontIndex = 0;
        var backIndex = 0;

        for (var definition : definitions) {
            var role = definition.getRole(starLevel);
            var isTank = role == UnitRole.TANK;
            var x = isTank ? 3 + frontIndex++ : 2 + backIndex++;
            var y = isTank ? 0 : 2;
            specs.add(new UnitSpec(definition.id(), starLevel, x, y));
        }
        return specs;
    }

    private List<UnitSpec> positionDamageUnits(List<UnitDefinition> definitions, int starLevel) {
        var specs = new ArrayList<UnitSpec>();
        var frontIndex = 0;
        var backIndex = 0;

        for (var definition : definitions) {
            var ranged = definition.getActiveRange(starLevel) > 1;
            var x = ranged ? 2 + backIndex++ : 3 + frontIndex++;
            var y = ranged ? 2 : 0;
            specs.add(new UnitSpec(definition.id(), starLevel, x, y));
        }
        return specs;
    }

    private void assertTargetRates(Map<SummaryKey, Summary> summaries) {
        for (var mode : GameMode.values()) {
            var modeSummary = new Summary();
            for (var boardSize : BOARD_SIZES) {
                var summary = summaries.get(new SummaryKey(mode, boardSize));
                var rate = summary.balancedWinRate();
                if (boardSize == 3) {
                    var damageWinRate = summary.damageWinRate();
                    assertTrue(
                            damageWinRate >= 0.35,
                            () -> mode + " board size 3 Damage-only win rate was " + formatPercent(damageWinRate)
                                    + ", expected at least 35%");
                } else {
                    var minimum = MIN_BALANCED_WIN_RATE.get(boardSize);
                    assertTrue(
                            rate >= minimum,
                            () -> mode + " board size " + boardSize + " balanced win rate was "
                                    + formatPercent(rate) + ", expected at least "
                                    + formatPercent(minimum));
                }
                modeSummary.add(summary);
            }
            var aggregateRate = modeSummary.balancedWinRate();
            assertTrue(
                    aggregateRate >= 0.60 && aggregateRate <= 0.70,
                    () -> mode + " aggregate balanced win rate was " + formatPercent(aggregateRate)
                            + ", expected 60-70%");
        }
    }

    private void writeReport(
            Map<SummaryKey, Summary> summaries, Map<UnitSummaryKey, Summary> unitSummaries, int runsPerMode, long seed)
            throws IOException {
        var outputDir = Path.of("target", "simulation-reports");
        Files.createDirectories(outputDir);
        var markdown = new StringBuilder()
                .append("# Role Balance Simulation Report\n\n")
                .append("- Seed: ")
                .append(seed)
                .append("\n- Matchups per mode: ")
                .append(runsPerMode)
                .append("\n- Comparison: equal-cost, equal-star balanced boards vs Damage-only boards\n")
                .append(
                        "- Targets: Damage-only remains viable at size 3; balanced advantage ramps from size 4 and is strongest at 6–7\n\n")
                .append("| Mode | Board size | Balanced wins | Damage wins | Draws | Balanced win rate |\n")
                .append("|---|---:|---:|---:|---:|---:|\n");

        for (var mode : GameMode.values()) {
            for (var boardSize : BOARD_SIZES) {
                var summary = summaries.get(new SummaryKey(mode, boardSize));
                markdown.append("| ")
                        .append(mode.name().toLowerCase(Locale.ROOT))
                        .append(" | ")
                        .append(boardSize)
                        .append(" | ")
                        .append(summary.balancedWins.sum())
                        .append(" | ")
                        .append(summary.damageWins.sum())
                        .append(" | ")
                        .append(summary.draws.sum())
                        .append(" | ")
                        .append(formatPercent(summary.balancedWinRate()))
                        .append(" |\n");
            }
        }

        markdown.append("\n## Balanced-unit impact\n\n")
                .append(
                        "| Mode | Cost | Star | Role | Unit / form | Appearances | Team win rate | Role/cost-tier delta |\n")
                .append("|---|---:|---:|---|---|---:|---:|---:|\n");
        var costTierRates = costTierRates(unitSummaries);
        unitSummaries.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(UnitSummaryKey::mode)
                        .thenComparingInt(UnitSummaryKey::cost)
                        .thenComparingInt(UnitSummaryKey::starLevel)
                        .thenComparing(UnitSummaryKey::role)
                        .thenComparing(UnitSummaryKey::name)))
                .forEach(entry -> {
                    var key = entry.getKey();
                    var summary = entry.getValue();
                    var tierRate =
                            costTierRates.get(new CostTierKey(key.mode(), key.cost(), key.starLevel(), key.role()));
                    markdown.append("| ")
                            .append(key.mode().name().toLowerCase(Locale.ROOT))
                            .append(" | ")
                            .append(key.cost())
                            .append(" | ")
                            .append(key.starLevel())
                            .append("★ | ")
                            .append(key.role())
                            .append(" | ")
                            .append(key.name())
                            .append(" | ")
                            .append(summary.appearances())
                            .append(" | ")
                            .append(formatPercent(summary.balancedWinRate()))
                            .append(" | ")
                            .append(String.format(
                                    Locale.ROOT, "%+.2f pp", (summary.balancedWinRate() - tierRate) * 100))
                            .append(" |\n");
                });

        Files.writeString(outputDir.resolve("role-balance-report.md"), markdown);
    }

    private Map<CostTierKey, Double> costTierRates(Map<UnitSummaryKey, Summary> unitSummaries) {
        var tierSummaries = new LinkedHashMap<CostTierKey, Summary>();
        unitSummaries.forEach((key, summary) -> tierSummaries
                .computeIfAbsent(
                        new CostTierKey(key.mode(), key.cost(), key.starLevel(), key.role()), ignored -> new Summary())
                .add(summary));
        var rates = new LinkedHashMap<CostTierKey, Double>();
        tierSummaries.forEach((key, summary) -> rates.put(key, summary.balancedWinRate()));
        return rates;
    }

    private String formatPercent(double value) {
        return String.format(Locale.ROOT, "%.2f%%", value * 100);
    }

    private record Matchup(BoardSpec balanced, BoardSpec damageOnly, List<SelectedUnit> balancedUnits) {}

    private record SelectedUnit(String lineId, String name, int cost, int starLevel, UnitRole role) {}

    private record SummaryKey(GameMode mode, int boardSize) {}

    private record UnitSummaryKey(GameMode mode, String lineId, String name, int cost, int starLevel, UnitRole role) {}

    private record CostTierKey(GameMode mode, int cost, int starLevel, UnitRole role) {}

    private static final class Summary {
        private final LongAdder balancedWins = new LongAdder();
        private final LongAdder damageWins = new LongAdder();
        private final LongAdder draws = new LongAdder();

        private void record(int balanced, int damage, int draw) {
            balancedWins.add(balanced);
            damageWins.add(damage);
            draws.add(draw);
        }

        private void add(Summary other) {
            balancedWins.add(other.balancedWins.sum());
            damageWins.add(other.damageWins.sum());
            draws.add(other.draws.sum());
        }

        private double balancedWinRate() {
            var total = appearances();
            return total == 0 ? 0 : (double) balancedWins.sum() / total;
        }

        private double damageWinRate() {
            var total = appearances();
            return total == 0 ? 0 : (double) damageWins.sum() / total;
        }

        private long appearances() {
            return balancedWins.sum() + damageWins.sum() + draws.sum();
        }
    }
}
