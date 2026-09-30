package net.lwenstrom.tft.backend.test;

import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityLoader;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.engine.CombatSystem;
import net.lwenstrom.tft.backend.core.engine.GameRoom;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.AugmentEffectType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import net.lwenstrom.tft.backend.core.random.RandomProvider;
import net.lwenstrom.tft.backend.core.time.Clock;

public final class TestHelpers {

    private TestHelpers() {}

    public static final long TEST_SEED = 42L;

    public static GameModeRegistry createMockRegistry() {
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
        return new GameModeRegistry(List.of(provider));
    }

    public static DataLoader createMockDataLoader() {
        return createMockDataLoader(List.of(createDefaultUnitDef()));
    }

    public static DataLoader createMockDataLoader(List<UnitDefinition> units) {
        return createMockDataLoader(units, createDefaultAugments());
    }

    public static DataLoader createMockDataLoader(List<UnitDefinition> units, List<AugmentDefinition> augments) {
        return createMockDataLoader(units, augments, List.of());
    }

    public static DataLoader createMockDataLoader(
            List<UnitDefinition> units,
            List<AugmentDefinition> augments,
            List<net.lwenstrom.tft.backend.core.model.ItemDefinition> items) {
        return createMockDataLoader(units, augments, items, List.of());
    }

    public static DataLoader createMockDataLoader(
            List<UnitDefinition> units,
            List<AugmentDefinition> augments,
            List<net.lwenstrom.tft.backend.core.model.ItemDefinition> items,
            List<net.lwenstrom.tft.backend.core.model.MatchRuleDefinition> matchRules) {
        var registry = createMockRegistry();
        return new DataLoader(
                registry, tools.jackson.databind.json.JsonMapper.builder().build()) {
            @Override
            public List<UnitDefinition> getAllUnits(GameMode mode) {
                return units;
            }

            @Override
            public UnitDefinition getUnitDefinition(GameMode mode, String id) {
                return units.stream()
                        .filter(u -> u.id().equals(id))
                        .findFirst()
                        .orElse(units.isEmpty() ? null : units.get(0));
            }

            @Override
            public List<TraitMetadata> getTraitMetadata(GameMode mode) {
                return List.of();
            }

            @Override
            public List<AugmentDefinition> getAugments(GameMode mode) {
                return augments;
            }

            @Override
            public List<net.lwenstrom.tft.backend.core.model.ItemDefinition> getItems(GameMode mode) {
                return items;
            }

            @Override
            public List<net.lwenstrom.tft.backend.core.model.MatchRuleDefinition> getMatchRules(GameMode mode) {
                return matchRules;
            }

            @Override
            public net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig getAffinityConfig(GameMode mode) {
                return net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig.neutral();
            }
        };
    }

    public static List<AugmentDefinition> createDefaultAugments() {
        return List.of(
                createAugment("ranged-tempo", AugmentEffectType.TEAM_ATTACK_SPEED_PER_RANGED_UNIT, List.of(3, 5, 8)),
                createAugment("guarded-formation", AugmentEffectType.TEAM_DAMAGE_REDUCTION, List.of(5, 10, 15)),
                createAugment("snowball-strike", AugmentEffectType.TEAM_ATTACK_DAMAGE_ON_KILL, List.of(6, 10, 15)),
                createAugment("treasure-cache", AugmentEffectType.GOLD, List.of(15, 25, 35)),
                createAugment("training-arc", AugmentEffectType.XP, List.of(8, 16, 24)),
                createAugment("battle-standard", AugmentEffectType.TEAM_MAX_HEALTH, List.of(120, 220, 360)),
                createAugment("sharpened-blades", AugmentEffectType.TEAM_ATTACK_DAMAGE, List.of(4, 7, 10)),
                createAugment("focused-haki", AugmentEffectType.TEAM_ABILITY_POWER, List.of(10, 18, 30)),
                createAugment("iron-line", AugmentEffectType.TEAM_DEFENSE, List.of(8, 14, 22)),
                createAugment("close-quarters", AugmentEffectType.MELEE_LIFESTEAL, List.of(10, 16, 24)),
                createAugment("backline-barrage", AugmentEffectType.RANGED_ATTACK_DAMAGE, List.of(5, 8, 12)),
                createAugment("quick-study", AugmentEffectType.TEAM_MANA_GAIN, List.of(12, 20, 30)),
                createAugment("opening-burst", AugmentEffectType.TEAM_STARTING_MANA, List.of(10, 20, 35)),
                createAugment("clean-bench", AugmentEffectType.GOLD_PER_EMPTY_BENCH_SLOT, List.of(3, 5, 8)),
                createAugment("first-guard", AugmentEffectType.TEAM_STARTING_SHIELD, List.of(125, 225, 375)));
    }

    public static AugmentDefinition createAugment(String id, AugmentEffectType effectType, List<Integer> values) {
        return new AugmentDefinition(
                id, id, effectType, values, List.of(id + " silver", id + " gold", id + " diamond"), null);
    }

    public static UnitDefinition createDefaultUnitDef() {
        return new UnitDefinition(
                "test-unit-1",
                "TestUnit",
                1,
                UnitRole.DAMAGE,
                l(100),
                l(100),
                l(10),
                l(0),
                l(0),
                lf(1.0f),
                l(1),
                List.of("Trait"),
                null);
    }

    public static UnitDefinition createUnitDef(String id, String name, int cost, int health, int attackDamage) {
        return new UnitDefinition(
                id,
                name,
                cost,
                UnitRole.DAMAGE,
                l(health),
                l(100),
                l(attackDamage),
                l(0),
                l(0),
                lf(1.0f),
                l(1),
                List.of(),
                null);
    }

    public static UnitDefinition createUnitDefWithAbility(
            String id, String name, int cost, int health, int maxMana, AbilityDefinition ability) {
        return new UnitDefinition(
                id,
                name,
                cost,
                UnitRole.DAMAGE,
                l(health),
                l(maxMana),
                l(10),
                l(0),
                l(0),
                lf(1.0f),
                l(1),
                List.of(),
                ability);
    }

    private static List<Integer> l(int val) {
        return List.of(val, val, val);
    }

    private static List<Float> lf(float val) {
        return List.of(val, val, val);
    }

    public static SeededRandomProvider createSeededRandomProvider() {
        return new SeededRandomProvider(TEST_SEED);
    }

    public static SeededRandomProvider createSeededRandomProvider(long seed) {
        return new SeededRandomProvider(seed);
    }

    public static Player createTestPlayer(String name) {
        return createTestPlayer(name, createMockDataLoader());
    }

    public static Player createTestPlayer(String name, DataLoader dataLoader) {
        return new Player(name, GameMode.ONEPIECE, dataLoader, createSeededRandomProvider());
    }

    public static Player createTestPlayer(String name, DataLoader dataLoader, RandomProvider randomProvider) {
        return new Player(name, GameMode.ONEPIECE, dataLoader, randomProvider);
    }

    public static TestClock createTestClock() {
        return new TestClock();
    }

    public static CombatSystem createTestCombatSystem() {
        return createTestCombatSystem(createTestClock());
    }

    public static CombatSystem createTestCombatSystem(Clock clock) {
        return new CombatSystem(
                new TraitManager(),
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                createSeededRandomProvider());
    }

    public static CombatSystem createPokemonCombatSystem() {
        var clock = createTestClock();
        return new CombatSystem(
                new TraitManager(),
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                createSeededRandomProvider(),
                new ElementalAffinityLoader().load("/data/affinities_pokemon.json"));
    }

    public static GameRoom createTestGameRoom() {
        return createTestGameRoom("test-room");
    }

    public static GameRoom createTestGameRoom(String roomId) {
        var registry = createMockRegistry();
        var dataLoader = createMockDataLoader();
        var clock = createTestClock();
        var randomProvider = createSeededRandomProvider();
        return new GameRoom(roomId, dataLoader, registry, clock, randomProvider, GameMode.ONEPIECE);
    }

    public static GameRoom createTestGameRoom(DataLoader dataLoader) {
        var registry = createMockRegistry();
        var clock = createTestClock();
        var randomProvider = createSeededRandomProvider();
        return new GameRoom("test-room", dataLoader, registry, clock, randomProvider, GameMode.ONEPIECE);
    }

    public static GameRoom createTestGameRoom(DataLoader dataLoader, Clock clock) {
        var registry = createMockRegistry();
        var randomProvider = createSeededRandomProvider();
        return new GameRoom("test-room", dataLoader, registry, clock, randomProvider, GameMode.ONEPIECE);
    }

    public static void fastForwardPhase(GameRoom room) {
        try {
            var field = GameRoom.class.getDeclaredField("phaseEndTime");
            field.setAccessible(true);
            field.set(room, System.currentTimeMillis() - 1);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fast forward phase", e);
        }
    }

    public static void setPhase(GameRoom room, net.lwenstrom.tft.backend.core.model.GamePhase phase) {
        try {
            var method = GameRoom.class.getDeclaredMethod(
                    "startPhase", net.lwenstrom.tft.backend.core.model.GamePhase.class);
            method.setAccessible(true);
            method.invoke(room, phase);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set phase", e);
        }
    }

    public static void addUnitToPlayer(Player player, net.lwenstrom.tft.backend.core.model.GameUnit unit) {
        try {
            var field = Player.class.getDeclaredField("boardUnits");
            field.setAccessible(true);
            @SuppressWarnings("unchecked")
            var boardUnits = (java.util.List<net.lwenstrom.tft.backend.core.model.GameUnit>) field.get(player);
            boardUnits.add(unit);
            unit.setOwnerId(player.getId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to add unit to player", e);
        }
    }
}
