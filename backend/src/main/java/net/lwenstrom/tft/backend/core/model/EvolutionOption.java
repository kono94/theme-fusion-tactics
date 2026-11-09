package net.lwenstrom.tft.backend.core.model;

import java.util.List;

public record EvolutionOption(
        String branchId,
        String definitionId,
        String name,
        UnitRole role,
        List<String> traits,
        int range,
        int maxHealth,
        int attackDamage,
        int defense,
        float attackSpeed,
        int maxMana,
        String abilityName,
        String abilityDescription,
        List<LaterForm> laterForms) {

    public EvolutionOption {
        traits = traits == null ? List.of() : List.copyOf(traits);
        laterForms = laterForms == null ? List.of() : List.copyOf(laterForms);
    }

    public record LaterForm(int starLevel, String definitionId, String name) {}
}
