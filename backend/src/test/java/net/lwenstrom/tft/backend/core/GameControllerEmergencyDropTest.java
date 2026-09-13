package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Set;
import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.engine.GameRoom;
import net.lwenstrom.tft.backend.core.engine.Player;
import net.lwenstrom.tft.backend.core.model.EmergencyDropPayload;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import net.lwenstrom.tft.backend.core.model.LootOrb;
import net.lwenstrom.tft.backend.core.model.LootType;
import net.lwenstrom.tft.backend.core.model.RoomEvent;
import net.lwenstrom.tft.backend.core.model.RoomEventType;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.ExecutorSubscribableChannel;

class GameControllerEmergencyDropTest {

    @Test
    void thresholdCrossingPublishesOneDropAtNextPlanningWithUniqueOrbs() {
        var dataLoader = TestHelpers.createMockDataLoader();
        var registry = TestHelpers.createMockRegistry();
        var clock = TestHelpers.createTestClock();
        var randomProvider = TestHelpers.createSeededRandomProvider();
        var sentMessages = new ArrayList<Message<?>>();
        var channel = new ExecutorSubscribableChannel();
        channel.subscribe(sentMessages::add);
        var messagingTemplate = new SimpMessagingTemplate(channel);
        var gameEngine = new GameEngine(dataLoader, registry, clock, randomProvider);
        var controller =
                new GameController(messagingTemplate, gameEngine, new TraitCatalogService(dataLoader), registry);

        controller.createRoom(new GameController.RoomRequest("emergency-room", "Winner"), "winner-session");
        controller.joinRoom(new GameController.RoomRequest("emergency-room", "Loser"), "loser-session");
        var room = gameEngine.getRoom("emergency-room");
        var winner = findPlayer(room, "Winner");
        var loser = findPlayer(room, "Loser");
        winner.addUnitToBoard(TestHelpers.createDefaultUnitDef(), 0, 0);
        TestHelpers.setPhase(room, GamePhase.PLANNING);
        sentMessages.clear();

        loser.setHealth(21);
        applyDamageToLoser(room, winner, loser);

        assertEquals(18, loser.getHealth());
        assertTrue(loser.isEmergencyDropTriggered());
        assertTrue(sentMessages.isEmpty());

        loser.addLootOrb(new LootOrb("existing-orb", 0, 0, LootType.GOLD, "", 1));
        TestHelpers.setPhase(room, GamePhase.PLANNING);

        var event = sentMessages.stream()
                .map(Message::getPayload)
                .filter(RoomEvent.class::isInstance)
                .map(RoomEvent.class::cast)
                .findFirst()
                .orElseThrow();
        assertEquals(RoomEventType.EMERGENCY_DROP, event.type());
        var payload = assertInstanceOf(EmergencyDropPayload.class, event.payload());
        assertEquals(loser.getId(), payload.playerId());
        assertEquals(2, payload.round());
        assertFalse(payload.dropId().isBlank());
        assertTrue(payload.orbIds().size() >= GameConstants.MIN_EMERGENCY_DROP_ORB_COUNT);
        assertTrue(payload.orbIds().size() <= GameConstants.MAX_EMERGENCY_DROP_ORB_COUNT);

        var emergencyOrbs = loser.getLootOrbs().stream()
                .filter(orb -> payload.orbIds().contains(orb.id()))
                .toList();
        assertEquals(payload.orbIds().size(), emergencyOrbs.size());
        assertEquals(
                emergencyOrbs.size(),
                emergencyOrbs.stream()
                        .map(orb -> orb.x() + ":" + orb.y())
                        .collect(java.util.stream.Collectors.toSet())
                        .size());
        assertFalse(emergencyOrbs.stream().anyMatch(orb -> orb.x() == 0 && orb.y() == 0));
        assertTrue(emergencyOrbs.stream()
                .allMatch(orb -> Set.of(LootType.GOLD, LootType.UNIT).contains(orb.type())));
    }

    private Player findPlayer(GameRoom room, String name) {
        return room.getPlayers().stream()
                .filter(player -> player.getName().equals(name))
                .findFirst()
                .orElseThrow();
    }

    private void applyDamageToLoser(GameRoom room, Player winner, Player loser) {
        try {
            var method = GameRoom.class.getDeclaredMethod("applyDamageToLoser", Player.class, Player.class);
            method.setAccessible(true);
            method.invoke(room, winner, loser);
        } catch (NoSuchMethodException | IllegalAccessException | InvocationTargetException exception) {
            throw new AssertionError(exception);
        }
    }
}
