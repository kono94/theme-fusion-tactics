package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.json.JsonMapper;

class GameRoomBotTest {
    @ParameterizedTest
    @EnumSource(GameMode.class)
    void botsBuyNormalUnitsOncePerPlanningRound(GameMode mode) {
        var mapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(mapper), new PokemonGameModeProvider(mapper)));
        var loader = new DataLoader(registry, mapper);
        var clock = TestHelpers.createTestClock();
        var room = new GameRoom("bots", loader, registry, clock, TestHelpers.createSeededRandomProvider(), mode);
        room.addPlayer("human");
        var bot = room.addBot().orElseThrow();
        assertTrue(bot.getBoardUnits().isEmpty(), "Lobby bots receive no free army");
        room.startMatch();
        assertFalse(bot.getBoardUnits().isEmpty());
        assertTrue(bot.getBoardUnits().size() <= bot.getLevel());
        assertTrue(bot.getLevel() <= 2, "Starting level follows normal XP");
        var ids = bot.getBoardUnits().stream().map(unit -> unit.getId()).toList();
        var gold = bot.getGold();
        var xp = bot.getXp();
        for (var tick = 0; tick < 100; tick++) {
            clock.advance(1000);
            room.tick();
        }
        assertEquals(1, room.getState().round());
        assertEquals(ids, bot.getBoardUnits().stream().map(unit -> unit.getId()).toList());
        assertEquals(gold, bot.getGold());
        assertEquals(xp, bot.getXp());
    }
}
