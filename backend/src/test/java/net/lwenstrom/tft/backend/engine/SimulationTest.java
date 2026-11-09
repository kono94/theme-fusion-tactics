package net.lwenstrom.tft.backend.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Collection;
import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.engine.GameRoom;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import org.junit.jupiter.api.Test;

public class SimulationTest {

    @Test
    public void testGameLoopSimulation() {
        // Mock GameModeRegistry and GameModeProvider
        net.lwenstrom.tft.backend.core.GameModeProvider provider =
                new net.lwenstrom.tft.backend.core.GameModeProvider() {
                    @Override
                    public net.lwenstrom.tft.backend.core.model.GameMode getMode() {
                        return net.lwenstrom.tft.backend.core.model.GameMode.ONEPIECE;
                    }

                    @Override
                    public String getUnitsPath() {
                        return "/data/units_onepiece.json";
                    }

                    @Override
                    public String getTraitsPath() {
                        return "/data/traits_onepiece.json";
                    }
                };

        net.lwenstrom.tft.backend.core.GameModeRegistry registry =
                new net.lwenstrom.tft.backend.core.GameModeRegistry(List.of(provider));

        // Mock DataLoader
        DataLoader dataLoader = new DataLoader(
                registry, tools.jackson.databind.json.JsonMapper.builder().build()) {
            @Override
            public List<net.lwenstrom.tft.backend.core.model.TraitDefinition> getTraitDefinitions(GameMode mode) {
                return List.of();
            }

            @Override
            public List<UnitDefinition> getAllUnits(GameMode mode) {
                return List.of(new UnitDefinition(
                        "0",
                        "TestUnit",
                        1,
                        net.lwenstrom.tft.backend.core.model.UnitRole.DAMAGE,
                        List.of(100, 100, 100),
                        List.of(50, 50, 50),
                        List.of(50, 50, 50),
                        List.of(0, 0, 0),
                        List.of(10, 10, 10),
                        List.of(1.0f, 1.0f, 1.0f),
                        List.of(1, 1, 1),
                        List.of("Trait"),
                        null));
            }

            @Override
            public UnitDefinition getUnitDefinition(GameMode mode, String id) {
                return getAllUnits(mode).get(0);
            }

            @Override
            public List<AugmentDefinition> getAugments(GameMode mode) {
                return createDefaultAugments();
            }
        };

        var testClock = createTestClock();
        var room = new GameRoom(
                "sim-room", dataLoader, registry, testClock, createSeededRandomProvider(), GameMode.ONEPIECE);
        room.addPlayer("P1");
        room.addPlayer("P2");

        // Initial State - starts in LOBBY with round 0
        assertEquals(0, room.getState().round(), "Should start at Round 0 in LOBBY");
        assertEquals(GamePhase.LOBBY, room.getState().phase(), "Should start in LOBBY phase");

        // Start match transitions to PLANNING
        room.startMatch();
        assertEquals(1, room.getState().round(), "Should be at Round 1 after startMatch");
        assertEquals(GamePhase.PLANNING, room.getState().phase(), "Should be in PLANNING after startMatch");

        try {
            java.lang.reflect.Method nextPhaseMethod = GameRoom.class.getDeclaredMethod("nextPhase");
            nextPhaseMethod.setAccessible(true);

            // Fast forward Planning to Combat
            testClock.advance(room.getState().timeRemainingMs() + 1);

            room.tick();
            assertEquals(GamePhase.COMBAT, room.getState().phase(), "Should switch to COMBAT phase");
            assertEquals(1, room.getState().round(), "Round should still be 1 in Combat");

            // Fast forward Combat to Planning
            testClock.advance(room.getState().timeRemainingMs() + 1);

            room.tick();
            assertEquals(
                    net.lwenstrom.tft.backend.core.model.GamePhase.PLANNING,
                    room.getState().phase(),
                    "Should switch back to PLANNING phase");
            assertEquals(2, room.getState().round(), "Round should be 2 now");

        } catch (Exception e) {
            fail("Reflection failed: " + e.getMessage());
        }
    }

    @Test
    public void testCombatInteraction() {
        // Similar mock setup for combat test
        net.lwenstrom.tft.backend.core.GameModeProvider provider =
                new net.lwenstrom.tft.backend.core.GameModeProvider() {
                    @Override
                    public net.lwenstrom.tft.backend.core.model.GameMode getMode() {
                        return net.lwenstrom.tft.backend.core.model.GameMode.ONEPIECE;
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
        net.lwenstrom.tft.backend.core.GameModeRegistry registry =
                new net.lwenstrom.tft.backend.core.GameModeRegistry(List.of(provider));

        DataLoader dataLoader = new DataLoader(
                registry, tools.jackson.databind.json.JsonMapper.builder().build()) {
            @Override
            public List<net.lwenstrom.tft.backend.core.model.TraitDefinition> getTraitDefinitions(GameMode mode) {
                return List.of();
            }

            @Override
            public List<UnitDefinition> getAllUnits(GameMode mode) {
                return List.of(new UnitDefinition(
                        "0",
                        "TestUnit",
                        1,
                        net.lwenstrom.tft.backend.core.model.UnitRole.DAMAGE,
                        List.of(100, 100, 100),
                        List.of(50, 50, 50),
                        List.of(50, 50, 50),
                        List.of(0, 0, 0),
                        List.of(10, 10, 10),
                        List.of(1.0f, 1.0f, 1.0f),
                        List.of(1, 1, 1),
                        List.of("Trait"),
                        null));
            }

            @Override
            public UnitDefinition getUnitDefinition(GameMode mode, String id) {
                return getAllUnits(mode).get(0);
            }

            @Override
            public List<AugmentDefinition> getAugments(GameMode mode) {
                return createDefaultAugments();
            }
        };

        var testClock = createTestClock();
        var room = new GameRoom(
                "combat-room", dataLoader, registry, testClock, createSeededRandomProvider(), GameMode.ONEPIECE);
        Player p1 = room.addPlayer("P1");
        Player p2 = room.addPlayer("P2");
        p1.setGold(100);
        p2.setGold(100);

        // Setup units - Place them at the border to be adjacent after transformation
        // Top player (P1): y=2 results in combat_y = (3-1)-2 = 0
        // Bottom player (P2): y=0 results in combat_y = 3+0 = 3
        // Still too far!
        // Let's place them such that they are within range 1.
        // If P1 is at y=2 (combat 0) and P2 is at y=0 (combat 3), distance is 3.

        // Let's cheat and manually position them AFTER startCombat
        // Setup units - manually add to board to avoid shop issues
        UnitDefinition def = dataLoader.getAllUnits(GameMode.ONEPIECE).get(0);
        p1.addUnitToBoard(def, 3, 2);
        var u1 = p1.getBoardUnits().get(0);

        p2.addUnitToBoard(def, 3, 0);
        var u2 = p2.getBoardUnits().get(0);

        // Set up combat matchup
        try {
            java.lang.reflect.Field phaseField = GameRoom.class.getDeclaredField("phase");
            phaseField.setAccessible(true);
            phaseField.set(room, GamePhase.COMBAT);

            java.lang.reflect.Field activeCombatsField = GameRoom.class.getDeclaredField("activeCombats");
            activeCombatsField.setAccessible(true);
            @SuppressWarnings("unchecked")
            List<List<Player>> activeCombats = (List<List<Player>>) activeCombatsField.get(room);
            activeCombats.add(List.of(p1, p2));

            java.lang.reflect.Field combatSystemField = GameRoom.class.getDeclaredField("combatSystem");
            combatSystemField.setAccessible(true);
            Object combatSystem = combatSystemField.get(room);

            java.lang.reflect.Method startCombatMethod =
                    combatSystem.getClass().getDeclaredMethod("startCombat", Collection.class);
            startCombatMethod.setAccessible(true);
            startCombatMethod.invoke(combatSystem, List.of(p1, p2));

            // MANUALLY move them close for attack
            u1.setPosition(3, 3);
            u2.setPosition(3, 4);

        } catch (Exception e) {
            fail("Reflection error: " + e.getMessage());
        }

        // Run ticks
        for (int i = 0; i < 50; i++) { // More ticks
            room.tick();
        }

        int hp1 = p1.getBoardUnits().get(0).getCurrentHealth();
        int hp2 = p2.getBoardUnits().get(0).getCurrentHealth();

        assertTrue(hp1 < 100 || hp2 < 100, "Units should have taken damage. HP1: " + hp1 + ", HP2: " + hp2);
    }
}
