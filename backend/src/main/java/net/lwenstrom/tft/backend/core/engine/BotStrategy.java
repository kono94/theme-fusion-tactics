package net.lwenstrom.tft.backend.core.engine;

import java.util.Comparator;

public interface BotStrategy {
    int goldReserve(Player player, int round);

    int rerollLimit(Player player, int round);

    boolean levelBeforeShopping();

    Comparator<BotTeamEvaluator.Score> scoreComparator();
}
