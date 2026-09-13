package net.lwenstrom.tft.backend.analytics;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Repository
@RequiredArgsConstructor
public class PublicMatchHistoryRepository {
    private final JdbcTemplate jdbcTemplate;
    private final JsonMapper objectMapper;

    public Response latest() {
        var matches = jdbcTemplate.query(
                "SELECT m.id, m.mode, m.ended_at, m.final_round, r.final_placement, r.final_board_json"
                        + " FROM analytics_match m JOIN analytics_player_run r ON r.match_id = m.id"
                        + " WHERE m.status = 'COMPLETED' AND m.ended_at IS NOT NULL AND m.final_round IS NOT NULL"
                        + " AND r.status = 'COMPLETED' AND r.abandoned_at IS NULL"
                        + " AND r.final_placement BETWEEN 1 AND 8 AND r.final_board_json IS NOT NULL"
                        + " AND (SELECT COUNT(*) FROM analytics_player_run human WHERE human.match_id = m.id) = 1"
                        + " ORDER BY m.ended_at DESC, m.id DESC LIMIT 20",
                this::mapMatch);
        return new Response(matches);
    }

    private Match mapMatch(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Match(
                canonicalMode(resultSet.getString("mode")),
                Instant.ofEpochMilli(resultSet.getLong("ended_at")),
                resultSet.getInt("final_round"),
                resultSet.getInt("final_placement"),
                parseBoard(resultSet.getString("final_board_json")));
    }

    private ArrayList<FinalBoardUnit> parseBoard(String json) {
        try {
            var node = objectMapper.readTree(json);
            var units = new ArrayList<FinalBoardUnit>();
            if (!node.isArray()) {
                return units;
            }
            node.forEach(unit -> units.add(new FinalBoardUnit(
                    unit.path("definitionId").asText(),
                    unit.path("lineId").asText(),
                    unit.path("starLevel").asInt(),
                    itemIds(unit))));
            return units;
        } catch (JacksonException exception) {
            throw new IllegalStateException("Invalid analytics board JSON", exception);
        }
    }

    private java.util.List<String> itemIds(JsonNode unit) {
        var itemIds = new ArrayList<String>();
        var items = unit.get("itemIds");
        if (items != null && items.isArray()) {
            items.forEach(item -> itemIds.add(item.asText()));
        }
        return itemIds;
    }

    private String canonicalMode(String mode) {
        return mode == null ? "unknown" : mode.toLowerCase().replace("_", "");
    }

    public record Response(java.util.List<Match> matches) {}

    public record Match(
            String mode,
            Instant completedAt,
            int finalRound,
            int finalPlacement,
            java.util.List<FinalBoardUnit> finalComposition) {}

    public record FinalBoardUnit(String definitionId, String lineId, int starLevel, java.util.List<String> itemIds) {}
}
