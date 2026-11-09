package net.lwenstrom.tft.backend.core.simulation;

import java.util.List;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeProvider;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.test.TestHelpers;
import tools.jackson.databind.json.JsonMapper;

final class SimulationTestSupport {

    private SimulationTestSupport() {}

    static Fixture createFixture() {
        var jsonMapper = JsonMapper.builder().build();
        List<GameModeProvider> providers = TestHelpers.allModeProviders();
        var registry = new GameModeRegistry(providers);
        var dataLoader = new DataLoader(registry, jsonMapper);
        dataLoader.loadData();
        return new Fixture(registry, dataLoader, new CombatSimulator(dataLoader));
    }

    record Fixture(GameModeRegistry registry, DataLoader dataLoader, CombatSimulator simulator) {}
}
