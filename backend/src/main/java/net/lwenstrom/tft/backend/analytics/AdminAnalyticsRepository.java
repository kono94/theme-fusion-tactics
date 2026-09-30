package net.lwenstrom.tft.backend.analytics;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Repository
@RequiredArgsConstructor
public class AdminAnalyticsRepository {
    private final JdbcTemplate jdbcTemplate;
    private final JsonMapper objectMapper;

    public Summary summary(long from, long to, String mode) {
        return summary(from, to, mode, null, null);
    }

    public Summary summary(long from, long to, String mode, String backendVersion, String backendCommit) {
        var filter = " FROM analytics_match m WHERE m.started_at >= ? AND m.started_at < ?"
                + (mode == null ? "" : " AND LOWER(REPLACE(m.mode, '_', '')) = ?")
                + (backendVersion == null ? "" : " AND COALESCE(NULLIF(m.backend_version, ''), 'unknown') = ?")
                + (backendCommit == null ? "" : " AND COALESCE(NULLIF(m.backend_commit, ''), 'unknown') = ?");
        var parameters = summaryParameters(from, to, mode, backendVersion, backendCommit);
        var matchStats = jdbcTemplate.queryForMap(
                "SELECT COUNT(*) games_started,"
                        + " SUM(CASE WHEN m.status = 'COMPLETED' THEN 1 ELSE 0 END) games_completed,"
                        + " SUM(CASE WHEN m.status = 'INTERRUPTED' THEN 1 ELSE 0 END) games_interrupted,"
                        + " AVG(m.final_round) average_final_round, MAX(m.final_round) max_final_round"
                        + filter,
                parameters);
        var runStats = jdbcTemplate.queryForMap(
                "SELECT COUNT(*) human_runs, SUM(CASE WHEN r.abandoned_at IS NOT NULL THEN 1 ELSE 0 END) abandoned"
                        + " FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                        + " WHERE m.started_at >= ? AND m.started_at < ?"
                        + cohortPredicate(mode, backendVersion, backendCommit),
                parameters);

        var humanRuns = number(runStats.get("human_runs")).longValue();
        var abandoned = number(runStats.get("abandoned")).longValue();
        return new Summary(
                number(matchStats.get("games_started")).longValue(),
                number(matchStats.get("games_completed")).longValue(),
                number(matchStats.get("games_interrupted")).longValue(),
                humanRuns,
                abandoned,
                humanRuns == 0 ? 0 : (double) abandoned / humanRuns,
                number(matchStats.get("average_final_round")).doubleValue(),
                number(matchStats.get("max_final_round")).intValue(),
                groupedModeCounts("SELECT m.mode label, COUNT(*) count" + filter + " GROUP BY m.mode", parameters),
                groupedCounts(
                        "SELECT CAST(r.final_placement AS TEXT) label, COUNT(*) count"
                                + " FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                                + " WHERE m.started_at >= ? AND m.started_at < ? AND r.final_placement IS NOT NULL"
                                + cohortPredicate(mode, backendVersion, backendCommit)
                                + " GROUP BY r.final_placement ORDER BY r.final_placement",
                        parameters),
                groupedCounts(
                        "SELECT pr.outcome label, COUNT(*) count FROM analytics_player_round pr"
                                + " JOIN analytics_player_run r ON r.id = pr.run_id"
                                + " JOIN analytics_match m ON m.id = r.match_id"
                                + " WHERE m.started_at >= ? AND m.started_at < ? AND pr.outcome IS NOT NULL"
                                + cohortPredicate(mode, backendVersion, backendCommit)
                                + " GROUP BY pr.outcome",
                        parameters),
                botRoundOutcomes(from, to, mode, backendVersion, backendCommit),
                buildCohorts(from, to),
                anonymousPlayerIds(from, to));
    }

    public RunsPage runs(
            long from,
            long to,
            String mode,
            String backendVersion,
            String backendCommit,
            Integer placement,
            Boolean completed,
            String analyticsClientId,
            Boolean abandoned,
            Cursor cursor,
            int size) {
        var sql = new StringBuilder("SELECT r.*, m.room_id, m.mode, m.backend_version, m.backend_commit,"
                + " m.match_rule_id, m.status match_status, m.ended_at,"
                + " SUM(CASE WHEN pr.outcome = 'WIN' THEN 1 ELSE 0 END) wins,"
                + " SUM(CASE WHEN pr.outcome = 'LOSS' THEN 1 ELSE 0 END) losses,"
                + " SUM(CASE WHEN pr.outcome = 'DRAW' THEN 1 ELSE 0 END) draws"
                + " FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                + " LEFT JOIN analytics_player_round pr ON pr.run_id = r.id"
                + " WHERE m.started_at >= ? AND m.started_at < ?");
        var parameters = new ArrayList<>();
        parameters.add(from);
        parameters.add(to);
        appendRunFilters(
                sql,
                parameters,
                mode,
                backendVersion,
                backendCommit,
                placement,
                completed,
                analyticsClientId,
                abandoned);
        if (cursor != null) {
            sql.append(" AND (r.started_at < ? OR (r.started_at = ? AND r.id < ?))");
            parameters.add(cursor.startedAt());
            parameters.add(cursor.startedAt());
            parameters.add(cursor.runId());
        }
        sql.append(" GROUP BY r.id ORDER BY r.started_at DESC, r.id DESC LIMIT ?");
        parameters.add(size + 1);
        var rows = jdbcTemplate.query(sql.toString(), this::mapRun, parameters.toArray());
        var hasMore = rows.size() > size;
        var items = hasMore ? rows.subList(0, size) : rows;
        var last = hasMore ? items.getLast() : null;
        return new RunsPage(
                items, last == null ? null : encodeCursor(last.startedAt().toEpochMilli(), last.runId()));
    }

    public RunsPage runs(
            long from, long to, String mode, String analyticsClientId, Boolean abandoned, Cursor cursor, int size) {
        return runs(from, to, mode, null, null, null, null, analyticsClientId, abandoned, cursor, size);
    }

    public RunDetail runDetail(String runId) {
        var runs = jdbcTemplate.query(
                "SELECT r.*, m.room_id, m.mode, m.backend_version, m.backend_commit,"
                        + " m.match_rule_id, m.status match_status, m.ended_at,"
                        + " SUM(CASE WHEN pr.outcome = 'WIN' THEN 1 ELSE 0 END) wins,"
                        + " SUM(CASE WHEN pr.outcome = 'LOSS' THEN 1 ELSE 0 END) losses,"
                        + " SUM(CASE WHEN pr.outcome = 'DRAW' THEN 1 ELSE 0 END) draws"
                        + " FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                        + " LEFT JOIN analytics_player_round pr ON pr.run_id = r.id WHERE r.id = ? GROUP BY r.id",
                this::mapRun,
                runId);
        if (runs.isEmpty()) {
            return null;
        }
        var rounds = jdbcTemplate.query(
                "SELECT * FROM analytics_player_round WHERE run_id = ? ORDER BY round_number", this::mapRound, runId);
        return new RunDetail(runs.getFirst(), rounds);
    }

    public UnitPresenceResponse unitPresence(
            long from, long to, String mode, String backendVersion, String backendCommit) {
        var sql = new StringBuilder("SELECT r.final_placement, r.final_board_json, m.mode,"
                + " m.backend_version, m.backend_commit FROM analytics_player_run r"
                + " JOIN analytics_match m ON m.id = r.match_id"
                + " WHERE m.started_at >= ? AND m.started_at < ?"
                + " AND r.status = 'COMPLETED' AND r.abandoned_at IS NULL"
                + " AND r.final_placement BETWEEN 1 AND 8 AND r.final_board_json IS NOT NULL");
        var parameters = new ArrayList<>();
        parameters.add(from);
        parameters.add(to);
        appendCohortFilters(sql, parameters, mode, backendVersion, backendCommit);
        sql.append(" ORDER BY LOWER(REPLACE(m.mode, '_', '')),")
                .append(" COALESCE(NULLIF(m.backend_version, ''), 'unknown'),")
                .append(" COALESCE(NULLIF(m.backend_commit, ''), 'unknown')");

        var cohorts = new LinkedHashMap<CohortKey, CohortAccumulator>();
        jdbcTemplate.query(
                sql.toString(),
                resultSet -> {
                    var key = new CohortKey(
                            canonicalMode(resultSet.getString("mode")),
                            valueOrUnknown(resultSet.getString("backend_version")),
                            valueOrUnknown(resultSet.getString("backend_commit")));
                    var accumulator = cohorts.computeIfAbsent(key, ignored -> new CohortAccumulator());
                    var top = resultSet.getInt("final_placement") <= 4;
                    accumulator.addRun(top, parseBoard(resultSet.getString("final_board_json")));
                },
                parameters.toArray());

        return new UnitPresenceResponse(cohorts.entrySet().stream()
                .map(entry -> entry.getValue().toResponse(entry.getKey()))
                .toList());
    }

    public Cursor decodeCursor(String encoded) {
        try {
            var decoded = new String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8);
            var separator = decoded.indexOf('|');
            if (separator <= 0 || separator == decoded.length() - 1) {
                throw new IllegalArgumentException("Invalid cursor");
            }
            return new Cursor(Long.parseLong(decoded.substring(0, separator)), decoded.substring(separator + 1));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid cursor", exception);
        }
    }

    private String encodeCursor(long startedAt, String runId) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((startedAt + "|" + runId).getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Long> groupedCounts(String sql, Object[] parameters) {
        var result = new LinkedHashMap<String, Long>();
        jdbcTemplate.query(
                sql,
                resultSet -> {
                    result.put(resultSet.getString("label"), resultSet.getLong("count"));
                },
                parameters);
        return result;
    }

    private Map<String, Long> groupedModeCounts(String sql, Object[] parameters) {
        var result = new LinkedHashMap<String, Long>();
        jdbcTemplate.query(
                sql,
                resultSet -> {
                    result.merge(canonicalMode(resultSet.getString("label")), resultSet.getLong("count"), Long::sum);
                },
                parameters);
        return result;
    }

    private RunSummary mapRun(ResultSet resultSet, int rowNumber) throws SQLException {
        return new RunSummary(
                resultSet.getString("id"),
                resultSet.getString("match_id"),
                resultSet.getString("analytics_client_id"),
                canonicalMode(resultSet.getString("mode")),
                resultSet.getString("match_rule_id"),
                valueOrUnknown(resultSet.getString("backend_version")),
                valueOrUnknown(resultSet.getString("backend_commit")),
                resultSet.getString("status"),
                instant(resultSet, "started_at"),
                nullableInstant(resultSet, "abandoned_at"),
                nullableInteger(resultSet, "final_placement"),
                nullableInteger(resultSet, "final_health"),
                nullableInteger(resultSet, "final_round"),
                nullableInstant(resultSet, "placement_finalized_at"),
                parseBoard(resultSet.getString("final_board_json")),
                resultSet.getInt("wins"),
                resultSet.getInt("losses"),
                resultSet.getInt("draws"));
    }

    private RoundSnapshot mapRound(ResultSet resultSet, int rowNumber) throws SQLException {
        return new RoundSnapshot(
                resultSet.getInt("round_number"),
                instant(resultSet, "captured_at"),
                nullableInstant(resultSet, "resolved_at"),
                resultSet.getInt("pre_health"),
                nullableInteger(resultSet, "post_health"),
                resultSet.getInt("gold"),
                resultSet.getInt("player_level"),
                resultSet.getInt("xp"),
                parseJson(resultSet.getString("board_json")),
                parseJson(resultSet.getString("augments_json")),
                resultSet.getString("outcome"),
                resultSet.getString("opponent_type"));
    }

    private List<BotRoundOutcome> botRoundOutcomes(
            long from, long to, String mode, String backendVersion, String backendCommit) {
        var sql = "SELECT pr.round_number,"
                + " SUM(CASE WHEN pr.outcome = 'WIN' THEN 1 ELSE 0 END) wins,"
                + " SUM(CASE WHEN pr.outcome = 'LOSS' THEN 1 ELSE 0 END) losses,"
                + " SUM(CASE WHEN pr.outcome = 'DRAW' THEN 1 ELSE 0 END) draws"
                + " FROM analytics_player_round pr"
                + " JOIN analytics_player_run r ON r.id = pr.run_id"
                + " JOIN analytics_match m ON m.id = r.match_id"
                + " WHERE m.started_at >= ? AND m.started_at < ?"
                + " AND pr.opponent_type = 'BOT' AND pr.outcome IS NOT NULL"
                + cohortPredicate(mode, backendVersion, backendCommit)
                + " GROUP BY pr.round_number ORDER BY pr.round_number";
        var parameters = summaryParameters(from, to, mode, backendVersion, backendCommit);
        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) -> new BotRoundOutcome(
                        resultSet.getInt("round_number"),
                        resultSet.getLong("wins"),
                        resultSet.getLong("losses"),
                        resultSet.getLong("draws")),
                parameters);
    }

    private JsonNode parseJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Invalid analytics JSON", exception);
        }
    }

    private List<FinalBoardUnit> parseBoard(String json) {
        if (json == null) {
            return null;
        }
        var node = parseJson(json);
        var units = new ArrayList<FinalBoardUnit>();
        if (!node.isArray()) {
            return units;
        }
        node.forEach(unit -> {
            var itemIds = new ArrayList<String>();
            var items = unit.get("itemIds");
            if (items != null && items.isArray()) {
                items.forEach(item -> itemIds.add(item.asText()));
            }
            units.add(new FinalBoardUnit(
                    unit.path("definitionId").asText(),
                    unit.path("lineId").asText(),
                    unit.path("starLevel").asInt(),
                    itemIds));
        });
        return units;
    }

    private List<BuildCohort> buildCohorts(long from, long to) {
        var sql = new StringBuilder("SELECT LOWER(REPLACE(m.mode, '_', '')) mode,"
                + " COALESCE(NULLIF(m.backend_version, ''), 'unknown') backend_version,"
                + " COALESCE(NULLIF(m.backend_commit, ''), 'unknown') backend_commit, COUNT(*) count"
                + " FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                + " WHERE m.started_at >= ? AND m.started_at < ?");
        var parameters = new ArrayList<>();
        parameters.add(from);
        parameters.add(to);
        sql.append(" GROUP BY LOWER(REPLACE(m.mode, '_', '')),")
                .append(" COALESCE(NULLIF(m.backend_version, ''), 'unknown'),")
                .append(" COALESCE(NULLIF(m.backend_commit, ''), 'unknown')")
                .append(" ORDER BY mode, backend_version, backend_commit");
        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNumber) -> new BuildCohort(
                        canonicalMode(resultSet.getString("mode")),
                        valueOrUnknown(resultSet.getString("backend_version")),
                        valueOrUnknown(resultSet.getString("backend_commit")),
                        resultSet.getLong("count")),
                parameters.toArray());
    }

    private List<String> anonymousPlayerIds(long from, long to) {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT r.analytics_client_id FROM analytics_player_run r"
                        + " JOIN analytics_match m ON m.id = r.match_id"
                        + " WHERE m.started_at >= ? AND m.started_at < ?"
                        + " AND r.analytics_client_id IS NOT NULL AND r.analytics_client_id <> ''"
                        + " ORDER BY r.analytics_client_id",
                String.class,
                from,
                to);
    }

    private String cohortPredicate(String mode, String backendVersion, String backendCommit) {
        return (mode == null ? "" : " AND LOWER(REPLACE(m.mode, '_', '')) = ?")
                + (backendVersion == null ? "" : " AND COALESCE(NULLIF(m.backend_version, ''), 'unknown') = ?")
                + (backendCommit == null ? "" : " AND COALESCE(NULLIF(m.backend_commit, ''), 'unknown') = ?");
    }

    private Object[] summaryParameters(long from, long to, String mode, String backendVersion, String backendCommit) {
        var parameters = new ArrayList<>();
        parameters.add(from);
        parameters.add(to);
        if (mode != null) {
            parameters.add(canonicalMode(mode));
        }
        if (backendVersion != null) {
            parameters.add(backendVersion);
        }
        if (backendCommit != null) {
            parameters.add(backendCommit);
        }
        return parameters.toArray();
    }

    private void appendRunFilters(
            StringBuilder sql,
            List<Object> parameters,
            String mode,
            String backendVersion,
            String backendCommit,
            Integer placement,
            Boolean completed,
            String analyticsClientId,
            Boolean abandoned) {
        appendCohortFilters(sql, parameters, mode, backendVersion, backendCommit);
        if (placement != null) {
            sql.append(" AND r.final_placement = ?");
            parameters.add(placement);
        }
        if (completed != null) {
            sql.append(completed ? " AND r.status = 'COMPLETED'" : " AND r.status <> 'COMPLETED'");
        }
        if (analyticsClientId != null && !analyticsClientId.isBlank()) {
            sql.append(" AND r.analytics_client_id = ?");
            parameters.add(analyticsClientId);
        }
        if (abandoned != null) {
            sql.append(abandoned ? " AND r.abandoned_at IS NOT NULL" : " AND r.abandoned_at IS NULL");
        }
    }

    private void appendCohortFilters(
            StringBuilder sql, List<Object> parameters, String mode, String backendVersion, String backendCommit) {
        if (mode != null) {
            sql.append(" AND LOWER(REPLACE(m.mode, '_', '')) = ?");
            parameters.add(canonicalMode(mode));
        }
        if (backendVersion != null && !backendVersion.isBlank()) {
            sql.append(" AND COALESCE(NULLIF(m.backend_version, ''), 'unknown') = ?");
            parameters.add(backendVersion);
        }
        if (backendCommit != null && !backendCommit.isBlank()) {
            sql.append(" AND COALESCE(NULLIF(m.backend_commit, ''), 'unknown') = ?");
            parameters.add(backendCommit);
        }
    }

    private String canonicalMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "unknown";
        }
        return mode.toLowerCase().replace("_", "");
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private Number number(Object value) {
        return value instanceof Number number ? number : 0;
    }

    private Instant instant(ResultSet resultSet, String column) throws SQLException {
        return Instant.ofEpochMilli(resultSet.getLong(column));
    }

    private Instant nullableInstant(ResultSet resultSet, String column) throws SQLException {
        var value = resultSet.getObject(column);
        return value == null ? null : Instant.ofEpochMilli(((Number) value).longValue());
    }

    private Integer nullableInteger(ResultSet resultSet, String column) throws SQLException {
        var value = resultSet.getObject(column);
        return value == null ? null : ((Number) value).intValue();
    }

    public record Summary(
            long gamesStarted,
            long gamesCompleted,
            long gamesInterrupted,
            long humanRuns,
            long abandonmentCount,
            double abandonmentRate,
            double averageFinalRound,
            int maxFinalRound,
            Map<String, Long> modeCounts,
            Map<String, Long> placementDistribution,
            Map<String, Long> outcomeDistribution,
            List<BotRoundOutcome> botRoundOutcomes,
            List<BuildCohort> buildCohorts,
            List<String> anonymousPlayerIds) {}

    public record BotRoundOutcome(int round, long wins, long losses, long draws) {}

    public record RunsPage(List<RunSummary> items, String nextCursor) {}

    public record RunDetail(RunSummary run, List<RoundSnapshot> rounds) {}

    public record RunSummary(
            String runId,
            String matchId,
            String anonymousPlayerId,
            String mode,
            String matchRuleId,
            String backendVersion,
            String backendCommit,
            String status,
            Instant startedAt,
            Instant abandonedAt,
            Integer finalPlacement,
            Integer finalHealth,
            Integer finalRound,
            Instant placementFinalizedAt,
            List<FinalBoardUnit> finalComposition,
            int wins,
            int losses,
            int draws) {}

    public record FinalBoardUnit(String definitionId, String lineId, int starLevel, List<String> itemIds) {}

    public record BuildCohort(String mode, String backendVersion, String backendCommit, long runs) {}

    public record UnitPresenceResponse(List<UnitPresenceCohort> cohorts) {}

    public record UnitPresenceCohort(
            String mode,
            String backendVersion,
            String backendCommit,
            long topFourRuns,
            long bottomFourRuns,
            boolean lowSample,
            List<UnitPresence> units) {}

    public record UnitPresence(
            String definitionId,
            long topFourCount,
            double topFourRate,
            long bottomFourCount,
            double bottomFourRate,
            double deltaPercentagePoints) {}

    public record RoundSnapshot(
            int round,
            Instant capturedAt,
            Instant resolvedAt,
            int healthBefore,
            Integer healthAfter,
            int gold,
            int level,
            int xp,
            JsonNode board,
            JsonNode augments,
            String outcome,
            String opponentType) {}

    public record Cursor(long startedAt, String runId) {}

    private record CohortKey(String mode, String backendVersion, String backendCommit) {}

    private static final class CohortAccumulator {
        private long topFourRuns;
        private long bottomFourRuns;
        private final Map<String, UnitCounts> units = new LinkedHashMap<>();

        private void addRun(boolean topFour, List<FinalBoardUnit> board) {
            if (topFour) {
                topFourRuns++;
            } else {
                bottomFourRuns++;
            }
            var seen = new HashSet<String>();
            board.forEach(unit -> {
                if (!seen.add(unit.definitionId())) {
                    return;
                }
                var counts = units.computeIfAbsent(unit.definitionId(), ignored -> new UnitCounts());
                if (topFour) {
                    counts.topFour++;
                } else {
                    counts.bottomFour++;
                }
            });
        }

        private UnitPresenceCohort toResponse(CohortKey key) {
            var lowSample = topFourRuns < 20 || bottomFourRuns < 20;
            var unitRows = units.entrySet().stream()
                    .map(entry -> entry.getValue().toPresence(entry.getKey(), topFourRuns, bottomFourRuns))
                    .sorted((left, right) -> {
                        var primary = lowSample
                                ? Long.compare(
                                        right.topFourCount() + right.bottomFourCount(),
                                        left.topFourCount() + left.bottomFourCount())
                                : Double.compare(
                                        Math.abs(right.deltaPercentagePoints()),
                                        Math.abs(left.deltaPercentagePoints()));
                        return primary != 0 ? primary : left.definitionId().compareTo(right.definitionId());
                    })
                    .toList();
            return new UnitPresenceCohort(
                    key.mode(),
                    key.backendVersion(),
                    key.backendCommit(),
                    topFourRuns,
                    bottomFourRuns,
                    lowSample,
                    unitRows);
        }
    }

    private static final class UnitCounts {
        private long topFour;
        private long bottomFour;

        private UnitPresence toPresence(String definitionId, long topRuns, long bottomRuns) {
            var topRate = topRuns == 0 ? 0 : (double) topFour / topRuns;
            var bottomRate = bottomRuns == 0 ? 0 : (double) bottomFour / bottomRuns;
            return new UnitPresence(
                    definitionId, topFour, topRate, bottomFour, bottomRate, (topRate - bottomRate) * 100);
        }
    }
}
