package net.lwenstrom.tft.backend.core.combat;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameUnit;

public interface AbilityCaster {
    default void setDamageResolver(DamageResolver damageResolver) {}

    boolean castAbility(GameUnit source, List<GameUnit> allUnits, TargetSelector targetSelector);

    boolean castAbility(
            GameUnit source, List<GameUnit> allUnits, TargetSelector targetSelector, CombatStatCallback callback);

    default boolean castAbility(
            GameUnit source,
            List<GameUnit> allUnits,
            TargetSelector targetSelector,
            CombatStatCallback callback,
            long currentTime) {
        return castAbility(source, allUnits, targetSelector, callback);
    }

    interface CombatStatCallback {
        default void onDamage(String unitId, String unitName, String targetId, int damage) {}

        default void onDirectHit(GameUnit target) {}

        default void onHealing(String unitId, String unitName, String targetId, int healing) {}

        default void onShielding(String unitId, String unitName, String targetId, int shielding) {}

        default void onSkill(String unitId, String unitName, String targetId, int value) {}
    }
}
