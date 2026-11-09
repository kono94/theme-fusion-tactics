package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.EvolutionOption;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.test.BranchingTestUnits;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class BranchingEvolutionDefinitionTest {
    private final UnitDefinition eevee = BranchingTestUnits.byId("eevee");
    private final UnitDefinition ralts = BranchingTestUnits.byId("ralts");
    private final UnitDefinition wurmple = BranchingTestUnits.byId("wurmple");

    @Test
    void branchPointIsTheLowestStarWithBranchedForms() {
        assertEquals(2, eevee.branchPoint());
        assertEquals(3, ralts.branchPoint());
        assertEquals(2, wurmple.branchPoint());
        assertEquals(List.of("vaporeon", "jolteon", "flareon"), eevee.branchIdsAt(2));
        assertEquals(List.of("gardevoir", "gallade"), ralts.branchIdsAt(3));
        assertEquals(List.of("silcoon", "cascoon"), wurmple.branchIdsAt(3));
        assertEquals(-1, TestHelpers.createDefaultUnitDef().branchPoint());
    }

    @Test
    void pendingUnitsShowTheirLastUnbranchedForm() {
        assertFalse(eevee.isPending(1, null));
        assertTrue(eevee.isPending(2, null));
        assertTrue(eevee.isPending(3, null));
        assertFalse(eevee.isPending(2, "jolteon"));
        assertEquals("Eevee", eevee.formAt(2, null).name());
        assertEquals("eevee", eevee.formAt(3, null).definitionId());

        assertFalse(ralts.isPending(2, null));
        assertTrue(ralts.isPending(3, null));
        assertEquals("Kirlia", ralts.formAt(2, null).name());
        assertEquals("Kirlia", ralts.formAt(3, null).name());
        assertEquals("Wurmple", wurmple.formAt(2, null).name());
    }

    @Test
    void chosenBranchesKeepApplyingAtHigherStars() {
        assertEquals("Vaporeon", eevee.formAt(2, "vaporeon").name());
        assertEquals("Vaporeon", eevee.formAt(3, "vaporeon").name());
        assertEquals(List.of("Water"), eevee.formAt(3, "vaporeon").traits());
        assertEquals(UnitRole.TANK, eevee.formAt(3, "vaporeon").role());
        assertEquals("Gallade", ralts.formAt(3, "gallade").name());
        assertEquals(List.of("Psychic", "Fighting"), ralts.formAt(3, "gallade").traits());
        assertEquals("Silcoon", wurmple.formAt(2, "silcoon").name());
        assertEquals("beautifly", wurmple.formAt(3, "silcoon").definitionId());
        assertEquals("dustox", wurmple.formAt(3, "cascoon").definitionId());
        assertEquals("Wurmple", wurmple.formAt(1, "silcoon").name());
    }

    @Test
    void perFormStatArraysOverrideTheLineStats() {
        assertEquals(1400, eevee.formAt(2, "vaporeon").maxHealth());
        assertEquals(2600, eevee.formAt(3, "vaporeon").maxHealth());
        assertEquals(40, eevee.formAt(2, "vaporeon").defense());
        assertEquals(900, eevee.formAt(2, "jolteon").maxHealth());
        assertEquals(1.0f, eevee.formAt(2, "jolteon").attackSpeed());
        assertEquals(2, eevee.formAt(2, "jolteon").range());
        assertEquals(95, eevee.formAt(2, "flareon").attackDamage());
        assertEquals(70, eevee.formAt(2, null).attackDamage());
        assertEquals(50, eevee.formAt(2, "flareon").maxMana());

        var unit = new StandardGameUnit(eevee, 2, "vaporeon");
        assertEquals(1400, unit.getMaxHealth());
        assertEquals(1400, unit.getCurrentHealth());
        assertEquals(40, unit.getDefense());
        assertEquals("vaporeon", unit.getDefinitionId());
        assertEquals("eevee", unit.getLineId());
    }

    @Test
    void pendingUnitsCarryEvolutionOptionsWithLaterForms() {
        var pending = new StandardGameUnit(wurmple, 2);

        assertNull(pending.getBranchId());
        assertEquals("Wurmple", pending.getName());
        var options = pending.getEvolutionOptions();
        assertNotNull(options);
        assertEquals(
                List.of("silcoon", "cascoon"),
                options.stream().map(EvolutionOption::branchId).toList());
        var silcoon = options.getFirst();
        assertEquals("silcoon", silcoon.definitionId());
        assertEquals("Silcoon", silcoon.name());
        assertEquals(UnitRole.TANK, silcoon.role());
        assertEquals(List.of("Bug"), silcoon.traits());
        assertEquals(900, silcoon.maxHealth());
        assertEquals("Silcoon Move", silcoon.abilityName());
        assertTrue(silcoon.abilityDescription().startsWith("Silcoon Move deals "));
        assertTrue(silcoon.abilityDescription().contains("<span class=\"active\">20</span>"));
        assertEquals(List.of(new EvolutionOption.LaterForm(3, "beautifly", "Beautifly")), silcoon.laterForms());

        var vaporeon = new StandardGameUnit(eevee, 3).getEvolutionOptions().getFirst();
        assertEquals("Vaporeon", vaporeon.name());
        assertEquals(2600, vaporeon.maxHealth());
        assertTrue(vaporeon.laterForms().isEmpty());

        var gallade = new StandardGameUnit(ralts, 3).getEvolutionOptions().get(1);
        assertEquals("Gallade", gallade.name());
        assertEquals(UnitRole.DAMAGE, gallade.role());
    }

    @Test
    void nonPendingUnitsHaveNoEvolutionOptions() {
        assertNull(new StandardGameUnit(eevee, 1).getEvolutionOptions());
        assertNull(new StandardGameUnit(ralts, 2).getEvolutionOptions());
        var chosen = new StandardGameUnit(wurmple, 3, "silcoon");
        assertNull(chosen.getEvolutionOptions());
        assertEquals("silcoon", chosen.getBranchId());
        assertEquals("Beautifly", chosen.getName());

        var pending = new StandardGameUnit(eevee, 2);
        var copy = pending.cloneUnit();
        assertEquals(pending.getEvolutionOptions(), copy.getEvolutionOptions());
        assertEquals(chosen.getBranchId(), chosen.cloneUnit().getBranchId());
    }

    @Test
    void existingModeDataResolvesExactlyAsTheExactStarLookup() {
        var jsonMapper = JsonMapper.builder().build();
        var dataLoader = new DataLoader(new GameModeRegistry(TestHelpers.allModeProviders()), jsonMapper);
        for (var mode : GameMode.values()) {
            for (var unit : dataLoader.getAllUnits(mode)) {
                if (unit.branchPoint() > 0) {
                    continue;
                }
                for (var star = 1; star <= 3; star++) {
                    var level = star;
                    var exact = unit.forms().stream()
                            .filter(form -> form.starLevel() == level)
                            .findFirst()
                            .orElse(null);
                    assertEquals(exact, unit.resolveForm(star, null), unit.id() + " at " + star);
                    var built = new StandardGameUnit(unit, star);
                    assertNull(built.getEvolutionOptions());
                    assertNull(built.getBranchId());
                }
            }
        }
    }
}
