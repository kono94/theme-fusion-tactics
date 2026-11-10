package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.CombatModifiers;
import net.lwenstrom.tft.backend.core.model.FieldConditionDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionModifier;
import net.lwenstrom.tft.backend.core.model.FieldConditionStart;
import net.lwenstrom.tft.backend.core.model.FieldConditionView;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.GameState;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.test.SeededRandomProvider;
import net.lwenstrom.tft.backend.test.TestClock;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class FieldConditionCombatTest {
    private static final long IDLE = 1_000_000L;

    private static final FieldConditionDefinition RAIN = new FieldConditionDefinition(
            "rain",
            "Rain",
            "Rain",
            "/rain.png",
            Map.of("Water", 1.25, "Fire", 0.75),
            null,
            Map.of("Water", 0.15f),
            null,
            true,
            false);
    private static final FieldConditionDefinition SUN = new FieldConditionDefinition(
            "sun",
            "Sun",
            "Sun",
            "/sun.png",
            Map.of("Fire", 1.25, "Water", 0.75),
            null,
            Map.of("Grass", 0.15f),
            null,
            true,
            false);
    private static final FieldConditionDefinition SANDSTORM = new FieldConditionDefinition(
            "sandstorm",
            "Sandstorm",
            "Sandstorm",
            "/sandstorm.png",
            null,
            new FieldConditionDefinition.PeriodicDamage(3, 1000, List.of("Rock", "Ground", "Steel")),
            null,
            Map.of("Rock", 15),
            true,
            false);
    private static final FieldConditionDefinition HAIL = new FieldConditionDefinition(
            "hail",
            "Hail",
            "Hail",
            "/hail.png",
            null,
            new FieldConditionDefinition.PeriodicDamage(3, 1000, List.of("Ice")),
            null,
            Map.of("Ice", 15),
            true,
            false);
    private static final FieldConditionDefinition CLEAR =
            new FieldConditionDefinition("clear", "Clear", "Clear", "/clear.png", null, null, null, null, false, true);

    private final TestClock clock = TestHelpers.createTestClock();
    private final DataLoader dataLoader = TestHelpers.createMockDataLoader();
    private final List<GameState.CombatEvent> events = new ArrayList<>();

    @Test
    void simultaneousPairingsIncludingAGhostKeepSeparateConditions() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var a = player("A", def("rain-setter", 1, List.of("Water"), 1000, start("rain"), null));
        var b = player("B", def("plain", 1, List.of("Normal"), 1000, null, null));
        var c = player("C", def("sun-setter", 5, List.of("Grass"), 1000, start("sun"), null));
        var ghostOfA = a.createGhost();

        combatSystem.resetFieldConditions();
        for (var pairing : List.of(List.of(a, b), List.of(c, ghostOfA))) {
            combatSystem.startCombat(pairing);
            combatSystem.beginFieldConditions(pairing, null, 0);
        }

        assertEquals("rain", conditionId(combatSystem, a));
        assertEquals("rain", conditionId(combatSystem, b));
        assertEquals("sun", conditionId(combatSystem, c));
        assertEquals("sun", conditionId(combatSystem, ghostOfA));
        assertEquals(0.15f, field(a).attackSpeedBonus());
        assertEquals(0.0f, field(ghostOfA).attackSpeedBonus());
        assertEquals(0.15f, field(c).attackSpeedBonus());

        combatSystem.endFieldConditions(List.of(a, b));

        assertTrue(combatSystem.fieldConditionView(a.getId()).isEmpty());
        assertEquals("sun", conditionId(combatSystem, ghostOfA));
    }

    @Test
    void castConditionOnANonDamageAbilityOverridesTheActiveOneUntilItExpires() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var rainDance =
                ability("Sunny Day", AbilityType.BUFF_SPD, new FieldConditionModifier("sun", List.of(1, 1, 1), false));
        var a = player(
                "A",
                def("caster", 1, List.of("Grass"), 1000, null, rainDance),
                def("swimmer", 1, List.of("Water"), 1000, null, null));
        var b = player("B", def("target", 1, List.of("Normal"), 1000, null, null));
        var caster = a.getBoardUnits().getFirst();
        var swimmer = a.getBoardUnits().get(1);
        idle(swimmer, b.getBoardUnits().getFirst());
        caster.setMana(caster.getMaxMana());

        combatSystem.beginFieldConditions(List.of(a, b), new CombatSystem.RoundFieldCondition(RAIN, 0), 0);
        assertEquals(0.15f, swimmer.getCombatModifiers().attackSpeedBonus());

        tick(combatSystem, List.of(a, b), 0);

        assertEquals("sun", conditionId(combatSystem, a));
        assertEquals(0.0f, swimmer.getCombatModifiers().attackSpeedBonus());
        assertEquals(0.15f, caster.getCombatModifiers().attackSpeedBonus());
        var fieldEvents = events("FIELD");
        assertEquals(
                List.of("rain", "sun"),
                fieldEvents.stream().map(GameState.CombatEvent::skillName).toList());
        assertNull(fieldEvents.getFirst().sourceId());
        assertEquals(caster.getId(), fieldEvents.getLast().sourceId());

        tick(combatSystem, List.of(a, b), 1000);

        assertTrue(combatSystem.fieldConditionView(a.getId()).isEmpty());
        assertEquals(
                CombatModifiers.FieldModifiers.NONE, caster.getCombatModifiers().field());
    }

    @Test
    void periodicDamageSkipsImmuneTraitsAndKillsThroughLethalResolution() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var a = player(
                "A",
                def("rock", 1, List.of("Rock"), 1000, null, null),
                def("normal", 1, List.of("Normal"), 1000, null, null),
                def("fragile", 1, List.of("Normal"), 1000, null, null));
        var b = player(
                "B",
                def("steel", 1, List.of("steel"), 1000, null, null),
                def("phoenix", 1, List.of("Fire"), 1000, null, null));
        var rock = a.getBoardUnits().getFirst();
        var normal = a.getBoardUnits().get(1);
        var fragile = a.getBoardUnits().get(2);
        var steel = b.getBoardUnits().getFirst();
        var phoenix = b.getBoardUnits().get(1);
        idle(rock, normal, fragile, steel, phoenix);
        fragile.setCurrentHealth(20);
        phoenix.setCurrentHealth(10);
        phoenix.setHasRevive(true);
        var rockDefense = rock.getDefense();

        combatSystem.beginFieldConditions(List.of(a, b), new CombatSystem.RoundFieldCondition(SANDSTORM, 0), 0);
        assertEquals(rockDefense + 15, rock.getDefense());

        tick(combatSystem, List.of(a, b), 0);
        assertEquals(1000, normal.getCurrentHealth());
        tick(combatSystem, List.of(a, b), 1000);

        assertEquals(1000, rock.getCurrentHealth());
        assertEquals(1000, steel.getCurrentHealth());
        assertEquals(970, normal.getCurrentHealth());
        assertEquals(0, fragile.getCurrentHealth());
        assertEquals(400, phoenix.getCurrentHealth());
        var chip = events("FIELD_DAMAGE").stream()
                .filter(event -> event.targetId().equals(normal.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(normal.getId(), chip.sourceId());
        assertEquals(30, chip.value());
        assertEquals("sandstorm", chip.skillName());
        var deaths = events("DEATH");
        assertEquals(1, deaths.size());
        assertEquals(fragile.getId(), deaths.getFirst().targetId());
        assertEquals(30, combatSystem.getDamageLog().get(normal.getId()).damageTaken());
    }

    @Test
    void startSettersPreferCostThenStarAndOnlyRollOnARealTie() {
        var counting = new CountingRandom(7);
        var combatSystem = combatSystem(counting);
        var cheapHighStar = player("A", 3, def("rain-setter", 4, List.of("Water"), 1000, start("rain"), null));
        var expensive = player("B", 1, def("sun-setter", 5, List.of("Fire"), 1000, start("sun"), null));
        combatSystem.beginFieldConditions(List.of(cheapHighStar, expensive), null, 0);
        assertEquals("sun", conditionId(combatSystem, cheapHighStar));

        var twoStar = player("C", 2, def("rain-setter", 5, List.of("Water"), 1000, start("rain"), null));
        var oneStar = player("D", 1, def("sun-setter", 5, List.of("Fire"), 1000, start("sun"), null));
        combatSystem.beginFieldConditions(List.of(twoStar, oneStar), null, 0);
        assertEquals("rain", conditionId(combatSystem, twoStar));
        assertEquals(0, counting.calls);

        var left = player("E", 1, def("rain-setter", 5, List.of("Water"), 1000, start("rain"), null));
        var right = player("F", 1, def("sun-setter", 5, List.of("Fire"), 1000, start("sun"), null));
        combatSystem.beginFieldConditions(List.of(left, right), null, 0);

        var expected = new Random(7).nextInt(2) == 0 ? "rain" : "sun";
        assertEquals(expected, conditionId(combatSystem, left));
        assertEquals(1, counting.calls);
    }

    @Test
    void roundConditionStartsBeforeUnitSettersSoSettersOverrideIt() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var a = player("A", def("rain-setter", 5, List.of("Water"), 1000, start("rain"), null));
        var b = player("B", def("plain", 1, List.of("Normal"), 1000, null, null));
        idle(a.getBoardUnits().getFirst(), b.getBoardUnits().getFirst());

        combatSystem.beginFieldConditions(List.of(a, b), new CombatSystem.RoundFieldCondition(HAIL, 0), 0);
        tick(combatSystem, List.of(a, b), 0);

        assertEquals("rain", conditionId(combatSystem, a));
        assertEquals(
                List.of("hail", "rain"),
                events("FIELD").stream().map(GameState.CombatEvent::skillName).toList());
    }

    @Test
    void extendingCastRefreshesTheActiveConditionOrStartsItsOwn() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var weatherBall = ability(
                "Weather Ball", AbilityType.SHIELD, new FieldConditionModifier("rain", List.of(6, 8, 10), true));
        var a = player("A", def("castform", 4, List.of("Normal"), 1000, null, weatherBall));
        var b = player("B", def("plain", 1, List.of("Normal"), 1000, null, null));
        var castform = a.getBoardUnits().getFirst();
        idle(b.getBoardUnits().getFirst());

        combatSystem.beginFieldConditions(List.of(a, b), null, 0);
        castform.setMana(castform.getMaxMana());
        tick(combatSystem, List.of(a, b), 0);
        assertEquals("rain", conditionId(combatSystem, a));
        assertEquals(6000L, view(combatSystem, a).remainingMs());

        combatSystem.endFieldConditions(List.of(a, b));
        combatSystem.beginFieldConditions(List.of(a, b), new CombatSystem.RoundFieldCondition(SUN, 2), 1000);
        castform.setMana(castform.getMaxMana());
        castform.setNextAttackTime(0);
        clock.setTime(1500);
        tick(combatSystem, List.of(a, b), 1500);

        assertEquals("sun", conditionId(combatSystem, a));
        assertEquals(6000L, view(combatSystem, a).remainingMs());
    }

    @Test
    void clearingCastRemovesTheActiveCondition() {
        var combatSystem = combatSystem(new SeededRandomProvider(1));
        var ascent = ability(
                "Dragon Ascent", AbilityType.BUFF_DEF, new FieldConditionModifier("clear", List.of(0, 0, 0), false));
        var a = player(
                "A",
                def("rayquaza", 5, List.of("Dragon"), 1000, null, ascent),
                def("leaf", 1, List.of("Grass"), 1000, null, null));
        var b = player("B", def("plain", 1, List.of("Normal"), 1000, null, null));
        var rayquaza = a.getBoardUnits().getFirst();
        var leaf = a.getBoardUnits().get(1);
        idle(leaf, b.getBoardUnits().getFirst());

        combatSystem.beginFieldConditions(List.of(a, b), new CombatSystem.RoundFieldCondition(SUN, 0), 0);
        assertEquals(0.15f, leaf.getCombatModifiers().attackSpeedBonus());
        rayquaza.setMana(rayquaza.getMaxMana());
        tick(combatSystem, List.of(a, b), 0);

        assertTrue(combatSystem.fieldConditionView(a.getId()).isEmpty());
        assertEquals(
                CombatModifiers.FieldModifiers.NONE, leaf.getCombatModifiers().field());
        assertEquals("clear", events("FIELD").getLast().skillName());
    }

    @Test
    void weatherFrontForecastIsAppliedToPairingsWithoutStartSetters() {
        var registry = new GameModeRegistry(TestHelpers.allModeProviders());
        var loader = new DataLoader(registry, JsonMapper.builder().build());
        var room =
                new GameRoom("weather", loader, registry, clock, new SeededRandomProvider(42), GameMode.POKEMON_GEN23);
        var host = room.addPlayer("Host");
        assertTrue(room.setMatchRuleForHost(host.getId(), "weather-front"));
        room.startMatch();

        var forecast = room.getState().fieldForecast();
        assertNotNull(forecast);
        assertNull(forecast.remainingMs());
        assertTrue(loader.getFieldConditions(GameMode.POKEMON_GEN23).stream()
                .anyMatch(condition -> condition.id().equals(forecast.id()) && condition.selectableByRule()));

        TestHelpers.setPhase(room, GamePhase.COMBAT);
        var state = room.getState();
        assertNull(state.fieldForecast());
        var checked = 0;
        for (var matchup : state.matchups().entrySet()) {
            var units = new ArrayList<GameUnit>(
                    state.players().get(matchup.getKey()).board());
            units.addAll(state.players().get(matchup.getValue()).board());
            if (units.stream().noneMatch(unit -> unit.getStartCondition() != null)) {
                assertEquals(
                        forecast.id(),
                        state.fieldConditions().get(matchup.getKey()).id());
                checked++;
            }
        }
        assertTrue(checked > 0);
    }

    @Test
    void gameStateSerializesFieldConditionsAndForecast() {
        var mapper = JsonMapper.builder().build();
        var empty = TestHelpers.createTestGameRoom().getState();
        var emptyJson = mapper.writeValueAsString(empty);
        assertTrue(emptyJson.contains("\"fieldConditions\":{}"), emptyJson);
        assertTrue(emptyJson.contains("\"fieldForecast\":null"), emptyJson);

        var withWeather = new GameState(
                empty.roomId(),
                empty.hostId(),
                empty.phase(),
                empty.round(),
                empty.timeRemainingMs(),
                empty.totalPhaseDuration(),
                empty.players(),
                empty.matchups(),
                empty.recentEvents(),
                empty.damageLog(),
                empty.gameMode(),
                empty.planningTimerPaused(),
                empty.planningReadyPlayerId(),
                empty.planningPauseReason(),
                empty.itemSlotsPerUnit(),
                empty.matchRuleSelection(),
                empty.activeMatchRule(),
                empty.baseIncome(),
                empty.maxInterest(),
                empty.rerollCost(),
                Map.of("p1", RAIN.toView(null)),
                SUN.toView(8000L),
                empty.roundTimeSettings());
        var json = mapper.writeValueAsString(withWeather);

        assertTrue(
                json.contains("\"fieldConditions\":{\"p1\":{\"id\":\"rain\",\"name\":\"Rain\",\"description\":\"Rain\","
                        + "\"icon\":\"/rain.png\",\"remainingMs\":null}}"),
                json);
        assertTrue(json.contains("\"fieldForecast\":{\"id\":\"sun\""), json);
        assertTrue(json.contains("\"remainingMs\":8000"), json);
    }

    @Test
    void shippedGen23ConditionsMatchTheDesign() {
        var loader = new DataLoader(
                new GameModeRegistry(TestHelpers.allModeProviders()),
                JsonMapper.builder().build());
        var conditions = loader.getFieldConditions(GameMode.POKEMON_GEN23);

        assertEquals(
                List.of("rain", "sun", "sandstorm", "hail", "clear"),
                conditions.stream().map(FieldConditionDefinition::id).toList());
        assertFalse(conditions.getLast().selectableByRule());
        assertTrue(conditions.getLast().clearsField());
        assertTrue(loader.getFieldConditions(GameMode.ONEPIECE).isEmpty());
        assertTrue(loader.getFieldConditions(GameMode.POKEMON).isEmpty());
        assertEquals(
                "sandstorm",
                loader.getUnitDefinition(GameMode.POKEMON_GEN23, "larvitar")
                        .formAt(3, null)
                        .startCondition()
                        .conditionId());
        assertNull(loader.getUnitDefinition(GameMode.POKEMON_GEN23, "larvitar")
                .formAt(2, null)
                .startCondition());
    }

    private CombatSystem combatSystem(RandomProvider randomProvider) {
        var combatSystem = new CombatSystem(
                new TraitManager(),
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                randomProvider);
        combatSystem.configureFieldConditions(List.of(RAIN, SUN, SANDSTORM, HAIL, CLEAR));
        return combatSystem;
    }

    private void tick(CombatSystem combatSystem, List<Player> participants, long time) {
        events.addAll(combatSystem.simulateTick(participants, time).events());
    }

    private List<GameState.CombatEvent> events(String type) {
        return events.stream().filter(event -> event.type().equals(type)).toList();
    }

    private Player player(String name, UnitDefinition... units) {
        return player(name, 1, units);
    }

    private Player player(String name, int starLevel, UnitDefinition... units) {
        var player = TestHelpers.createTestPlayer(name, dataLoader);
        player.setLevel(units.length);
        for (var index = 0; index < units.length; index++) {
            player.addUnitToBoard(units[index], index, 0, starLevel);
        }
        return player;
    }

    private static void idle(GameUnit... units) {
        for (var unit : units) {
            unit.setNextAttackTime(IDLE);
        }
    }

    private static CombatModifiers.FieldModifiers field(Player player) {
        return player.getBoardUnits().getFirst().getCombatModifiers().field();
    }

    private static String conditionId(CombatSystem combatSystem, Player player) {
        return view(combatSystem, player).id();
    }

    private static FieldConditionView view(CombatSystem combatSystem, Player player) {
        return combatSystem.fieldConditionView(player.getId()).orElseThrow();
    }

    private static FieldConditionStart start(String conditionId) {
        return new FieldConditionStart(conditionId, 0);
    }

    private static AbilityDefinition ability(String name, AbilityType type, FieldConditionModifier modifier) {
        return new AbilityDefinition(
                name, name, type, AbilityPattern.SURROUND, List.of(4, 4, 4), List.of(10, 10, 10), List.of(modifier));
    }

    private static UnitDefinition def(
            String id,
            int cost,
            List<String> traits,
            int health,
            FieldConditionStart startCondition,
            AbilityDefinition ability) {
        return new UnitDefinition(
                id,
                id,
                cost,
                UnitRole.DAMAGE,
                List.of(health, health, health),
                List.of(50, 50, 50),
                List.of(10, 10, 10),
                List.of(0, 0, 0),
                List.of(0, 0, 0),
                List.of(1.0f, 1.0f, 1.0f),
                List.of(1, 1, 1),
                traits,
                ability,
                null,
                null,
                startCondition);
    }

    private static final class CountingRandom extends SeededRandomProvider {
        private int calls;

        private CountingRandom(long seed) {
            super(seed);
        }

        @Override
        public int nextInt(int bound) {
            calls++;
            return super.nextInt(bound);
        }
    }
}
