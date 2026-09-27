package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameItem;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.model.ItemStat;

public final class ItemStatApplier {
    private ItemStatApplier() {}

    public static void apply(GameUnit unit) {
        var items = unit.getItems();
        if (items.isEmpty()) return;
        var healthBonus = Math.round(unit.getMaxHealth() * total(items, ItemStat.MAX_HEALTH_PERCENT) / 100.0f);
        unit.setMaxHealth(unit.getMaxHealth() + healthBonus);
        unit.setCurrentHealth(unit.getCurrentHealth() + healthBonus);
        unit.setAttackDamage(
                Math.round(unit.getAttackDamage() * percentMultiplier(items, ItemStat.ATTACK_DAMAGE_PERCENT)));
        unit.setDefense(unit.getDefense() + total(items, ItemStat.DEFENSE_FLAT));
        unit.setAttackSpeed(unit.getAttackSpeed() * percentMultiplier(items, ItemStat.ATTACK_SPEED_PERCENT));
        unit.setAbilityDamageMultiplier(
                unit.getAbilityDamageMultiplier() * percentMultiplier(items, ItemStat.ABILITY_DAMAGE_PERCENT));
    }

    public static int total(List<GameItem> items, ItemStat stat) {
        return items.stream()
                .mapToInt(item -> item.getStatBonuses().getOrDefault(stat, 0))
                .sum();
    }

    private static float percentMultiplier(List<GameItem> items, ItemStat stat) {
        return 1.0f + total(items, stat) / 100.0f;
    }
}
