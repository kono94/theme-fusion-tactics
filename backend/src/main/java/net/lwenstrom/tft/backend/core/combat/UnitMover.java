package net.lwenstrom.tft.backend.core.combat;

import java.util.List;
import net.lwenstrom.tft.backend.core.model.GameUnit;

public interface UnitMover {

    void moveTowards(GameUnit mover, GameUnit target, List<GameUnit> allUnits);

    default void moveTowards(GameUnit mover, GameUnit target, List<GameUnit> allUnits, long currentTime) {
        moveTowards(mover, target, allUnits);
    }

    default void moveTowards(
            GameUnit mover, GameUnit target, List<GameUnit> allUnits, int desiredRange, long currentTime) {
        moveTowards(mover, target, allUnits, currentTime);
    }
}
