package net.lwenstrom.tft.backend.core;

import java.util.Optional;
import net.lwenstrom.tft.backend.core.model.GameMode;

public interface GameModeProvider {
    GameMode getMode();

    default String getUnitsPath() {
        return dataPath("units");
    }

    default String getTraitsPath() {
        return dataPath("traits");
    }

    default String getAugmentsPath() {
        return dataPath("augments");
    }

    default String getItemsPath() {
        return dataPath("items");
    }

    default String getMatchRulesPath() {
        return dataPath("match_rules");
    }

    default String getFieldConditionsPath() {
        return dataPath("field_conditions");
    }

    default Optional<String> getAffinitiesPath() {
        return Optional.empty();
    }

    private String dataPath(String kind) {
        return "/data/" + kind + "_" + getMode().getValue() + ".json";
    }
}
