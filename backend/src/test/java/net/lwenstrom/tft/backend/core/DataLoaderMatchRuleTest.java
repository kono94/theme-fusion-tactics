package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderMatchRuleTest {
    private static final Set<String> COMMON_RULE_IDS = Set.of(
            "cheap-rerolls", "volatile", "loot-rain", "second-wind", "glass-cannons", "mana-surge", "head-start");

    @Test
    void everyModeGetsTheSharedRulesPlusItsThemedRule() {
        var dataLoader = createDataLoader();

        assertEquals(
                ids(COMMON_RULE_IDS, "bounty-hunt"),
                dataLoader.getMatchRules(GameMode.ONEPIECE).stream()
                        .map(MatchRuleDefinition::id)
                        .collect(Collectors.toSet()));
        assertEquals(
                ids(COMMON_RULE_IDS, "type-master"),
                dataLoader.getMatchRules(GameMode.POKEMON).stream()
                        .map(MatchRuleDefinition::id)
                        .collect(Collectors.toSet()));
    }

    @Test
    void referencedIconFilesExist() {
        var dataLoader = createDataLoader();
        var frontendPublic = Path.of("..", "frontend", "public");

        for (var mode : List.of(GameMode.ONEPIECE, GameMode.POKEMON)) {
            dataLoader.getMatchRules(mode).forEach(rule -> assertIconExists(frontendPublic, rule.icon()));
            dataLoader.getAugments(mode).forEach(augment -> assertIconExists(frontendPublic, augment.image()));
        }
    }

    private static void assertIconExists(Path frontendPublic, String icon) {
        assertTrue(icon != null && icon.startsWith("/assets/"), "Unexpected icon path " + icon);
        assertTrue(Files.exists(frontendPublic.resolve(icon.substring(1))), "Missing icon file " + icon);
    }

    private static Set<String> ids(Set<String> common, String themed) {
        return java.util.stream.Stream.concat(common.stream(), java.util.stream.Stream.of(themed))
                .collect(Collectors.toSet());
    }

    private static DataLoader createDataLoader() {
        var jsonMapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(jsonMapper), new PokemonGameModeProvider(jsonMapper)));
        return new DataLoader(registry, jsonMapper);
    }
}
