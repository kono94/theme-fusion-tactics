package net.lwenstrom.tft.backend.core;

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
        for (var starLevel = 1; starLevel <= MAX_STAR_LEVEL; starLevel++) {
            var traits = unit.getTraits(starLevel);
            var hasTrait = traits.stream().map(TraitManager::normalizeTraitId).anyMatch(traitId::equals);
            if (!hasTrait) {
                continue;
            }

            var ability = unit.getAbility(starLevel);
            return Optional.of(new TraitRosterUnit(
                    unit.lineId(),
                    unit.cost(),
                    starLevel,
                    unit.getDefinitionId(starLevel),
                    unit.getName(starLevel),
                    unit.getRole(starLevel),
                    unit.getMaxHealth(starLevel),
                    unit.getMaxMana(starLevel),
                    unit.getAttackDamage(starLevel),
                    unit.getAbilityPower(starLevel),
                    unit.getDefense(starLevel),
                    unit.getAttackSpeed(starLevel),
                    unit.getActiveRange(starLevel),
                    traits,
                    ability,
                    ability != null ? ability.getFormattedDescription(starLevel) : ""));
        }
        return Optional.empty();
    }
}
