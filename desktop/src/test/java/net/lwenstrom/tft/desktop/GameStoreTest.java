package net.lwenstrom.tft.desktop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GameStoreTest {
    @TempDir
    Path directory;

    private AppPaths paths;
    private GameStore store;
    private ReleaseManifest previous;

    @BeforeEach
    void setup() throws Exception {
        paths = new AppPaths(directory.resolve("User data ü with spaces"));
        paths.initialize();
        store = new GameStore(paths);
        previous = install("1.0.0", "previous game");
        JsonFiles.write(paths.active(), previous);
    }

    @Test
    void failedUpdateRestoresDatabaseSidecarsAndPreservesConfiguration() throws Exception {
        var configuration = paths.root().resolve("application.yaml");
        Files.writeString(configuration, "server:\n  port: 19300\n");
        Files.writeString(paths.database().resolve("analytics.db"), "original history");
        Files.writeString(paths.database().resolve("analytics.db-wal"), "original WAL");
        var next = install("1.1.0", "updated game");
        store.begin(next);
        Files.writeString(paths.database().resolve("analytics.db"), "migrated history");
        Files.writeString(paths.database().resolve("analytics.db-shm"), "new shared memory");

        assertTrue(new GameStore(paths).recover());

        assertEquals(previous, store.active());
        assertEquals("original history", Files.readString(paths.database().resolve("analytics.db")));
        assertEquals("original WAL", Files.readString(paths.database().resolve("analytics.db-wal")));
        assertFalse(Files.exists(paths.database().resolve("analytics.db-shm")));
        assertEquals("server:\n  port: 19300\n", Files.readString(configuration));
        assertFalse(store.recover());
    }

    @Test
    void successfulUpdateKeepsNewHistoryAndOldJar() throws Exception {
        var next = install("1.1.0", "updated game");
        store.begin(next);
        Files.writeString(paths.database().resolve("analytics.db"), "new history");
        store.commit();
        assertEquals(next, store.active());
        assertFalse(store.recover());
        assertTrue(Files.exists(paths.jar(previous)));
        assertEquals("new history", Files.readString(paths.database().resolve("analytics.db")));
    }

    @Test
    void checksumFailureCannotReplaceActiveGame() throws Exception {
        var next = manifest("1.1.0", "expected");
        assertThrows(IOException.class, () -> store.install(next, new ByteArrayInputStream("broken".getBytes())));
        assertEquals(previous, store.active());
        assertFalse(Files.exists(paths.jar(next)));
        try (var files = Files.list(paths.jar(next).getParent())) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void interruptedStreamRemovesPartialDownload() throws Exception {
        var next = manifest("1.1.0", "expected");
        var input = new java.io.InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("Disconnected");
            }
        };
        assertThrows(IOException.class, () -> store.install(next, input));
        assertFalse(Files.exists(paths.jar(next)));
        assertEquals(previous, store.active());
    }

    @Test
    void recoveryRemovesNewDatabaseIfNoneExistedBeforeUpdate() throws Exception {
        store.begin(install("1.1.0", "next"));
        Files.writeString(paths.database().resolve("analytics.db"), "first failed schema");
        store.recover();
        assertFalse(Files.exists(paths.database().resolve("analytics.db")));
    }

    @Test
    void startupDetectsModifiedInstalledJar() throws Exception {
        Files.writeString(paths.jar(previous), "corrupt");
        assertThrows(IOException.class, () -> store.verify(previous));
    }

    @Test
    void refusesToReplaceAnImmutableVersionWithDifferentContents() throws Exception {
        var changed = manifest("1.0.0", "different release");
        assertThrows(
                IOException.class,
                () -> store.install(changed, new ByteArrayInputStream("different release".getBytes())));
        store.verify(previous);
    }

    @Test
    void preferencesSurviveInitializationAndRecovery() throws Exception {
        var preferences = new Preferences(false, true);
        JsonFiles.write(paths.preferences(), preferences);
        paths.initialize();
        store.begin(install("1.1.0", "next"));
        store.recover();
        assertEquals(preferences, Preferences.load(paths));
    }

    private ReleaseManifest install(String version, String content) throws Exception {
        var manifest = manifest(version, content);
        store.install(manifest, new ByteArrayInputStream(content.getBytes()));
        return manifest;
    }

    private ReleaseManifest manifest(String version, String content) throws Exception {
        var temporary = Files.createTempFile(directory, "checksum", ".jar");
        Files.writeString(temporary, content);
        return new ReleaseManifest(version, 25, "1.0.0", "game.jar", GameStore.checksum(temporary), Map.of());
    }
}
