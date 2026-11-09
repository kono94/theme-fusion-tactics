package net.lwenstrom.tft.backend.core.combat;

import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.model.GameUnit;

public final class StunRules {
    private static final float[] STUN_DURATION_MULTIPLIERS = {1.0f, 0.8f, 0.6f};

    private StunRules() {}

    public static boolean applyStun(GameUnit target, float stunSeconds, long currentTime) {
        if (stunSeconds <= 0) {
            return false;
        }
        if (target.getHeldItemState().tryConsumeStunImmunity()) {
            return false;
        }

        var recentStunCount = target.getRecentStunCount();
        var lastStunAppliedAt = target.getLastStunAppliedAt();
        if (recentStunCount == 0
                || currentTime < lastStunAppliedAt
                || currentTime - lastStunAppliedAt >= GameConstants.STUN_DIMINISHING_RETURNS_RESET_MS) {
            recentStunCount = 0;
        }

        var multiplier = STUN_DURATION_MULTIPLIERS[Math.min(recentStunCount, STUN_DURATION_MULTIPLIERS.length - 1)];
        var diminishedDuration =
                Math.min(stunSeconds, Math.max(GameConstants.MIN_DIMINISHED_STUN_SECONDS, stunSeconds * multiplier));
        target.setStunSecondsRemaining(Math.max(target.getStunSecondsRemaining(), diminishedDuration));
        target.setRecentStunCount(Math.min(recentStunCount + 1, STUN_DURATION_MULTIPLIERS.length));
        target.setLastStunAppliedAt(currentTime);
        return true;
    }
}
