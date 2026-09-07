package net.lwenstrom.tft.backend.core;

import java.util.Optional;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.model.GameMode;

public interface GameModeProvider {
    GameMode getMode();

    String getUnitsPath();

    String getTraitsPath();

    default String getAugmentsPath() {
        return "/data/augments_" + getMode().getValue() + ".json";
    }

    default Optional<String> getAffinitiesPath() {
        return Optional.empty();
    }

    void registerTraitEffects(TraitManager traitManager);
}
