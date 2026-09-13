package net.lwenstrom.tft.backend.core;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.engine.CombatSystem;
import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.engine.GameRoom;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.EmergencyDropPayload;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.RoomEvent;
import net.lwenstrom.tft.backend.core.model.RoomEventType;
import net.lwenstrom.tft.backend.core.model.TraitCatalogEntry;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@RestController
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private static final int MAX_ROOM_ID_LENGTH = 32;
    private static final int MAX_PLAYER_NAME_LENGTH = 32;

    private final SimpMessagingTemplate messagingTemplate;
    private final GameEngine gameEngine;
    private final TraitCatalogService traitCatalogService;
    private final GameModeRegistry gameModeRegistry;
    private final Map<String, SessionPlayer> sessionPlayers = new ConcurrentHashMap<>();

    @Scheduled(fixedRate = GameConstants.TICK_RATE_MS)
    public void tick() {
        gameEngine.tick();
        gameEngine.getActiveRooms().forEach(this::broadcastRoomState);
    }

    @GetMapping("/api/traits")
    public List<TraitCatalogEntry> getTraits(@RequestParam(required = false) String mode) {
        GameMode resolvedMode;
        try {
            resolvedMode = mode != null ? GameMode.fromString(mode) : gameModeRegistry.getDefaultMode();
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mode is invalid", exception);
        }
        return traitCatalogService.getTraits(resolvedMode);
    }

    @GetMapping("/api/mode")
    public GameMode getMode() {
        return gameModeRegistry.getDefaultMode();
    }

    @MessageMapping("/create")
    @SendToUser(destinations = "/queue/room-result", broadcast = false)
    public RoomRequestResult createRoom(@Payload RoomRequest request, @Header("simpSessionId") String sessionId) {
        var validationError = validateRoomRequest(request);
        if (validationError.isPresent()) {
            return RoomRequestResult.rejected(
                    request != null ? request.roomId() : null, "INVALID_REQUEST", validationError.get());
        }

        var roomId = request.roomId().trim();
        var room = gameEngine.tryCreateRoom(roomId).orElse(null);
        if (room == null) {
            return RoomRequestResult.rejected(roomId, "ROOM_EXISTS", "A room with that ID already exists.");
        }
        configureCombatResultListener(room);
        var player = addPlayerForSession(
                        room,
                        request.playerName().trim(),
                        request.analyticsClientId(),
                        request.reconnectToken(),
                        sessionId)
                .orElseThrow();
        broadcastRoomState(room);
        return RoomRequestResult.accepted(roomId, player.getId());
    }

    private void configureCombatResultListener(GameRoom room) {
        room.setCombatResultListener(new GameRoom.CombatResultListener() {
            @Override
            public void onCombatResult(
                    String roomId,
                    String winnerId,
                    String loserId,
                    List<String> participantIds,
                    Map<String, CombatSystem.DamageEntry> damageLog) {
                handleCombatResult(roomId, winnerId, loserId, participantIds, damageLog);
            }

            @Override
            public void onEmergencyDrop(String roomId, EmergencyDropPayload payload) {
                handleEmergencyDrop(roomId, payload);
            }
        });
    }

    private void handleCombatResult(
            String roomId,
            String winnerId,
            String loserId,
            List<String> participantIds,
            Map<String, CombatSystem.DamageEntry> damageLog) {
        var damageMap = buildDamageMap(damageLog);
        var payload = buildCombatResultPayload(winnerId, loserId, participantIds, damageMap);
        publishRoomEvent(roomId, new RoomEvent<>(RoomEventType.COMBAT_RESULT, payload));
    }

    private void handleEmergencyDrop(String roomId, EmergencyDropPayload payload) {
        publishRoomEvent(roomId, new RoomEvent<>(RoomEventType.EMERGENCY_DROP, payload));
    }

    private void publishRoomEvent(String roomId, RoomEvent<?> event) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/event", event);
    }

    private Map<String, Map<String, Object>> buildDamageMap(Map<String, CombatSystem.DamageEntry> damageLog) {
        return damageLog.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> Map.of(
                                "name",
                                e.getValue().unitName(),
                                "unitName",
                                e.getValue().unitName(),
                                "definitionId",
                                e.getValue().definitionId(),
                                "ownerId",
                                e.getValue().ownerId(),
                                "damage",
                                e.getValue().damage(),
                                "healing",
                                e.getValue().healing(),
                                "shielding",
                                e.getValue().shielding())));
    }

    private CombatResultPayload buildCombatResultPayload(
            String winnerId, String loserId, List<String> participantIds, Map<String, Map<String, Object>> damageMap) {
        return new CombatResultPayload(winnerId, loserId, participantIds, damageMap);
    }

    @MessageMapping("/join")
    @SendToUser(destinations = "/queue/room-result", broadcast = false)
    public RoomRequestResult joinRoom(@Payload RoomRequest request, @Header("simpSessionId") String sessionId) {
        var validationError = validateRoomRequest(request);
        if (validationError.isPresent()) {
            return RoomRequestResult.rejected(
                    request != null ? request.roomId() : null, "INVALID_REQUEST", validationError.get());
        }

        var roomId = request.roomId().trim();
        var room = gameEngine.getRoom(roomId);
        if (room == null) {
            return RoomRequestResult.rejected(roomId, "ROOM_NOT_FOUND", "That room does not exist.");
        }

        var existingSessionPlayer = resolveSessionPlayer(room.getId(), sessionId);
        if (existingSessionPlayer != null) {
            broadcastRoomState(room);
            return RoomRequestResult.accepted(roomId, existingSessionPlayer.playerId());
        }

        var rejoiningPlayer = room.reconnectPlayer(request.reconnectToken());
        if (rejoiningPlayer.isPresent()) {
            bindSession(room.getId(), rejoiningPlayer.get().getId(), sessionId);
            broadcastRoomState(room);
            return RoomRequestResult.accepted(roomId, rejoiningPlayer.get().getId());
        }

        var player = addPlayerForSession(
                room, request.playerName().trim(), request.analyticsClientId(), request.reconnectToken(), sessionId);
        if (player.isEmpty()) {
            log.info("Rejected join for room {} because it is not accepting players.", room.getId());
            return RoomRequestResult.rejected(roomId, "ROOM_UNAVAILABLE", "That room is full or has already started.");
        }

        broadcastRoomState(room);
        return RoomRequestResult.accepted(roomId, player.get().getId());
    }

    @MessageMapping("/leave")
    public void leaveRoom(@Payload RoomRequest request, @Header("simpSessionId") String sessionId) {
        var sessionPlayer = resolveSessionPlayer(request.roomId(), sessionId);
        if (sessionPlayer == null) return;

        var room = gameEngine.getRoom(sessionPlayer.roomId());
        if (room != null) {
            sessionPlayers.remove(sessionId);
            room.disconnectPlayer(sessionPlayer.playerId());
            broadcastRoomState(room);
        }
    }

    @MessageMapping("/abandon")
    public void abandonRoom(@Payload RoomRequest request, @Header("simpSessionId") String sessionId) {
        var sessionPlayer = resolveSessionPlayer(request.roomId(), sessionId);
        if (sessionPlayer == null) return;

        sessionPlayers.remove(sessionId);
        var room = gameEngine.getRoom(sessionPlayer.roomId());
        if (room != null && room.abandonPlayer(sessionPlayer.playerId())) {
            broadcastRoomState(room);
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        disconnectSession(event.getSessionId());
    }

    @MessageMapping("/start")
    public void startRoom(@Payload RoomRequest request, @Header("simpSessionId") String sessionId) {
        if (request == null || request.roomId() == null) return;
        var room = gameEngine.getRoom(request.roomId());
        if (room == null) return;

        var sessionPlayer = resolveSessionPlayer(room.getId(), sessionId);
        if (sessionPlayer != null && room.startMatchForHost(sessionPlayer.playerId())) {
            broadcastRoomState(room);
        }
    }

    @MessageMapping("/room/{id}/add-bot")
    public void addBot(@DestinationVariable String id, @Header("simpSessionId") String sessionId) {
        var room = gameEngine.getRoom(id);
        if (room == null) return;

        var sessionPlayer = resolveSessionPlayer(room.getId(), sessionId);
        if (sessionPlayer != null
                && room.addBotForHost(sessionPlayer.playerId()).isPresent()) {
            broadcastRoomState(room);
        }
    }

    @MessageMapping("/room/{id}/action")
    public void handleAction(
            @DestinationVariable String id, @Payload GameAction action, @Header("simpSessionId") String sessionId) {
        var room = gameEngine.getRoom(id);
        if (room == null) return;

        var sessionPlayer = resolveSessionPlayer(id, sessionId);
        if (sessionPlayer == null || action == null || !sessionPlayer.playerId().equals(action.playerId())) {
            log.warn("Rejected action for unbound or mismatched player.");
            return;
        }

        if (!room.applyAction(sessionPlayer.playerId(), action)) {
            log.warn("Rejected invalid action {} for player {}.", action.type(), sessionPlayer.playerId());
            return;
        }

        broadcastRoomState(room);
    }

    @MessageMapping("/room/{id}/mode")
    public void changeRoomMode(
            @DestinationVariable String id,
            @Payload ModeChangeRequest request,
            @Header("simpSessionId") String sessionId) {
        var room = gameEngine.getRoom(id);
        if (room == null) return;

        var sessionPlayer = resolveSessionPlayer(room.getId(), sessionId);
        if (sessionPlayer != null
                && request != null
                && room.setGameModeForHost(sessionPlayer.playerId(), request.gameMode())) {
            broadcastRoomState(room);
        }
    }

    private void broadcastRoomState(GameRoom room) {
        synchronized (room) {
            messagingTemplate.convertAndSend("/topic/room/" + room.getId(), room.getState());
        }
    }

    private Optional<Player> addPlayerForSession(
            GameRoom room, String playerName, String analyticsClientId, String reconnectToken, String sessionId) {
        var player = room.tryAddPlayer(playerName, analyticsClientId, reconnectToken);
        player.ifPresent(p -> bindSession(room.getId(), p.getId(), sessionId));
        return player;
    }

    private Optional<String> validateRoomRequest(RoomRequest request) {
        if (request == null || request.roomId() == null || request.roomId().isBlank()) {
            return Optional.of("Room ID is required.");
        }
        var roomId = request.roomId().trim();
        if (roomId.length() > MAX_ROOM_ID_LENGTH || !roomId.matches("[A-Za-z0-9_-]+")) {
            return Optional.of("Room ID must use 1-32 letters, numbers, underscores, or hyphens.");
        }
        if (request.playerName() == null || request.playerName().isBlank()) {
            return Optional.of("Player name is required.");
        }
        if (request.playerName().trim().length() > MAX_PLAYER_NAME_LENGTH) {
            return Optional.of("Player name must be at most 32 characters.");
        }
        return Optional.empty();
    }

    private void bindSession(String roomId, String playerId, String sessionId) {
        sessionPlayers
                .entrySet()
                .removeIf(entry -> entry.getValue().roomId().equals(roomId)
                        && entry.getValue().playerId().equals(playerId));
        sessionPlayers.put(sessionId, new SessionPlayer(roomId, playerId));
    }

    private void disconnectSession(String sessionId) {
        var sessionPlayer = sessionPlayers.remove(sessionId);
        if (sessionPlayer == null) {
            return;
        }
        var room = gameEngine.getRoom(sessionPlayer.roomId());
        if (room != null) {
            room.disconnectPlayer(sessionPlayer.playerId());
            broadcastRoomState(room);
        }
    }

    private SessionPlayer resolveSessionPlayer(String roomId, String sessionId) {
        var sessionPlayer = sessionPlayers.get(sessionId);
        if (sessionPlayer == null || !sessionPlayer.roomId().equals(roomId)) {
            return null;
        }
        return sessionPlayer;
    }

    public record RoomRequest(String roomId, String playerName, String analyticsClientId, String reconnectToken) {
        public RoomRequest(String roomId, String playerName) {
            this(roomId, playerName, null, null);
        }
    }

    public record ModeChangeRequest(String playerName, GameMode gameMode) {}

    public record RoomRequestResult(boolean accepted, String roomId, String playerId, String code, String message) {
        private static RoomRequestResult accepted(String roomId, String playerId) {
            return new RoomRequestResult(true, roomId, playerId, null, null);
        }

        private static RoomRequestResult rejected(String roomId, String code, String message) {
            return new RoomRequestResult(false, roomId, null, code, message);
        }
    }

    public record CombatResultPayload(
            String winnerId, String loserId, List<String> participantIds, Map<String, Map<String, Object>> damageLog) {}

    private record SessionPlayer(String roomId, String playerId) {}
}
