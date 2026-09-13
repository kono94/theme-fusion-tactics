package net.lwenstrom.tft.backend.core.model;

public record UnitCombatStats(
        String lineId,
        String definitionId,
        String unitName,
        int starLevel,
        int damageDealt,
        int damageTaken,
        int healingDone,
        int shieldingDone) {

    public UnitCombatStats add(UnitCombatStats other) {
        var representative = other.starLevel >= starLevel ? other : this;
        return new UnitCombatStats(
                lineId,
                representative.definitionId,
                representative.unitName,
                representative.starLevel,
                damageDealt + other.damageDealt,
                damageTaken + other.damageTaken,
                healingDone + other.healingDone,
                shieldingDone + other.shieldingDone);
    }
}
