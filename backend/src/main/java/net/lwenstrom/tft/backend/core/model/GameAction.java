package net.lwenstrom.tft.backend.core.model;

public record GameAction(
        ActionType type,
        String playerId,
        String unitId,
        String orbId,
        Integer targetX,
        Integer targetY,
        Integer shopIndex,
        String augmentId,
        String clientActionId) {

    public GameAction(
            ActionType type,
            String playerId,
            String unitId,
            String orbId,
            Integer targetX,
            Integer targetY,
            Integer shopIndex,
            String augmentId) {
        this(type, playerId, unitId, orbId, targetX, targetY, shopIndex, augmentId, null);
    }
}
