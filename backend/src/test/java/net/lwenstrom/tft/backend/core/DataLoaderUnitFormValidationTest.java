package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.engine.UnitFormDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.test.BranchingTestUnits;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderUnitFormValidationTest {

    @Test
    void acceptsTheBranchingFixture() {
        BranchingTestUnits.load().forEach(unit -> assertDoesNotThrow(() -> DataLoader.validateUnitForms(unit)));
    }

    @Test
    void rejectsBranchPointBelowTwoStars() {
        assertInvalid(
                "branch point must be at least 2",
                unit(form(1, "a", null), form(1, "b", "b"), form(1, "c", "c"), form(2, "b2", "b")));
    }

    @Test
    void rejectsFewerThanTwoBranchesAtTheBranchPoint() {
        assertInvalid("needs at least 2 distinct branches", unit(form(1, "base", null), form(2, "only", "only")));
    }

    @Test
    void rejectsUnbranchedFormsAtOrAboveTheBranchPoint() {
        assertInvalid(
                "unbranched form at star 3",
                unit(form(1, "base", null), form(2, "a", "a"), form(2, "b", "b"), form(3, "late", null)));
    }

    @Test
    void rejectsUndeclaredBranchesAtHigherStars() {
        assertInvalid(
                "branch 'c' at star 3 is not declared",
                unit(form(1, "base", null), form(2, "a", "a"), form(2, "b", "b"), form(3, "c", "c")));
    }

    @Test
    void rejectsFormStatArraysWithoutThreeValues() {
        var badStats = new UnitFormDefinition(
                2, "a", "A", UnitRole.TANK, List.of("T"), null, null, "a", List.of(1, 2), null, null, null, null);
        assertInvalid("maxHealth (branch 'a') must contain exactly three", unit(badStats, form(2, "b", "b")));
        var badSpeed = new UnitFormDefinition(
                2, "a", "A", UnitRole.TANK, List.of("T"), null, null, "a", null, null, null, null, List.of(1.0f));
        assertInvalid("attackSpeed (branch 'a') must contain exactly three", unit(badSpeed, form(2, "b", "b")));
    }

    @Test
    void rejectsDuplicateFormsForTheSameStarAndBranch() {
        assertInvalid("duplicate form for star 2 (branch 'a')", unit(form(2, "a", "a"), form(2, "a2", "a")));
    }

    @Test
    void failsFastWhenModeDataContainsAnInvalidBranch() {
        var jsonMapper = JsonMapper.builder().build();
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.ONEPIECE;
            }

            @Override
            public String getUnitsPath() {
                return "/units/single_branch_units.json";
            }

            @Override
            public String getTraitsPath() {
                return "/data/traits_onepiece.json";
            }

            @Override
            public void registerTraitEffects(TraitManager traitManager) {}
        };
        var dataLoader = new DataLoader(new GameModeRegistry(List.of(provider)), jsonMapper);

        var error = assertThrows(RuntimeException.class, dataLoader::loadData);

        assertTrue(error.getCause().getMessage().contains("Invalid forms for unit eevee"));
        assertTrue(error.getCause().getMessage().contains("needs at least 2 distinct branches"));
    }

    private static void assertInvalid(String expectedMessage, UnitDefinition unit) {
        var error = assertThrows(IllegalStateException.class, () -> DataLoader.validateUnitForms(unit));
        assertTrue(error.getMessage().contains(expectedMessage), error.getMessage());
    }

    private static UnitFormDefinition form(int starLevel, String definitionId, String branchId) {
        return new UnitFormDefinition(
                starLevel,
                definitionId,
                definitionId,
                UnitRole.DAMAGE,
                List.of("T"),
                null,
                null,
                branchId,
                null,
                null,
                null,
                null,
                null);
    }

    private static UnitDefinition unit(UnitFormDefinition... forms) {
        var values = List.of(100, 200, 300);
        return new UnitDefinition(
                "line",
                "Line",
                1,
                UnitRole.DAMAGE,
                values,
                values,
                values,
                values,
                values,
                List.of(1.0f, 1.0f, 1.0f),
                List.of(1, 1, 1),
                List.of("T"),
                null,
                "line",
                List.of(forms));
    }
}
