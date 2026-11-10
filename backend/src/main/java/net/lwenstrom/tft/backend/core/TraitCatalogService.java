package net.lwenstrom.tft.backend.core;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import net.lwenstrom.tft.backend.core.engine.ResolvedForm;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.TraitCatalogEntry;
import net.lwenstrom.tft.backend.core.model.TraitRosterUnit;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TraitCatalogService {

    private static final int MAX_STAR_LEVEL = 3;

    private final DataLoader dataLoader;

    public List<TraitCatalogEntry> getTraits(GameMode mode) {
        var unitDefinitions = dataLoader.getAllUnits(mode);
        return dataLoader.getTraitMetadata(mode).stream()
                .map(trait -> TraitCatalogEntry.from(trait, getRosterUnits(trait.id(), unitDefinitions)))
                .toList();
    }

    private List<TraitRosterUnit> getRosterUnits(String traitId, List<UnitDefinition> unitDefinitions) {
        var seenLines = new HashSet<String>();
        return unitDefinitions.stream()
                .sorted(Comparator.comparing(UnitDefinition::id))
                .map(unit -> getRosterUnit(traitId, unit))
                .flatMap(Optional::stream)
                .filter(rosterUnit -> seenLines.add(rosterUnit.lineId()))
                .sorted(Comparator.comparingInt(TraitRosterUnit::cost)
                        .thenComparingInt(TraitRosterUnit::starLevel)
                        .thenComparing(TraitRosterUnit::name))
                .toList();
    }

    private Optional<TraitRosterUnit> getRosterUnit(String traitId, UnitDefinition unit) {
        for (var starLevel = 1; starLevel <= MAX_STAR_LEVEL; starLevel++) {
            for (var branchId : unit.variantsAt(starLevel)) {
                var rosterUnit = rosterUnitWithTrait(traitId, unit, unit.formAt(starLevel, branchId));
                if (rosterUnit.isPresent()) {
                    return rosterUnit;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<TraitRosterUnit> rosterUnitWithTrait(String traitId, UnitDefinition unit, ResolvedForm form) {
        var hasTrait =
                form.traits().stream().map(TraitManager::normalizeTraitId).anyMatch(traitId::equals);
        if (!hasTrait) {
            return Optional.empty();
        }

        var ability = form.ability();
        return Optional.of(new TraitRosterUnit(
                unit.lineId(),
                unit.cost(),
                form.starLevel(),
                form.definitionId(),
                form.name(),
                form.role(),
                form.maxHealth(),
                form.maxMana(),
                form.attackDamage(),
                form.abilityPower(),
                form.defense(),
                form.attackSpeed(),
                form.range(),
                form.traits(),
                ability,
                ability != null ? ability.getFormattedDescription(form.starLevel()) : ""));
    }
}
