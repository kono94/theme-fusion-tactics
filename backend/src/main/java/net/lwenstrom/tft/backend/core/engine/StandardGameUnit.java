package net.lwenstrom.tft.backend.core.engine;

public class StandardGameUnit extends AbstractGameUnit {

    public StandardGameUnit(UnitDefinition def) {
        this(def, 1);
    }

    public StandardGameUnit(UnitDefinition def, int starLevel) {
        this(def, starLevel, null);
    }

    public StandardGameUnit(UnitDefinition def, int starLevel, String branchId) {
        this(def, def.formAt(starLevel, branchId));
    }

    private StandardGameUnit(UnitDefinition def, ResolvedForm form) {
        super(
                form,
                def.lineId(),
                def.cost(),
                def.isPending(form.starLevel(), form.branchId()) ? def.evolutionOptions(form.starLevel()) : null);
        setStarLevel(form.starLevel());
        setMaxHealth(form.maxHealth());
        setMaxMana(form.maxMana());
        setAttackDamage(form.attackDamage());
        setAbilityPower(form.abilityPower());
        setDefense(form.defense());
        setAttackSpeed(form.attackSpeed());
        setCurrentHealth(form.maxHealth());
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
