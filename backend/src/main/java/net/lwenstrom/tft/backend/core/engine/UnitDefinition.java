package net.lwenstrom.tft.backend.core.engine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.EvolutionOption;
import net.lwenstrom.tft.backend.core.model.FieldConditionStart;
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

        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        List<UnitFormDefinition> forms,

        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        FieldConditionStart startCondition) {

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
            AbilityDefinition ability,
            String lineId,
            List<UnitFormDefinition> forms) {
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
                lineId,
                forms,
                null);
    }

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

    public ResolvedForm formAt(int star, String branchId) {
        var form = resolveForm(star, branchId);
        return new ResolvedForm(
                star,
                branchId,
                form != null && form.definitionId() != null ? form.definitionId() : id,
                form != null && form.name() != null ? form.name() : name,
                form != null && form.role() != null ? form.role() : role,
                form != null && form.traits() != null && !form.traits().isEmpty() ? form.traits() : traits,
                valueAt(formValues(form, UnitFormDefinition::range, range), star),
                form != null && form.ability() != null ? form.ability() : ability,
                valueAt(formValues(form, UnitFormDefinition::maxHealth, maxHealth), star),
                valueAt(formValues(form, UnitFormDefinition::maxMana, maxMana), star),
                valueAt(formValues(form, UnitFormDefinition::attackDamage, attackDamage), star),
                valueAt(abilityPower, star),
                valueAt(formValues(form, UnitFormDefinition::defense, defense), star),
                valueAt(formValues(form, UnitFormDefinition::attackSpeed, attackSpeed), star),
                form != null && form.startCondition() != null ? form.startCondition() : startCondition);
    }

    public List<String> variantsAt(int star) {
        var variants = new ArrayList<String>();
        if (!isPending(star, null)) {
            variants.add(null);
        }
        var branchPoint = branchPoint();
        if (branchPoint > 0 && star >= branchPoint) {
            variants.addAll(branchIdsAt(branchPoint));
        }
        return Collections.unmodifiableList(variants);
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
        var form = formAt(level, branchId);
        var activeAbility = form.ability();
        var laterForms = forms().stream()
                .filter(later -> branchId.equals(later.branchId()) && later.starLevel() > level)
                .sorted(Comparator.comparingInt(UnitFormDefinition::starLevel))
                .map(later -> formAt(later.starLevel(), branchId))
                .map(later -> new EvolutionOption.LaterForm(later.starLevel(), later.definitionId(), later.name()))
                .toList();
        return new EvolutionOption(
                branchId,
                form.definitionId(),
                form.name(),
                form.role(),
                form.traits(),
                form.range(),
                form.maxHealth(),
                form.attackDamage(),
                form.defense(),
                form.attackSpeed(),
                form.maxMana(),
                activeAbility != null ? activeAbility.name() : null,
                activeAbility != null ? activeAbility.getFormattedDescription(level) : "",
                laterForms);
    }

    private static <T> List<T> formValues(
            UnitFormDefinition form, Function<UnitFormDefinition, List<T>> formValues, List<T> lineValues) {
        if (form == null) {
            return lineValues;
        }
        var values = formValues.apply(form);
        return values != null && !values.isEmpty() ? values : lineValues;
    }

    private static <T> T valueAt(List<T> list, int level) {
        if (list == null || list.isEmpty()) return null;
        return list.get(Math.min(level - 1, list.size() - 1));
    }

    // Compatibility getters for Shop Tooltip (always shows 1-star stats)
    @JsonProperty("maxHealth")
    public int baseMaxHealth() {
        return formAt(1, null).maxHealth();
    }

    @JsonProperty("maxMana")
    public int baseMaxMana() {
        return formAt(1, null).maxMana();
    }

    @JsonProperty("attackDamage")
    public int baseAttackDamage() {
        return formAt(1, null).attackDamage();
    }

    @JsonProperty("abilityPower")
    public int baseAbilityPower() {
        return formAt(1, null).abilityPower();
    }

    @JsonProperty("defense")
    public int baseDefense() {
        return formAt(1, null).defense();
    }

    @JsonProperty("attackSpeed")
    public float baseAttackSpeed() {
        return formAt(1, null).attackSpeed();
    }

    @JsonProperty("range")
    public int baseRange() {
        return valueAt(range, 1);
    }

    @JsonProperty("formattedAbilityDescription")
    public String formattedAbilityDescription() {
        var activeAbility = formAt(1, null).ability();
        return activeAbility != null ? activeAbility.getFormattedDescription(1) : "";
    }
}
