package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.TraitDefinition;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GridRefactorTest {

    static class MockDataLoader extends DataLoader {
        public MockDataLoader(GameModeRegistry registry) {
            super(registry, JsonMapper.builder().build());
        }

        @Override
        public java.util.List<UnitDefinition> getAllUnits(GameMode mode) {
            return Collections.emptyList();
        }

        @Override
        public List<TraitDefinition> getTraitDefinitions(GameMode mode) {
            return List.of();
        }
    }

    private GameModeRegistry createMockRegistry() {
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.ONEPIECE;
            }

            @Override
            public String getUnitsPath() {
                return "";
            }

            @Override
            public String getTraitsPath() {
                return "";
            }
        };
        return new GameModeRegistry(List.of(provider));
    }

    private UnitDefinition createDummyDef() {
        return new UnitDefinition(
                "1",
                "Dummy",
                1,
                net.lwenstrom.tft.backend.core.model.UnitRole.DAMAGE,
                List.of(100, 100, 100),
                List.of(100, 100, 100),
                List.of(10, 10, 10),
                List.of(0, 0, 0),
                List.of(0, 0, 0),
                List.of(1.0f, 1.0f, 1.0f),
                List.of(1, 1, 1),
                Collections.emptyList(),
                null);
    }

    @Test
    void testGridConstraints() {
        var grid = new Grid();
        assertEquals(Grid.PLAYER_ROWS, Grid.PLAYER_ROWS);
        assertEquals(3, Grid.PLAYER_ROWS);
        assertEquals(9, Grid.COLS);

        GameUnit u = new StandardGameUnit(createDummyDef());

        // Valid placement
        grid.placeUnit(u, 2, 2);
        assertEquals(2, u.getX());
        assertEquals(2, u.getY());

        // Invalid placement
        assertThrows(IllegalArgumentException.class, () -> grid.placeUnit(u, Grid.COLS, 0));
        assertThrows(IllegalArgumentException.class, () -> grid.placeUnit(u, 0, Grid.PLAYER_ROWS));
    }

    @Test
    void testRemoveUnitUsesStoredOccupancyWhenCoordinatesChanged() {
        var grid = new Grid();
        var unit = new StandardGameUnit(createDummyDef());

        grid.placeUnit(unit, 3, 2);
        unit.setPosition(3, 5);

        grid.removeUnit(unit);

        assertTrue(grid.isEmpty(3, 2), "Grid should remove unit from its stored planning cell");
    }

    @Test
    void testSellBoardUnitAfterCombatCoordinatesClearsPlanningCell() {
        var dataLoader = createMockDataLoader();
        var player = createTestPlayer("TestPlayer", dataLoader);
        player.setLevel(3);
        player.addUnitToBoard(createDefaultUnitDef(), 3, 2);

        var unit = player.getBoardUnits().getFirst();
        unit.savePlanningPosition();
        unit.setPosition(3, 5);

        player.sellUnit(unit.getId(), true);

        assertEquals(0, player.getBoardUnits().size(), "Board should be empty after selling");
        assertTrue(player.getGrid().isEmpty(3, 2), "Grid planning cell should be empty after selling");
    }

    @Test
    void testCombatMerging() {
        var registry = createMockRegistry();
        var p1 = new Player("P1", GameMode.ONEPIECE, new MockDataLoader(registry), createSeededRandomProvider());
        var p2 = new Player("P2", GameMode.ONEPIECE, new MockDataLoader(registry), createSeededRandomProvider());

        var u1 = new StandardGameUnit(createDummyDef());
        u1.setOwnerId(p1.getId());

        var u2 = new StandardGameUnit(createDummyDef());
        u2.setOwnerId(p2.getId());

        // Use the new Bench API instead of reflection
        p1.getBenchSlots().set(0, u1);
        p2.getBenchSlots().set(0, u2);

        p1.setLevel(3);
        p2.setLevel(3);

        // Move P1 unit to (3, 2) - Back Center
        p1.moveUnit(u1.getId(), 3, 2);
        assertEquals(3, u1.getX());
        assertEquals(2, u1.getY());

        // Move P2 unit to (3, 2) - Back Center
        p2.moveUnit(u2.getId(), 3, 2);
        assertEquals(3, u2.getX());
        assertEquals(2, u2.getY());

        // Start Combat
        var cs = createTestCombatSystem();

        // Ensure sorting P1 < P2 for test predictability (P1=Top, P2=Bottom)
        if (p1.getId().compareTo(p2.getId()) > 0) {
            var tmp = p1;
            p1 = p2;
            p2 = tmp;
            var tmpU = u1;
            u1 = u2;
            u2 = tmpU;
        }

        cs.startCombat(Arrays.asList(p1, p2));

        // P1 (Top) at (3,2) Backline -> Should mirror to Arena Top Edge (0)
        assertEquals(3, u1.getX(), "P1 X should be 3");
        assertEquals(0, u1.getY(), "P1 Y should be 0 (Top Edge)");

        // P2 (Bottom) at (3,2) Backline -> Should offset to Arena Bottom Edge (5)
        assertEquals(3, u2.getX(), "P2 X should be 3");
        assertEquals(5, u2.getY(), "P2 Y should be 5 (Bottom Edge)");

        // End Combat
        cs.endCombat(Arrays.asList(p1, p2));

        // Restore
        assertEquals(3, u1.getX());
        assertEquals(2, u1.getY());
        assertEquals(3, u2.getX());
        assertEquals(2, u2.getY());
    }
}
