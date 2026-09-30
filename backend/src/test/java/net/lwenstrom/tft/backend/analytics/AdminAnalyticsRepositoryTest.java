package net.lwenstrom.tft.backend.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.sqlite.SQLiteConfig;
import org.sqlite.SQLiteDataSource;
import tools.jackson.databind.json.JsonMapper;

class AdminAnalyticsRepositoryTest {
    @TempDir
    java.nio.file.Path temporaryDirectory;

    private JdbcTemplate jdbcTemplate;
    private AdminAnalyticsRepository repository;
    private long insertedAt;

    @BeforeEach
    void setUp() throws Exception {
        var database = Files.createFile(temporaryDirectory.resolve("analytics.db"));
        var config = new SQLiteConfig();
        config.enforceForeignKeys(true);
        var dataSource = new SQLiteDataSource(config);
        dataSource.setUrl("jdbc:sqlite:" + database);
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        jdbcTemplate = new JdbcTemplate(dataSource);
        repository =
                new AdminAnalyticsRepository(jdbcTemplate, JsonMapper.builder().build());
        insertedAt = 1;
    }

    @Test
    void exposesMatchRulesAndEquippedItemsInRunListAndDetail() {
        insertCompletedRun("ruled", "match-ruled", 1_000, false, "WIN", "BOT");
        insertCompletedRun("plain", "match-plain", 2_000, false, "LOSS", "BOT");
        jdbcTemplate.update("UPDATE analytics_match SET match_rule_id = 'volatile' WHERE id = 'match-ruled'");
        var board =
                "[{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":2,\"itemIds\":[\"item-a\",\"item-b\"]}]";
        jdbcTemplate.update("UPDATE analytics_player_run SET final_board_json = ? WHERE id = 'ruled'", board);
        jdbcTemplate.update("UPDATE analytics_player_round SET board_json = ? WHERE run_id = 'ruled'", board);

        var page = repository.runs(0, 3_000, null, null, null, null, 10);
        assertThat(page.items())
                .extracting(AdminAnalyticsRepository.RunSummary::matchRuleId)
                .containsExactly(null, "volatile");
        var detail = repository.runDetail("ruled");
        assertThat(detail.run().matchRuleId()).isEqualTo("volatile");
        assertThat(detail.run().finalComposition().getFirst().itemIds()).containsExactly("item-a", "item-b");
        assertThat(detail.rounds().getFirst().board().get(0).get("itemIds").size())
                .isEqualTo(2);
    }

    @Test
    void aggregatesAndPagesRuns() {
        insertCompletedRun("run-2", "match-2", 2_000, true, "LOSS", "BOT");
        insertCompletedRun("run-1", "match-1", 1_000, false, "WIN", "HUMAN");

        var summary = repository.summary(0, 3_000, null);
        assertThat(summary.gamesStarted()).isEqualTo(2);
        assertThat(summary.gamesCompleted()).isEqualTo(2);
        assertThat(summary.humanRuns()).isEqualTo(2);
        assertThat(summary.abandonmentCount()).isEqualTo(1);
        assertThat(summary.outcomeDistribution()).containsEntry("WIN", 1L).containsEntry("LOSS", 1L);
        assertThat(summary.botRoundOutcomes())
                .containsExactly(new AdminAnalyticsRepository.BotRoundOutcome(4, 0, 1, 0));

        var firstPage = repository.runs(0, 3_000, null, null, null, null, 1);
        assertThat(firstPage.items())
                .extracting(AdminAnalyticsRepository.RunSummary::runId)
                .containsExactly("run-2");
        assertThat(firstPage.nextCursor()).isNotBlank();

        var secondPage =
                repository.runs(0, 3_000, null, null, null, repository.decodeCursor(firstPage.nextCursor()), 1);
        assertThat(secondPage.items())
                .extracting(AdminAnalyticsRepository.RunSummary::runId)
                .containsExactly("run-1");
        assertThat(repository.runDetail("run-2").rounds()).hasSize(1);
    }

    @Test
    void comparesUnitPresenceWithinIndependentBuildCohortsAndDeduplicatesBoards() {
        insertPresenceRun(
                "presence-top",
                1,
                "[{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":2,\"itemIds\":[]},{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":1,\"itemIds\":[]},{\"definitionId\":\"unit-b\",\"lineId\":\"line-b\",\"starLevel\":1,\"itemIds\":[\"item-1\"]}]");
        insertPresenceRun(
                "presence-bottom",
                5,
                "[{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":1,\"itemIds\":[]}]");

        var response = repository.unitPresence(0, 10_000, null, "version-a", "commit-a");

        assertThat(response.cohorts()).hasSize(1);
        var cohort = response.cohorts().getFirst();
        assertThat(cohort.mode()).isEqualTo("pokemon");
        assertThat(cohort.topFourRuns()).isEqualTo(1);
        assertThat(cohort.bottomFourRuns()).isEqualTo(1);
        assertThat(cohort.lowSample()).isTrue();
        assertThat(cohort.units())
                .extracting(AdminAnalyticsRepository.UnitPresence::definitionId)
                .containsExactly("unit-a", "unit-b");
        assertThat(cohort.units().getFirst().topFourCount()).isEqualTo(1);
        assertThat(cohort.units().getFirst().bottomFourCount()).isEqualTo(1);
    }

    @Test
    void filtersRunsByBuildPlacementCompletionAndAbandonment() {
        insertPresenceRun(
                "matching-run",
                1,
                "[{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":1}]",
                "POKEMON",
                "version-a",
                "commit-a",
                "COMPLETED",
                false);
        insertPresenceRun("wrong-placement", 5, "[]", "POKEMON", "version-a", "commit-a", "COMPLETED", false);
        insertPresenceRun("interrupted-run", 1, "[]", "POKEMON", "version-a", "commit-a", "INTERRUPTED", false);
        insertPresenceRun("abandoned-run", 1, "[]", "POKEMON", "version-a", "commit-a", "COMPLETED", true);

        var completed = repository.runs(0, 10_000, "POKEMON", "version-a", "commit-a", 1, true, null, false, null, 100);
        var interrupted =
                repository.runs(0, 10_000, "pokemon", "version-a", "commit-a", 1, false, null, false, null, 100);

        assertThat(completed.items())
                .extracting(AdminAnalyticsRepository.RunSummary::runId)
                .containsExactly("matching-run");
        assertThat(interrupted.items())
                .extracting(AdminAnalyticsRepository.RunSummary::runId)
                .containsExactly("interrupted-run");
    }

    @Test
    void isolatesUnknownBuildsAndExcludesDiagnosticRunsFromPresence() {
        insertPresenceRun(
                "unknown-top",
                1,
                "[{\"definitionId\":\"unknown-unit\",\"lineId\":\"unknown-line\",\"starLevel\":1}]",
                "ONEPIECE",
                null,
                "",
                "COMPLETED",
                false);
        insertPresenceRun(
                "known-top",
                1,
                "[{\"definitionId\":\"known-unit\",\"lineId\":\"known-line\",\"starLevel\":1}]",
                "ONEPIECE",
                "version-a",
                "commit-a",
                "COMPLETED",
                false);
        insertPresenceRun(
                "unknown-abandoned",
                5,
                "[{\"definitionId\":\"excluded-unit\",\"lineId\":\"excluded-line\",\"starLevel\":1}]",
                "ONEPIECE",
                null,
                null,
                "COMPLETED",
                true);
        insertPresenceRun(
                "unknown-interrupted",
                5,
                "[{\"definitionId\":\"interrupted-unit\",\"lineId\":\"interrupted-line\",\"starLevel\":1}]",
                "ONEPIECE",
                null,
                null,
                "INTERRUPTED",
                false);

        var response = repository.unitPresence(0, 10_000, "onepiece", "unknown", "unknown");

        assertThat(response.cohorts()).hasSize(1);
        assertThat(response.cohorts().getFirst().backendVersion()).isEqualTo("unknown");
        assertThat(response.cohorts().getFirst().backendCommit()).isEqualTo("unknown");
        assertThat(response.cohorts().getFirst().units())
                .extracting(AdminAnalyticsRepository.UnitPresence::definitionId)
                .containsExactly("unknown-unit");
    }

    @Test
    void ranksMatureCohortsByPresenceDelta() {
        for (var index = 0; index < 20; index++) {
            insertPresenceRun(
                    "mature-top-" + index,
                    1,
                    "[{\"definitionId\":\"unit-a\",\"lineId\":\"line-a\",\"starLevel\":1},"
                            + "{\"definitionId\":\"unit-b\",\"lineId\":\"line-b\",\"starLevel\":1}]",
                    "POKEMON",
                    "version-mature",
                    "commit-mature",
                    "COMPLETED",
                    false);
            var bottomBoard =
                    index < 10 ? "[{\"definitionId\":\"unit-b\",\"lineId\":\"line-b\",\"starLevel\":1}]" : "[]";
            insertPresenceRun(
                    "mature-bottom-" + index,
                    5,
                    bottomBoard,
                    "POKEMON",
                    "version-mature",
                    "commit-mature",
                    "COMPLETED",
                    false);
        }

        var cohort = repository
                .unitPresence(0, 10_000, "pokemon", "version-mature", "commit-mature")
                .cohorts()
                .getFirst();

        assertThat(cohort.lowSample()).isFalse();
        assertThat(cohort.topFourRuns()).isEqualTo(20);
        assertThat(cohort.bottomFourRuns()).isEqualTo(20);
        assertThat(cohort.units())
                .extracting(AdminAnalyticsRepository.UnitPresence::definitionId)
                .containsExactly("unit-a", "unit-b");
        assertThat(cohort.units().getFirst().deltaPercentagePoints()).isEqualTo(100);
    }

    @Test
    void exposesAllDateRangeFilterOptionsRegardlessOfActiveBuildFilters() {
        insertPresenceRun("pokemon-run", 1, "[]", "POKEMON", "version-a", "commit-a", "COMPLETED", false);
        insertPresenceRun("one-piece-run", 2, "[]", "ONE_PIECE", null, "", "COMPLETED", false);

        var summary = repository.summary(0, 10_000, "POKEMON", "version-a", "commit-a");

        assertThat(summary.gamesStarted()).isEqualTo(1);
        assertThat(summary.buildCohorts())
                .extracting(
                        AdminAnalyticsRepository.BuildCohort::mode,
                        AdminAnalyticsRepository.BuildCohort::backendVersion,
                        AdminAnalyticsRepository.BuildCohort::backendCommit)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("pokemon", "version-a", "commit-a"),
                        org.assertj.core.groups.Tuple.tuple("onepiece", "unknown", "unknown"));
        assertThat(summary.anonymousPlayerIds()).containsExactly("browser-one-piece-run", "browser-pokemon-run");
    }

    private void insertCompletedRun(
            String runId, String matchId, long startedAt, boolean abandoned, String outcome, String opponentType) {
        jdbcTemplate.update(
                "INSERT INTO analytics_match"
                        + " (id, room_id, mode, started_at, ended_at, final_round, status)"
                        + " VALUES (?, ?, 'ONE_PIECE', ?, ?, 4, 'COMPLETED')",
                matchId,
                UUID.randomUUID().toString(),
                startedAt,
                startedAt + 100);
        jdbcTemplate.update(
                "INSERT INTO analytics_player_run"
                        + " (id, match_id, player_id, analytics_client_id, started_at, abandoned_at,"
                        + " final_placement, final_health, final_round, status)"
                        + " VALUES (?, ?, ?, ?, ?, ?, 2, 10, 4, 'COMPLETED')",
                runId,
                matchId,
                UUID.randomUUID().toString(),
                "browser-" + runId,
                startedAt,
                abandoned ? startedAt + 50 : null);
        jdbcTemplate.update(
                "INSERT INTO analytics_player_round"
                        + " (id, run_id, round_number, captured_at, resolved_at, pre_health, gold, player_level, xp,"
                        + " board_json, augments_json, outcome, opponent_type, post_health)"
                        + " VALUES (?, ?, 4, ?, ?, 20, 10, 3, 2, '[]', '[]', ?, ?, 10)",
                UUID.randomUUID().toString(),
                runId,
                startedAt,
                startedAt + 10,
                outcome,
                opponentType);
    }

    private void insertPresenceRun(String runId, int placement, String boardJson) {
        insertPresenceRun(runId, placement, boardJson, "POKEMON", "version-a", "commit-a", "COMPLETED", false);
    }

    private void insertPresenceRun(
            String runId,
            int placement,
            String boardJson,
            String mode,
            String backendVersion,
            String backendCommit,
            String status,
            boolean abandoned) {
        var matchId = "match-" + runId;
        var startedAt = insertedAt++;
        jdbcTemplate.update(
                "INSERT INTO analytics_match"
                        + " (id, room_id, mode, backend_version, backend_commit, started_at, ended_at, final_round, status)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, 4, ?)",
                matchId,
                UUID.randomUUID().toString(),
                mode,
                backendVersion,
                backendCommit,
                startedAt,
                startedAt + 100,
                status);
        jdbcTemplate.update(
                "INSERT INTO analytics_player_run"
                        + " (id, match_id, player_id, analytics_client_id, started_at, abandoned_at, final_placement, final_health,"
                        + " final_round, placement_finalized_at, final_board_json, status)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, 10, 4, ?, ?, ?)",
                runId,
                matchId,
                UUID.randomUUID().toString(),
                "browser-" + runId,
                startedAt,
                abandoned ? startedAt + 25 : null,
                placement,
                startedAt + 50,
                boardJson,
                status);
    }
}
