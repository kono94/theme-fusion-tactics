package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.core.model.MatchRuleEffectType;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class MatchRuleGameRoomTest {

    private static final MatchRuleDefinition HEAD_START = new MatchRuleDefinition(
            "head-start",
            "Head Start",
            "Start at level 4.",
            "/head.png",
            MatchRuleEffectType.STARTING_LEVEL,
            List.of(4));
    private static final MatchRuleDefinition CHEAP_REROLLS = new MatchRuleDefinition(
            "cheap-rerolls", "Cheap Rerolls", "Cheaper.", "/cheap.png", MatchRuleEffectType.REROLL_COST, List.of(1));

    @Test
    void newRoomsDefaultToRandomSelectionWithNoActiveRule() {
        var room = createRoom();

        assertEquals(MatchRuleManager.RANDOM, room.getState().matchRuleSelection());
        assertNull(room.getState().activeMatchRule());
    }

    @Test
    void onlyTheHostCanChangeTheRuleAndOnlyInTheLobby() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        var guest = room.addPlayer("Guest");

        assertFalse(room.setMatchRuleForHost(guest.getId(), "head-start"));
        assertFalse(room.setMatchRuleForHost(host.getId(), "missing"));
        assertTrue(room.setMatchRuleForHost(host.getId(), "head-start"));
        assertEquals("head-start", room.getState().matchRuleSelection());

        room.startMatch();

        assertFalse(room.setMatchRuleForHost(host.getId(), MatchRuleManager.NONE));
        assertEquals("head-start", room.getState().matchRuleSelection());
    }

    @Test
    void startingTheMatchActivatesTheSelectedRuleAndAppliesItsEconomy() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        room.setMatchRuleForHost(host.getId(), "head-start");

        room.startMatch();

        var active = room.getState().activeMatchRule();
        assertEquals("head-start", active.id());
        assertEquals("Head Start", active.name());
        assertTrue(host.getLevel() >= 4);
    }

    @Test
    void stateExposesTheRuleAdjustedRerollCost() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        room.setMatchRuleForHost(host.getId(), "cheap-rerolls");

        room.startMatch();

        assertEquals(1, room.getState().rerollCost());
        assertEquals(1, host.getRerollCost());
    }

    @Test
    void noneSelectionStartsWithoutARule() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        room.setMatchRuleForHost(host.getId(), MatchRuleManager.NONE);

        room.startMatch();

        assertNull(room.getState().activeMatchRule());
        assertEquals(2, host.getRerollCost());
    }

    @Test
    void randomSelectionPicksAnAvailableRuleAtStart() {
        var room = createRoom();
        room.addPlayer("Host");

        room.startMatch();

        var active = room.getState().activeMatchRule();
        assertTrue(List.of("head-start", "cheap-rerolls").contains(active.id()));
    }

    @Test
    void changingModeResetsTheSelectionToRandom() {
        var room = createRoom();
        var host = room.addPlayer("Host");
        room.setMatchRuleForHost(host.getId(), "head-start");

        assertTrue(room.setGameModeForHost(host.getId(), GameMode.POKEMON));

        assertEquals(MatchRuleManager.RANDOM, room.getState().matchRuleSelection());
    }

    @Test
    void stateExposesIncomeConstantsForTheInterestIndicator() {
        var state = createRoom().getState();

        assertEquals(5, state.baseIncome());
        assertEquals(5, state.maxInterest());
        assertEquals(2, state.rerollCost());
    }

    private GameRoom createRoom() {
        var unitDef = TestHelpers.createUnitDef("unit", "Unit", 1, 100, 10);
        var dataLoader = TestHelpers.createMockDataLoader(
                List.of(unitDef), TestHelpers.createDefaultAugments(), List.of(), List.of(HEAD_START, CHEAP_REROLLS));
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

            @Override
            public void registerTraitEffects(TraitManager traitManager) {}
        };
    }
}
