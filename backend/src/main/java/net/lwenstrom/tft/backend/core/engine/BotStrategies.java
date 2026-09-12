package net.lwenstrom.tft.backend.core.engine;

import java.util.Comparator;
import net.lwenstrom.tft.backend.core.model.BotPersonality;

public final class BotStrategies {
    private static final Comparator<BotTeamEvaluator.Score> STAR_FIRST = Comparator.comparingInt(
                    BotTeamEvaluator.Score::stars)
            .thenComparingInt(BotTeamEvaluator.Score::traitTiers)
            .thenComparingInt(BotTeamEvaluator.Score::roles)
            .thenComparingInt(BotTeamEvaluator.Score::cost);

    private static final Comparator<BotTeamEvaluator.Score> TRAIT_FIRST = Comparator.comparingInt(
                    BotTeamEvaluator.Score::traitTiers)
            .thenComparingInt(BotTeamEvaluator.Score::stars)
            .thenComparingInt(BotTeamEvaluator.Score::roles)
            .thenComparingInt(BotTeamEvaluator.Score::cost);

    private static final BotStrategy BALANCED = new ConfiguredStrategy(30, 5, 0, 2, 4, false, STAR_FIRST);
    private static final BotStrategy ECONOMY = new ConfiguredStrategy(50, 4, 20, 0, 1, false, STAR_FIRST);
    private static final BotStrategy REROLL = new ConfiguredStrategy(10, 2, 0, 6, 8, false, STAR_FIRST);
    private static final BotStrategy FAST_LEVEL = new ConfiguredStrategy(10, 2, 0, 0, 1, true, STAR_FIRST);
    private static final BotStrategy TRAIT_FOCUSED = new ConfiguredStrategy(20, 4, 5, 3, 5, false, TRAIT_FIRST);

    private BotStrategies() {}

    public static BotStrategy forPersonality(BotPersonality personality) {
        if (personality == null) {
            return BALANCED;
        }
        return switch (personality) {
            case BALANCED -> BALANCED;
            case ECONOMY -> ECONOMY;
            case REROLL -> REROLL;
            case FAST_LEVEL -> FAST_LEVEL;
            case TRAIT_FOCUSED -> TRAIT_FOCUSED;
        };
    }

    private record ConfiguredStrategy(
            int healthyReserveCap,
            int reservePerRound,
            int lowHealthReserve,
            int healthyRerolls,
            int lowHealthRerolls,
            boolean levelBeforeShopping,
            Comparator<BotTeamEvaluator.Score> scoreComparator)
            implements BotStrategy {

        @Override
        public int goldReserve(Player player, int round) {
            return player.getHealth() <= 30 ? lowHealthReserve : Math.min(healthyReserveCap, round * reservePerRound);
        }

        @Override
        public int rerollLimit(Player player, int round) {
            return player.getHealth() <= 30 ? lowHealthRerolls : healthyRerolls;
        }
    }
}
