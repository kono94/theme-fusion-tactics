package net.lwenstrom.tft.backend.game;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.json.JsonMapper;

class ModeDataInvariantsTest {
    private static final Path UNIT_ASSETS = Path.of("..", "frontend", "public", "assets", "units");
    private static final DataLoader DATA_LOADER = new DataLoader(
            new GameModeRegistry(TestHelpers.allModeProviders()),
            JsonMapper.builder().build());

    @ParameterizedTest
    @EnumSource(GameMode.class)
    void unitAndFormTraitsReferenceDefinedTraits(GameMode mode) {
        var traitIds = DATA_LOADER.getTraitDefinitions(mode).stream()
                .map(trait -> TraitManager.normalizeTraitId(trait.id()))
                .collect(Collectors.toSet());

        for (var unit : DATA_LOADER.getAllUnits(mode)) {
            possibleTraits(unit)
                    .forEach(trait -> assertTrue(
                            traitIds.contains(TraitManager.normalizeTraitId(trait)),
                            unit.id() + " references unknown trait " + trait));
        }
    }

    @ParameterizedTest
    @EnumSource(GameMode.class)
    void everyTraitTopBreakpointIsReachableByDistinctLines(GameMode mode) {
        var linesByTrait = new HashMap<String, Set<String>>();
        for (var unit : DATA_LOADER.getAllUnits(mode)) {
            possibleTraits(unit)
                    .forEach(trait -> linesByTrait
                            .computeIfAbsent(TraitManager.normalizeTraitId(trait), ignored -> new HashSet<>())
                            .add(unit.lineId()));
        }

        for (var trait : DATA_LOADER.getTraitDefinitions(mode)) {
            var topBreakpoint = trait.effects().getLast().minUnits();
            var lines = linesByTrait.getOrDefault(trait.id(), Set.of()).size();
            assertTrue(
                    topBreakpoint <= lines,
                    trait.name() + " top breakpoint " + topBreakpoint + " exceeds " + lines + " possible lines");
        }
    }

    // One Piece deliberately keeps some short-reach damage abilities on ranged units (e.g. Prometheus).
    @ParameterizedTest
    @EnumSource(
            value = GameMode.class,
            names = {"POKEMON", "POKEMON_GEN23"})
    void damageAbilitiesReachTheirActiveAttackRange(GameMode mode) {
        for (var unit : DATA_LOADER.getAllUnits(mode)) {
            for (var star = 1; star <= 3; star++) {
                for (var branchId : unit.variantsAt(star)) {
                    var form = unit.formAt(star, branchId);
                    var ability = form.ability();
                    if (ability != null && ability.type() == AbilityType.DAMAGE) {
                        assertTrue(
                                ability.getRangeForLevel(star) >= form.range(),
                                unit.id() + "/" + branchId + " " + star + "-star damage ability must reach its range");
                    }
                }
            }
        }
    }

    @Test
    void definitionIdsAreUniqueAcrossAllModes() {
        var owners = new HashMap<String, String>();
        for (var mode : GameMode.values()) {
            for (var unit : DATA_LOADER.getAllUnits(mode)) {
                var owner = mode.getValue() + "/" + unit.lineId();
                definitionIds(unit).forEach(id -> {
                    var previous = owners.putIfAbsent(id, owner);
                    assertTrue(
                            previous == null || previous.equals(owner),
                            id + " is used by " + previous + " and " + owner);
                });
            }
        }
    }

    @ParameterizedTest
    @EnumSource(GameMode.class)
    void everyDefinitionIdHasAUnitPortrait(GameMode mode) {
        var folder = UNIT_ASSETS.resolve(mode.getValue());
        assumeTrue(Files.isDirectory(UNIT_ASSETS), "Frontend unit assets are not available next to the backend");

        var missing = new TreeSet<String>();
        for (var unit : DATA_LOADER.getAllUnits(mode)) {
            definitionIds(unit).stream()
                    .filter(id -> !Files.isRegularFile(folder.resolve(id + ".png")))
                    .forEach(missing::add);
        }
        assertTrue(missing.isEmpty(), "Missing portraits in " + folder + ": " + missing);
    }

    private static List<String> possibleTraits(UnitDefinition unit) {
        var traits = new ArrayList<>(unit.traits());
        unit.forms().stream().filter(form -> form.traits() != null).forEach(form -> traits.addAll(form.traits()));
        return traits;
    }

    private static Set<String> definitionIds(UnitDefinition unit) {
        var ids = new HashSet<String>();
        ids.add(unit.id());
        unit.forms().stream().filter(form -> form.definitionId() != null).forEach(form -> ids.add(form.definitionId()));
        return ids;
    }
}
