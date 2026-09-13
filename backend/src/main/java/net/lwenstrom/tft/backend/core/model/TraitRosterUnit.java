package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record TraitRosterUnit(
        String lineId,
        int cost,
        int starLevel,
        String definitionId,
        String name,
        UnitRole role,
        int maxHealth,
        int maxMana,
        int attackDamage,
        int abilityPower,
        int defense,
        float attackSpeed,
        int range,
        List<String> traits,
        AbilityDefinition ability,
        String formattedAbilityDescription) {}
