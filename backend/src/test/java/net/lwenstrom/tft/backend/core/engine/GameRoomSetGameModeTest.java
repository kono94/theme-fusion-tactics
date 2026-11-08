package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;

import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class GameRoomSetGameModeTest {

    @Test
    void modeWithoutRegisteredProviderLeavesTheRoomUntouched() {
        var room = TestHelpers.createTestGameRoom();
        var host = room.addPlayer("Host");
        var stateBefore = room.getState();

        assertFalse(room.setGameModeForHost(host.getId(), GameMode.POKEMON));

        assertEquals(GameMode.ONEPIECE, room.getGameMode());
        assertSame(stateBefore, room.getState());
        assertEquals(GameMode.ONEPIECE, room.getState().gameMode());
    }
}
