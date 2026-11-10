package net.lwenstrom.tft.backend.core;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityLoader;
import net.lwenstrom.tft.backend.core.engine.MatchRuleManager;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.engine.UnitVariantDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityDefinition;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionModifier;
import net.lwenstrom.tft.backend.core.model.FieldConditionStart;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.ItemEffectType;
import net.lwenstrom.tft.backend.core.model.MatchRuleDefinition;
import net.lwenstrom.tft.backend.core.model.MatchRuleEffectType;
import net.lwenstrom.tft.backend.core.model.TraitDefinition;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@Slf4j
public class DataLoader {

    private final GameModeRegistry gameModeRegistry;
    private final JsonMapper jsonMapper;
    private final ElementalAffinityLoader affinityLoader;
    private final Map<GameMode, Optional<ElementalAffinityConfig>> affinityCache = new ConcurrentHashMap<>();

    @Autowired
    public DataLoader(GameModeRegistry gameModeRegistry, JsonMapper jsonMapper) {
        this(gameModeRegistry, jsonMapper, new ElementalAffinityLoader(jsonMapper));
    }

    public DataLoader(
            GameModeRegistry gameModeRegistry, JsonMapper jsonMapper, ElementalAffinityLoader affinityLoader) {
        this.gameModeRegistry = gameModeRegistry;
        this.jsonMapper = jsonMapper;
        this.affinityLoader = affinityLoader;
    }

    private record ModeData(
            Map<String, UnitDefinition> unitRegistry,
            List<TraitDefinition> traits,
            List<AugmentDefinition> augments,
            List<ItemDefinition> items) {}

    private static final String VARIANTS_FIELD = "variants";
    private static final String COMMON_MATCH_RULES_PATH = "/data/match_rules_common.json";

    private final Map<GameMode, ModeData> modeDataCache = new ConcurrentHashMap<>();
    private final Map<GameMode, List<MatchRuleDefinition>> matchRuleCache = new ConcurrentHashMap<>();
    private final Map<GameMode, List<FieldConditionDefinition>> fieldConditionCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadData() {
        gameModeRegistry.getAvailableModes().forEach(mode -> {
            getModeData(mode);
            getElementalAffinity(mode);
            getMatchRules(mode);
        });
    }

    private ModeData getModeData(GameMode mode) {
        return modeDataCache.computeIfAbsent(mode, this::loadModeData);
    }

    private ModeData loadModeData(GameMode mode) {
        var provider = gameModeRegistry.getProvider(mode);
        var units = loadUnits(provider.getUnitsPath());
        var traits = loadTraits(provider.getTraitsPath());
        var augments = loadAugments(provider.getAugmentsPath());
        var items = loadItems(provider.getItemsPath());
        if (units.isEmpty() || traits.isEmpty() || augments.isEmpty() || items.isEmpty()) {
            throw new IllegalStateException("Incomplete data for game mode: " + mode);
        }
        validateTraitReferences(mode, units.values(), traits);
        var fieldConditions = getFieldConditions(mode);
        validateFieldConditionReferences(mode, units.values(), fieldConditions);
        validateFieldConditionTraits(mode, fieldConditions, traits);
        return new ModeData(units, traits, augments, items);
    }

    private List<FieldConditionDefinition> loadFieldConditions(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                return List.of();
            }
            List<FieldConditionDefinition> conditions = jsonMapper.readValue(inputStream, new TypeReference<>() {});
            var ids = new HashSet<String>();
            for (var condition : conditions) {
                condition.validate();
                if (!ids.add(condition.id())) {
                    throw new IllegalStateException("Duplicate field condition id " + condition.id());
                }
            }
            log.info("Loaded {} field conditions from {}", conditions.size(), path);
            return List.copyOf(conditions);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load field condition data: " + path, e);
        }
    }

    private static void validateFieldConditionReferences(
            GameMode mode, Collection<UnitDefinition> units, List<FieldConditionDefinition> conditions) {
        var ids = conditions.stream().map(FieldConditionDefinition::id).collect(Collectors.toSet());
        for (var unit : units) {
            validateStartCondition(mode, unit, unit.startCondition(), ids);
            validateAbilityFieldConditions(mode, unit, unit.ability(), ids);
            for (var form : unit.forms()) {
                validateStartCondition(mode, unit, form.startCondition(), ids);
                validateAbilityFieldConditions(mode, unit, form.ability(), ids);
            }
        }
    }

    private static void validateFieldConditionTraits(
            GameMode mode, List<FieldConditionDefinition> conditions, List<TraitDefinition> traits) {
        var traitIds = traits.stream()
                .map(trait -> TraitManager.normalizeTraitId(trait.id()))
                .collect(Collectors.toSet());
        for (var condition : conditions) {
            var references = new ArrayList<String>();
            references.addAll(condition.elementDamageMultipliers().keySet());
            references.addAll(condition.traitAttackSpeedBonus().keySet());
            references.addAll(condition.traitDefenseBonus().keySet());
            if (condition.periodicDamage() != null) {
                references.addAll(condition.periodicDamage().immuneTraits());
            }
            for (var trait : references) {
                if (!traitIds.contains(TraitManager.normalizeTraitId(trait))) {
                    throw new IllegalStateException("Field condition " + condition.id() + " references unknown trait "
                            + trait + " in mode " + mode);
                }
            }
        }
    }

    private static void validateStartCondition(
            GameMode mode, UnitDefinition unit, FieldConditionStart start, Set<String> ids) {
        if (start == null) {
            return;
        }
        requireFieldCondition(mode, unit, start.conditionId(), ids);
        if (start.durationSeconds() < 0) {
            throw new IllegalStateException("Unit " + unit.id() + " has a negative start condition duration");
        }
    }

    private static void validateAbilityFieldConditions(
            GameMode mode, UnitDefinition unit, AbilityDefinition ability, Set<String> ids) {
        if (ability == null) {
            return;
        }
        for (var modifier : ability.modifiers()) {
            if (modifier instanceof FieldConditionModifier fieldConditionModifier) {
                requireFieldCondition(mode, unit, fieldConditionModifier.conditionId(), ids);
                var durations = fieldConditionModifier.durationSeconds();
                if (durations == null
                        || durations.size() != 3
                        || durations.stream().anyMatch(value -> value == null || value < 0)) {
                    throw new IllegalStateException("Ability " + ability.name() + " of unit " + unit.id()
                            + " needs three non-negative field condition durations");
                }
            }
        }
    }

    private static void requireFieldCondition(GameMode mode, UnitDefinition unit, String conditionId, Set<String> ids) {
        if (!ids.contains(conditionId)) {
            throw new IllegalStateException(
                    "Unit " + unit.id() + " references unknown field condition " + conditionId + " in mode " + mode);
        }
    }

    public List<FieldConditionDefinition> getFieldConditions(GameMode mode) {
        return fieldConditionCache.computeIfAbsent(
                mode,
                key -> gameModeRegistry.getAvailableModes().contains(key)
                        ? loadFieldConditions(gameModeRegistry.getProvider(key).getFieldConditionsPath())
                        : List.of());
    }

    public ElementalAffinityConfig getAffinityConfig(GameMode mode) {
        return getElementalAffinity(mode).orElseGet(ElementalAffinityConfig::neutral);
    }

    public Optional<ElementalAffinityConfig> getElementalAffinity(GameMode mode) {
        return affinityCache.computeIfAbsent(mode, this::loadAffinityData);
    }

    private Optional<ElementalAffinityConfig> loadAffinityData(GameMode mode) {
        return gameModeRegistry.getProvider(mode).getAffinitiesPath().map(this::loadAffinities);
    }

    private ElementalAffinityConfig loadAffinities(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find affinity data at " + path);
            }
            var config = affinityLoader.load(inputStream);
            log.info("Loaded {} elemental affinities from {}", config.elements().size(), path);
            return config;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load affinity data: " + path, e);
        }
    }

    private Map<String, UnitDefinition> loadUnits(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find units at " + path);
            }
            var units = parseUnits(jsonMapper, jsonMapper.readTree(inputStream));
            units.forEach(DataLoader::validateUnitForms);
            var registry = new HashMap<String, UnitDefinition>();
            units.forEach(unit -> registry.put(unit.id(), unit));
            log.info("Loaded {} units from {}", registry.size(), path);
            return registry;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load unit data: " + path, e);
        }
    }

    public static List<UnitDefinition> parseUnits(JsonMapper jsonMapper, JsonNode root) {
        var units = new ArrayList<UnitDefinition>();
        for (var entry : root) {
            if (!entry.has(VARIANTS_FIELD)) {
                units.add(jsonMapper.treeToValue(entry, UnitDefinition.class));
                continue;
            }
            var templateNode = (ObjectNode) entry.deepCopy();
            var variantsNode = templateNode.remove(VARIANTS_FIELD);
            var template = jsonMapper.treeToValue(templateNode, UnitDefinition.class);
            List<UnitVariantDefinition> variants =
                    jsonMapper.convertValue(variantsNode, new TypeReference<List<UnitVariantDefinition>>() {});
            units.addAll(expandVariants(template, variants));
        }
        var ids = new HashSet<String>();
        for (var unit : units) {
            if (!ids.add(unit.id())) {
                throw new IllegalStateException("Duplicate unit id " + unit.id());
            }
        }
        return List.copyOf(units);
    }

    public static List<UnitDefinition> expandVariants(UnitDefinition template, List<UnitVariantDefinition> variants) {
        if (variants == null || variants.isEmpty()) {
            throw invalidVariants(template, "variants must not be empty");
        }
        if (!template.forms().isEmpty()) {
            throw invalidVariants(template, "a variant template cannot also declare forms");
        }
        return variants.stream()
                .map(variant -> {
                    if (isBlank(variant.id()) || isBlank(variant.name())) {
                        throw invalidVariants(template, "every variant needs an id and a name");
                    }
                    if (variant.traits() == null || variant.traits().isEmpty()) {
                        throw invalidVariants(template, "variant " + variant.id() + " needs traits");
                    }
                    if (variant.resolvedShopWeight() <= 0) {
                        throw invalidVariants(template, "variant " + variant.id() + " needs a positive shopWeight");
                    }
                    return template.asVariant(
                            variant.id(),
                            variant.name(),
                            variant.traits(),
                            variant.ability() != null ? variant.ability() : template.ability(),
                            variant.resolvedShopWeight(),
                            variant.resolvedWildcardTrait());
                })
                .toList();
    }

    private static IllegalStateException invalidVariants(UnitDefinition template, String reason) {
        return new IllegalStateException("Invalid variants for unit " + template.id() + ": " + reason);
    }

    private static void validateTraitReferences(
            GameMode mode, Collection<UnitDefinition> units, List<TraitDefinition> traits) {
        var traitIds = traits.stream()
                .map(trait -> TraitManager.normalizeTraitId(trait.id()))
                .collect(Collectors.toSet());
        for (var unit : units) {
            var references = new ArrayList<>(unit.traits() == null ? List.<String>of() : unit.traits());
            unit.forms().stream()
                    .filter(form -> form.traits() != null)
                    .forEach(form -> references.addAll(form.traits()));
            for (var trait : references) {
                if (!traitIds.contains(TraitManager.normalizeTraitId(trait))) {
                    throw new IllegalStateException(
                            "Unit " + unit.id() + " references unknown trait " + trait + " in mode " + mode);
                }
            }
        }
    }

    public static void validateUnitForms(UnitDefinition unit) {
        var forms = unit.forms();
        var formKeys = new HashSet<String>();
        for (var form : forms) {
            if (!formKeys.add(form.starLevel() + ":" + form.branchId())) {
                throw invalidForms(unit, "duplicate form for star " + form.starLevel() + branchLabel(form.branchId()));
            }
            if (form.branchId() != null && (isBlank(form.definitionId()) || isBlank(form.name()))) {
                throw invalidForms(
                        unit,
                        "branched form at star " + form.starLevel() + branchLabel(form.branchId())
                                + " needs its own definitionId and name");
            }
            validateFormStats(unit, form.branchId(), "maxHealth", form.maxHealth());
            validateFormStats(unit, form.branchId(), "maxMana", form.maxMana());
            validateFormStats(unit, form.branchId(), "attackDamage", form.attackDamage());
            validateFormStats(unit, form.branchId(), "defense", form.defense());
            validateFormStats(unit, form.branchId(), "attackSpeed", form.attackSpeed());
        }

        var branchPoint = unit.branchPoint();
        if (branchPoint < 0) {
            return;
        }
        if (branchPoint < 2) {
            throw invalidForms(unit, "branch point must be at least 2 stars but is " + branchPoint);
        }
        var declaredBranches = unit.branchIdsAt(branchPoint);
        if (declaredBranches.size() < 2) {
            throw invalidForms(unit, "branch point " + branchPoint + " needs at least 2 distinct branches");
        }
        for (var form : forms) {
            if (form.branchId() == null && form.starLevel() >= branchPoint) {
                throw invalidForms(
                        unit,
                        "unbranched form at star " + form.starLevel() + " is at or above branch point " + branchPoint);
            }
            if (form.branchId() != null && !declaredBranches.contains(form.branchId())) {
                throw invalidForms(
                        unit,
                        "branch '" + form.branchId() + "' at star " + form.starLevel()
                                + " is not declared at branch point " + branchPoint);
            }
        }
    }

    private static void validateFormStats(UnitDefinition unit, String branchId, String stat, List<?> values) {
        if (values != null && values.size() != 3) {
            throw invalidForms(unit, stat + branchLabel(branchId) + " must contain exactly three star-level values");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String branchLabel(String branchId) {
        return branchId == null ? "" : " (branch '" + branchId + "')";
    }

    private static IllegalStateException invalidForms(UnitDefinition unit, String reason) {
        return new IllegalStateException("Invalid forms for unit " + unit.id() + ": " + reason);
    }

    private List<TraitDefinition> loadTraits(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find traits at " + path);
            }
            List<TraitDefinition> traits = jsonMapper.readValue(inputStream, new TypeReference<>() {});
            var ids = new HashSet<String>();
            for (var trait : traits) {
                trait.validate();
                if (!ids.add(TraitManager.normalizeTraitId(trait.id()))) {
                    throw new IllegalStateException("Duplicate trait id " + trait.id());
                }
            }
            log.info("Loaded {} traits from {}", traits.size(), path);
            return List.copyOf(traits);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load trait data: " + path, e);
        }
    }

    private List<AugmentDefinition> loadAugments(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find augments at " + path);
            }
            var augments = jsonMapper.readValue(inputStream, new TypeReference<List<AugmentDefinition>>() {});
            log.info("Loaded {} augments from {}", augments.size(), path);
            return augments;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load augment data: " + path, e);
        }
    }

    private List<ItemDefinition> loadItems(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find items at " + path);
            }
            List<ItemDefinition> items = jsonMapper.readValue(inputStream, new TypeReference<>() {});
            var ids = new HashSet<String>();
            for (var item : items) {
                if (!isValidItem(item) || !ids.add(item.id())) {
                    throw new IllegalStateException("Invalid item definition " + item.id() + " in " + path);
                }
                validateItemEffects(item);
            }
            return List.copyOf(items);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load item data: " + path, e);
        }
    }

    private static boolean isValidItem(ItemDefinition item) {
        return item.id() != null
                && !item.id().isBlank()
                && item.name() != null
                && !item.name().isBlank()
                && item.icon() != null
                && !item.icon().isBlank()
                && item.statBonuses() != null
                && !item.statBonuses().isEmpty()
                && item.statBonuses().values().stream().allMatch(value -> value != null && value > 0);
    }

    public static void validateItemEffects(ItemDefinition item) {
        for (var effect : item.effects()) {
            if (effect == null || effect.type() == null) {
                throw invalidItemEffect(item, "effect type is missing");
            }
            var parameters = effect.type().parameters();
            var expectedNames =
                    parameters.stream().map(ItemEffectType.Parameter::name).collect(Collectors.toSet());
            if (!expectedNames.equals(effect.values().keySet())) {
                throw invalidItemEffect(
                        item,
                        effect.type() + " expects parameters " + expectedNames + " but got "
                                + effect.values().keySet());
            }
            for (var parameter : parameters) {
                if (!parameter.accepts(effect.values().get(parameter.name()))) {
                    throw invalidItemEffect(
                            item,
                            effect.type() + " parameter " + parameter.name() + " must be "
                                    + (parameter.wholeNumber() ? "a whole number " : "")
                                    + "greater than 0 and at most " + parameter.max());
                }
            }
        }
    }

    private static IllegalStateException invalidItemEffect(ItemDefinition item, String reason) {
        return new IllegalStateException("Invalid effect on item " + item.id() + ": " + reason);
    }

    public List<MatchRuleDefinition> getMatchRules(GameMode mode) {
        return matchRuleCache.computeIfAbsent(mode, this::loadMatchRulesForMode);
    }

    private List<MatchRuleDefinition> loadMatchRulesForMode(GameMode mode) {
        var rules = new ArrayList<>(loadMatchRules(COMMON_MATCH_RULES_PATH, true));
        var provider = gameModeRegistry.getProvider(mode);
        rules.addAll(loadMatchRules(provider == null ? null : provider.getMatchRulesPath(), false));
        var ids = new HashSet<String>();
        rules.forEach(rule -> {
            if (!ids.add(rule.id())) {
                throw new IllegalStateException("Duplicate match rule id " + rule.id() + " for mode " + mode);
            }
            if (rule.effectType() == MatchRuleEffectType.RANDOM_FIELD_CONDITION) {
                validateFieldConditionRule(mode, rule);
            }
        });
        return List.copyOf(rules);
    }

    private void validateFieldConditionRule(GameMode mode, MatchRuleDefinition rule) {
        if (rule.value(0) < 0) {
            throw new IllegalStateException("Match rule " + rule.id() + " needs a non-negative duration");
        }
        if (getFieldConditions(mode).stream().noneMatch(FieldConditionDefinition::selectableByRule)) {
            throw new IllegalStateException(
                    "Match rule " + rule.id() + " needs a field condition selectable by rule in mode " + mode);
        }
    }

    private List<MatchRuleDefinition> loadMatchRules(String path, boolean required) {
        if (path == null) {
            return List.of();
        }
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                if (required) {
                    throw new IllegalStateException("Could not find match rules at " + path);
                }
                return List.of();
            }
            List<MatchRuleDefinition> rules = jsonMapper.readValue(inputStream, new TypeReference<>() {});
            var ids = new HashSet<String>();
            for (var rule : rules) {
                if (!isValidMatchRule(rule) || !ids.add(rule.id())) {
                    throw new IllegalStateException("Invalid match rule definition " + rule.id() + " in " + path);
                }
            }
            log.info("Loaded {} match rules from {}", rules.size(), path);
            return rules;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load match rule data: " + path, e);
        }
    }

    private static boolean isValidMatchRule(MatchRuleDefinition rule) {
        return rule.id() != null
                && !rule.id().isBlank()
                && !MatchRuleManager.RANDOM.equalsIgnoreCase(rule.id())
                && !MatchRuleManager.NONE.equalsIgnoreCase(rule.id())
                && rule.name() != null
                && !rule.name().isBlank()
                && rule.description() != null
                && !rule.description().isBlank()
                && rule.icon() != null
                && !rule.icon().isBlank()
                && rule.effectType() != null
                && rule.values() != null
                && !rule.values().isEmpty();
    }

    public UnitDefinition getUnitDefinition(GameMode mode, String id) {
        return getModeData(mode).unitRegistry().get(id);
    }

    public UnitDefinition findUnitDefinition(GameMode mode, String idOrLineIdOrName) {
        var direct = getUnitDefinition(mode, idOrLineIdOrName);
        if (direct != null) {
            return direct;
        }
        return getAllUnits(mode).stream()
                .filter(def ->
                        def.lineId().equals(idOrLineIdOrName) || def.name().equals(idOrLineIdOrName))
                .findFirst()
                .orElse(null);
    }

    public List<UnitDefinition> getAllUnits(GameMode mode) {
        return List.copyOf(getModeData(mode).unitRegistry().values());
    }

    public List<UnitDefinition> getVariants(GameMode mode, String variantGroup) {
        if (variantGroup == null) {
            return List.of();
        }
        return getAllUnits(mode).stream()
                .filter(unit -> variantGroup.equals(unit.variantGroup()))
                .sorted(Comparator.comparing(UnitDefinition::id))
                .toList();
    }

    public List<TraitDefinition> getTraitDefinitions(GameMode mode) {
        return getModeData(mode).traits();
    }

    public List<TraitMetadata> getTraitMetadata(GameMode mode) {
        return getTraitDefinitions(mode).stream().map(TraitDefinition::metadata).toList();
    }

    public List<AugmentDefinition> getAugments(GameMode mode) {
        return getModeData(mode).augments();
    }

    public List<ItemDefinition> getItems(GameMode mode) {
        return getModeData(mode).items();
    }

    public Optional<ItemDefinition> getItem(GameMode mode, String id) {
        return getItems(mode).stream().filter(item -> item.id().equals(id)).findFirst();
    }
}
