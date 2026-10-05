package net.lwenstrom.tft.backend.standalone;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import net.lwenstrom.tft.backend.core.engine.GameEngine;
import net.lwenstrom.tft.backend.core.model.GamePhase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

@RestController
@Profile("standalone")
public class StandaloneController {
    private final GameEngine gameEngine;
    private final JsonMapper jsonMapper;
    private final String gameVersion;
    private final String launchId;
    private final String readyFile;
    private volatile int port;

    public StandaloneController(
            GameEngine gameEngine,
            JsonMapper jsonMapper,
            @Value("${standalone.game-version:dev}") String gameVersion,
            @Value("${standalone.launch-id:}") String launchId,
            @Value("${standalone.ready-file:}") String readyFile) {
        this.gameEngine = gameEngine;
        this.jsonMapper = jsonMapper;
        this.gameVersion = gameVersion;
        this.launchId = launchId;
        this.readyFile = readyFile;
    }

    @GetMapping("/api/standalone/status")
    public Status status() {
        var activeMatch = gameEngine.getActiveRooms().stream().anyMatch(room -> {
            var phase = room.getState().phase();
            return phase == GamePhase.PLANNING || phase == GamePhase.COMBAT || phase == GamePhase.END_CELEBRATION;
        });
        return new Status(gameVersion, launchId, port, activeMatch);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ready(ApplicationReadyEvent event) throws IOException {
        if (event.getApplicationContext() instanceof WebServerApplicationContext context) {
            port = context.getWebServer().getPort();
        }
        if (!readyFile.isBlank()) {
            var destination = Path.of(readyFile);
            Files.createDirectories(destination.getParent());
            var temporary = Files.createTempFile(destination.getParent(), "ready-", ".json");
            Files.writeString(temporary, jsonMapper.writeValueAsString(status()));
            Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public record Status(String gameVersion, String launchId, int port, boolean activeMatch) {}
}
