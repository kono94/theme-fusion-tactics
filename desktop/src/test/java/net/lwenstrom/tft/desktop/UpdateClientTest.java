package net.lwenstrom.tft.desktop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class UpdateClientTest {
    @TempDir
    Path directory;

    private HttpServer server;
    private URI base;
    private byte[] content = "downloaded game".getBytes();
    private int responseCode = 200;
    private boolean prerelease;
    private String manifestVersion = "1.1.0";
    private int requiredJava = 25;
    private volatile int checks;
    private volatile int downloads;

    @BeforeEach
    void setup() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        base = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
        var checksumFile = directory.resolve("reference.jar");
        Files.write(checksumFile, content);
        var checksum = GameStore.checksum(checksumFile);
        server.createContext("/latest", exchange -> {
            checks++;
            var json = JsonFiles.MAPPER.writeValueAsBytes(Map.of(
                    "tag_name",
                    "v1.1.0",
                    "draft",
                    false,
                    "prerelease",
                    prerelease,
                    "html_url",
                    base + "/release",
                    "assets",
                    new Object[] {
                        Map.of("name", "tft-update.json", "browser_download_url", base + "/manifest"),
                        Map.of("name", "game.jar", "browser_download_url", base + "/game")
                    }));
            exchange.sendResponseHeaders(responseCode, json.length);
            exchange.getResponseBody().write(json);
            exchange.close();
        });
        server.createContext("/manifest", exchange -> {
            var json = JsonFiles.MAPPER.writeValueAsBytes(
                    new ReleaseManifest(manifestVersion, requiredJava, "1.0.0", "game.jar", checksum, Map.of()));
            exchange.sendResponseHeaders(200, json.length);
            exchange.getResponseBody().write(json);
            exchange.close();
        });
        server.createContext("/game", exchange -> {
            downloads++;
            exchange.sendResponseHeaders(200, content.length);
            exchange.getResponseBody().write(content);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void disabledChecksDoNotContactTheReleaseServer() throws Exception {
        var paths = new AppPaths(directory.resolve("disabled"));
        paths.initialize();
        var dialogs = new TestDialogs(false);
        var result = new UpdateCoordinator(new UpdateClient(base.resolve("/latest")))
                .select("1.0.0", new Preferences(false, true), new GameStore(paths), dialogs, ignored -> {});
        assertTrue(result.isEmpty());
        assertEquals(0, checks);
        assertEquals(0, downloads);
        assertEquals(0, dialogs.prompts);
    }

    @Test
    void decliningUpdateDoesNotDownloadOrActivateAnything() throws Exception {
        var paths = new AppPaths(directory.resolve("declined"));
        paths.initialize();
        var dialogs = new TestDialogs(false);
        var result = new UpdateCoordinator(new UpdateClient(base.resolve("/latest")))
                .select("1.0.0", new Preferences(true, false), new GameStore(paths), dialogs, ignored -> {});
        assertTrue(result.isEmpty());
        assertEquals(1, checks);
        assertEquals(0, downloads);
        assertEquals(1, dialogs.prompts);
        assertFalse(Files.exists(paths.active()));
        try (var files = Files.list(paths.versions())) {
            assertEquals(0, files.count());
        }
    }

    @Test
    void automaticUpdatesStageVerifiedGameWithoutPromptOrPrematureActivation() throws Exception {
        var paths = new AppPaths(directory.resolve("automatic"));
        paths.initialize();
        var dialogs = new TestDialogs(false);
        var result = new UpdateCoordinator(new UpdateClient(base.resolve("/latest")))
                .select("1.0.0", new Preferences(true, true), new GameStore(paths), dialogs, ignored -> {})
                .orElseThrow();
        assertEquals(1, downloads);
        assertEquals(0, dialogs.prompts);
        new GameStore(paths).verify(result);
        assertFalse(Files.exists(paths.active()));
    }

    @Test
    void incompatibleUpdateOffersInstallerAndLeavesGameUntouched() throws Exception {
        requiredJava = 26;
        var paths = new AppPaths(directory.resolve("incompatible"));
        paths.initialize();
        var dialogs = new TestDialogs(true);
        var result = new UpdateCoordinator(new UpdateClient(base.resolve("/latest")))
                .select("1.0.0", new Preferences(true, true), new GameStore(paths), dialogs, ignored -> {});
        assertTrue(result.isEmpty());
        assertEquals(1, dialogs.installers);
        assertEquals(0, downloads);
        assertEquals(0, dialogs.prompts);
    }

    private static final class TestDialogs implements UpdateCoordinator.Dialogs {
        private final boolean accepted;
        private int prompts;
        private int installers;

        TestDialogs(boolean accepted) {
            this.accepted = accepted;
        }

        @Override
        public boolean update(String version) {
            prompts++;
            return accepted;
        }

        @Override
        public void installer(UpdateClient.Update release) {
            installers++;
        }
    }

    @Test
    void stableReleaseDownloadsAndVerifiesBeforeActivation() throws Exception {
        var client = new UpdateClient(base.resolve("/latest"));
        var update = client.latest().orElseThrow();
        var paths = new AppPaths(directory.resolve("user"));
        paths.initialize();
        client.download(update, new GameStore(paths));
        assertEquals("downloaded game", Files.readString(paths.jar(update.manifest())));
        assertFalse(Files.exists(paths.active()));
    }

    @Test
    void corruptDownloadIsRejected() throws Exception {
        var client = new UpdateClient(base.resolve("/latest"));
        var update = client.latest().orElseThrow();
        content = "wrong game".getBytes();
        var paths = new AppPaths(directory.resolve("user"));
        paths.initialize();
        assertThrows(IOException.class, () -> client.download(update, new GameStore(paths)));
        assertFalse(Files.exists(paths.jar(update.manifest())));
    }

    @Test
    void rateLimitingIsReportedWithoutAnUpdate() {
        responseCode = 403;
        assertThrows(IOException.class, () -> new UpdateClient(base.resolve("/latest")).latest());
    }

    @Test
    void offlineServerIsReportedWithoutAnUpdate() {
        server.stop(0);
        assertThrows(IOException.class, () -> new UpdateClient(base.resolve("/latest")).latest());
    }

    @Test
    void prereleasesAreSkipped() throws Exception {
        prerelease = true;
        assertTrue(new UpdateClient(base.resolve("/latest")).latest().isEmpty());
    }

    @Test
    void inconsistentReleaseIdentityIsRejected() {
        manifestVersion = "9.0.0";
        assertThrows(IOException.class, () -> new UpdateClient(base.resolve("/latest")).latest());
    }
}
