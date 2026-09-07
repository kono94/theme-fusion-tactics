package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class GameConstantsTest {

    @Test
    void testCombatConstants() {
        assertEquals(10, GameConstants.MANA_PER_HIT);
        assertEquals(1000L, GameConstants.ABILITY_COOLDOWN_MS);
        assertEquals(32000L, GameConstants.COMBAT_PHASE_MS);
    }

    @Test
    void testEconomyConstants() {
        assertEquals(2, GameConstants.XP_PER_PHASE);
        assertEquals(4, GameConstants.XP_BUY_COST);
        assertEquals(4, GameConstants.XP_BUY_AMOUNT);
        assertEquals(2, GameConstants.REROLL_COST);
        assertEquals(10, GameConstants.STARTING_GOLD);
        assertEquals(5, GameConstants.BASE_INCOME);
        assertEquals(5, GameConstants.MAX_INTEREST);
    }

    @Test
    void testGridConstants() {
        assertEquals(9, GameConstants.MAX_BENCH_SIZE);
        assertEquals(5, GameConstants.SHOP_SIZE);
        assertEquals(9, GameConstants.GRID_COLS);
        assertEquals(3, GameConstants.PLAYER_ROWS);
        assertEquals(6, GameConstants.COMBAT_ROWS);
        assertEquals(3, GameConstants.MAX_STAR_LEVEL);
        assertEquals(3, GameConstants.COPIES_TO_UPGRADE_TO_TWO_STAR);
        assertEquals(2, GameConstants.COPIES_TO_UPGRADE_TO_THREE_STAR);
        assertEquals(6, GameConstants.THREE_STAR_SELL_COPY_COUNT);
    }

    @Test
    void testDamageConstants() {
        assertEquals(2, GameConstants.BASE_COMBAT_DAMAGE);
    }

    @Test
    void testTimingConstants() {
        assertEquals(100, GameConstants.TICK_RATE_MS);
        assertEquals(15000L, GameConstants.BASE_PLANNING_DURATION_MS);
        assertEquals(250L, GameConstants.PLANNING_DURATION_INCREMENT_MS);
    }

    @Test
    void testLootOrbConstants() {
        assertEquals(2, GameConstants.MIN_ORB_COUNT);
        assertEquals(4, GameConstants.MAX_ORB_COUNT);
        assertEquals(60, GameConstants.ORB_GOLD_CHANCE_PERCENT);
        assertEquals(70, GameConstants.ORB_OWNED_UNIT_CHANCE_PERCENT);
        assertEquals(3, GameConstants.MIN_ORB_GOLD);
        assertEquals(8, GameConstants.MAX_ORB_GOLD);
        assertEquals(20, GameConstants.EMERGENCY_DROP_HEALTH_THRESHOLD);
        assertEquals(10, GameConstants.MIN_EMERGENCY_DROP_ORB_COUNT);
        assertEquals(15, GameConstants.MAX_EMERGENCY_DROP_ORB_COUNT);
    }
}
