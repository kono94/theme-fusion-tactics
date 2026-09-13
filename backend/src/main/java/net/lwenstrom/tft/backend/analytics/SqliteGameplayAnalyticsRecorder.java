package net.lwenstrom.tft.backend.analytics;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.analytics.GameplayAnalyticsRecorder;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.UnitCombatStats;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Slf4j
@Component
public class SqliteGameplayAnalyticsRecorder implements GameplayAnalyticsRecorder {
    private final JdbcTemplate jdbcTemplate;
    private final JsonMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final String backendVersion;
    private final String backendCommit;
    private final String backendBuildTime;
    private final ExecutorService writeExecutor = new ThreadPoolExecutor(
            1,
            1,
            0,
            TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(1_024),
            Thread.ofVirtual().name("analytics-writer-", 0).factory(),
            new ThreadPoolExecutor.AbortPolicy());

    public SqliteGameplayAnalyticsRecorder(
            JdbcTemplate jdbcTemplate,
            JsonMapper objectMapper,
            TransactionTemplate transactionTemplate,
            @Value("${APP_GIT_TAG:${app.git-tag:unknown}}") String backendVersion,
            @Value("${APP_GIT_COMMIT:${app.git-commit:unknown}}") String backendCommit,
            @Value("${APP_BUILD_TIME:${app.build-time:unknown}}") String backendBuildTime) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.transactionTemplate = transactionTemplate;
        this.backendVersion = backendVersion;
        this.backendCommit = backendCommit;
        this.backendBuildTime = backendBuildTime;
    }

    @PostConstruct
    void recoverInterruptedMatches() {
        var now = System.currentTimeMillis();
        transactionally("recover interrupted matches", () -> {
            jdbcTemplate.update(
                    "UPDATE analytics_match SET status = 'INTERRUPTED', ended_at = ? WHERE status = 'STARTED'", now);
            jdbcTemplate.update("UPDATE analytics_player_run SET status = 'INTERRUPTED' WHERE status = 'STARTED'");
        });
    }

    @PreDestroy
    void stopWriter() {
        writeExecutor.shutdown();
        try {
            if (!writeExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                writeExecutor.shutdownNow();
            }
        } catch (InterruptedException exception) {
            writeExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public void matchStarted(String roomId, GameMode mode, long occurredAt, List<Player> players) {
        var runs = humanPlayers(players).stream()
                .map(player -> new PlayerRun(player.getId(), player.getAnalyticsClientId()))
                .toList();
        enqueue("start match", () -> {
            var matchId = UUID.randomUUID().toString();
            jdbcTemplate.update(
                    "INSERT OR IGNORE INTO analytics_match"
                            + " (id, room_id, mode, backend_version, backend_commit, backend_build_time, started_at, status)"
                            + " VALUES (?, ?, ?, ?, ?, ?, ?, 'STARTED')",
                    matchId,
                    roomId,
                    mode.name(),
                    backendVersion,
                    backendCommit,
                    backendBuildTime,
                    occurredAt);
            var persistedMatchId = jdbcTemplate.queryForObject(
                    "SELECT id FROM analytics_match WHERE room_id = ?", String.class, roomId);
            runs.forEach(player -> jdbcTemplate.update(
                    "INSERT OR IGNORE INTO analytics_player_run"
                            + " (id, match_id, player_id, analytics_client_id, started_at, status)"
                            + " VALUES (?, ?, ?, ?, ?, 'STARTED')",
                    UUID.randomUUID().toString(),
                    persistedMatchId,
                    player.playerId(),
                    player.analyticsClientId(),
                    occurredAt));
        });
    }

    @Override
    public void roundStarted(String roomId, int round, long occurredAt, List<Player> players) {
        var snapshots = humanPlayers(players).stream().map(this::roundSnapshot).toList();
        enqueue(
                "capture round",
                () -> snapshots.forEach(player -> {
                    var runId = findRunId(roomId, player.playerId());
                    if (runId == null) {
                        return;
                    }
                    jdbcTemplate.update(
                            "INSERT OR IGNORE INTO analytics_player_round"
                                    + " (id, run_id, round_number, captured_at, pre_health, gold, player_level, xp,"
                                    + " board_json, augments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            UUID.randomUUID().toString(),
                            runId,
                            round,
                            occurredAt,
                            player.health(),
                            player.gold(),
                            player.level(),
                            player.xp(),
                            player.boardJson(),
                            player.augmentsJson());
                }));
    }

    @Override
    public void combatResolved(
            String roomId,
            int round,
            long occurredAt,
            String winnerId,
            String loserId,
            boolean draw,
            List<Player> participants) {
        combatResolved(roomId, round, occurredAt, winnerId, loserId, draw, participants, Map.of());
    }

    @Override
    public void combatResolved(
            String roomId,
            int round,
            long occurredAt,
            String winnerId,
            String loserId,
            boolean draw,
            List<Player> participants,
            Map<String, List<UnitCombatStats>> unitStatsByPlayer) {
        var outcomes = humanPlayers(participants).stream()
                .map(player -> roundOutcome(player, winnerId, loserId, draw, opponentType(player, participants)))
                .filter(Objects::nonNull)
                .toList();
        enqueue(
                "resolve combat",
                () -> outcomes.forEach(player -> {
                    var runId = findRunId(roomId, player.playerId());
                    if (runId == null) {
                        return;
                    }
                    jdbcTemplate.update(
                            "UPDATE analytics_player_round SET resolved_at = ?, outcome = ?, opponent_type = ?, post_health = ?"
                                    + " WHERE run_id = ? AND round_number = ?",
                            occurredAt,
                            player.outcome(),
                            player.opponentType(),
                            player.health(),
                            runId,
                            round);
                    unitStatsByPlayer
                            .getOrDefault(player.playerId(), List.of())
                            .forEach(stats -> jdbcTemplate.update(
                                    "INSERT INTO analytics_unit_combat_stat"
                                            + " (id, run_id, round_number, line_id, definition_id, unit_name, star_level,"
                                            + " damage_dealt, damage_taken, healing_done, shielding_done)"
                                            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                                            + " ON CONFLICT(run_id, round_number, line_id) DO UPDATE SET"
                                            + " definition_id = excluded.definition_id, unit_name = excluded.unit_name,"
                                            + " star_level = excluded.star_level, damage_dealt = excluded.damage_dealt,"
                                            + " damage_taken = excluded.damage_taken, healing_done = excluded.healing_done,"
                                            + " shielding_done = excluded.shielding_done",
                                    UUID.randomUUID().toString(),
                                    runId,
                                    round,
                                    stats.lineId(),
                                    stats.definitionId(),
                                    stats.unitName(),
                                    stats.starLevel(),
                                    stats.damageDealt(),
                                    stats.damageTaken(),
                                    stats.healingDone(),
                                    stats.shieldingDone()));
                }));
    }

    @Override
    public void playerAbandoned(String roomId, String playerId, long occurredAt) {
        enqueue(
                "record abandonment",
                () -> jdbcTemplate.update(
                        "UPDATE analytics_player_run SET abandoned_at = COALESCE(abandoned_at, ?)"
                                + " WHERE player_id = ? AND match_id = (SELECT id FROM analytics_match WHERE room_id = ?)",
                        occurredAt,
                        playerId,
                        roomId));
    }

    @Override
    public void playerPlacementFinalized(String roomId, int finalRound, long occurredAt, Player player) {
        if (player == null || player.isBot() || player.isGhost()) {
            return;
        }
        var snapshot = new PlayerResult(
                player.getId(), player.getPlace(), player.getHealth(), finalRound, serializeBoard(player));
        enqueue(
                "capture final board",
                () -> jdbcTemplate.update(
                        "UPDATE analytics_player_run SET placement_finalized_at = COALESCE(placement_finalized_at, ?),"
                                + " final_board_json = COALESCE(final_board_json, ?),"
                                + " final_placement = COALESCE(final_placement, ?),"
                                + " final_health = COALESCE(final_health, ?),"
                                + " final_round = COALESCE(final_round, ?) WHERE player_id = ?"
                                + " AND match_id = (SELECT id FROM analytics_match WHERE room_id = ?)",
                        occurredAt,
                        snapshot.boardJson(),
                        snapshot.placement(),
                        snapshot.health(),
                        snapshot.finalRound(),
                        snapshot.playerId(),
                        roomId));
    }

    @Override
    public void matchCompleted(String roomId, int finalRound, long occurredAt, List<Player> players) {
        var results = humanPlayers(players).stream()
                .map(player -> new PlayerResult(
                        player.getId(), player.getPlace(), player.getHealth(), finalRound, serializeBoard(player)))
                .toList();
        enqueue("complete match", () -> {
            results.forEach(player -> jdbcTemplate.update(
                    "UPDATE analytics_player_run SET status = 'COMPLETED',"
                            + " final_placement = COALESCE(final_placement, ?),"
                            + " final_health = COALESCE(final_health, ?),"
                            + " final_round = COALESCE(final_round, ?),"
                            + " placement_finalized_at = COALESCE(placement_finalized_at, ?),"
                            + " final_board_json = COALESCE(final_board_json, ?) WHERE player_id = ?"
                            + " AND match_id = (SELECT id FROM analytics_match WHERE room_id = ?)",
                    player.placement(),
                    player.health(),
                    finalRound,
                    occurredAt,
                    player.boardJson(),
                    player.playerId(),
                    roomId));
            jdbcTemplate.update(
                    "UPDATE analytics_match SET status = 'COMPLETED', ended_at = ?, final_round = ? WHERE room_id = ?",
                    occurredAt,
                    finalRound,
                    roomId);
        });
    }

    private List<Player> humanPlayers(List<Player> players) {
        return players.stream()
                .filter(player -> !player.isBot() && !player.isGhost())
                .toList();
    }

    void awaitPendingWrites() {
        try {
            writeExecutor.submit(() -> {}).get(5, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new IllegalStateException("Analytics writes did not finish", exception);
        }
    }

    private RoundSnapshot roundSnapshot(Player player) {
        return new RoundSnapshot(
                player.getId(),
                player.getHealth(),
                player.getGold(),
                player.getLevel(),
                player.getXp(),
                serializeBoard(player),
                serializeAugments(player));
    }

    private ResolvedRound roundOutcome(
            Player player, String winnerId, String loserId, boolean draw, String opponentType) {
        var outcome = draw
                ? "DRAW"
                : player.getId().equals(winnerId) ? "WIN" : player.getId().equals(loserId) ? "LOSS" : null;
        return outcome == null ? null : new ResolvedRound(player.getId(), player.getHealth(), outcome, opponentType);
    }

    private String opponentType(Player player, List<Player> participants) {
        return participants.stream()
                .filter(opponent -> !opponent.getId().equals(player.getId()))
                .findFirst()
                .map(opponent -> opponent.isBot() ? "BOT" : opponent.isGhost() ? "GHOST" : "HUMAN")
                .orElse("UNKNOWN");
    }

    private String findRunId(String roomId, String playerId) {
        return jdbcTemplate
                .query(
                        "SELECT r.id FROM analytics_player_run r JOIN analytics_match m ON m.id = r.match_id"
                                + " WHERE m.room_id = ? AND r.player_id = ?",
                        (resultSet, rowNum) -> resultSet.getString(1),
                        roomId,
                        playerId)
                .stream()
                .findFirst()
                .orElse(null);
    }

    private String serializeBoard(Player player) {
        var units = player.getBoardUnits().stream()
                .map(unit -> new BoardUnit(
                        unit.getDefinitionId(),
                        unit.getLineId(),
                        unit.getStarLevel(),
                        unit.getItems().stream().map(item -> item.getId()).toList()))
                .toList();
        return toJson(units);
    }

    private String serializeAugments(Player player) {
        var augments = player.getSelectedAugments().stream()
                .map(augment -> new Augment(augment.id(), augment.tier().name()))
                .toList();
        return toJson(augments);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize analytics snapshot", exception);
        }
    }

    private void enqueue(String operation, Runnable action) {
        try {
            writeExecutor.execute(() -> transactionally(operation, action));
        } catch (RejectedExecutionException exception) {
            log.warn("Could not queue {} for gameplay analytics because the writer is stopping", operation);
        }
    }

    private void transactionally(String operation, Runnable action) {
        try {
            transactionTemplate.executeWithoutResult(status -> action.run());
        } catch (DataAccessException | IllegalStateException exception) {
            log.error("Could not {} for gameplay analytics", operation, exception);
        }
    }

    private record BoardUnit(String definitionId, String lineId, int starLevel, List<String> itemIds) {}

    private record Augment(String id, String tier) {}

    private record PlayerRun(String playerId, String analyticsClientId) {}

    private record RoundSnapshot(
            String playerId, int health, int gold, int level, int xp, String boardJson, String augmentsJson) {}

    private record ResolvedRound(String playerId, int health, String outcome, String opponentType) {}

    private record PlayerResult(String playerId, Integer placement, int health, int finalRound, String boardJson) {}
}
