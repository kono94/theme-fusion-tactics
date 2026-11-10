package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.RoundTimeSettings;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class RoundTimeGameRoomTest {

    @Test
    void newRoomsUseTheDefaultRoundTimes() {
        var settings = createRoom().getState().roundTimeSettings();

        assertEquals(new RoundTimeSettings(15, 32), settings);
        assertEquals(GameConstants.BASE_PLANNING_DURATION_MS, settings.planningDurationMs());
        assertEquals(GameConstants.COMBAT_PHASE_MS, settings.combatDurationMs());
    }

    @Test
    void onlyTheHostCanChangeTheRoundTimeAndOnlyInTheLobby() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        var guest = room.addPlayer("Guest");
        var chosen = new RoundTimeSettings(25, 40);

        assertFalse(room.setRoundTimeForHost(guest.getId(), chosen));
        assertFalse(room.setRoundTimeForHost(host.getId(), null));
        assertTrue(room.setRoundTimeForHost(host.getId(), chosen));
        assertFalse(room.setRoundTimeForHost(host.getId(), chosen));
        assertEquals(chosen, room.getState().roundTimeSettings());

        room.startMatch();

        assertFalse(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(10, 20)));
        assertEquals(chosen, room.getState().roundTimeSettings());
        assertEquals(25000, room.getState().totalPhaseDuration());
    }

    @Test
    void valuesOutsideTheAllowedRangeAreRejected() {
        var room = createRoom();
        var host = room.addPlayer("Host");

        assertFalse(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(4, 32)));
        assertFalse(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(61, 32)));
        assertFalse(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(15, 14)));
        assertFalse(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(15, 61)));
        assertTrue(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(5, 15)));
        assertTrue(room.setRoundTimeForHost(host.getId(), new RoundTimeSettings(60, 60)));
    }

    @Test
    void changingModeKeepsTheRoundTime() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        var chosen = new RoundTimeSettings(25, 40);
        room.setRoundTimeForHost(host.getId(), chosen);

        assertTrue(room.setGameModeForHost(host.getId(), GameMode.POKEMON));

        assertEquals(chosen, room.getState().roundTimeSettings());
    }

    private GameRoom createRoom() {
        var unitDef = TestHelpers.createUnitDef("unit", "Unit", 1, 100, 10);
        var dataLoader = TestHelpers.createMockDataLoader(
                List.of(unitDef), TestHelpers.createDefaultAugments(), List.of(), List.of());
        var registry = new GameModeRegistry(List.of(provider(GameMode.ONEPIECE), provider(GameMode.POKEMON)));
        return new GameRoom(
                "test-room",
                dataLoader,
                registry,
                TestHelpers.createTestClock(),
                TestHelpers.createSeededRandomProvider(),
                GameMode.ONEPIECE);
    }

    private static GameModeProvider provider(GameMode mode) {
        return new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return mode;
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
    }
}
