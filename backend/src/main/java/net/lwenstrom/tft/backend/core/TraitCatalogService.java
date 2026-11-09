package net.lwenstrom.tft.backend.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
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
        return unitDefinitions.stream()
                .map(unit -> getRosterUnit(traitId, unit))
                .flatMap(Optional::stream)
                .sorted(Comparator.comparingInt(TraitRosterUnit::cost)
                        .thenComparingInt(TraitRosterUnit::starLevel)
                        .thenComparing(TraitRosterUnit::name))
                .toList();
    }

    private Optional<TraitRosterUnit> getRosterUnit(String traitId, UnitDefinition unit) {
        var branchPoint = unit.branchPoint();
        var branchIds = branchPoint > 0 ? unit.branchIdsAt(branchPoint) : List.<String>of();
        for (var starLevel = 1; starLevel <= MAX_STAR_LEVEL; starLevel++) {
            var candidates = new ArrayList<String>();
            if (!unit.isPending(starLevel, null)) {
                candidates.add(null);
            }
            if (branchPoint > 0 && starLevel >= branchPoint) {
                candidates.addAll(branchIds);
            }
            for (var branchId : candidates) {
                var rosterUnit = rosterUnitWithTrait(traitId, unit, starLevel, branchId);
                if (rosterUnit.isPresent()) {
                    return rosterUnit;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<TraitRosterUnit> rosterUnitWithTrait(
            String traitId, UnitDefinition unit, int starLevel, String branchId) {
        var traits = unit.getTraits(starLevel, branchId);
        var hasTrait = traits.stream().map(TraitManager::normalizeTraitId).anyMatch(traitId::equals);
        if (!hasTrait) {
            return Optional.empty();
        }

        var ability = unit.getAbility(starLevel, branchId);
        return Optional.of(new TraitRosterUnit(
                unit.lineId(),
                unit.cost(),
                starLevel,
                unit.getDefinitionId(starLevel, branchId),
                unit.getName(starLevel, branchId),
                unit.getRole(starLevel, branchId),
                unit.getMaxHealth(starLevel, branchId),
                unit.getMaxMana(starLevel, branchId),
                unit.getAttackDamage(starLevel, branchId),
                unit.getAbilityPower(starLevel),
                unit.getDefense(starLevel, branchId),
                unit.getAttackSpeed(starLevel, branchId),
                unit.getActiveRange(starLevel, branchId),
                traits,
                ability,
                ability != null ? ability.getFormattedDescription(starLevel) : ""));
    }
}
