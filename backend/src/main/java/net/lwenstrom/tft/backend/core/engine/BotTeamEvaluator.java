package net.lwenstrom.tft.backend.core.engine;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;

public final class BotTeamEvaluator {
    private final List<TraitMetadata> traits;
    private final Comparator<Score> scoreComparator;

    public BotTeamEvaluator(List<TraitMetadata> traits) {
        this(traits, Comparator.naturalOrder());
    }

    public BotTeamEvaluator(List<TraitMetadata> traits, Comparator<Score> scoreComparator) {
        this.traits = List.copyOf(traits);
        this.scoreComparator = scoreComparator;
    }

    public Score score(List<GameUnit> units) {
        var counts = new HashMap<String, Set<String>>();
        for (var unit : units) {
            for (var trait : unit.getTraits()) {
                counts.computeIfAbsent(TraitManager.normalizeTraitId(trait), ignored -> new HashSet<>())
                        .add(unit.getLineId());
            }
        }
        var tiers = traits.stream()
                .mapToInt(trait -> {
                    var count = counts.getOrDefault(trait.id(), Set.of()).size();
                    return (int) trait.effects().stream()
                            .filter(effect -> count >= effect.minUnits())
                            .count();
                })
                .sum();
        return new Score(
                units.stream().mapToInt(GameUnit::getStarLevel).sum(),
                tiers,
                (int) units.stream().map(GameUnit::getRole).distinct().count(),
                units.stream().mapToInt(GameUnit::getCost).sum());
    }

    public int compare(Score first, Score second) {
        return scoreComparator.compare(first, second);
    }

    public Comparator<Score> scoreComparator() {
        return scoreComparator;
    }

    public record Score(int stars, int traitTiers, int roles, int cost) implements Comparable<Score> {
        @Override
        public int compareTo(Score other) {
            var comparison = Integer.compare(stars, other.stars);
            if (comparison == 0) comparison = Integer.compare(traitTiers, other.traitTiers);
            if (comparison == 0) comparison = Integer.compare(roles, other.roles);
            if (comparison == 0) comparison = Integer.compare(cost, other.cost);
            return comparison;
        }
    }
}
