package net.lwenstrom.tft.backend.standalone;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.model.GameMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "standalone.game-version=1.2.3",
            "standalone.launch-id=test-launch",
            "spring.datasource.url=jdbc:sqlite:file:standalone-context?mode=memory&cache=shared&foreign_keys=on"
        })
@ActiveProfiles("standalone")
class StandaloneControllerTest {
    @TempDir
    static Path directory;

    @Autowired
    private StandaloneController controller;

    @Autowired
    private GameEngine engine;

    @Autowired
    private JsonMapper mapper;

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add(
                "standalone.ready-file", () -> directory.resolve("ready.json").toString());
    }

    @Test
    void readyFileIdentifiesTheActualServerAndTracksActiveMatches() throws Exception {
        var status =
                mapper.readValue(Files.readString(directory.resolve("ready.json")), StandaloneController.Status.class);
        assertThat(status.gameVersion()).isEqualTo("1.2.3");
        assertThat(status.launchId()).isEqualTo("test-launch");
        assertThat(status.port()).isEqualTo(port);
        assertThat(status.activeMatch()).isFalse();
        var room = engine.createRoom("standalone-test");
        room.addPlayer("tester");
        room.setGameMode(GameMode.POKEMON);
        room.startMatch();
        assertThat(controller.status().activeMatch()).isTrue();
    }
}
