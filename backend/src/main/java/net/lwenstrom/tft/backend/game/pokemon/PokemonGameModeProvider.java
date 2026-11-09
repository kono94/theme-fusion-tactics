package net.lwenstrom.tft.backend.game.pokemon;

import java.util.Optional;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;

@Component
public class PokemonGameModeProvider implements GameModeProvider {

    @Override
    public GameMode getMode() {
        return GameMode.POKEMON;
    }

    @Override
    public Optional<String> getAffinitiesPath() {
        return Optional.of("/data/affinities_pokemon.json");
    }
}
