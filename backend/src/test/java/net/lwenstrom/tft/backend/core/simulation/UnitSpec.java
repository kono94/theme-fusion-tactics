package net.lwenstrom.tft.backend.core.simulation;

public record UnitSpec(String definitionId, int starLevel, int x, int y, String branchId) {

    public UnitSpec(String definitionId, int starLevel, int x, int y) {
        this(definitionId, starLevel, x, y, null);
    }
}
