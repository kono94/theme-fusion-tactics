package net.lwenstrom.tft.backend.game.pokemongen23;

import java.util.Optional;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;

@Component
public class PokemonGen23GameModeProvider implements GameModeProvider {

    @Override
    public GameMode getMode() {
        return GameMode.POKEMON_GEN23;
    }

    @Override
    public Optional<String> getAffinitiesPath() {
        return Optional.of("/data/affinities_pokemongen23.json");
    }
}
