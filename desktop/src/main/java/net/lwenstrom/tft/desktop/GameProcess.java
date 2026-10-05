package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

final class GameProcess implements AutoCloseable {
    private final AppPaths paths;
    private final HttpClient client =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
    private Process process;
    private volatile Status ready;

    GameProcess(AppPaths paths) {
        this.paths = paths;
    }

    Status start(ReleaseManifest manifest) throws IOException, InterruptedException {
        if (process != null && process.isAlive()) throw new IOException("The game is already running");
        Files.deleteIfExists(paths.ready());
        var launchId = UUID.randomUUID().toString();
        var java = Path.of(System.getProperty("java.home"), "bin", windows() ? "java.exe" : "java");
        var database = paths.database().resolve("analytics.db").toString().replace('\\', '/');
        var command = List.of(
                java.toString(),
                "--enable-preview",
                "-jar",
                paths.jar(manifest).toString(),
                "--spring.profiles.active=standalone",
                "--spring.profiles.include=",
                "--spring.config.location=classpath:/application.yml,classpath:/application-standalone.yml",
                "--spring.config.additional-location=optional:"
                        + paths.root().resolve("application.yaml").toUri(),
                "--spring.config.import=optional:classpath:standalone-build.properties",
                "--server.address=127.0.0.1",
                "--server.forward-headers-strategy=none",
                "--spring.datasource.url=jdbc:sqlite:" + database
                        + "?foreign_keys=on&journal_mode=WAL&synchronous=FULL&busy_timeout=5000",
                "--app.websocket.allowed-origin-patterns=http://localhost:*,http://127.0.0.1:*",
                "--standalone.launch-id=" + launchId,
                "--standalone.ready-file=" + paths.ready(),
                "--standalone.game-version=" + manifest.gameVersion(),
                "--app.git-tag=" + manifest.gameVersion());
        var builder = new ProcessBuilder(command)
                .directory(paths.root().toFile())
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(
                        paths.logs().resolve("game.log").toFile()));
        var javaOptions = Set.of("JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS", "SPRING_APPLICATION_JSON");
        builder.environment()
                .keySet()
                .removeIf(key -> javaOptions.contains(key) || key.startsWith("SPRING_") || key.startsWith("OTEL_"));
        process = builder.start();
        JsonFiles.write(
                paths.process(),
                new OwnedProcess(
                        process.pid(),
                        process.info().startInstant().map(Object::toString).orElse(""),
                        launchId,
                        java.toString()));
        var deadline = System.nanoTime() + Duration.ofSeconds(90).toNanos();
        while (process.isAlive() && System.nanoTime() < deadline) {
            if (Files.exists(paths.ready())) {
                try {
                    var candidate = JsonFiles.read(paths.ready(), Status.class);
                    if (candidate.launchId().equals(launchId)
                            && candidate.gameVersion().equals(manifest.gameVersion())
                            && candidate.port() > 0
                            && candidate.port() <= 65535) {
                        var verified = fetch(candidate);
                        if (verified.launchId().equals(launchId)
                                && verified.gameVersion().equals(manifest.gameVersion())) {
                            ready = verified;
                            return ready;
                        }
                    }
                } catch (IOException | RuntimeException ignored) {
                    // The readiness file can arrive before the first HTTP request succeeds.
                }
            }
            Thread.sleep(100);
        }
        throw new IOException("Game failed to start. Check " + paths.logs().resolve("game.log")
                + " for an occupied port or invalid application.yaml.");
    }

    Status status() throws IOException, InterruptedException {
        var current = ready;
        if (current == null || process == null || !process.isAlive()) throw new IOException("The game is not running");
        var status = fetch(current);
        if (!status.launchId().equals(current.launchId())) throw new IOException("Game identity changed");
        return status;
    }

    URI gameUrl() {
        var current = ready;
        return current == null ? null : URI.create("http://127.0.0.1:" + current.port() + "/");
    }

    boolean running() {
        return process != null && process.isAlive();
    }

    private Status fetch(Status expected) throws IOException, InterruptedException {
        var uri = URI.create("http://127.0.0.1:" + expected.port() + "/api/standalone/status");
        var response = client.send(
                HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(2)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new IOException("Game is not ready");
        return JsonFiles.MAPPER.readValue(response.body(), Status.class);
    }

    static void stopOrphan(AppPaths paths) throws IOException, InterruptedException {
        if (!Files.exists(paths.process())) return;
        var owned = JsonFiles.read(paths.process(), OwnedProcess.class);
        var handle = ProcessHandle.of(owned.pid());
        if (handle.isPresent() && handle.get().isAlive()) {
            var info = handle.get().info();
            var sameStart = info.startInstant().map(Object::toString).orElse("").equals(owned.startedAt());
            var sameLaunch = info.arguments()
                    .map(arguments -> Arrays.asList(arguments).contains("--standalone.launch-id=" + owned.launchId()))
                    .orElseGet(() -> info.command()
                            .map(command -> command.equalsIgnoreCase(owned.javaCommand()))
                            .orElse(false));
            if (!sameStart || !sameLaunch || owned.startedAt().isBlank()) {
                throw new IOException("Cannot verify the previous game process. Quit it before restarting TFT.");
            }
            stop(handle.get());
        }
        Files.deleteIfExists(paths.process());
        Files.deleteIfExists(paths.ready());
    }

    @Override
    public synchronized void close() throws IOException {
        if (process == null) return;
        ready = null;
        if (process != null && process.isAlive()) {
            try {
                stop(process.toHandle());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted while stopping the game", exception);
            }
        }
        Files.deleteIfExists(paths.process());
        Files.deleteIfExists(paths.ready());
        process = null;
    }

    private static void stop(ProcessHandle handle) throws IOException, InterruptedException {
        handle.destroy();
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (handle.isAlive() && System.nanoTime() < deadline) Thread.sleep(100);
        if (handle.isAlive()) {
            handle.destroyForcibly();
            deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (handle.isAlive() && System.nanoTime() < deadline) Thread.sleep(100);
        }
        if (handle.isAlive()) throw new IOException("Game did not stop; database recovery has been postponed");
    }

    private static boolean windows() {
        return System.getProperty("os.name").startsWith("Windows");
    }

    record Status(String gameVersion, String launchId, int port, boolean activeMatch) {}

    record OwnedProcess(long pid, String startedAt, String launchId, String javaCommand) {}
}
