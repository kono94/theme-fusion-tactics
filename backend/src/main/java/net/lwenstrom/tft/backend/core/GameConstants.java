package net.lwenstrom.tft.backend.core;

public final class GameConstants {

    // Combat
    public static final int MANA_PER_HIT = 10;
    public static final float MANA_ON_DIRECT_HIT_PERCENT = 0.05f;
    public static final long ABILITY_COOLDOWN_MS = 1000L;
    public static final long COMBAT_PHASE_MS = 32000L;

    // Economy
    public static final int XP_PER_PHASE = 2;
    public static final int XP_BUY_COST = 4;
    public static final int XP_BUY_AMOUNT = 4;
    public static final int MAX_PLAYER_LEVEL = 9;
    public static final int REROLL_COST = 2;
    public static final int STARTING_GOLD = 10;
    public static final int BASE_INCOME = 5;
    public static final int MAX_INTEREST = 5;

    // Grid & Units
    public static final int MAX_BENCH_SIZE = 9;
    public static final int SHOP_SIZE = 5;
    public static final int MAX_PLAYERS = 8;
    public static final int GRID_COLS = 9;
    public static final int PLAYER_ROWS = 3;
    public static final int COMBAT_ROWS = 6;
    public static final int MAX_STAR_LEVEL = 3;
    public static final int COPIES_TO_UPGRADE_TO_TWO_STAR = 3;
    public static final int COPIES_TO_UPGRADE_TO_THREE_STAR = 2;
    public static final int THREE_STAR_SELL_COPY_COUNT = 6;

    // Damage
    public static final int BASE_COMBAT_DAMAGE = 2;

    // Timing
    public static final int TICK_RATE_MS = 100;
    public static final long BASE_PLANNING_DURATION_MS = 15000L;
    public static final long PLANNING_DURATION_INCREMENT_MS = 250L;

    // Loot Orbs
    public static final int MIN_ORB_COUNT = 2;
    public static final int MAX_ORB_COUNT = 4;
    public static final int ORB_GOLD_CHANCE_PERCENT = 60;
    public static final int ORB_OWNED_UNIT_CHANCE_PERCENT = 70;
    public static final int MIN_ORB_GOLD = 3;
    public static final int MAX_ORB_GOLD = 8;
    public static final int EMERGENCY_DROP_HEALTH_THRESHOLD = 20;
    public static final int MIN_EMERGENCY_DROP_ORB_COUNT = 10;
    public static final int MAX_EMERGENCY_DROP_ORB_COUNT = 15;

    private GameConstants() {}
}
