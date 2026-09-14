package net.lwenstrom.tft.backend.analytics;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
                resultSet.getString("id"),
                canonicalMode(resultSet.getString("mode")),
                Instant.ofEpochMilli(resultSet.getLong("ended_at")),
                resultSet.getInt("final_round"),
                resultSet.getInt("final_placement"),
                parseBoard(resultSet.getString("final_board_json")));
    }

    private List<FinalBoardUnit> parseBoard(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            var node = objectMapper.readTree(json);
            if (!node.isArray()) {
                return null;
            }
            var units = new ArrayList<FinalBoardUnit>();
            for (var unit : node) {
                var definitionId = textValue(unit, "definitionId");
                var lineId = textValue(unit, "lineId");
                var starLevelNode = unit.get("starLevel");
                var itemIds = itemIds(unit);
                if (definitionId == null
                        || lineId == null
                        || starLevelNode == null
                        || !starLevelNode.isIntegralNumber()
                        || starLevelNode.asInt() < 1
                        || starLevelNode.asInt() > 3
                        || itemIds == null) {
                    return null;
                }
                units.add(new FinalBoardUnit(definitionId, lineId, starLevelNode.asInt(), itemIds));
            }
            return units;
        } catch (JacksonException | IllegalArgumentException exception) {
            return null;
        }
    }

    private List<String> itemIds(JsonNode unit) {
        var items = unit.get("itemIds");
        if (items == null) {
            return List.of();
        }
        if (!items.isArray()) {
            return null;
        }
        var itemIds = new ArrayList<String>();
        for (var item : items) {
            if (!item.isTextual() || item.asText().isBlank()) {
                return null;
            }
            itemIds.add(item.asText());
        }
        return itemIds;
    }

    private String textValue(JsonNode node, String fieldName) {
        var value = node.get(fieldName);
        return value != null && value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    private String canonicalMode(String mode) {
        return mode == null ? "unknown" : mode.toLowerCase().replace("_", "");
    }

    public record Response(List<Match> matches) {}

    public record Match(
            String historyId,
            String mode,
            Instant completedAt,
            int finalRound,
            int finalPlacement,
            List<FinalBoardUnit> finalComposition) {}

    public record FinalBoardUnit(String definitionId, String lineId, int starLevel, List<String> itemIds) {}
}
