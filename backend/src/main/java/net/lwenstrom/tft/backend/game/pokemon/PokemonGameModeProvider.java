package net.lwenstrom.tft.backend.game.pokemon;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class PokemonGameModeProvider implements GameModeProvider {
    private final JsonMapper jsonMapper;

    @Override
    public GameMode getMode() {
        return GameMode.POKEMON;
    }

    @Override
    public String getUnitsPath() {
        return "/data/units_pokemon.json";
    }

    @Override
    public String getTraitsPath() {
        return "/data/traits_pokemon.json";
    }

    @Override
    public String getAugmentsPath() {
        return "/data/augments_pokemon.json";
    }

    @Override
    public Optional<String> getAffinitiesPath() {
        return Optional.of("/data/affinities_pokemon.json");
    }

    @Override
    public void registerTraitEffects(TraitManager traitManager) {
        PokemonTraitLoader.load(traitManager, jsonMapper);
    }
}
