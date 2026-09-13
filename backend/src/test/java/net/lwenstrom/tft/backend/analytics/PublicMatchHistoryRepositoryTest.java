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

class PublicMatchHistoryRepositoryTest {
    @TempDir
    java.nio.file.Path temporaryDirectory;

    private JdbcTemplate jdbcTemplate;
    private PublicMatchHistoryRepository repository;

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
        repository = new PublicMatchHistoryRepository(
                jdbcTemplate, JsonMapper.builder().build());
    }

    @Test
    void returnsOnlyCompletedSoloRunsWithFinalBoardsInDeterministicOrder() {
        insertMatch(
                "older",
                "ONE_PIECE",
                1_000,
                9,
                2,
                "[{\"definitionId\":\"luffy\",\"lineId\":\"luffy\",\"starLevel\":2,\"itemIds\":[\"item-1\"]}]",
                "COMPLETED",
                "COMPLETED",
                null);
        insertMatch(
                "newer",
                "POKEMON",
                2_000,
                14,
                3,
                "[{\"definitionId\":\"mewtwo\",\"lineId\":\"mewtwo\",\"starLevel\":1,\"itemIds\":[]}]",
                "COMPLETED",
                "COMPLETED",
                null);
        insertMatch("abandoned", "POKEMON", 3_000, 10, 1, "[]", "COMPLETED", "COMPLETED", 3_050L);
        insertMatch("unfinished", "POKEMON", 4_000, 10, 1, "[]", "STARTED", "STARTED", null);
        insertMatch("no-board", "POKEMON", 5_000, 10, 1, null, "COMPLETED", "COMPLETED", null);
        insertMatch("bad-placement", "POKEMON", 6_000, 10, 9, "[]", "COMPLETED", "COMPLETED", null);
        insertMatch("two-humans", "POKEMON", 7_000, 10, 1, "[]", "COMPLETED", "COMPLETED", null);

        var response = repository.latest();

        assertThat(response.matches())
                .extracting(PublicMatchHistoryRepository.Match::mode)
                .containsExactly("pokemon", "onepiece");
        assertThat(response.matches().getFirst()).satisfies(match -> {
            assertThat(match.completedAt().toEpochMilli()).isEqualTo(2_000);
            assertThat(match.finalRound()).isEqualTo(14);
            assertThat(match.finalPlacement()).isEqualTo(3);
            assertThat(match.finalComposition())
                    .containsExactly(new PublicMatchHistoryRepository.FinalBoardUnit(
                            "mewtwo", "mewtwo", 1, java.util.List.of()));
        });
    }

    @Test
    void capsHistoryAtTwentyMatches() {
        for (var index = 0; index < 25; index++) {
            insertMatch("match-" + index, "POKEMON", index, 1, 1, "[]", "COMPLETED", "COMPLETED", null);
        }

        var response = repository.latest();

        assertThat(response.matches()).hasSize(20);
        assertThat(response.matches().getFirst().completedAt().toEpochMilli()).isEqualTo(24);
        assertThat(response.matches().getLast().completedAt().toEpochMilli()).isEqualTo(5);
    }

    private void insertMatch(
            String matchId,
            String mode,
            long endedAt,
            int finalRound,
            int placement,
            String boardJson,
            String matchStatus,
            String runStatus,
            Long abandonedAt) {
        jdbcTemplate.update(
                "INSERT INTO analytics_match (id, room_id, mode, started_at, ended_at, final_round, status)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?)",
                matchId,
                UUID.randomUUID().toString(),
                mode,
                endedAt - 100,
                endedAt,
                finalRound,
                matchStatus);
        jdbcTemplate.update(
                "INSERT INTO analytics_player_run"
                        + " (id, match_id, player_id, started_at, abandoned_at, final_placement, final_round,"
                        + " placement_finalized_at, final_board_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "run-" + matchId,
                matchId,
                "player-" + matchId,
                endedAt - 100,
                abandonedAt,
                placement,
                finalRound,
                endedAt - 10,
                boardJson,
                runStatus);
        if (matchId.equals("two-humans")) {
            jdbcTemplate.update(
                    "INSERT INTO analytics_player_run (id, match_id, player_id, started_at, final_placement,"
                            + " final_round, placement_finalized_at, final_board_json, status)"
                            + " VALUES ('run-two', ?, 'player-two', ?, 1, ?, ?, '[]', 'COMPLETED')",
                    matchId,
                    endedAt - 100,
                    finalRound,
                    endedAt - 10);
        }
    }
}
