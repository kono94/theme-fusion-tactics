package net.lwenstrom.tft.desktop;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;

final class SingleInstance implements AutoCloseable {
    private final AppPaths paths;
    private final FileChannel channel;
    private final FileLock lock;
    private HttpServer server;
    private java.util.concurrent.ExecutorService executor;

    SingleInstance(AppPaths paths) throws IOException {
        this.paths = paths;
        channel = FileChannel.open(
                paths.root().resolve("launcher.lock"), StandardOpenOption.CREATE, StandardOpenOption.WRITE);
        FileLock acquired;
        try {
            acquired = channel.tryLock();
        } catch (java.nio.channels.OverlappingFileLockException exception) {
            acquired = null;
        }
        lock = acquired;
    }

    boolean primary() {
        return lock != null;
    }

    void listen(Runnable open) throws IOException {
        if (!primary()) throw new IOException("Only the primary launcher may listen");
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newVirtualThreadPerTaskExecutor();
        server.setExecutor(executor);
        var token = UUID.randomUUID().toString();
        server.createContext("/open", exchange -> {
            var allowed = exchange.getRequestMethod().equals("POST")
                    && token.equals(exchange.getRequestHeaders().getFirst("X-TFT-Instance"));
            exchange.sendResponseHeaders(allowed ? 204 : 403, -1);
            exchange.close();
            if (allowed) open.run();
        });
        server.start();
        JsonFiles.write(paths.instance(), new Instance(server.getAddress().getPort(), token));
    }

    void openExisting() throws IOException, InterruptedException {
        var client =
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
        for (var attempt = 0; attempt < 20; attempt++) {
            try {
                var existing = JsonFiles.read(paths.instance(), Instance.class);
                if (existing.port() <= 0 || existing.port() > 65535) throw new IOException("Invalid launcher port");
                var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + existing.port() + "/open"))
                        .timeout(Duration.ofSeconds(1))
                        .header("X-TFT-Instance", existing.token())
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build();
                if (client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 204) return;
            } catch (IOException | RuntimeException ignored) {
                // The first launcher may still be creating its control endpoint.
            }
            Thread.sleep(100);
        }
        throw new IOException("The existing launcher is not responding");
    }

    @Override
    public void close() throws IOException {
        if (server != null) server.stop(0);
        if (executor != null) executor.shutdownNow();
        if (lock != null) {
            Files.deleteIfExists(paths.instance());
            lock.release();
        }
        channel.close();
    }

    record Instance(int port, String token) {}
}
