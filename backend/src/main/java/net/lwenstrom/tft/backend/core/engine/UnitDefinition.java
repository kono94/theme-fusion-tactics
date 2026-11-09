package net.lwenstrom.tft.backend.core.engine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.EvolutionOption;
import net.lwenstrom.tft.backend.core.model.UnitRole;

public record UnitDefinition(
        String id,
        String name,
        int cost,
        UnitRole role,
        List<Integer> maxHealth,
        List<Integer> maxMana,
        List<Integer> attackDamage,
        List<Integer> abilityPower,
        List<Integer> defense,
        List<Float> attackSpeed,
        List<Integer> range,
        List<String> traits,
        AbilityDefinition ability,
        String lineId,
        List<UnitFormDefinition> forms) {

    public UnitDefinition(
            String id,
            String name,
            int cost,
            UnitRole role,
            List<Integer> maxHealth,
            List<Integer> maxMana,
            List<Integer> attackDamage,
            List<Integer> abilityPower,
            List<Integer> defense,
            List<Float> attackSpeed,
            List<Integer> range,
            List<String> traits,
            AbilityDefinition ability) {
        this(
                id,
                name,
                cost,
                role,
                maxHealth,
                maxMana,
                attackDamage,
                abilityPower,
                defense,
                attackSpeed,
                range,
                traits,
                ability,
                null,
                null);
    }

    public UnitDefinition {
        Objects.requireNonNull(role, "Unit role is required");
        if (defense == null || defense.size() != 3) {
            throw new IllegalArgumentException("Unit defense must contain exactly three star-level values");
        }
        if (defense.stream().anyMatch(value -> value == null || value < 0)) {
            throw new IllegalArgumentException("Unit defense values must be non-negative");
        }
    }

    public String lineId() {
        return lineId == null || lineId.isBlank() ? id : lineId;
    }

    public List<UnitFormDefinition> forms() {
        return forms == null ? List.of() : forms;
    }

    public int getMaxHealth(int level) {
        return getMaxHealth(level, null);
    }

    public int getMaxHealth(int level, String branchId) {
        return getVal(formStats(level, branchId, UnitFormDefinition::maxHealth, maxHealth), level);
    }

    public int getMaxMana(int level) {
        return getMaxMana(level, null);
    }

    public int getMaxMana(int level, String branchId) {
        return getVal(formStats(level, branchId, UnitFormDefinition::maxMana, maxMana), level);
    }

    public int getAttackDamage(int level) {
        return getAttackDamage(level, null);
    }

    public int getAttackDamage(int level, String branchId) {
        return getVal(formStats(level, branchId, UnitFormDefinition::attackDamage, attackDamage), level);
    }

    public int getAbilityPower(int level) {
        return getVal(abilityPower, level);
    }

    public int getDefense(int level) {
        return getDefense(level, null);
    }

    public int getDefense(int level, String branchId) {
        return getVal(formStats(level, branchId, UnitFormDefinition::defense, defense), level);
    }

    public float getAttackSpeed(int level) {
        return getAttackSpeed(level, null);
    }

    public float getAttackSpeed(int level, String branchId) {
        return getVal(formStats(level, branchId, UnitFormDefinition::attackSpeed, attackSpeed), level);
    }

    public int getRange(int level) {
        return getVal(range, level);
    }

    public String getDefinitionId(int level) {
        return getDefinitionId(level, null);
    }

    public String getDefinitionId(int level, String branchId) {
        var form = resolveForm(level, branchId);
        return form != null && form.definitionId() != null ? form.definitionId() : id;
    }

    public String getName(int level) {
        return getName(level, null);
    }

    public String getName(int level, String branchId) {
        var form = resolveForm(level, branchId);
        return form != null && form.name() != null ? form.name() : name;
    }

    public UnitRole getRole(int level) {
        return getRole(level, null);
    }

    public UnitRole getRole(int level, String branchId) {
        var form = resolveForm(level, branchId);
        return form != null && form.role() != null ? form.role() : role;
    }

    public List<String> getTraits(int level) {
        return getTraits(level, null);
    }

    public List<String> getTraits(int level, String branchId) {
        var form = resolveForm(level, branchId);
        return form != null && form.traits() != null && !form.traits().isEmpty() ? form.traits() : traits;
    }

    public AbilityDefinition getAbility(int level) {
        return getAbility(level, null);
    }

    public AbilityDefinition getAbility(int level, String branchId) {
        var form = resolveForm(level, branchId);
        return form != null && form.ability() != null ? form.ability() : ability;
    }

    public int getActiveRange(int level) {
        return getActiveRange(level, null);
    }

    public int getActiveRange(int level, String branchId) {
        var form = resolveForm(level, branchId);
        if (form != null && form.range() != null && !form.range().isEmpty()) {
            return getVal(form.range(), level);
        }
        return getRange(level);
    }

    // A chosen branch keeps applying at higher stars until a later form of the same branch replaces it;
    // without a branch only unbranched forms apply, so a pending unit keeps showing its pre-branch form.
    public UnitFormDefinition resolveForm(int level, String branchId) {
        UnitFormDefinition best = null;
        for (var form : forms()) {
            if (form.starLevel() > level) continue;
            var matches = branchId == null ? form.branchId() == null : branchId.equals(form.branchId());
            if (matches && (best == null || form.starLevel() > best.starLevel())) {
                best = form;
            }
        }
        if (best == null && branchId != null) {
            return resolveForm(level, null);
        }
        return best;
    }

    @JsonIgnore
    public int branchPoint() {
        return forms().stream()
                .filter(form -> form.branchId() != null)
                .mapToInt(UnitFormDefinition::starLevel)
                .min()
                .orElse(-1);
    }

    public boolean isPending(int level, String branchId) {
        var branchPoint = branchPoint();
        return branchId == null && branchPoint > 0 && level >= branchPoint;
    }

    public List<String> branchIdsAt(int level) {
        return forms().stream()
                .filter(form -> form.starLevel() == level && form.branchId() != null)
                .map(UnitFormDefinition::branchId)
                .distinct()
                .toList();
    }

    public boolean offersBranch(String branchId) {
        var branchPoint = branchPoint();
        return branchId != null && branchPoint > 0 && branchIdsAt(branchPoint).contains(branchId);
    }

    public List<EvolutionOption> evolutionOptions(int level) {
        var branchPoint = branchPoint();
        if (branchPoint < 0) {
            return List.of();
        }
        return branchIdsAt(branchPoint).stream()
                .map(branchId -> evolutionOption(level, branchId))
                .toList();
    }

    private EvolutionOption evolutionOption(int level, String branchId) {
        var activeAbility = getAbility(level, branchId);
        var laterForms = forms().stream()
                .filter(form -> branchId.equals(form.branchId()) && form.starLevel() > level)
                .sorted(Comparator.comparingInt(UnitFormDefinition::starLevel))
                .map(form -> new EvolutionOption.LaterForm(
                        form.starLevel(),
                        getDefinitionId(form.starLevel(), branchId),
                        getName(form.starLevel(), branchId)))
                .toList();
        return new EvolutionOption(
                branchId,
                getDefinitionId(level, branchId),
                getName(level, branchId),
                getRole(level, branchId),
                getTraits(level, branchId),
                getActiveRange(level, branchId),
                getMaxHealth(level, branchId),
                getAttackDamage(level, branchId),
                getDefense(level, branchId),
                getAttackSpeed(level, branchId),
                getMaxMana(level, branchId),
                activeAbility != null ? activeAbility.name() : null,
                activeAbility != null ? activeAbility.getFormattedDescription(level) : "",
                laterForms);
    }

    private <T> List<T> formStats(
            int level, String branchId, Function<UnitFormDefinition, List<T>> formValues, List<T> lineValues) {
        var form = resolveForm(level, branchId);
        if (form == null) {
            return lineValues;
        }
        var values = formValues.apply(form);
        return values != null && !values.isEmpty() ? values : lineValues;
    }

    private <T> T getVal(List<T> list, int level) {
        if (list == null || list.isEmpty()) return null;
        return list.get(Math.min(level - 1, list.size() - 1));
    }

    // Compatibility getters for Shop Tooltip (always shows 1-star stats)
    @JsonProperty("maxHealth")
    public int baseMaxHealth() {
        return getMaxHealth(1);
    }

    @JsonProperty("maxMana")
    public int baseMaxMana() {
        return getMaxMana(1);
    }

    @JsonProperty("attackDamage")
    public int baseAttackDamage() {
        return getAttackDamage(1);
    }

    @JsonProperty("abilityPower")
    public int baseAbilityPower() {
        return getAbilityPower(1);
    }

    @JsonProperty("defense")
    public int baseDefense() {
        return getDefense(1);
    }

    @JsonProperty("attackSpeed")
    public float baseAttackSpeed() {
        return getAttackSpeed(1);
    }

    @JsonProperty("range")
    public int baseRange() {
        return getRange(1);
    }

    @JsonProperty("formattedAbilityDescription")
    public String formattedAbilityDescription() {
        var activeAbility = getAbility(1);
        return activeAbility != null ? activeAbility.getFormattedDescription(1) : "";
    }
}
