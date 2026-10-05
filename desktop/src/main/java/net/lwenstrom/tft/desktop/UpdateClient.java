package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.time.Duration;
import java.util.Optional;
import tools.jackson.databind.JsonNode;

final class UpdateClient {
    static final URI REPOSITORY = URI.create("https://github.com/kono94/theme-fusion-tactics");
    private final URI latest;
    private final HttpClient client;

    UpdateClient() {
        this(URI.create("https://api.github.com/repos/kono94/theme-fusion-tactics/releases/latest"));
    }

    UpdateClient(URI latest) {
        this.latest = latest;
        client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    Optional<Update> latest() throws IOException, InterruptedException {
        var deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
        var release = get(latest, deadline);
        if (release.path("draft").asBoolean() || release.path("prerelease").asBoolean()) return Optional.empty();
        var tag = release.path("tag_name").asText();
        var version = Version.parse(tag);
        if (version.prerelease() != null) return Optional.empty();
        URI manifestUrl = null;
        URI jarUrl = null;
        for (var asset : release.path("assets")) {
            if (asset.path("name").asText().equals("tft-update.json")) {
                manifestUrl = assetUri(asset.path("browser_download_url").asText());
            }
        }
        if (manifestUrl == null) return Optional.empty();
        var manifest = JsonFiles.MAPPER.treeToValue(get(manifestUrl, deadline), ReleaseManifest.class);
        if (!Version.parse(manifest.gameVersion()).equals(version)) throw new IOException("Release version mismatch");
        for (var asset : release.path("assets")) {
            if (asset.path("name").asText().equals(manifest.jarAsset())) {
                jarUrl = assetUri(asset.path("browser_download_url").asText());
            }
        }
        if (jarUrl == null) throw new IOException("Release game asset is missing");
        return Optional.of(
                new Update(manifest, jarUrl, assetUri(release.path("html_url").asText())));
    }

    void download(Update update, GameStore store) throws IOException, InterruptedException {
        var staged = Files.createTempFile("tft-update-", ".jar");
        try {
            var response = client.send(
                    request(update.jarUrl(), Duration.ofMinutes(5)), HttpResponse.BodyHandlers.ofFile(staged));
            if (response.statusCode() != 200)
                throw new IOException("Game download failed: HTTP " + response.statusCode());
            try (var input = Files.newInputStream(staged)) {
                store.install(update.manifest(), input);
            }
        } finally {
            Files.deleteIfExists(staged);
        }
    }

    private JsonNode get(URI uri, long deadline) throws IOException, InterruptedException {
        var remaining = deadline - System.nanoTime();
        if (remaining <= 0) throw new IOException("Update check timed out");
        var response = client.send(request(uri, Duration.ofNanos(remaining)), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new IOException("Update check failed: HTTP " + response.statusCode());
        if (response.body().length() > 1_000_000) throw new IOException("Update response is too large");
        return JsonFiles.MAPPER.readTree(response.body());
    }

    private static HttpRequest request(URI uri, Duration timeout) {
        return HttpRequest.newBuilder(uri)
                .timeout(timeout)
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "ThemeFusionTactics-Launcher/" + Launcher.version())
                .GET()
                .build();
    }

    private URI assetUri(String value) throws IOException {
        var uri = URI.create(value);
        if (latest.getHost().equals("127.0.0.1")
                && uri.getHost().equals("127.0.0.1")
                && uri.getPort() == latest.getPort()) {
            return uri;
        }
        if (!"https".equals(uri.getScheme())
                || !"github.com".equals(uri.getHost())
                || !uri.getPath().startsWith("/kono94/theme-fusion-tactics/releases/")) {
            throw new IOException("Unexpected release download location");
        }
        return uri;
    }

    record Update(ReleaseManifest manifest, URI jarUrl, URI releaseUrl) {
        URI installerUrl() {
            var os = System.getProperty("os.name").startsWith("Windows") ? "windows" : "macos";
            var architecture = System.getProperty("os.arch");
            var key = os + "-" + (architecture.equals("aarch64") || architecture.equals("arm64") ? "arm64" : "x64");
            var asset = manifest.installerAssets().get(key);
            return asset == null ? releaseUrl : jarUrl.resolve(asset);
        }
    }
}
