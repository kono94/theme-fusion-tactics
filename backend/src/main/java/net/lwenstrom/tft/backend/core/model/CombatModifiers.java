package net.lwenstrom.tft.backend.core.model;

public final class CombatModifiers {

    public record FieldModifiers(
            float attackSpeedBonus, int defenseBonus, float extraAttackChance, float manaGainMultiplier) {
        public static final FieldModifiers NONE = new FieldModifiers(0.0f, 0, 0.0f, 1.0f);
    }

    private HeldItemState items = HeldItemState.none();
    private FieldModifiers field = FieldModifiers.NONE;

    private CombatModifiers() {}

    public static CombatModifiers none() {
        return new CombatModifiers();
    }

    public CombatModifiers copy() {
        var copy = new CombatModifiers();
        copy.items = items.copy();
        copy.field = field;
        return copy;
    }

    public HeldItemState items() {
        return items;
    }

    public void setItems(HeldItemState items) {
        this.items = items == null ? HeldItemState.none() : items;
    }

    public FieldModifiers field() {
        return field;
    }

    public void setField(FieldModifiers field) {
        this.field = field == null ? FieldModifiers.NONE : field;
    }

    public float attackSpeedBonus() {
        return field.attackSpeedBonus();
    }

    public int defenseBonus() {
        return field.defenseBonus();
    }

    public float extraAttackChance() {
        return items.extraAttackChance() + field.extraAttackChance();
    }

    public float manaGainMultiplier() {
        return items.manaGainMultiplier() * field.manaGainMultiplier();
    }
}
