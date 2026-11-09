package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Collections;
import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.TraitDefinition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PlayerAutoFillTest {

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

    private UnitDefinition createDummyDef(String name) {
        return new UnitDefinition(
                name,
                name,
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

    private Player player;

    @BeforeEach
    void setup() {
        var registry = createMockRegistry();
        player = new Player("Player1", GameMode.ONEPIECE, new MockDataLoader(registry), createSeededRandomProvider());
    }

    @Test
    void testAutoFill_placesUnitsUpToCapacity() {
        player.setLevel(3); // Board capacity = 3

        GameUnit u1 = new StandardGameUnit(createDummyDef("U1"));
        GameUnit u2 = new StandardGameUnit(createDummyDef("U2"));
        GameUnit u3 = new StandardGameUnit(createDummyDef("U3"));
        GameUnit u4 = new StandardGameUnit(createDummyDef("U4"));

        player.getBenchSlots().set(0, u1);
        player.getBenchSlots().set(1, u2);
        player.getBenchSlots().set(2, u3);
        player.getBenchSlots().set(8, u4);

        player.autoFillBoard();

        assertEquals(3, player.getBoardUnits().size());

        assertNull(player.getBenchSlots().getOrNull(0));
        assertNull(player.getBenchSlots().getOrNull(1));
        assertNull(player.getBenchSlots().getOrNull(2));
        assertNotNull(player.getBenchSlots().getOrNull(8));

        assertTrue(player.getBoardUnits().contains(u1));
        assertEquals(0, u1.getX());
        assertEquals(GameConstants.PLAYER_ROWS - 1, u1.getY());

        assertTrue(player.getBoardUnits().contains(u2));
        assertEquals(1, u2.getX());
        assertEquals(GameConstants.PLAYER_ROWS - 1, u2.getY());

        assertTrue(player.getBoardUnits().contains(u3));
        assertEquals(2, u3.getX());
        assertEquals(GameConstants.PLAYER_ROWS - 1, u3.getY());
    }

    @Test
    void testAutoFill_doesNotOverrideExistingBoardUnits() {
        player.setLevel(3);

        GameUnit existing = new StandardGameUnit(createDummyDef("Existing"));
        player.getGrid().placeUnit(existing, 0, 0);
        player.getBoardUnits().add(existing);

        GameUnit u1 = new StandardGameUnit(createDummyDef("U1"));
        GameUnit u2 = new StandardGameUnit(createDummyDef("U2"));
        GameUnit u3 = new StandardGameUnit(createDummyDef("U3"));

        player.getBenchSlots().set(0, u1);
        player.getBenchSlots().set(1, u2);
        player.getBenchSlots().set(2, u3);

        player.autoFillBoard();

        assertEquals(3, player.getBoardUnits().size());

        assertNull(player.getBenchSlots().getOrNull(0));
        assertNull(player.getBenchSlots().getOrNull(1));
        assertNotNull(player.getBenchSlots().getOrNull(2));

        assertEquals(0, existing.getX());
        assertEquals(0, existing.getY());

        assertEquals(0, u1.getX());
        assertEquals(GameConstants.PLAYER_ROWS - 1, u1.getY());

        assertEquals(1, u2.getX());
        assertEquals(GameConstants.PLAYER_ROWS - 1, u2.getY());
    }
}
