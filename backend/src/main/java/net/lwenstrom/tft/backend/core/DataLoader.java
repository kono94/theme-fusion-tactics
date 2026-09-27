package net.lwenstrom.tft.backend.core;

import jakarta.annotation.PostConstruct;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityConfig;
import net.lwenstrom.tft.backend.core.combat.ElementalAffinityLoader;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AugmentDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import net.lwenstrom.tft.backend.core.model.TraitMetadata;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

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
            List<TraitMetadata> traitMetadata,
            List<AugmentDefinition> augments,
            List<ItemDefinition> items) {}

    private final Map<GameMode, ModeData> modeDataCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadData() {
        gameModeRegistry.getAvailableModes().forEach(mode -> {
            getModeData(mode);
            getElementalAffinity(mode);
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
        return new ModeData(units, traits, augments, items);
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
            List<UnitDefinition> units = jsonMapper.readValue(inputStream, new TypeReference<>() {});
            var registry = units.stream().collect(Collectors.toMap(UnitDefinition::id, unit -> unit));
            log.info("Loaded {} units from {}", registry.size(), path);
            return registry;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load unit data: " + path, e);
        }
    }

    private List<TraitMetadata> loadTraits(String path) {
        try (var inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IllegalStateException("Could not find traits at " + path);
            }
            var metadata = jsonMapper.readValue(inputStream, new TypeReference<List<TraitMetadata>>() {});
            log.info("Loaded {} traits from {}", metadata.size(), path);
            return metadata;
        } catch (Exception e) {
            throw new RuntimeException("Failed to load trait data: " + path, e);
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

    public List<TraitMetadata> getTraitMetadata(GameMode mode) {
        return getModeData(mode).traitMetadata();
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
