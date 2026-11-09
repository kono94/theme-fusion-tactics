package net.lwenstrom.tft.backend.core.engine;

import java.util.HashSet;

public class StandardGameUnit extends AbstractGameUnit {

    public StandardGameUnit(UnitDefinition def) {
        this(def, 1);
    }

    public StandardGameUnit(UnitDefinition def, int starLevel) {
        this(def, starLevel, null);
    }

    public StandardGameUnit(UnitDefinition def, int starLevel, String branchId) {
        super(
                def.getDefinitionId(starLevel, branchId),
                def.lineId(),
                def.getName(starLevel, branchId),
                def.cost(),
                def.getRole(starLevel, branchId),
                def.getAbility(starLevel, branchId),
                def.getActiveRange(starLevel, branchId),
                new HashSet<>(def.getTraits(starLevel, branchId)),
                branchId,
                def.isPending(starLevel, branchId) ? def.evolutionOptions(starLevel) : null);
        setStarLevel(starLevel);
        setMaxHealth(def.getMaxHealth(starLevel, branchId));
        setMaxMana(def.getMaxMana(starLevel, branchId));
        setAttackDamage(def.getAttackDamage(starLevel, branchId));
        setAbilityPower(def.getAbilityPower(starLevel));
        setDefense(def.getDefense(starLevel, branchId));
        setAttackSpeed(def.getAttackSpeed(starLevel, branchId));
        setCurrentHealth(def.getMaxHealth(starLevel, branchId));
    }

    public boolean isDead() {
        return getCurrentHealth() <= 0;
    }

    public void useMana(int amount) {
        setMana(Math.max(0, getMana() - amount));
    }

    private StandardGameUnit(StandardGameUnit other) {
        super(other);
    }

    @Override
    public StandardGameUnit cloneUnit() {
        return new StandardGameUnit(this);
    }
}
