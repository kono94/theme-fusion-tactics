package net.lwenstrom.tft.backend.core.engine;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionStart;
import net.lwenstrom.tft.backend.core.model.UnitRole;

public record ResolvedForm(
        int starLevel,
        String branchId,
        String definitionId,
        String name,
        UnitRole role,
        List<String> traits,
        int range,
        AbilityDefinition ability,
        int maxHealth,
        int maxMana,
        int attackDamage,
        int abilityPower,
        int defense,
        float attackSpeed,
        FieldConditionStart startCondition) {}
