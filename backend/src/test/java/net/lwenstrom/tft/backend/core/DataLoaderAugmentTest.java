package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.model.AugmentEffectType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderAugmentTest {

    @Test
    void loadsAndValidatesModeAugments() {
        var jsonMapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(TestHelpers.allModeProviders(jsonMapper));
        var dataLoader = new DataLoader(registry, jsonMapper);

        validate(dataLoader, GameMode.ONEPIECE);
        validate(dataLoader, GameMode.POKEMON);
        validate(dataLoader, GameMode.POKEMON_GEN23);
    }

    private void validate(DataLoader dataLoader, GameMode mode) {
        var augments = dataLoader.getAugments(mode);
        assertEquals(15, augments.size());
        assertEquals(
                Set.of(
                        AugmentEffectType.TEAM_ATTACK_SPEED_PER_RANGED_UNIT,
                        AugmentEffectType.TEAM_DAMAGE_REDUCTION,
                        AugmentEffectType.TEAM_ATTACK_DAMAGE_ON_KILL,
                        AugmentEffectType.TEAM_MAX_HEALTH,
                        AugmentEffectType.TEAM_ATTACK_DAMAGE,
                        AugmentEffectType.TEAM_ABILITY_POWER,
                        AugmentEffectType.TEAM_DEFENSE,
                        AugmentEffectType.MELEE_LIFESTEAL,
                        AugmentEffectType.RANGED_ATTACK_DAMAGE,
                        AugmentEffectType.TEAM_MANA_GAIN,
                        AugmentEffectType.TEAM_STARTING_MANA,
                        AugmentEffectType.GOLD_PER_EMPTY_BENCH_SLOT,
                        AugmentEffectType.TEAM_STARTING_SHIELD,
                        AugmentEffectType.GOLD,
                        AugmentEffectType.XP),
                augments.stream().map(augment -> augment.effectType()).collect(Collectors.toSet()));
        assertEquals(
                15,
                augments.stream()
                        .map(augment -> augment.id())
                        .collect(Collectors.toSet())
                        .size());
        assertTrue(augments.stream().allMatch(augment -> augment.values().size() == 3));
        assertTrue(augments.stream().allMatch(augment -> augment.descriptions().size() == 3));
        assertEquals(
                expectedAugmentValues(mode),
                augments.stream()
                        .collect(Collectors.toMap(augment -> augment.effectType(), augment -> augment.values())));
    }

    private Map<AugmentEffectType, List<Integer>> expectedAugmentValues(GameMode mode) {
        var values = new EnumMap<AugmentEffectType, List<Integer>>(AugmentEffectType.class);
        values.put(AugmentEffectType.TEAM_ATTACK_SPEED_PER_RANGED_UNIT, List.of(3, 5, 8));
        values.put(AugmentEffectType.TEAM_DAMAGE_REDUCTION, List.of(5, 10, 15));
        values.put(AugmentEffectType.TEAM_ATTACK_DAMAGE_ON_KILL, List.of(6, 10, 15));
        values.put(
                AugmentEffectType.TEAM_MAX_HEALTH,
                mode == GameMode.ONEPIECE ? List.of(150, 275, 450) : List.of(120, 220, 360));
        values.put(
                AugmentEffectType.TEAM_ATTACK_DAMAGE,
                mode == GameMode.ONEPIECE ? List.of(8, 14, 22) : List.of(6, 10, 15));
        values.put(AugmentEffectType.TEAM_ABILITY_POWER, List.of(10, 18, 30));
        values.put(AugmentEffectType.TEAM_DEFENSE, List.of(8, 14, 22));
        values.put(AugmentEffectType.MELEE_LIFESTEAL, List.of(12, 20, 30));
        values.put(
                AugmentEffectType.RANGED_ATTACK_DAMAGE,
                mode == GameMode.ONEPIECE ? List.of(9, 15, 24) : List.of(7, 11, 16));
        values.put(AugmentEffectType.TEAM_MANA_GAIN, List.of(15, 25, 40));
        values.put(AugmentEffectType.TEAM_STARTING_MANA, List.of(10, 15, 20));
        values.put(AugmentEffectType.GOLD_PER_EMPTY_BENCH_SLOT, List.of(1, 2, 3));
        values.put(AugmentEffectType.TEAM_STARTING_SHIELD, List.of(125, 225, 375));
        values.put(AugmentEffectType.GOLD, List.of(10, 16, 24));
        values.put(AugmentEffectType.XP, List.of(8, 16, 24));
        return values;
    }
}
