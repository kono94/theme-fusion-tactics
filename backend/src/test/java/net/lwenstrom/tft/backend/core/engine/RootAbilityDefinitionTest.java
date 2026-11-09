package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;

class RootAbilityDefinitionTest {
    @Test
    void oneRootAbilityIsReusedAtEveryStarLevelWithScaledValues() {
        var ability = new AbilityDefinition(
                "Aqua Burst",
                "Deals $value damage.",
                AbilityType.DAMAGE,
                AbilityPattern.SINGLE,
                List.of(1, 1, 2),
                List.of(100, 200, 300),
                List.of());
        var definition = new UnitDefinition(
                "pal",
                "Pal",
                1,
                UnitRole.DAMAGE,
                List.of(100, 200, 300),
                List.of(50, 50, 50),
                List.of(10, 20, 30),
                List.of(0, 0, 0),
                List.of(5, 5, 5),
                List.of(1.0f, 1.0f, 1.0f),
                List.of(1, 1, 1),
                List.of("Water"),
                ability);

        assertSame(ability, definition.formAt(1, null).ability());
        assertSame(ability, definition.formAt(2, null).ability());
        assertSame(ability, definition.formAt(3, null).ability());
        assertEquals(100, definition.formAt(1, null).ability().getValueForLevel(1));
        assertEquals(200, definition.formAt(2, null).ability().getValueForLevel(2));
        assertEquals(300, definition.formAt(3, null).ability().getValueForLevel(3));
    }
}
