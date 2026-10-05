package net.lwenstrom.tft.desktop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LauncherContractsTest {
    @TempDir
    Path directory;

    @Test
    void duplicateLauncherOpensExistingInstance() throws Exception {
        var paths = new AppPaths(directory);
        paths.initialize();
        var opened = new CountDownLatch(1);
        try (var primary = new SingleInstance(paths);
                var duplicate = new SingleInstance(paths)) {
            assertTrue(primary.primary());
            assertFalse(duplicate.primary());
            primary.listen(opened::countDown);
            duplicate.openExisting();
            assertTrue(opened.await(2, TimeUnit.SECONDS));
        }
        try (var next = new SingleInstance(paths)) {
            assertTrue(next.primary());
        }
    }

    @Test
    void duplicateLauncherCleanupDoesNotRemovePrimaryGameIdentity() throws Exception {
        var paths = new AppPaths(directory);
        paths.initialize();
        java.nio.file.Files.writeString(paths.process(), "primary identity");
        java.nio.file.Files.writeString(paths.ready(), "primary readiness");
        try (var unusedGame = new GameProcess(paths)) {}
        assertEquals("primary identity", java.nio.file.Files.readString(paths.process()));
        assertEquals("primary readiness", java.nio.file.Files.readString(paths.ready()));
    }

    @Test
    void exactPreviewRuntimeAndLauncherMinimumAreRequired() {
        var manifest = new ReleaseManifest("1.0.0", 25, "1.1.0", "game.jar", "a".repeat(64), Map.of());
        assertFalse(manifest.compatible(17, "1.1.0"));
        assertFalse(manifest.compatible(26, "1.1.0"));
        assertFalse(manifest.compatible(25, "1.0.0"));
        assertTrue(manifest.compatible(25, "1.1.0"));
    }

    @Test
    void comparesNumericVersionsAndFinalVersions() {
        assertTrue(Version.parse("1.10.0").compareTo(Version.parse("1.9.0")) > 0);
        assertTrue(Version.parse("1.0.0").compareTo(Version.parse("1.0.0-preview")) > 0);
        assertEquals(Version.parse("1.0.0"), Version.parse("v1.0.0"));
        assertThrows(IllegalArgumentException.class, () -> Version.parse("../../game"));
    }

    @Test
    void unsafeAssetPathsAreRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new ReleaseManifest("1.0.0", 25, "1.0.0", "../game.jar", "a".repeat(64), Map.of()));
    }

    @Test
    void defaultPathsUsePerUserPlatformLocations() {
        assertEquals(
                Path.of("C:/Local/TFT", "ThemeFusionTactics"),
                AppPaths.defaultRoot("Windows 11", Map.of("LOCALAPPDATA", "C:/Local/TFT"), "unused"));
        assertEquals(
                Path.of("/Users/test", "Library", "Application Support", "ThemeFusionTactics"),
                AppPaths.defaultRoot("Mac OS X", Map.of(), "/Users/test"));
    }
}
