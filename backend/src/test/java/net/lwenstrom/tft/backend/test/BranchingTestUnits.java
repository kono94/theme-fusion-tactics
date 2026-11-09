package net.lwenstrom.tft.backend.test;

import java.io.IOException;
import java.util.List;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

public final class BranchingTestUnits {
    public static final String PATH = "/units/branching_units.json";

    private BranchingTestUnits() {}

    public static List<UnitDefinition> load() {
        try (var inputStream = BranchingTestUnits.class.getResourceAsStream(PATH)) {
            return JsonMapper.builder().build().readValue(inputStream, new TypeReference<List<UnitDefinition>>() {});
        } catch (IOException e) {
            throw new IllegalStateException("Could not load " + PATH, e);
        }
    }

    public static UnitDefinition byId(String id) {
        return load().stream().filter(unit -> unit.id().equals(id)).findFirst().orElseThrow();
    }
}
