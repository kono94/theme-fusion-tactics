package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.analytics.GameplayAnalyticsRecorder;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;

class GameRoomCombatFastForwardTest {

    @Test
    void oneHumanBattleFinishesBeforeRemainingBotBattlesAreFastForwarded() {
        var clock = new TestClock();
        var recorder = new RecordingAnalyticsRecorder();
        var resultParticipantIds = new ArrayList<List<String>>();
        var room = createRoom(clock, recorder);
        addHuman(room, "Human");
        addBots(room, 7);
        room.setCombatResultListener(
                (roomId, winnerId, loserId, participantIds, damageLog) -> resultParticipantIds.add(participantIds));

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var combats = activeCombats(room);
        var humanCombat =
                combats.stream().filter(this::hasHumanParticipant).findFirst().orElseThrow();
        var botCombat = combats.stream()
                .filter(combat -> !hasHumanParticipant(combat))
                .findFirst()
                .orElseThrow();
        setCombatStats(humanCombat, 1, 100);
        setCombatStats(botCombat, 1_000, 10);
        separateCombatHorizontally(botCombat);
        combats.stream()
                .filter(combat -> !combat.equals(humanCombat) && !combat.equals(botCombat))
                .forEach(combat -> setCombatStats(combat, 1_000, 10));

        room.tick();

        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(4, recorder.combatResolutions);
        assertEquals(0, recorder.draws);
        assertEquals(4, resultParticipantIds.size());
    }

    @Test
    void botBattlesKeepNormalPacingWhileAnyHumanBattleIsActive() {
        var clock = new TestClock();
        var recorder = new RecordingAnalyticsRecorder();
        var room = createRoom(clock, recorder);
        addHuman(room, "Human");
        addBots(room, 7);

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var combats = activeCombats(room);
        combats.forEach(combat -> setCombatStats(combat, 1_000, 10));
        var botCombats =
                combats.stream().filter(combat -> !hasHumanParticipant(combat)).toList();

        room.tick();

        assertEquals(GamePhase.COMBAT, room.getState().phase());
        assertEquals(0, recorder.combatResolutions);
        assertFalse(botCombats.isEmpty());
        botCombats.stream()
                .flatMap(combat -> combat.stream())
                .flatMap(player -> player.getBoardUnits().stream())
                .forEach(unit -> assertEquals(1_000, unit.getCurrentHealth()));
    }

    @Test
    void remainingBotBattlesWaitForAllStaggeredHumanBattlesToFinish() {
        var clock = new TestClock();
        var recorder = new RecordingAnalyticsRecorder();
        var resultParticipantIds = new ArrayList<List<String>>();
        var room = createRoom(clock, recorder);
        addHumans(room, 4);
        addBots(room, 4);
        room.setCombatResultListener(
                (roomId, winnerId, loserId, participantIds, damageLog) -> resultParticipantIds.add(participantIds));

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var combats = activeCombats(room);
        var humanCombats = combats.stream().filter(this::hasHumanParticipant).toList();
        var botCombats =
                combats.stream().filter(combat -> !hasHumanParticipant(combat)).toList();
        assertEquals(2, humanCombats.size());
        assertEquals(2, botCombats.size());

        setCombatStats(humanCombats.get(0), 1, 100);
        setCombatStats(humanCombats.get(1), 40, 10);
        botCombats.forEach(combat -> {
            setCombatStats(combat, 1_000, 10);
            separateCombatHorizontally(combat);
        });

        room.tick();
        assertEquals(GamePhase.COMBAT, room.getState().phase());
        assertEquals(1, recorder.combatResolutions);
        assertBotUnitsHaveHealth(botCombats, 1_000);

        clock.advance(GameConstants.TICK_RATE_MS);
        room.tick();
        assertEquals(GamePhase.COMBAT, room.getState().phase());
        assertEquals(1, recorder.combatResolutions);
        assertBotUnitsHaveHealth(botCombats, 1_000);

        clock.advance(GameConstants.TICK_RATE_MS);
        room.tick();
        assertEquals(GamePhase.COMBAT, room.getState().phase());
        assertEquals(1, recorder.combatResolutions);
        assertBotUnitsHaveHealth(botCombats, 1_000);

        clock.advance(GameConstants.TICK_RATE_MS);
        room.tick();

        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(4, recorder.combatResolutions);
        assertEquals(0, recorder.draws);
        assertEquals(4, resultParticipantIds.size());
    }

    private GameRoom createRoom(TestClock clock, RecordingAnalyticsRecorder recorder) {
        var unitDefinition = createCombatUnitDefinition("test-unit", "Test Unit");
        var dataLoader = TestHelpers.createMockDataLoader(List.of(unitDefinition));
        return new GameRoom(
                "combat-fast-forward-room",
                dataLoader,
                TestHelpers.createMockRegistry(),
                clock,
                new GroupedRandomProvider(),
                GameMode.ONEPIECE,
                recorder);
    }

    private void addHuman(GameRoom room, String name) {
        var human = room.addPlayer(name);
        human.addUnitToBoard(createCombatUnitDefinition("human-unit-" + name, name, 9), 0, 0);
    }

    private void addHumans(GameRoom room, int count) {
        for (var i = 1; i <= count; i++) {
            addHuman(room, "Human-" + i);
        }
    }

    private void addBots(GameRoom room, int count) {
        for (var i = 0; i < count; i++) {
            var bot = room.addBot().orElseThrow();
            bot.addUnitToBoard(createCombatUnitDefinition("bot-unit-" + i, "Bot Unit"), 0, 2);
        }
    }

    @SuppressWarnings("unchecked")
    private List<List<Player>> activeCombats(GameRoom room) {
        try {
            var field = GameRoom.class.getDeclaredField("activeCombats");
            field.setAccessible(true);
            return (List<List<Player>>) field.get(room);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Unable to inspect active combats", exception);
        }
    }

    private boolean hasHumanParticipant(List<Player> combat) {
        return combat.stream().anyMatch(player -> !player.isBot() && !player.isGhost());
    }

    private void setCombatStats(List<Player> combat, int health, int attackDamage) {
        combat.stream().flatMap(player -> player.getBoardUnits().stream()).forEach(unit -> {
            unit.setMaxHealth(health);
            unit.setCurrentHealth(health);
            unit.setAttackDamage(attackDamage);
            unit.setAttackSpeed(10.0f);
        });
    }

    private void separateCombatHorizontally(List<Player> combat) {
        combat.get(0).getBoardUnits().forEach(unit -> unit.setPosition(0, unit.getY()));
        combat.get(1).getBoardUnits().forEach(unit -> unit.setPosition(8, unit.getY()));
    }

    private void assertBotUnitsHaveHealth(List<List<Player>> combats, int expectedHealth) {
        combats.stream()
                .flatMap(combat -> combat.stream())
                .flatMap(player -> player.getBoardUnits().stream())
                .forEach(unit -> assertEquals(expectedHealth, unit.getCurrentHealth()));
    }

    private UnitDefinition createCombatUnitDefinition(String id, String name) {
        return createCombatUnitDefinition(id, name, 1);
    }

    private UnitDefinition createCombatUnitDefinition(String id, String name, int range) {
        return new UnitDefinition(
                id,
                name,
                1,
                UnitRole.DAMAGE,
                List.of(100, 100, 100),
                List.of(0, 0, 0),
                List.of(10, 10, 10),
                List.of(0, 0, 0),
                List.of(0, 0, 0),
                List.of(1.0f, 1.0f, 1.0f),
                List.of(range, range, range),
                List.of(),
                null);
    }

    private static final class RecordingAnalyticsRecorder implements GameplayAnalyticsRecorder {
        private int combatResolutions;
        private int draws;

        @Override
        public void combatResolved(
                String roomId,
                int round,
                long occurredAt,
                String winnerId,
                String loserId,
                boolean draw,
                List<Player> participants) {
            combatResolutions++;
            if (draw) {
                draws++;
            }
        }
    }

    private static final class GroupedRandomProvider implements RandomProvider {
        private final Random random = new Random(0L);

        @Override
        public <T> void shuffle(List<T> list) {
            list.sort(Comparator.comparing(value -> value instanceof Player player && player.isBot()));
        }

        @Override
        public int nextInt(int bound) {
            return 0;
        }

        @Override
        public double nextDouble() {
            return 0.99;
        }

        @Override
        public Random getRandom() {
            return random;
        }
    }
}
