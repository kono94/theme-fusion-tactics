package net.lwenstrom.tft.backend.core.model;

import net.lwenstrom.tft.backend.core.GameConstants;

public record RoundTimeSettings(int planningSeconds, int combatSeconds) {

    public static RoundTimeSettings defaults() {
        return new RoundTimeSettings(
                (int) (GameConstants.BASE_PLANNING_DURATION_MS / 1000), (int) (GameConstants.COMBAT_PHASE_MS / 1000));
    }

    public boolean isValid() {
        return planningSeconds >= GameConstants.MIN_PLANNING_SECONDS
                && planningSeconds <= GameConstants.MAX_PLANNING_SECONDS
                && combatSeconds >= GameConstants.MIN_COMBAT_SECONDS
                && combatSeconds <= GameConstants.MAX_COMBAT_SECONDS;
    }

    public long planningDurationMs() {
        return planningSeconds * 1000L;
    }

    public long combatDurationMs() {
        return combatSeconds * 1000L;
    }
}
