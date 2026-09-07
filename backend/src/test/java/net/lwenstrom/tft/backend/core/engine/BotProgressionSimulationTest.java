package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.combat.BfsUnitMover;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.random.DefaultRandomProvider;
import net.lwenstrom.tft.backend.game.onepiece.OnePieceGameModeProvider;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.json.JsonMapper;

class BotProgressionSimulationTest {
    @ParameterizedTest
    @EnumSource(GameMode.class)
    void seededProgressionStaysWithinPlayerEconomy(GameMode mode) throws Exception {
        var first = simulate(mode, 42);
        assertEquals(first, simulate(mode, 42), "Seeded progression should reproduce");
        var report = new ArrayList<String>();
        report.add("seed,round,gold,level,boardSize,threeStars,ownedCopies,actions,outcome");
        report.addAll(first);
        report.addAll(simulate(mode, 73));
        report.addAll(simulate(mode, 101));
        var directory = Path.of("target/simulation-reports");
        Files.createDirectories(directory);
        Files.write(directory.resolve("economy-bots-" + mode.getValue() + ".csv"), report);
    }

    private List<String> simulate(GameMode mode, long seed) {
        var mapper = JsonMapper.builder().build();
        var registry = new GameModeRegistry(
                List.of(new OnePieceGameModeProvider(mapper), new PokemonGameModeProvider(mapper)));
        var loader = new DataLoader(registry, mapper);
        var random = new DefaultRandomProvider();
        random.getRandom().setSeed(seed);
        var bot = new Player("bot", mode, loader, random);
        var baseline = new Player("baseline", mode, loader, random);
        bot.setBot(true);
        var controller = new BotController(loader, random);
        var augments = new AugmentManager(loader.getAugments(mode), random);
        var traits = new TraitManager();
        registry.getProvider(mode).registerTraitEffects(traits);
        var clock = TestHelpers.createTestClock();
        var combat = new CombatSystem(
                traits,
                clock,
                new NearestEnemyTargetSelector(),
                new BfsUnitMover(clock),
                new DefaultAbilityCaster(),
                random,
                loader.getAffinityConfig(mode));
        var report = new ArrayList<String>();
        var totalGrantedGold = GameConstants.STARTING_GOLD;
        for (var round = 1; round <= 25; round++) {
            var income = GameConstants.BASE_INCOME + Math.min(bot.getGold() / 10, GameConstants.MAX_INTEREST);
            totalGrantedGold += income + (round % 2 == 0 ? 6 : 0);
            for (var player : List.of(bot, baseline)) {
                player.gainGold(
                        GameConstants.BASE_INCOME + Math.min(player.getGold() / 10, GameConstants.MAX_INTEREST));
                player.gainXp(GameConstants.XP_PER_PHASE);
                player.refreshShop();
                if (round % 2 == 0) player.addLootOrb(new LootOrb("round-" + round, 0, 0, LootType.GOLD, null, 6));
            }
            var actions = controller.plan(bot, round, augments);
            baseline.collectAllOrbs();
            for (var index = 0; index < baseline.getShop().size(); index++) baseline.buyUnit(index);
            baseline.autoFillBoard();
            while (baseline.getGold() >= 24 && baseline.buyXp()) {}
            baseline.autoFillBoard();
            var owned = Stream.concat(
                            bot.getBoardUnits().stream(), bot.getBenchSlots().units())
                    .toList();
            var value = owned.stream().mapToInt(bot::calculateSellValue).sum();
            assertTrue(value + bot.getGold() <= totalGrantedGold, "No unearned roster value");
            assertTrue(bot.getGold() >= 0);
            assertTrue(bot.getBoardUnits().size() <= bot.getLevel());
            assertTrue(bot.getBenchSlots().count() <= 9);
            assertTrue(actions <= BotController.MAX_ACTIONS);
            assertEquals(
                    bot.getBoardUnits().size(),
                    bot.getBoardUnits().stream()
                            .map(unit -> unit.getX() + ":" + unit.getY())
                            .distinct()
                            .count());
            for (var unit : bot.getBoardUnits()) {
                assertTrue(unit.getX() >= 0
                        && unit.getX() < Grid.COLS
                        && unit.getY() >= 0
                        && unit.getY() < Grid.PLAYER_ROWS);
            }
            var participants = round % 2 == 0 ? List.of(bot, baseline) : List.of(baseline, bot);
            combat.startCombat(participants);
            var outcome = "draw";
            for (var tick = 0; tick < 320; tick++) {
                var result = combat.simulateTick(participants, clock.currentTimeMillis());
                clock.advance(100);
                if (result.ended()) {
                    outcome = bot.getId().equals(result.winnerId()) ? "win" : "loss";
                    break;
                }
            }
            combat.endCombat(participants);
            var copies = owned.stream()
                    .mapToInt(unit -> switch (unit.getStarLevel()) {
                        case 1 -> 1;
                        case 2 -> 3;
                        default -> 6;
                    })
                    .sum();
            report.add(seed + "," + round + "," + bot.getGold() + "," + bot.getLevel() + ","
                    + bot.getBoardUnits().size() + ","
                    + owned.stream().filter(unit -> unit.getStarLevel() == 3).count()
                    + "," + copies + "," + actions + "," + outcome);
        }
        return report;
    }
}
