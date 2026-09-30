package net.lwenstrom.tft.backend.core.engine;

public record MatchRuleDeathEffects(int explosionPercent, int killBounty, int reviveHealthPercent) {
    public static final MatchRuleDeathEffects NONE = new MatchRuleDeathEffects(0, 0, 0);

    public boolean isActive() {
        return explosionPercent > 0 || killBounty > 0 || reviveHealthPercent > 0;
    }
}
