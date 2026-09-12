package net.lwenstrom.tft.backend.test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.DotEffect;
import net.lwenstrom.tft.backend.core.model.GameItem;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.UnitRole;

public class MockUnit implements GameUnit {
    private String id;
    private String definitionId;
    private String name;
    private int cost = 1;
    private UnitRole role = UnitRole.DAMAGE;
    private int maxHealth = 100;
    private int currentHealth = 100;
    private int mana = 0;
    private int maxMana = 100;
    private int attackDamage = 10;
    private int abilityPower = 0;
    private int defense = 0;
    private int temporaryDefenseBuff = 0;
    private int temporaryDefenseShred = 0;
    private float attackSpeed = 1.0f;
    private int range = 1;
    private Set<String> traits = Set.of();
    private final List<DotEffect> dotEffects = new ArrayList<>();
    private int starLevel = 1;
    private String ownerId;
    private int x = 0;
    private int y = 0;
    private int savedX = 0;
    private int savedY = 0;
    private int savedMaxHealth = 100;
    private int savedMaxMana = 100;
    private int savedAttackDamage = 10;
    private int savedAbilityPower = 0;
    private int savedDefense = 0;
    private float savedAttackSpeed = 1.0f;
    private int savedMana = 0;
    private long nextAttackTime = 0;
    private long nextMoveTime = 0;
    private AbilityDefinition ability;
    private String activeAbility;

    // Trait specific values
    private float abilityDamageMultiplier = 1.0f;
    private float lifesteal = 0.0f;
    private float manaGainMultiplier = 1.0f;
    private float extraAttackChance = 0.0f;
    private float onHitDotDamageRatio = 0.0f;
    private long onHitDotDurationMs = 0L;
    private long onHitDotTickIntervalMs = 0L;
    private float damagePerCell = 0.0f;
    private float healAmplification = 1.0f;
    private boolean hasRevive = false;
    private boolean reviveUsed = false;
    private int goldBonusMin = 0;
    private int goldBonusMax = 0;
    private float asOnCast = 0.0f;
    private int asOnCastDuration = 0;
    private float lowHpDamageBonus = 0.0f;
    private float lowHpDamageThreshold = 0.0f;
    private float lowHpAsBonus = 0.0f;
    private float lowHpAsThreshold = 0.0f;

    public MockUnit(String id, String ownerId) {
        this.id = id;
        this.definitionId = id;
        this.name = "MockUnit";
        this.ownerId = ownerId;
    }

    public static MockUnit create(String id, String ownerId) {
        return new MockUnit(id, ownerId);
    }

    public MockUnit withPosition(int x, int y) {
        this.x = x;
        this.y = y;
        return this;
    }

    public MockUnit withHealth(int current, int max) {
        this.currentHealth = current;
        this.maxHealth = max;
        return this;
    }

    public MockUnit withAttackDamage(int damage) {
        this.attackDamage = damage;
        return this;
    }

    public MockUnit withDefense(int defense) {
        this.defense = defense;
        return this;
    }

    public MockUnit withRange(int range) {
        this.range = range;
        return this;
    }

    public MockUnit withMana(int current, int max) {
        this.mana = current;
        this.maxMana = max;
        return this;
    }

    public MockUnit withAbility(AbilityDefinition ability) {
        this.ability = ability;
        return this;
    }

    public MockUnit withName(String name) {
        this.name = name;
        return this;
    }

    public MockUnit withAttackSpeed(float speed) {
        this.attackSpeed = speed;
        return this;
    }

    public MockUnit withTraits(Set<String> traits) {
        this.traits = traits;
        return this;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getDefinitionId() {
        return definitionId;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public int getCost() {
        return cost;
    }

    @Override
    public UnitRole getRole() {
        return role;
    }

    @Override
    public int getMaxHealth() {
        return maxHealth;
    }

    @Override
    public int getCurrentHealth() {
        return currentHealth;
    }

    @Override
    public int getMana() {
        return mana;
    }

    @Override
    public int getMaxMana() {
        return maxMana;
    }

    @Override
    public int getAttackDamage() {
        return attackDamage;
    }

    @Override
    public int getAbilityPower() {
        return abilityPower;
    }

    @Override
    public int getDefense() {
        return Math.max(0, defense + temporaryDefenseBuff - temporaryDefenseShred);
    }

    @Override
    public float getAttackSpeed() {
        return attackSpeed;
    }

    @Override
    public int getRange() {
        return range;
    }

    @Override
    public Set<String> getTraits() {
        return traits;
    }

    @Override
    public List<GameItem> getItems() {
        return List.of();
    }

    @Override
    public List<DotEffect> getDotEffects() {
        return dotEffects;
    }

    @Override
    public void addDotEffect(DotEffect effect) {
        dotEffects.add(effect);
    }

    @Override
    public int getX() {
        return x;
    }

    @Override
    public int getY() {
        return y;
    }

    @Override
    public void setPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }

    @Override
    public void takeDamage(int amount) {
        this.currentHealth = Math.max(0, this.currentHealth - calculateDefenseMitigatedDamage(amount));
    }

    @Override
    public void gainMana(int amount) {
        this.mana = Math.min(this.maxMana, this.mana + amount);
    }

    @Override
    public int getStarLevel() {
        return starLevel;
    }

    @Override
    public String getOwnerId() {
        return ownerId;
    }

    @Override
    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    @Override
    public long getNextAttackTime() {
        return nextAttackTime;
    }

    @Override
    public void setNextAttackTime(long time) {
        this.nextAttackTime = time;
    }

    @Override
    public long getNextMoveTime() {
        return nextMoveTime;
    }

    @Override
    public void setNextMoveTime(long time) {
        this.nextMoveTime = time;
    }

    @Override
    public void setMaxHealth(int maxHealth) {
        this.maxHealth = maxHealth;
    }

    @Override
    public void setCurrentHealth(int currentHealth) {
        this.currentHealth = currentHealth;
    }

    @Override
    public void setMaxMana(int maxMana) {
        this.maxMana = maxMana;
    }

    @Override
    public void setAttackDamage(int attackDamage) {
        this.attackDamage = attackDamage;
    }

    @Override
    public void setAbilityPower(int abilityPower) {
        this.abilityPower = abilityPower;
    }

    @Override
    public void setDefense(int defense) {
        this.defense = defense;
    }

    @Override
    public void applyTemporaryDefenseBuff(int defense) {
        this.temporaryDefenseBuff = Math.max(this.temporaryDefenseBuff, Math.max(0, defense));
    }

    @Override
    public void applyTemporaryDefenseShred(int defense) {
        this.temporaryDefenseShred = Math.max(this.temporaryDefenseShred, Math.max(0, defense));
    }

    @Override
    public void setAttackSpeed(float attackSpeed) {
        this.attackSpeed = attackSpeed;
    }

    @Override
    public void savePlanningPosition() {
        this.savedX = this.x;
        this.savedY = this.y;
        this.savedMaxHealth = this.maxHealth;
        this.savedMaxMana = this.maxMana;
        this.savedAttackDamage = this.attackDamage;
        this.savedAbilityPower = this.abilityPower;
        this.savedDefense = this.defense;
        this.savedAttackSpeed = this.attackSpeed;
        this.savedMana = this.mana;
    }

    @Override
    public void restorePlanningPosition() {
        this.x = this.savedX;
        this.y = this.savedY;
        this.maxHealth = this.savedMaxHealth;
        this.currentHealth = this.savedMaxHealth;
        this.maxMana = this.savedMaxMana;
        this.attackDamage = this.savedAttackDamage;
        this.abilityPower = this.savedAbilityPower;
        this.defense = this.savedDefense;
        this.temporaryDefenseBuff = 0;
        this.temporaryDefenseShred = 0;
        this.attackSpeed = this.savedAttackSpeed;
        this.mana = Math.min(this.savedMana, this.maxMana);
        this.stunSecondsRemaining = 0;
        this.recentStunCount = 0;
        this.lastStunAppliedAt = Long.MIN_VALUE;
        this.atkBuff = 1.0f;
        this.spdBuff = 1.0f;
        this.abilityDamageMultiplier = 1.0f;
        this.lifesteal = 0.0f;
        this.manaGainMultiplier = 1.0f;
        this.extraAttackChance = 0.0f;
        this.onHitDotDamageRatio = 0.0f;
        this.onHitDotDurationMs = 0L;
        this.onHitDotTickIntervalMs = 0L;
        this.damagePerCell = 0.0f;
        this.healAmplification = 1.0f;
        this.hasRevive = false;
        this.reviveUsed = false;
        this.goldBonusMin = 0;
        this.goldBonusMax = 0;
        this.asOnCast = 0.0f;
        this.asOnCastDuration = 0;
        this.lowHpDamageBonus = 0.0f;
        this.lowHpDamageThreshold = 0.0f;
        this.lowHpAsBonus = 0.0f;
        this.lowHpAsThreshold = 0.0f;
        this.dotEffects.clear();
    }

    @Override
    public AbilityDefinition getAbility() {
        return ability;
    }

    @Override
    public String getActiveAbility() {
        return activeAbility;
    }

    @Override
    public void setActiveAbility(String abilityName) {
        this.activeAbility = abilityName;
    }

    @Override
    public void setMana(int mana) {
        this.mana = mana;
    }

    // Stun/buff fields for combat effects
    private float stunSecondsRemaining = 0;
    private int recentStunCount = 0;
    private long lastStunAppliedAt = Long.MIN_VALUE;
    private float atkBuff = 1.0f;
    private float spdBuff = 1.0f;

    @Override
    public float getStunSecondsRemaining() {
        return stunSecondsRemaining;
    }

    @Override
    public void setStunSecondsRemaining(float seconds) {
        this.stunSecondsRemaining = seconds;
    }

    @Override
    public int getRecentStunCount() {
        return recentStunCount;
    }

    @Override
    public void setRecentStunCount(int count) {
        this.recentStunCount = count;
    }

    @Override
    public long getLastStunAppliedAt() {
        return lastStunAppliedAt;
    }

    @Override
    public void setLastStunAppliedAt(long time) {
        this.lastStunAppliedAt = time;
    }

    @Override
    public float getAtkBuff() {
        return atkBuff;
    }

    @Override
    public void setAtkBuff(float buff) {
        this.atkBuff = buff;
    }

    @Override
    public float getSpdBuff() {
        return spdBuff;
    }

    @Override
    public void setSpdBuff(float buff) {
        this.spdBuff = buff;
    }

    @Override
    public float getAbilityDamageMultiplier() {
        return abilityDamageMultiplier;
    }

    @Override
    public void setAbilityDamageMultiplier(float multiplier) {
        this.abilityDamageMultiplier = multiplier;
    }

    @Override
    public float getLifesteal() {
        return lifesteal;
    }

    @Override
    public void setLifesteal(float lifesteal) {
        this.lifesteal = lifesteal;
    }

    @Override
    public float getManaGainMultiplier() {
        return manaGainMultiplier;
    }

    @Override
    public void setManaGainMultiplier(float multiplier) {
        this.manaGainMultiplier = multiplier;
    }

    @Override
    public float getExtraAttackChance() {
        return extraAttackChance;
    }

    @Override
    public void setExtraAttackChance(float chance) {
        this.extraAttackChance = chance;
    }

    @Override
    public float getOnHitDotDamageRatio() {
        return onHitDotDamageRatio;
    }

    @Override
    public void setOnHitDotDamageRatio(float ratio) {
        this.onHitDotDamageRatio = ratio;
    }

    @Override
    public long getOnHitDotDurationMs() {
        return onHitDotDurationMs;
    }

    @Override
    public void setOnHitDotDurationMs(long durationMs) {
        this.onHitDotDurationMs = durationMs;
    }

    @Override
    public long getOnHitDotTickIntervalMs() {
        return onHitDotTickIntervalMs;
    }

    @Override
    public void setOnHitDotTickIntervalMs(long tickIntervalMs) {
        this.onHitDotTickIntervalMs = tickIntervalMs;
    }

    @Override
    public float getDamagePerCell() {
        return damagePerCell;
    }

    @Override
    public void setDamagePerCell(float damage) {
        this.damagePerCell = damage;
    }

    @Override
    public float getHealAmplification() {
        return healAmplification;
    }

    @Override
    public void setHealAmplification(float amp) {
        this.healAmplification = amp;
    }

    @Override
    public boolean hasRevive() {
        return hasRevive;
    }

    @Override
    public void setHasRevive(boolean hasRevive) {
        this.hasRevive = hasRevive;
    }

    @Override
    public boolean isReviveUsed() {
        return reviveUsed;
    }

    @Override
    public void setReviveUsed(boolean used) {
        this.reviveUsed = used;
    }

    @Override
    public int getGoldBonusMin() {
        return goldBonusMin;
    }

    @Override
    public void setGoldBonusMin(int min) {
        this.goldBonusMin = min;
    }

    @Override
    public int getGoldBonusMax() {
        return goldBonusMax;
    }

    @Override
    public void setGoldBonusMax(int max) {
        this.goldBonusMax = max;
    }

    @Override
    public float getAsOnCast() {
        return asOnCast;
    }

    @Override
    public void setAsOnCast(float as) {
        this.asOnCast = as;
    }

    @Override
    public int getAsOnCastDuration() {
        return asOnCastDuration;
    }

    @Override
    public void setAsOnCastDuration(int duration) {
        this.asOnCastDuration = duration;
    }

    @Override
    public float getLowHpDamageBonus() {
        return lowHpDamageBonus;
    }

    @Override
    public void setLowHpDamageBonus(float bonus) {
        this.lowHpDamageBonus = bonus;
    }

    @Override
    public float getLowHpDamageThreshold() {
        return lowHpDamageThreshold;
    }

    @Override
    public void setLowHpDamageThreshold(float threshold) {
        this.lowHpDamageThreshold = threshold;
    }

    @Override
    public float getLowHpAsBonus() {
        return lowHpAsBonus;
    }

    @Override
    public void setLowHpAsBonus(float bonus) {
        this.lowHpAsBonus = bonus;
    }

    @Override
    public float getLowHpAsThreshold() {
        return lowHpAsThreshold;
    }

    @Override
    public void setLowHpAsThreshold(float threshold) {
        this.lowHpAsThreshold = threshold;
    }

    @Override
    public GameUnit cloneUnit() {
        MockUnit clone = new MockUnit(this.id, this.ownerId);
        clone.definitionId = this.definitionId;
        clone.name = this.name;
        clone.cost = this.cost;
        clone.role = this.role;
        clone.maxHealth = this.maxHealth;
        clone.currentHealth = this.currentHealth;
        clone.mana = this.mana;
        clone.maxMana = this.maxMana;
        clone.attackDamage = this.attackDamage;
        clone.abilityPower = this.abilityPower;
        clone.defense = this.defense;
        clone.temporaryDefenseBuff = this.temporaryDefenseBuff;
        clone.temporaryDefenseShred = this.temporaryDefenseShred;
        clone.attackSpeed = this.attackSpeed;
        clone.range = this.range;
        clone.traits = this.traits;
        clone.dotEffects.addAll(this.dotEffects);
        clone.starLevel = this.starLevel;
        clone.x = this.x;
        clone.y = this.y;
        clone.savedX = this.savedX;
        clone.savedY = this.savedY;
        clone.savedMaxHealth = this.savedMaxHealth;
        clone.savedMaxMana = this.savedMaxMana;
        clone.savedAttackDamage = this.savedAttackDamage;
        clone.savedAbilityPower = this.savedAbilityPower;
        clone.savedDefense = this.savedDefense;
        clone.savedAttackSpeed = this.savedAttackSpeed;
        clone.savedMana = this.savedMana;
        clone.nextAttackTime = this.nextAttackTime;
        clone.nextMoveTime = this.nextMoveTime;
        clone.ability = this.ability;
        clone.activeAbility = this.activeAbility;
        clone.stunSecondsRemaining = this.stunSecondsRemaining;
        clone.recentStunCount = this.recentStunCount;
        clone.lastStunAppliedAt = this.lastStunAppliedAt;
        clone.atkBuff = this.atkBuff;
        clone.spdBuff = this.spdBuff;
        clone.abilityDamageMultiplier = this.abilityDamageMultiplier;
        clone.lifesteal = this.lifesteal;
        clone.manaGainMultiplier = this.manaGainMultiplier;
        clone.extraAttackChance = this.extraAttackChance;
        clone.onHitDotDamageRatio = this.onHitDotDamageRatio;
        clone.onHitDotDurationMs = this.onHitDotDurationMs;
        clone.onHitDotTickIntervalMs = this.onHitDotTickIntervalMs;
        clone.damagePerCell = this.damagePerCell;
        clone.healAmplification = this.healAmplification;
        clone.hasRevive = this.hasRevive;
        clone.reviveUsed = this.reviveUsed;
        clone.goldBonusMin = this.goldBonusMin;
        clone.goldBonusMax = this.goldBonusMax;
        clone.asOnCast = this.asOnCast;
        clone.asOnCastDuration = this.asOnCastDuration;
        clone.lowHpDamageBonus = this.lowHpDamageBonus;
        clone.lowHpDamageThreshold = this.lowHpDamageThreshold;
        clone.lowHpAsBonus = this.lowHpAsBonus;
        clone.lowHpAsThreshold = this.lowHpAsThreshold;
        return clone;
    }
}
