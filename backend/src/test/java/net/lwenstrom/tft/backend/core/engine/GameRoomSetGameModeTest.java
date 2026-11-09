package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

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

    @Test
    void roomCreationAndModeSwitchRegisterTheModeTraitAppliers() {
        var dataLoader = realDataLoader();
        var room = realRoom(dataLoader);

        assertEquals(
                traitIds(dataLoader, GameMode.ONEPIECE), room.getTraitManager().registeredTraitIds());

        var host = room.addPlayer("Host");
        assertTrue(room.setGameModeForHost(host.getId(), GameMode.POKEMON_GEN23));

        assertEquals(
                traitIds(dataLoader, GameMode.POKEMON_GEN23),
                room.getTraitManager().registeredTraitIds());
        assertEquals(GameMode.POKEMON_GEN23, room.getState().gameMode());
    }

    @Test
    void failedModeLoadLeavesTraitsAndModeUntouched() {
        var registry = new GameModeRegistry(TestHelpers.allModeProviders());
        var dataLoader = new DataLoader(registry, JsonMapper.builder().build()) {
            @Override
            public List<MatchRuleDefinition> getMatchRules(GameMode mode) {
                if (mode == GameMode.POKEMON) {
                    throw new IllegalStateException("broken match rules");
                }
                return super.getMatchRules(mode);
            }
        };
        var room = realRoom(dataLoader);
        var host = room.addPlayer("Host");

        assertThrows(IllegalStateException.class, () -> room.setGameModeForHost(host.getId(), GameMode.POKEMON));

        assertEquals(GameMode.ONEPIECE, room.getGameMode());
        assertEquals(
                traitIds(dataLoader, GameMode.ONEPIECE), room.getTraitManager().registeredTraitIds());
    }

    private static DataLoader realDataLoader() {
        return new DataLoader(
                new GameModeRegistry(TestHelpers.allModeProviders()),
                JsonMapper.builder().build());
    }

    private static GameRoom realRoom(DataLoader dataLoader) {
        return new GameRoom(
                "room",
                dataLoader,
                new GameModeRegistry(TestHelpers.allModeProviders()),
                TestHelpers.createTestClock(),
                TestHelpers.createSeededRandomProvider(),
                GameMode.ONEPIECE);
    }

    private static Set<String> traitIds(DataLoader dataLoader, GameMode mode) {
        return dataLoader.getTraitDefinitions(mode).stream()
                .map(trait -> TraitManager.normalizeTraitId(trait.id()))
                .collect(Collectors.toSet());
    }
}
