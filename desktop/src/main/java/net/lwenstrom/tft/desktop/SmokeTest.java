package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import tools.jackson.databind.JsonNode;

final class SmokeTest {
    private SmokeTest() {}

    static void check(GameProcess game) throws Exception {
        var client = HttpClient.newHttpClient();
        for (var path : new String[] {
            "",
            "api/config",
            "api/traits?mode=onepiece",
            "api/traits?mode=pokemon",
            "assets/fonts/barlow/barlow-400.ttf",
            "api/match-history"
        }) {
            var response = client.send(
                    HttpRequest.newBuilder(game.gameUrl().resolve(path))
                            .timeout(Duration.ofSeconds(5))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200 || response.body().length == 0)
                throw new IOException("Smoke failed: " + path);
        }
        for (var mode : new String[] {"onepiece", "pokemon"}) play(client, game.gameUrl(), mode);
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (true) {
            var response = client.send(
                    HttpRequest.newBuilder(game.gameUrl().resolve("api/match-history"))
                            .timeout(Duration.ofSeconds(2))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            var history = JsonFiles.MAPPER.readTree(response.body()).path("matches");
            var modes = new java.util.HashSet<String>();
            for (var match : history) modes.add(match.path("mode").asText());
            if (modes.containsAll(java.util.Set.of("onepiece", "pokemon"))) break;
            if (System.nanoTime() > deadline) throw new IOException("Completed solo matches were not persisted");
            Thread.sleep(100);
        }
        System.out.println(
                "Standalone smoke passed: offline assets, completed solo matches in both themes, and persisted history");
    }

    private static void play(HttpClient client, URI gameUrl, String mode) throws Exception {
        var listener = new StompListener();
        var socket = client.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create("ws://127.0.0.1:" + gameUrl.getPort() + "/ws"), listener)
                .get(5, TimeUnit.SECONDS);
        try {
            send(socket, "CONNECT", "accept-version:1.2\nhost:localhost\nheart-beat:0,0", "");
            listener.await(frame -> frame.startsWith("CONNECTED"), 10);
            var room = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 8)
                    .toUpperCase(java.util.Locale.ROOT);
            var player = "Offline Tester";
            send(socket, "SUBSCRIBE", "id:result\ndestination:/user/queue/room-result", "");
            send(socket, "SUBSCRIBE", "id:state\ndestination:/topic/room/" + room, "");
            publish(
                    socket,
                    "/app/create",
                    Map.of(
                            "roomId",
                            room,
                            "playerName",
                            player,
                            "analyticsClientId",
                            UUID.randomUUID().toString(),
                            "reconnectToken",
                            UUID.randomUUID().toString()));
            var result = listener.message(node -> node.has("accepted"), 10);
            if (!result.path("accepted").asBoolean()) throw new IOException("Solo room creation rejected: " + result);
            var playerId = result.path("playerId").asText();
            publish(socket, "/app/room/" + room + "/mode", Map.of("playerName", player, "gameMode", mode));
            listener.message(node -> node.path("gameMode").asText().equals(mode), 10);
            publish(socket, "/app/room/" + room + "/match-rule", Map.of("playerName", player, "matchRule", "NONE"));
            listener.message(node -> node.path("matchRuleSelection").asText().equals("NONE"), 10);
            publish(socket, "/app/start", Map.of("roomId", room, "playerName", player));
            var state = listener.message(node -> node.path("phase").asText().equals("PLANNING"), 10);
            if (state.path("players").size() != 8) throw new IOException("Solo game did not fill with bots");
            var readyRound = 0;
            var lastReady = 0L;
            var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(300);
            while (!state.path("phase").asText().equals("END_CELEBRATION")
                    && !state.path("phase").asText().equals("END")) {
                if (state.path("phase").asText().equals("PLANNING")
                        && (state.path("round").asInt() > readyRound
                                || System.nanoTime() - lastReady > TimeUnit.SECONDS.toNanos(1))) {
                    if (state.path("round").asInt() > readyRound)
                        System.out.println("Solo smoke " + mode + ": round "
                                + state.path("round").asInt());
                    readyRound = state.path("round").asInt();
                    lastReady = System.nanoTime();
                    publish(
                            socket,
                            "/app/room/" + room + "/action",
                            Map.of("type", "READY_FOR_COMBAT", "playerId", playerId));
                }
                if (System.nanoTime() > deadline)
                    throw new IOException("Solo match did not complete: " + mode + ", phase=" + state.path("phase")
                            + ", round=" + state.path("round") + ", health="
                            + state.path("players").path(playerId).path("health"));
                state = listener.message(node -> node.has("phase"), 15);
            }
            if (state.path("players").path(playerId).path("place").isNull())
                throw new IOException("Solo placement was not finalized");
        } finally {
            socket.sendClose(WebSocket.NORMAL_CLOSURE, "smoke complete").join();
        }
    }

    private static void publish(WebSocket socket, String destination, Object body) {
        send(
                socket,
                "SEND",
                "destination:" + destination + "\ncontent-type:application/json",
                JsonFiles.MAPPER.writeValueAsString(body));
    }

    private static void send(WebSocket socket, String command, String headers, String body) {
        socket.sendText(command + "\n" + headers + "\n\n" + body + "\0", true).join();
    }

    private static final class StompListener implements WebSocket.Listener {
        private final StringBuilder buffer = new StringBuilder();
        private final LinkedBlockingQueue<String> frames = new LinkedBlockingQueue<>();

        @Override
        public void onOpen(WebSocket socket) {
            socket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket socket, CharSequence data, boolean last) {
            buffer.append(data);
            int end;
            while ((end = buffer.indexOf("\0")) >= 0) {
                frames.offer(buffer.substring(0, end).stripLeading());
                buffer.delete(0, end + 1);
            }
            socket.request(1);
            return null;
        }

        @Override
        public void onError(WebSocket socket, Throwable error) {
            frames.offer("ERROR\n\n" + error);
        }

        String await(Predicate<String> condition, int seconds) throws Exception {
            var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
            while (System.nanoTime() < deadline) {
                var frame = frames.poll(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
                if (frame == null) break;
                if (frame.startsWith("ERROR")) throw new IOException(frame);
                if (condition.test(frame)) return frame;
            }
            throw new IOException("Timed out waiting for STOMP smoke response");
        }

        JsonNode message(Predicate<JsonNode> condition, int seconds) throws Exception {
            var frame = await(
                    value -> {
                        if (!value.startsWith("MESSAGE")) return false;
                        var boundary = value.indexOf("\n\n");
                        return boundary >= 0
                                && condition.test(JsonFiles.MAPPER.readTree(value.substring(boundary + 2)));
                    },
                    seconds);
            return JsonFiles.MAPPER.readTree(frame.substring(frame.indexOf("\n\n") + 2));
        }
    }
}
