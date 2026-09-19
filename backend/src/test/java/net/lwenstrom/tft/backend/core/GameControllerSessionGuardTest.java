package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.engine.GameRoom;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.ActionType;
import net.lwenstrom.tft.backend.core.model.GameAction;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

class GameControllerSessionGuardTest {

    private GameController controller;
    private GameEngine gameEngine;

    @BeforeEach
    void setUp() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var registry = TestHelpers.createMockRegistry();
        var clock = TestHelpers.createTestClock();
        var randomProvider = TestHelpers.createSeededRandomProvider();
        var messagingTemplate = mock(SimpMessagingTemplate.class);

        gameEngine = new GameEngine(dataLoader, registry, clock, randomProvider);
        controller = new GameController(messagingTemplate, gameEngine, new TraitCatalogService(dataLoader), registry);
    }

    @Test
    void handleAction_AllowsOwnSessionPlayer() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        var gold = host.getGold();
        var level = host.getLevel();
        var xp = host.getXp();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(gold - GameConstants.XP_BUY_COST, host.getGold());
        assertTrue(host.getLevel() > level || host.getXp() > xp);
    }

    @Test
    void handleAction_ReturnsCorrelatedAcceptedAndRejectedResults() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");

        var accepted = controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null, "accepted-action"),
                "host-session");
        var rejected = controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, "spoofed-player", null, null, null, null, null, null, "rejected-action"),
                "host-session");

        assertEquals(new GameController.ActionResult("accepted-action", ActionType.EXP, "accepted", "none"), accepted);
        assertEquals(
                new GameController.ActionResult("rejected-action", ActionType.EXP, "rejected", "unauthorized"),
                rejected);
        assertNull(controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "host-session"));
    }

    @Test
    void handleAction_RejectsMismatchedPlayerId() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");

        var host = findPlayer(room, "Host");
        var guest = findPlayer(room, "Guest");
        var hostGold = host.getGold();
        var guestGold = guest.getGold();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, guest.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(hostGold, host.getGold());
        assertEquals(0, host.getXp());
        assertEquals(guestGold, guest.getGold());
        assertEquals(0, guest.getXp());
    }

    @Test
    void handleAction_RejectsMalformedPayload() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        var gold = host.getGold();

        controller.handleAction(room.getId(), null, "host-session");
        controller.handleAction(
                room.getId(), new GameAction(null, host.getId(), null, null, null, null, null, null), "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.BUY, host.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(gold, host.getGold());
    }

    @Test
    void handleAction_AllowsBuyingAndEconomyActionsDuringCombat() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        TestHelpers.setPhase(room, GamePhase.COMBAT);
        host.setGold(20);
        var shopUnit = host.getShop().getFirst();
        var level = host.getLevel();
        var xp = host.getXp();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.BUY, host.getId(), null, null, null, null, 0, null),
                "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.REROLL, host.getId(), null, null, null, null, null, null),
                "host-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.LOCK, host.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(shopUnit.id(), host.getBench().getFirst().getDefinitionId());
        assertTrue(host.getShop().stream().allMatch(java.util.Objects::nonNull));
        assertTrue(host.isShopLocked());
        assertEquals(20 - shopUnit.cost() - GameConstants.XP_BUY_COST - GameConstants.REROLL_COST, host.getGold());
        assertTrue(host.getLevel() > level || host.getXp() > xp);
    }

    @Test
    void applyAction_RestrictsCombatMovementAndSellingToBenchUnits() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        host.setGold(20);
        TestHelpers.setPhase(room, GamePhase.COMBAT);
        assertTrue(room.applyAction(
                host.getId(), new GameAction(ActionType.BUY, host.getId(), null, null, null, null, 0, null)));
        var benchUnit = host.getBench().getFirst();

        assertFalse(room.applyAction(
                host.getId(),
                new GameAction(ActionType.MOVE, host.getId(), benchUnit.getId(), null, 0, 0, null, null)));
        assertTrue(room.applyAction(
                host.getId(),
                new GameAction(ActionType.MOVE, host.getId(), benchUnit.getId(), null, 1, -1, null, null)));
        assertEquals(benchUnit.getId(), host.getBench().get(1).getId());
        assertTrue(room.applyAction(
                host.getId(),
                new GameAction(ActionType.SELL, host.getId(), benchUnit.getId(), null, null, null, null, null)));
        assertNull(host.getBench().get(1));
    }

    @Test
    void applyAction_RejectsCoordinatesOutsideThePlanningBoardAndBenchContract() {
        var room = createRoomWithHost();
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");

        assertFalse(room.applyAction(
                host.getId(), new GameAction(ActionType.MOVE, host.getId(), "unit", null, 9, 0, null, null)));
        assertFalse(room.applyAction(
                host.getId(), new GameAction(ActionType.MOVE, host.getId(), "unit", null, 0, 3, null, null)));
        assertFalse(room.applyAction(
                host.getId(), new GameAction(ActionType.MOVE, host.getId(), "unit", null, 0, -2, null, null)));
    }

    @Test
    void createRoom_DoesNotOverwriteAnExistingRoom() {
        var firstResult =
                controller.createRoom(new GameController.RoomRequest("duplicate-room", "Host"), "host-session");
        var originalRoom = gameEngine.getRoom("duplicate-room");

        var secondResult =
                controller.createRoom(new GameController.RoomRequest("duplicate-room", "Other"), "other-session");

        assertTrue(firstResult.accepted());
        assertFalse(secondResult.accepted());
        assertEquals("ROOM_EXISTS", secondResult.code());
        assertEquals(originalRoom, gameEngine.getRoom("duplicate-room"));
        assertEquals(1, originalRoom.getPlayers().size());
    }

    @Test
    void joinRoom_ReturnsAResultForMissingRoom() {
        var result = controller.joinRoom(new GameController.RoomRequest("missing-room", "Guest"), "guest-session");

        assertFalse(result.accepted());
        assertEquals("ROOM_NOT_FOUND", result.code());
    }

    @Test
    void leaveRoom_RemovesSessionBoundPlayer() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");
        var guest = findPlayer(room, "Guest");

        controller.leaveRoom(new GameController.RoomRequest(room.getId(), "wrong-name"), "guest-session");

        assertNull(room.getPlayer(guest.getId()));
        assertNotNull(findPlayer(room, "Host"));
    }

    @Test
    void abandonRoom_EliminatesPlayerAndPreventsReconnect() {
        controller.createRoom(
                new GameController.RoomRequest("abandon-room", "Host", "browser-id", "reconnect-secret"),
                "host-session");
        var room = gameEngine.getRoom("abandon-room");
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");

        controller.abandonRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");

        assertEquals(0, host.getHealth());
        assertTrue(host.isAbandoned());
        assertTrue(room.reconnectPlayer("reconnect-secret").isEmpty());
    }

    @Test
    void startRoom_DoesNotAllowNonHostToSpoofHostName() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");

        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "guest-session");

        assertEquals(GamePhase.LOBBY, room.getState().phase());
    }

    @Test
    void changeRoomMode_DoesNotAllowNonHostToSpoofHostName() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");

        controller.changeRoomMode(
                room.getId(), new GameController.ModeChangeRequest("Host", GameMode.POKEMON), "guest-session");

        assertEquals(GameMode.ONEPIECE, room.getState().gameMode());
    }

    @Test
    void getTraitsRejectsUnsupportedModesWithBadRequest() {
        var exception = assertThrows(ResponseStatusException.class, () -> controller.getTraits("unsupported-mode"));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    void joinRoom_DoesNotAddPlayerAfterMatchStarted() {
        var room = createRoomWithHost();
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        var playerCount = room.getPlayers().size();

        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Late"), "late-session");

        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(playerCount, room.getPlayers().size());
    }

    @Test
    void joinRoom_DoesNotBindSessionWhenRejected() {
        var room = createRoomWithHost();
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        var playerCount = room.getPlayers().size();

        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Late"), "late-session");
        controller.leaveRoom(new GameController.RoomRequest(room.getId(), "Late"), "late-session");

        assertEquals(playerCount, room.getPlayers().size());
        assertNotNull(findPlayer(room, "Host"));
    }

    @Test
    void joinRoom_RebindsActivePlayerWithReconnectToken() {
        controller.createRoom(
                new GameController.RoomRequest("reconnect-room", "Host", "browser-id", "reconnect-secret"),
                "old-session");
        var room = gameEngine.getRoom("reconnect-room");
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "old-session");

        controller.leaveRoom(new GameController.RoomRequest(room.getId(), "Host"), "old-session");

        assertNotNull(room.getPlayer(host.getId()));
        assertNotNull(host.getDisconnectedAt());

        controller.joinRoom(
                new GameController.RoomRequest(room.getId(), "Host", "browser-id", "reconnect-secret"), "new-session");
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "new-session");

        assertNull(host.getDisconnectedAt());
        assertEquals(2, host.getLevel());
    }

    @Test
    void joinRoom_ReconnectFromAnotherTabRevokesOldSession() {
        controller.createRoom(
                new GameController.RoomRequest("tab-reconnect-room", "Host", "browser-id", "reconnect-secret"),
                "old-session");
        var room = gameEngine.getRoom("tab-reconnect-room");
        var host = findPlayer(room, "Host");
        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "old-session");

        controller.joinRoom(
                new GameController.RoomRequest(room.getId(), "Host", "browser-id", "reconnect-secret"), "new-session");
        var goldBeforeActions = host.getGold();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "old-session");
        assertEquals(goldBeforeActions, host.getGold());

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.EXP, host.getId(), null, null, null, null, null, null),
                "new-session");
        assertEquals(goldBeforeActions - GameConstants.XP_BUY_COST, host.getGold());
    }

    @Test
    void joinRoom_IsIdempotentForSameSessionInSameRoom() {
        var room = createRoomWithHost();

        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");

        assertEquals(2, room.getPlayers().size());
        assertEquals(
                1,
                room.getPlayers().stream()
                        .filter(player -> player.getName().equals("Guest"))
                        .count());
    }

    @Test
    void addBot_RejectsNonHostAndStartedRoom() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");

        controller.addBot(room.getId(), "guest-session");

        assertEquals(2, room.getPlayers().size());

        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        var playerCount = room.getPlayers().size();

        controller.addBot(room.getId(), "host-session");

        assertEquals(playerCount, room.getPlayers().size());
    }

    @Test
    void handleAction_RejectsReadyForCombatSpoofing() {
        var room = createRoomWithHost();

        controller.startRoom(new GameController.RoomRequest(room.getId(), "Host"), "host-session");
        var host = findPlayer(room, "Host");
        var bot = room.getPlayers().stream().filter(Player::isBot).findFirst().orElseThrow();

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.READY_FOR_COMBAT, bot.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(GamePhase.PLANNING, room.getState().phase());
        assertEquals(host.getId(), room.getState().planningReadyPlayerId());

        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.READY_FOR_COMBAT, host.getId(), null, null, null, null, null, null),
                "host-session");

        assertEquals(GamePhase.COMBAT, room.getState().phase());
    }

    @Test
    void handleAction_SelectsAugmentForSessionBoundPlayer() {
        var room = createRoomWithHost();
        controller.joinRoom(new GameController.RoomRequest(room.getId(), "Guest"), "guest-session");
        var host = findPlayer(room, "Host");

        TestHelpers.setPhase(room, GamePhase.PLANNING);
        TestHelpers.setPhase(room, GamePhase.PLANNING);
        TestHelpers.setPhase(room, GamePhase.PLANNING);

        assertFalse(host.getAugmentChoices().isEmpty());
        var augmentId = host.getAugmentChoices().get(0).id();
        controller.handleAction(
                room.getId(),
                new GameAction(ActionType.SELECT_AUGMENT, host.getId(), null, null, null, null, null, augmentId),
                "host-session");

        assertEquals(0, host.getAugmentChoices().size());
        assertEquals(1, host.getSelectedAugments().size());
        assertEquals(augmentId, host.getSelectedAugments().get(0).id());
    }

    private GameRoom createRoomWithHost() {
        controller.createRoom(new GameController.RoomRequest("session-room", "Host"), "host-session");
        return gameEngine.getRoom("session-room");
    }

    private Player findPlayer(GameRoom room, String name) {
        return room.getPlayers().stream()
                .filter(player -> player.getName().equals(name))
                .findFirst()
                .orElseThrow();
    }
}
