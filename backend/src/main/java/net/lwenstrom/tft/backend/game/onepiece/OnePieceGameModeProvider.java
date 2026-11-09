package net.lwenstrom.tft.backend.game.onepiece;

import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.springframework.stereotype.Component;

@Component
public class OnePieceGameModeProvider implements GameModeProvider {

    @Override
    public GameMode getMode() {
        return GameMode.ONEPIECE;
    }
}
