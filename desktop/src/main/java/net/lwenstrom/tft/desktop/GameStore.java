package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

final class GameStore {
    private static final List<String> DATABASE_FILES = List.of("analytics.db", "analytics.db-wal", "analytics.db-shm");
    private final AppPaths paths;

    GameStore(AppPaths paths) {
        this.paths = paths;
    }

    ReleaseManifest active() throws IOException {
        return JsonFiles.read(paths.active(), ReleaseManifest.class);
    }

    ReleaseManifest seed(Path bundle) throws IOException {
        var manifest = JsonFiles.read(bundle.resolve("tft-update.json"), ReleaseManifest.class);
        if (!manifest.compatible(Runtime.version().feature(), Launcher.version())) {
            throw new IOException("The bundled game requires a different launcher or Java runtime");
        }
        try (var input = Files.newInputStream(bundle.resolve(manifest.jarAsset()))) {
            install(manifest, input);
        }
        if (!Files.exists(paths.active())) JsonFiles.write(paths.active(), manifest);
        return manifest;
    }

    void verify(ReleaseManifest manifest) throws IOException {
        if (!manifest.sha256().equals(checksum(paths.jar(manifest)))) {
            throw new IOException("Game checksum failed. Reinstall TFT to repair this version.");
        }
    }

    void install(ReleaseManifest manifest, InputStream input) throws IOException {
        var destination = paths.jar(manifest);
        Files.createDirectories(destination.getParent());
        if (Files.exists(destination)) {
            verify(manifest);
            return;
        }
        var staged = Files.createTempFile(destination.getParent(), "download-", ".part");
        try {
            Files.copy(input, staged, StandardCopyOption.REPLACE_EXISTING);
            if (!checksum(staged).equals(manifest.sha256())) throw new IOException("Downloaded game checksum failed");
            Files.move(staged, destination, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            Files.deleteIfExists(staged);
        }
    }

    void begin(ReleaseManifest candidate) throws IOException {
        if (Files.exists(paths.pending())) throw new IOException("An update still needs recovery");
        verify(candidate);
        deleteTree(paths.backup());
        Files.createDirectories(paths.backup());
        for (var name : DATABASE_FILES) {
            var source = paths.database().resolve(name);
            if (Files.exists(source)) Files.copy(source, paths.backup().resolve(name));
        }
        JsonFiles.write(paths.pending(), new Pending(active(), candidate));
        JsonFiles.write(paths.active(), candidate);
    }

    boolean recover() throws IOException {
        if (!Files.exists(paths.pending())) return false;
        var pending = JsonFiles.read(paths.pending(), Pending.class);
        if (!Files.isDirectory(paths.backup())) throw new IOException("Update database backup is missing");
        for (var name : DATABASE_FILES) {
            var destination = paths.database().resolve(name);
            var backup = paths.backup().resolve(name);
            if (Files.exists(backup)) Files.copy(backup, destination, StandardCopyOption.REPLACE_EXISTING);
            else Files.deleteIfExists(destination);
        }
        JsonFiles.write(paths.active(), pending.previous());
        commit();
        return true;
    }

    void commit() throws IOException {
        Files.deleteIfExists(paths.pending());
        deleteTree(paths.backup());
    }

    static String checksum(Path path) throws IOException {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            try (var input = new DigestInputStream(Files.newInputStream(path), digest)) {
                input.transferTo(OutputStream.nullOutputStream());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static void deleteTree(Path directory) throws IOException {
        if (!Files.exists(directory)) return;
        try (var files = Files.walk(directory)) {
            for (var file : files.sorted(Comparator.reverseOrder()).toList()) Files.delete(file);
        }
    }

    record Pending(ReleaseManifest previous, ReleaseManifest candidate) {}
}
