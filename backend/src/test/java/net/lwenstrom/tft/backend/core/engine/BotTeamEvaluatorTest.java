package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;
import net.lwenstrom.tft.backend.core.model.TraitTargetScope;
import net.lwenstrom.tft.backend.test.MockUnit;
import org.junit.jupiter.api.Test;

class BotTeamEvaluatorTest {
    @Test
    void countsDistinctLinesAndOrdersStarsBeforeTraits() {
        var trait = new TraitMetadata(
                "water",
                "Water",
                "",
                "type",
                TraitTargetScope.TEAM,
                "",
                List.of(new TraitMetadata.TraitEffect(2, "", "")),
                null);
        var evaluator = new BotTeamEvaluator(List.of(trait));
        var first = MockUnit.create("a", "owner").withTraits(Set.of("Water"));
        var duplicate = MockUnit.create("a", "owner").withTraits(Set.of("Water"));
        var second = MockUnit.create("b", "owner").withTraits(Set.of("Water"));
        assertEquals(0, evaluator.score(List.of(first, duplicate)).traitTiers());
        assertEquals(1, evaluator.score(List.of(first, second)).traitTiers());
        assertTrue(new BotTeamEvaluator.Score(3, 0, 1, 1).compareTo(new BotTeamEvaluator.Score(2, 5, 3, 10)) > 0);
        assertTrue(new BotTeamEvaluator.Score(3, 1, 1, 1).compareTo(new BotTeamEvaluator.Score(3, 0, 3, 10)) > 0);
        assertTrue(new BotTeamEvaluator.Score(3, 1, 2, 1).compareTo(new BotTeamEvaluator.Score(3, 1, 1, 10)) > 0);
    }
}
