package net.lwenstrom.tft.backend.core.model;

import java.util.List;
import java.util.Map;
import net.lwenstrom.tft.backend.core.GameConstants;
import net.lwenstrom.tft.backend.core.engine.CombatSystem;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;

public record GameState(
        String roomId,
        String hostId,
        GamePhase phase,
        long round,
        long timeRemainingMs,
        long totalPhaseDuration,
        Map<String, PlayerState> players,
        Map<String, String> matchups,
        List<CombatEvent> recentEvents,
        Map<String, CombatSystem.DamageEntry> damageLog,
        GameMode gameMode,
        boolean planningTimerPaused,
        String planningReadyPlayerId,
        PlanningPauseReason planningPauseReason,
        int itemSlotsPerUnit,
        String matchRuleSelection,
        ActiveMatchRule activeMatchRule,
        int baseIncome,
        int maxInterest,
        int rerollCost) {

    public GameState(
            String roomId,
            String hostId,
            GamePhase phase,
            long round,
            long timeRemainingMs,
            long totalPhaseDuration,
            Map<String, PlayerState> players,
            Map<String, String> matchups,
            List<CombatEvent> recentEvents,
            Map<String, CombatSystem.DamageEntry> damageLog,
            GameMode gameMode,
            boolean planningTimerPaused,
            String planningReadyPlayerId,
            PlanningPauseReason planningPauseReason) {
        this(
                roomId,
                hostId,
                phase,
                round,
                timeRemainingMs,
                totalPhaseDuration,
                players,
                matchups,
                recentEvents,
                damageLog,
                gameMode,
                planningTimerPaused,
                planningReadyPlayerId,
                planningPauseReason,
                GameConstants.DEFAULT_ITEM_SLOTS,
                "NONE",
                null,
                GameConstants.BASE_INCOME,
                GameConstants.MAX_INTEREST,
                GameConstants.REROLL_COST);
    }

    public record UnitStats(
            int maxHealth,
            int currentHealth,
            int mana,
            int maxMana,
            int attackDamage,
            int defense,
            float attackSpeed,
            float abilityDamageMultiplier,
            int shield,
            int damageReduction,
            float lifesteal) {
        public static UnitStats from(GameUnit unit) {
            return new UnitStats(
                    unit.getMaxHealth(),
                    unit.getCurrentHealth(),
                    unit.getMana(),
                    unit.getMaxMana(),
                    unit.getAttackDamage(),
                    unit.getDefense(),
                    unit.getAttackSpeed(),
                    unit.getAbilityDamageMultiplier(),
                    unit.getShield(),
                    unit.getDamageReduction(),
                    unit.getLifesteal());
        }
    }

    public record PlayerState(
            String playerId,
            String name, // Added name for UI
            int health,
            int gold,
            int level,
            int xp,
            int nextLevelXp, // Added for frontend scaling
            Integer place, // Added for game end
            String combatSide, // "TOP" or "BOTTOM"
            List<GameUnit> bench,
            List<GameUnit> board,
            List<UnitDefinition> shop,
            List<LootOrb> lootOrbs,
            List<AugmentOffer> augmentChoices,
            List<SelectedAugment> selectedAugments,
            boolean isGhost,
            boolean isBot,
            BotPersonality botPersonality,
            MatchStats matchStats,
            List<GameItem> inventory,
            Map<String, UnitStats> statPreviews) {
        public PlayerState(
                String playerId,
                String name,
                int health,
                int gold,
                int level,
                int xp,
                int nextLevelXp,
                Integer place,
                String combatSide,
                List<GameUnit> bench,
                List<GameUnit> board,
                List<UnitDefinition> shop,
                List<LootOrb> lootOrbs,
                List<AugmentOffer> augmentChoices,
                List<SelectedAugment> selectedAugments,
                boolean isGhost,
                boolean isBot,
                BotPersonality botPersonality,
                MatchStats matchStats) {
            this(
                    playerId,
                    name,
                    health,
                    gold,
                    level,
                    xp,
                    nextLevelXp,
                    place,
                    combatSide,
                    bench,
                    board,
                    shop,
                    lootOrbs,
                    augmentChoices,
                    selectedAugments,
                    isGhost,
                    isBot,
                    botPersonality,
                    matchStats,
                    List.of(),
                    Map.of());
        }
    }

    public record CombatEvent(
            long timestamp,
            String type, // DAMAGE, SKILL, DEATH, HEAL, SHIELD
            String sourceId,
            String targetId,
            int value,
            String skillName) {}
}
