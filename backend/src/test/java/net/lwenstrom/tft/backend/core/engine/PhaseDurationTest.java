package net.lwenstrom.tft.backend.core.engine;

import static net.lwenstrom.tft.backend.test.TestHelpers.createSeededRandomProvider;
import static net.lwenstrom.tft.backend.test.TestHelpers.createTestClock;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

public class PhaseDurationTest {

    private GameRoom room;
    private TestClock testClock;

    @BeforeEach
    public void setup() {
        // Mock Dependencies
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

            @Override
            public void registerTraitEffects(TraitManager traitManager) {}
        };

        GameModeRegistry registry = new GameModeRegistry(List.of(provider));
        DataLoader dataLoader = new DataLoader(registry, JsonMapper.builder().build()) {
            @Override
            public List<UnitDefinition> getAllUnits(GameMode mode) {
                return List.of(new UnitDefinition(
                        "u1",
                        "Unit",
                        1,
                        net.lwenstrom.tft.backend.core.model.UnitRole.DAMAGE,
                        List.of(100, 100, 100),
                        List.of(10, 10, 10),
                        List.of(10, 10, 10),
                        List.of(1, 1, 1),
                        List.of(1, 1, 1),
                        List.of(1f, 1f, 1f),
                        List.of(1, 1, 1),
                        List.of(),
                        null));
            }

            @Override
            public UnitDefinition getUnitDefinition(GameMode mode, String id) {
                return getAllUnits(mode).get(0);
            }

            @Override
            public List<net.lwenstrom.tft.backend.core.model.TraitMetadata> getTraitMetadata(GameMode mode) {
                return List.of();
            }

            @Override
            public List<AugmentDefinition> getAugments(GameMode mode) {
                return TestHelpers.createDefaultAugments();
            }
        };

        testClock = createTestClock();
        room = new GameRoom(
                "test-room", dataLoader, registry, testClock, createSeededRandomProvider(), GameMode.ONEPIECE);
        room.addPlayer("P1");
        room.addPlayer("P2");
    }

    @Test
    public void testPhaseDurationScaling() throws Exception {
        // Start Match -> Round 1 Planning
        room.startMatch();
        assertEquals(1, room.getState().round());
        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(15000, room.getState().totalPhaseDuration(), "Round 1 Planning should be 15s");

        // Fast forward to Combat
        fastForward();
        room.tick();

        assertEquals(GamePhase.COMBAT, room.getState().phase());
        assertEquals(32000, room.getState().totalPhaseDuration(), "Round 1 Combat should be 32s");

        // Fast forward to Round 2 Planning
        fastForward();
        room.tick();

        assertEquals(2, room.getState().round());
        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(15250, room.getState().totalPhaseDuration(), "Round 2 Planning should be 15.25s");

        // Fast forward to Round 2 Combat
        fastForward();
        room.tick();

        assertEquals(32000, room.getState().totalPhaseDuration(), "Round 2 Combat should be 32s");
    }

    @Test
    public void testLateGameScaling() {
        // Start Match -> Round 1
        room.startMatch();

        // Advance multiple rounds (bots may eliminate players, so game might end early)
        for (int i = 1; i < 10; i++) {
            if (room.getState().phase() == GamePhase.END) {
                break;
            }
            // Planning -> Combat
            try {
                fastForward();
            } catch (Exception e) {
            }
            room.tick();

            if (room.getState().phase() == GamePhase.END) {
                break;
            }
            // Combat -> Planning (Next Round)
            try {
                fastForward();
            } catch (Exception e) {
            }
            room.tick();
        }

        // Verify the phase duration formula is correct for whatever round we reached
        if (room.getState().phase() != GamePhase.END) {
            int round = (int) room.getState().round();
            GamePhase phase = room.getState().phase();
            long expectedDuration = (phase == GamePhase.COMBAT) ? 32000 : 15000 + (round - 1) * 250L;
            assertEquals(
                    expectedDuration,
                    room.getState().totalPhaseDuration(),
                    "Round " + round + " (" + phase + ") should have correct duration");
        }
    }

    private void fastForward() {
        // Use TestClock to advance time past phase end
        testClock.advance(33000);
    }
}
