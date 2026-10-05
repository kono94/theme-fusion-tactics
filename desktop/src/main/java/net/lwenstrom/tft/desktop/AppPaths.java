package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;

record AppPaths(Path root) {
    AppPaths {
        root = root.toAbsolutePath().normalize();
    }

    static Path defaultRoot(String os, Map<String, String> environment, String userHome) {
        if (os.toLowerCase(Locale.ROOT).contains("win")) {
            return Path.of(
                    environment.getOrDefault(
                            "LOCALAPPDATA",
                            Path.of(userHome, "AppData", "Local").toString()),
                    "ThemeFusionTactics");
        }
        return Path.of(userHome, "Library", "Application Support", "ThemeFusionTactics");
    }

    Path database() {
        return root.resolve("data");
    }

    Path versions() {
        return root.resolve("versions");
    }

    Path logs() {
        return root.resolve("logs");
    }

    Path active() {
        return root.resolve("active.json");
    }

    Path pending() {
        return root.resolve("pending-update.json");
    }

    Path backup() {
        return root.resolve("update-backup");
    }

    Path ready() {
        return root.resolve("game-ready.json");
    }

    Path process() {
        return root.resolve("game-process.json");
    }

    Path instance() {
        return root.resolve("launcher-instance.json");
    }

    Path preferences() {
        return root.resolve("launcher.json");
    }

    void initialize() throws IOException {
        Files.createDirectories(database());
        Files.createDirectories(versions());
        Files.createDirectories(logs());
        var example = root.resolve("application.example.yaml");
        if (!Files.exists(example)) {
            try (var input = AppPaths.class.getResourceAsStream("/application.example.yaml")) {
                if (input == null) throw new IOException("Missing configuration example");
                Files.copy(input, example);
            }
        }
    }

    Path jar(ReleaseManifest manifest) {
        return versions().resolve(manifest.gameVersion()).resolve(manifest.jarAsset());
    }
}
