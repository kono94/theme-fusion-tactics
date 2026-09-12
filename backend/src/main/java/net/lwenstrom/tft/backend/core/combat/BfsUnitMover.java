package net.lwenstrom.tft.backend.core.combat;

import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import net.lwenstrom.tft.backend.core.engine.Grid;
import net.lwenstrom.tft.backend.core.model.GameUnit;
import net.lwenstrom.tft.backend.core.time.Clock;
import org.springframework.stereotype.Component;

@Component
public class BfsUnitMover implements UnitMover {

    private final Clock clock;

    public BfsUnitMover(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void moveTowards(GameUnit mover, GameUnit target, List<GameUnit> allUnits) {
        moveTowards(mover, target, allUnits, clock.currentTimeMillis());
    }

    @Override
    public void moveTowards(GameUnit mover, GameUnit target, List<GameUnit> allUnits, long currentTime) {
        moveTowards(mover, target, allUnits, mover.getRange(), currentTime);
    }

    @Override
    public void moveTowards(
            GameUnit mover, GameUnit target, List<GameUnit> allUnits, int desiredRange, long currentTime) {
        if (currentTime < mover.getNextMoveTime()) {
            return;
        }

        var nextStep = findNextStep(mover, List.of(target), allUnits, desiredRange);
        if (nextStep == null && CombatUtils.getDistance(mover, target) > desiredRange) {
            var enemies = allUnits.stream()
                    .filter(unit -> unit.getCurrentHealth() > 0 && CombatUtils.isEnemy(mover, unit))
                    .toList();
            nextStep = findNextStep(mover, enemies, allUnits, desiredRange);
        }

        if (nextStep != null) {
            mover.setPosition(nextStep.x(), nextStep.y());
            mover.setNextMoveTime(currentTime + 800);
        }
    }

    private Point findNextStep(GameUnit start, List<GameUnit> targets, List<GameUnit> allUnits, int desiredRange) {
        int rows = Grid.COMBAT_ROWS;
        int cols = Grid.COLS;

        var occupied = new boolean[rows][cols];
        allUnits.stream()
                .filter(unit -> unit.getCurrentHealth() > 0 && unit != start)
                .filter(unit -> unit.getX() >= 0 && unit.getX() < cols && unit.getY() >= 0 && unit.getY() < rows)
                .forEach(unit -> occupied[unit.getY()][unit.getX()] = true);

        var queue = new ArrayDeque<Point>();
        var parent = new HashMap<Point, Point>();
        var visited = new HashSet<Point>();

        var startPt = new Point(start.getX(), start.getY());
        queue.add(startPt);
        visited.add(startPt);

        Point foundDest = null;

        while (!queue.isEmpty()) {
            var current = queue.poll();

            var inRange = targets.stream()
                    .anyMatch(target ->
                            Math.max(Math.abs(current.x() - target.getX()), Math.abs(current.y() - target.getY()))
                                    <= desiredRange);
            if (inRange) {
                if (current.equals(startPt) || !occupied[current.y()][current.x()]) {
                    foundDest = current;
                    break;
                }
            }

            int[] dx = {0, 0, 1, -1};
            int[] dy = {1, -1, 0, 0};

            for (int i = 0; i < 4; i++) {
                int nx = current.x() + dx[i];
                int ny = current.y() + dy[i];

                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    if (!occupied[ny][nx]) {
                        var next = new Point(nx, ny);
                        if (!visited.contains(next)) {
                            visited.add(next);
                            parent.put(next, current);
                            queue.add(next);
                        }
                    }
                }
            }
        }

        if (foundDest != null) {
            var curr = foundDest;
            while (curr != null && parent.containsKey(curr) && !parent.get(curr).equals(startPt)) {
                curr = parent.get(curr);
            }
            if (curr.equals(startPt)) return null;
            return curr;
        }

        return null;
    }

    private record Point(int x, int y) {}
}
