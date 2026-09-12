package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.BotPersonality;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class BotStrategiesTest {
    @Test
    void personalitiesUseDifferentEconomyAndProgressionPolicies() {
        var unit = TestHelpers.createUnitDef("unit", "Unit", 1, 100, 10);
        var loader = TestHelpers.createMockDataLoader(List.of(unit));
        var player = new Player("bot", GameMode.ONEPIECE, loader, TestHelpers.createSeededRandomProvider());
        player.setHealth(100);

        var economy = BotStrategies.forPersonality(BotPersonality.ECONOMY);
        var reroll = BotStrategies.forPersonality(BotPersonality.REROLL);
        var fastLevel = BotStrategies.forPersonality(BotPersonality.FAST_LEVEL);

        assertTrue(economy.goldReserve(player, 8) > reroll.goldReserve(player, 8));
        assertTrue(reroll.rerollLimit(player, 8) > economy.rerollLimit(player, 8));
        assertTrue(fastLevel.levelBeforeShopping());
        assertFalse(economy.levelBeforeShopping());
    }

    @Test
    void traitFocusedStrategyRanksTraitBreakpointsBeforeStars() {
        var traitFocused = BotStrategies.forPersonality(BotPersonality.TRAIT_FOCUSED);
        var moreStars = new BotTeamEvaluator.Score(5, 0, 2, 8);
        var moreTraits = new BotTeamEvaluator.Score(4, 1, 2, 8);

        assertTrue(traitFocused.scoreComparator().compare(moreTraits, moreStars) > 0);
    }
}
