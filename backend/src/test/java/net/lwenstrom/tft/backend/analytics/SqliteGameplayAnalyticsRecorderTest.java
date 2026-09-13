package net.lwenstrom.tft.backend.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.GameItem;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitCombatStats;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.sqlite.SQLiteConfig;
import org.sqlite.SQLiteDataSource;
import tools.jackson.databind.json.JsonMapper;

class SqliteGameplayAnalyticsRecorderTest {
    @TempDir
    java.nio.file.Path temporaryDirectory;

    @Test
    void persistsRoundProgressOutcomeAbandonmentAndPlacement() throws Exception {
        var sqliteConfig = new SQLiteConfig();
        sqliteConfig.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(sqliteConfig);
        dataSource.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("analytics.db"));
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        var jdbcTemplate = new JdbcTemplate(dataSource);
        var transactionTemplate = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        var recorder = new SqliteGameplayAnalyticsRecorder(
                jdbcTemplate,
                JsonMapper.builder().build(),
                transactionTemplate,
                "1.2.3",
                "abc123",
                "2026-07-10T20:00:00Z");

        var dataLoader = TestHelpers.createMockDataLoader();
        var player = new Player(
                "Anonymous",
                GameMode.ONEPIECE,
                dataLoader,
                TestHelpers.createSeededRandomProvider(),
                "browser-123",
                "reconnect-hash");
        var bot = new Player("Bot", GameMode.ONEPIECE, dataLoader, TestHelpers.createSeededRandomProvider());
        bot.setBot(true);
        player.addUnitToBoard(TestHelpers.createDefaultUnitDef(), 0, 0, 1);
        player.getBoardUnits().getFirst().getItems().add(new TestItem("item-1"));
        var fallbackPlayer = new Player(
                "Fallback",
                GameMode.ONEPIECE,
                dataLoader,
                TestHelpers.createSeededRandomProvider(),
                "browser-fallback",
                "fallback-hash");

        recorder.matchStarted("match-key", GameMode.ONEPIECE, 1_000, List.of(player, fallbackPlayer));
        recorder.roundStarted("match-key", 1, 1_100, List.of(player));
        player.takeDamage(12);
        recorder.combatResolved(
                "match-key",
                1,
                1_200,
                player.getId(),
                bot.getId(),
                false,
                List.of(player, bot),
                Map.of(
                        player.getId(),
                        List.of(new UnitCombatStats("test-line", "test-unit-1", "Test Unit", 2, 321, 210, 45, 67))));
        recorder.playerAbandoned("match-key", player.getId(), 1_250);
        player.setPlace(1);
        fallbackPlayer.setPlace(2);
        recorder.playerPlacementFinalized("match-key", 4, 1_275, player);
        recorder.matchCompleted("match-key", 9, 1_300, List.of(player, fallbackPlayer));
        recorder.awaitPendingWrites();

        assertThat(jdbcTemplate.queryForObject(
                        "SELECT status FROM analytics_match WHERE room_id = 'match-key'", String.class))
                .isEqualTo("COMPLETED");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT backend_version FROM analytics_match WHERE room_id = 'match-key'", String.class))
                .isEqualTo("1.2.3");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_placement FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        Integer.class))
                .isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_round FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        Integer.class))
                .isEqualTo(4);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_health FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        Integer.class))
                .isEqualTo(88);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_round FROM analytics_player_run WHERE analytics_client_id = 'browser-fallback'",
                        Integer.class))
                .isEqualTo(9);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT abandoned_at FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        Long.class))
                .isEqualTo(1_250L);
        assertThat(jdbcTemplate.queryForMap("SELECT * FROM analytics_player_round"))
                .containsEntry("outcome", "WIN");
        assertThat(jdbcTemplate.queryForObject("SELECT post_health FROM analytics_player_round", Integer.class))
                .isEqualTo(88);
        assertThat(jdbcTemplate.queryForObject("SELECT opponent_type FROM analytics_player_round", String.class))
                .isEqualTo("BOT");
        assertThat(jdbcTemplate.queryForMap("SELECT * FROM analytics_unit_combat_stat"))
                .containsEntry("line_id", "test-line")
                .containsEntry("definition_id", "test-unit-1")
                .containsEntry("unit_name", "Test Unit")
                .containsEntry("star_level", 2)
                .containsEntry("damage_dealt", 321)
                .containsEntry("damage_taken", 210)
                .containsEntry("healing_done", 45)
                .containsEntry("shielding_done", 67);
        assertThat(jdbcTemplate.queryForObject("SELECT board_json FROM analytics_player_round", String.class))
                .contains("\"definitionId\":\"test-unit-1\"")
                .contains("\"starLevel\":1")
                .contains("\"itemIds\":[\"item-1\"]");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT placement_finalized_at FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        Long.class))
                .isEqualTo(1_275L);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_board_json FROM analytics_player_run WHERE analytics_client_id = 'browser-123'",
                        String.class))
                .contains("\"definitionId\":\"test-unit-1\"")
                .contains("\"itemIds\":[\"item-1\"]");
    }

    @Test
    void classifiesBotGhostsAsBotOpponents() throws Exception {
        var sqliteConfig = new SQLiteConfig();
        sqliteConfig.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(sqliteConfig);
        dataSource.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("bot-ghost.db"));
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        var jdbcTemplate = new JdbcTemplate(dataSource);
        var recorder = new SqliteGameplayAnalyticsRecorder(
                jdbcTemplate,
                JsonMapper.builder().build(),
                new TransactionTemplate(new DataSourceTransactionManager(dataSource)),
                "unknown",
                "unknown",
                "unknown");
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = new Player("Anonymous", GameMode.ONEPIECE, dataLoader, TestHelpers.createSeededRandomProvider());
        var bot = new Player("Bot", GameMode.ONEPIECE, dataLoader, TestHelpers.createSeededRandomProvider());
        bot.setBot(true);
        var botGhost = bot.createGhost();

        recorder.matchStarted("match-key", GameMode.ONEPIECE, 1_000, List.of(player));
        recorder.roundStarted("match-key", 1, 1_100, List.of(player));
        recorder.combatResolved(
                "match-key", 1, 1_200, player.getId(), botGhost.getId(), false, List.of(player, botGhost));
        recorder.awaitPendingWrites();

        assertThat(jdbcTemplate.queryForObject("SELECT opponent_type FROM analytics_player_round", String.class))
                .isEqualTo("BOT");
    }

    @Test
    void firstFinalCompositionWinsAndCapturedEmptyBoardIsNotMissing() throws Exception {
        var sqliteConfig = new SQLiteConfig();
        sqliteConfig.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(sqliteConfig);
        dataSource.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("final-board.db"));
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        var jdbcTemplate = new JdbcTemplate(dataSource);
        var recorder = new SqliteGameplayAnalyticsRecorder(
                jdbcTemplate,
                JsonMapper.builder().build(),
                new TransactionTemplate(new DataSourceTransactionManager(dataSource)),
                "1.0.0",
                "commit-a",
                "build");
        var dataLoader = TestHelpers.createMockDataLoader();
        var player = new Player("Anonymous", GameMode.ONEPIECE, dataLoader, TestHelpers.createSeededRandomProvider());

        recorder.matchStarted("empty-board", GameMode.ONEPIECE, 1_000, List.of(player));
        player.setHealth(0);
        player.setPlace(8);
        recorder.playerPlacementFinalized("empty-board", 2, 1_100, player);
        player.addUnitToBoard(TestHelpers.createDefaultUnitDef(), 0, 0, 1);
        player.setPlace(7);
        recorder.playerPlacementFinalized("empty-board", 3, 1_200, player);
        recorder.awaitPendingWrites();

        assertThat(jdbcTemplate.queryForObject(
                        "SELECT placement_finalized_at FROM analytics_player_run WHERE player_id = ?",
                        Long.class,
                        player.getId()))
                .isEqualTo(1_100L);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_board_json FROM analytics_player_run WHERE player_id = ?",
                        String.class,
                        player.getId()))
                .isEqualTo("[]");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_placement FROM analytics_player_run WHERE player_id = ?",
                        Integer.class,
                        player.getId()))
                .isEqualTo(8);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_round FROM analytics_player_run WHERE player_id = ?",
                        Integer.class,
                        player.getId()))
                .isEqualTo(2);

        recorder.recoverInterruptedMatches();

        assertThat(jdbcTemplate.queryForObject(
                        "SELECT status FROM analytics_player_run WHERE player_id = ?", String.class, player.getId()))
                .isEqualTo("INTERRUPTED");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT final_board_json FROM analytics_player_run WHERE player_id = ?",
                        String.class,
                        player.getId()))
                .isEqualTo("[]");
    }

    @Test
    void v3BackfillsTheLastRoundAndLeavesItemIdsOptionalForLegacyBoards() throws Exception {
        var sqliteConfig = new SQLiteConfig();
        sqliteConfig.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(sqliteConfig);
        dataSource.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("backfill.db"));
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("2")
                .load()
                .migrate();
        var jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.update(
                "INSERT INTO analytics_match (id, room_id, mode, started_at, status) VALUES ('match', 'room', 'ONEPIECE', 1, 'COMPLETED')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_run (id, match_id, player_id, started_at, final_round, status)"
                        + " VALUES ('run', 'match', 'player', 1, 99, 'COMPLETED')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold, player_level, xp, board_json, augments_json)"
                        + " VALUES ('round', 'run', 6, 6000, 50, 10, 3, 2, '[{\"definitionId\":\"legacy-unit\",\"lineId\":\"legacy-line\",\"starLevel\":2}]', '[]')");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();

        assertThat(jdbcTemplate.queryForObject("SELECT final_round FROM analytics_player_run", Integer.class))
                .isEqualTo(6);
        assertThat(jdbcTemplate.queryForObject("SELECT placement_finalized_at FROM analytics_player_run", Long.class))
                .isEqualTo(6000L);
        assertThat(jdbcTemplate.queryForObject("SELECT final_board_json FROM analytics_player_run", String.class))
                .contains("legacy-unit")
                .doesNotContain("itemIds");
    }

    @Test
    void latestMigrationPurgesUnsupportedModeAnalyticsAndChildren() throws Exception {
        var sqliteConfig = new SQLiteConfig();
        sqliteConfig.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(sqliteConfig);
        dataSource.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("unsupported-modes.db"));
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("3")
                .load()
                .migrate();
        var jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.update("INSERT INTO analytics_match (id, room_id, mode, started_at, status)"
                + " VALUES ('legacy-match', 'legacy-room', 'legacy-mode', 1, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_match (id, room_id, mode, started_at, status)"
                + " VALUES ('future-match', 'future-room', 'future-mode', 2, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_match (id, room_id, mode, started_at, status)"
                + " VALUES ('onepiece-match', 'onepiece-room', 'ONEPIECE', 3, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_match (id, room_id, mode, started_at, status)"
                + " VALUES ('pokemon-match', 'pokemon-room', 'POKEMON', 4, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_player_run (id, match_id, player_id, started_at, status)"
                + " VALUES ('legacy-run', 'legacy-match', 'legacy-player', 1, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_player_run (id, match_id, player_id, started_at, status)"
                + " VALUES ('future-run', 'future-match', 'future-player', 2, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_player_run (id, match_id, player_id, started_at, status)"
                + " VALUES ('onepiece-run', 'onepiece-match', 'onepiece-player', 3, 'COMPLETED')");
        jdbcTemplate.update("INSERT INTO analytics_player_run (id, match_id, player_id, started_at, status)"
                + " VALUES ('pokemon-run', 'pokemon-match', 'pokemon-player', 4, 'COMPLETED')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold,"
                        + " player_level, xp, board_json, augments_json)"
                        + " VALUES ('legacy-round', 'legacy-run', 1, 1, 100, 0, 1, 0, '[]', '[]')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold,"
                        + " player_level, xp, board_json, augments_json)"
                        + " VALUES ('future-round', 'future-run', 1, 2, 100, 0, 1, 0, '[]', '[]')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold,"
                        + " player_level, xp, board_json, augments_json)"
                        + " VALUES ('onepiece-round', 'onepiece-run', 1, 3, 100, 0, 1, 0, '[]', '[]')");
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold,"
                        + " player_level, xp, board_json, augments_json)"
                        + " VALUES ('pokemon-round', 'pokemon-run', 1, 4, 100, 0, 1, 0, '[]', '[]')");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM analytics_match", Integer.class))
                .isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM analytics_match WHERE mode = 'ONEPIECE'", Integer.class))
                .isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM analytics_match WHERE mode = 'POKEMON'", Integer.class))
                .isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM analytics_player_run", Integer.class))
                .isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM analytics_player_round", Integer.class))
                .isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM analytics_player_round WHERE run_id IN ('onepiece-run', 'pokemon-run')",
                        Integer.class))
                .isEqualTo(2);
    }

    private record TestItem(String id) implements GameItem {
        @Override
        public String getId() {
            return id;
        }

        @Override
        public String getName() {
            return id;
        }

        @Override
        public String getDescription() {
            return id;
        }

        @Override
        public Map<String, Integer> getStatBonuses() {
            return Map.of();
        }
    }
}
