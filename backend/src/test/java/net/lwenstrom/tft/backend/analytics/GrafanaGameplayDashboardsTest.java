package net.lwenstrom.tft.backend.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.sqlite.SQLiteDataSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GrafanaGameplayDashboardsTest {
    @TempDir
    Path temporaryDirectory;

    private JdbcTemplate jdbc;
    private final JsonMapper mapper = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        var source = new SQLiteDataSource();
        source.setUrl("jdbc:sqlite:" + temporaryDirectory.resolve("analytics.db"));
        Flyway.configure()
                .dataSource(source)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        jdbc = new JdbcTemplate(source);
        for (var id : List.of("ruled", "plain", "legacy")) {
            jdbc.update(
                    "INSERT INTO analytics_match (id, room_id, mode, started_at, ended_at, final_round, status, match_rule_id) VALUES (?, ?, 'POKEMON', 1000, 2000, 4, 'COMPLETED', ?)",
                    id,
                    id,
                    id.equals("ruled") ? "volatile" : null);
            var board = id.equals("legacy")
                    ? "[{\"definitionId\":\"pikachu\",\"lineId\":\"pikachu\",\"starLevel\":2}]"
                    : "[{\"definitionId\":\"pikachu\",\"lineId\":\"pikachu\",\"starLevel\":2,\"itemIds\":[\"choice-band\",\"leftovers\"]}]";
            jdbc.update(
                    "INSERT INTO analytics_player_run (id, match_id, player_id, started_at, final_placement, final_round, final_board_json, status) VALUES (?, ?, ?, 1000, 1, 4, ?, 'COMPLETED')",
                    id,
                    id,
                    id,
                    board);
            jdbc.update(
                    "INSERT INTO analytics_player_round (id, run_id, round_number, captured_at, pre_health, gold, player_level, xp, board_json, augments_json, outcome, opponent_type) VALUES (?, ?, 4, 1100, 100, 20, 4, 0, ?, '[{\"id\":\"opening-burst\",\"tier\":\"SILVER\"}]', 'WIN', 'BOT')",
                    id,
                    id,
                    board);
            jdbc.update(
                    "INSERT INTO analytics_unit_combat_stat (id, run_id, round_number, line_id, definition_id, unit_name, star_level, damage_dealt, damage_taken, healing_done, shielding_done) VALUES (?, ?, 4, 'pikachu', 'pikachu', 'Pikachu', 2, 100, 50, 10, 20)",
                    id,
                    id);
        }
    }

    @Test
    void overviewQueriesSupportAllSpecificAndNoRuleFilters() throws Exception {
        var dashboard = dashboard("tft-gameplay-analytics.json");
        for (var variable : dashboard.path("templating").path("list")) {
            if (variable.path("type").asText().equals("query")) {
                jdbc.queryForList(variable.path("query").asText());
            }
        }
        for (var rule : List.of("__all__", "volatile", "__none__", "missing")) {
            for (var panel : dashboard.path("panels")) {
                var rows = query(panel, Map.of("match_rule", rule));
                if (panel.path("title").asText().equals("Games started")) {
                    assertThat(((Number) rows.getFirst().get("value")).intValue())
                            .isEqualTo(
                                    rule.equals("__all__")
                                            ? 3
                                            : rule.equals("volatile") ? 1 : rule.equals("__none__") ? 2 : 0);
                }
                if (panel.path("title").asText().equals("Player runs") && rule.equals("volatile")) {
                    assertThat(rows).hasSize(1);
                    assertThat(rows.getFirst()).containsEntry("Match rule", "volatile");
                    assertThat(rows.getFirst().get("Final board").toString()).contains("choice-band", "leftovers");
                }
            }
        }
        for (var panel : dashboard.path("panels")) {
            query(
                    panel,
                    Map.of(
                            "mode",
                            "pokemon",
                            "backend_version",
                            "unknown",
                            "backend_commit",
                            "unknown",
                            "placement",
                            "1",
                            "anonymous_player",
                            "unknown",
                            "completed",
                            "COMPLETED",
                            "abandoned",
                            "NO",
                            "match_rule",
                            "volatile"));
        }
    }

    @Test
    void drillDownIncludesRulesEquipmentAugmentsAndCombatStatsIncludingLegacyBoards() throws Exception {
        for (var panel : dashboard("tft-gameplay-run.json").path("panels")) {
            var rows = query(panel, Map.of("run_id", "ruled"));
            assertThat(rows).isNotEmpty();
            var title = panel.path("title").asText();
            if (title.equals("Run summary")) {
                assertThat(rows.getFirst()).containsEntry("Match rule", "volatile");
            }
            if (title.equals("Final deployed board") || title.equals("Board by round")) {
                assertThat(rows.getFirst()).containsEntry("Items", "choice-band, leftovers");
                assertThat(query(panel, Map.of("run_id", "legacy")).getFirst()).containsEntry("Items", "—");
            }
        }
    }

    private JsonNode dashboard(String name) throws Exception {
        return mapper.readTree(Files.readString(Path.of("../deployment/observability/grafana/dashboards", name)));
    }

    private List<Map<String, Object>> query(JsonNode panel, Map<String, String> variables) {
        var target = panel.path("targets").get(0);
        var sql = target.path("queryText").asText();
        assertThat(target.path("rawQueryText").asText()).isEqualTo(sql);
        sql = sql.replace("$__from", "0").replace("$__to", "3000");
        for (var name : List.of(
                "mode",
                "backend_version",
                "backend_commit",
                "placement",
                "anonymous_player",
                "completed",
                "abandoned",
                "match_rule",
                "run_id")) {
            sql = sql.replace(
                    "${" + name + ":sqlstring}",
                    "'" + variables.getOrDefault(name, "__all__").replace("'", "''") + "'");
        }
        return jdbc.queryForList(sql);
    }
}
