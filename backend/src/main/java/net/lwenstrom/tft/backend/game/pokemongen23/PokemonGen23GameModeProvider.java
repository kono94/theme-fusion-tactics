package net.lwenstrom.tft.backend.game.pokemongen23;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.engine.JsonTraitLoader;
import net.lwenstrom.tft.backend.core.engine.TraitManager;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class PokemonGen23GameModeProvider implements GameModeProvider {
    private final JsonMapper jsonMapper;

    @Override
    public GameMode getMode() {
        return GameMode.POKEMON_GEN23;
    }

    @Override
    public String getUnitsPath() {
        return "/data/units_pokemongen23.json";
    }

    @Override
    public String getTraitsPath() {
        return "/data/traits_pokemongen23.json";
    }

    @Override
    public String getAugmentsPath() {
        return "/data/augments_pokemongen23.json";
    }

    @Override
    public Optional<String> getAffinitiesPath() {
        return Optional.of("/data/affinities_pokemongen23.json");
    }

    @Override
    public void registerTraitEffects(TraitManager traitManager) {
        JsonTraitLoader.load(getTraitsPath(), traitManager, jsonMapper);
    }
}
