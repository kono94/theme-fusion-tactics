package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import tools.jackson.databind.json.JsonMapper;

final class JsonFiles {
    static final JsonMapper MAPPER = JsonMapper.builder().build();

    private JsonFiles() {}

    static <T> T read(Path path, Class<T> type) throws IOException {
        return MAPPER.readValue(Files.readString(path), type);
    }

    static void write(Path path, Object value) throws IOException {
        Files.createDirectories(path.getParent());
        var temporary = Files.createTempFile(path.getParent(), ".write-", ".json");
        try {
            Files.writeString(temporary, MAPPER.writeValueAsString(value));
            Files.move(temporary, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
