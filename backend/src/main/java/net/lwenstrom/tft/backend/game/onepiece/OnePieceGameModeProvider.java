package net.lwenstrom.tft.backend.game.onepiece;

import lombok.RequiredArgsConstructor;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.engine.JsonTraitLoader;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class OnePieceGameModeProvider implements GameModeProvider {

    private final JsonMapper jsonMapper;

    @Override
    public GameMode getMode() {
        return GameMode.ONEPIECE;
    }

    @Override
    public String getUnitsPath() {
        return "/data/units_onepiece.json";
    }

    @Override
    public String getTraitsPath() {
        return "/data/traits_onepiece.json";
    }

    @Override
    public String getAugmentsPath() {
        return "/data/augments_onepiece.json";
    }

    @Override
    public void registerTraitEffects(TraitManager traitManager) {
        JsonTraitLoader.load(getTraitsPath(), traitManager, jsonMapper);
    }
}
