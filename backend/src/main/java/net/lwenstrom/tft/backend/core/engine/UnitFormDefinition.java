package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.UnitRole;

public record UnitFormDefinition(
        int starLevel,
        String definitionId,
        String name,
        UnitRole role,
        List<String> traits,
        List<Integer> range,
        AbilityDefinition ability,
        String branchId,
        List<Integer> maxHealth,
        List<Integer> maxMana,
        List<Integer> attackDamage,
        List<Integer> defense,
        List<Float> attackSpeed) {

    public UnitFormDefinition(
            int starLevel,
            String definitionId,
            String name,
            UnitRole role,
            List<String> traits,
            List<Integer> range,
            AbilityDefinition ability) {
        this(starLevel, definitionId, name, role, traits, range, ability, null, null, null, null, null, null);
    }

    public UnitFormDefinition {
        if (branchId != null && branchId.isBlank()) {
            branchId = null;
        }
    }
}
