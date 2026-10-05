package net.lwenstrom.tft.desktop;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;

public final class Launcher {
    private static final String VERSION = readVersion();

    private Launcher() {}

    public static void main(String[] arguments) {
        var smoke = Arrays.asList(arguments).contains("--smoke-test");
        var headless = smoke || Arrays.asList(arguments).contains("--headless");
        try {
            var bundle = option(
                    arguments,
                    "--bundle=",
                    Path.of(Launcher.class
                                    .getProtectionDomain()
                                    .getCodeSource()
                                    .getLocation()
                                    .toURI())
                            .getParent());
            var paths = new AppPaths(option(
                    arguments,
                    "--data-dir=",
                    AppPaths.defaultRoot(
                            System.getProperty("os.name"), System.getenv(), System.getProperty("user.home"))));
            run(bundle, paths, headless, smoke);
        } catch (Exception exception) {
            exception.printStackTrace();
            if (!headless)
                JOptionPane.showMessageDialog(
                        null, exception.getMessage(), "TFT could not start", JOptionPane.ERROR_MESSAGE);
            System.exit(1);
        }
    }

    static String version() {
        return VERSION;
    }

    private static void run(Path bundle, AppPaths paths, boolean headless, boolean smoke) throws Exception {
        paths.initialize();
        try (var instance = new SingleInstance(paths);
                var game = new GameProcess(paths)) {
            if (!instance.primary()) {
                instance.openExisting();
                return;
            }
            var store = new GameStore(paths);
            GameProcess.stopOrphan(paths);
            var recovered = store.recover();
            var bundled = store.seed(bundle);
            var preferences = Preferences.load(paths);
            var quit = new CountDownLatch(1);
            var closing = new AtomicBoolean();
            var mainThread = Thread.currentThread();
            var window = new LauncherWindow[1];
            var open = (Runnable) () -> {
                if (window[0] != null) window[0].focus();
                var uri = game.gameUrl();
                if (uri != null && !headless) {
                    try {
                        LauncherWindow.browse(uri);
                    } catch (Exception exception) {
                        window[0].message(exception.getMessage());
                    }
                }
            };
            var requestQuit = (Runnable) () -> Thread.ofVirtual().start(() -> {
                if (!closing.compareAndSet(false, true)) return;
                var active = game.gameUrl() == null;
                try {
                    active = game.status().activeMatch();
                } catch (Exception ignored) {
                    active = true;
                }
                if (window[0] == null || !active || window[0].confirmQuit()) {
                    quit.countDown();
                    mainThread.interrupt();
                } else closing.set(false);
            });
            if (!headless)
                SwingUtilities.invokeAndWait(
                        () -> window[0] = new LauncherWindow(paths, preferences, open, requestQuit));
            instance.listen(open);
            var shutdown = new Thread(
                    () -> {
                        try {
                            game.close();
                        } catch (IOException exception) {
                            exception.printStackTrace();
                        }
                    },
                    "tft-shutdown");
            Runtime.getRuntime().addShutdownHook(shutdown);
            try {
                if (recovered && window[0] != null)
                    window[0].message("Recovered the previous game and history after an interrupted update.");
                ReleaseManifest candidate = Version.parse(bundled.gameVersion())
                                        .compareTo(Version.parse(store.active().gameVersion()))
                                > 0
                        ? bundled
                        : null;
                if (!headless) {
                    var dialogs = new UpdateCoordinator.Dialogs() {
                        @Override
                        public boolean update(String version) {
                            return window[0].update(version);
                        }

                        @Override
                        public void installer(UpdateClient.Update release) throws Exception {
                            if (window[0].installer(release.manifest().gameVersion()))
                                LauncherWindow.browse(release.installerUrl());
                        }
                    };
                    var update = new UpdateCoordinator(new UpdateClient())
                            .select(
                                    candidate == null ? store.active().gameVersion() : candidate.gameVersion(),
                                    preferences,
                                    store,
                                    dialogs,
                                    window[0]::status);
                    if (update.isPresent()) candidate = update.get();
                }
                if (candidate != null) store.begin(candidate);
                var active = store.active();
                store.verify(active);
                if (!active.compatible(Runtime.version().feature(), version())) {
                    throw new IOException(
                            "The installed game requires a different runtime. Download a matching TFT installer.");
                }
                if (window[0] != null) window[0].status("Starting TFT " + active.gameVersion() + "…");
                try {
                    game.start(active);
                } catch (IOException exception) {
                    game.close();
                    if (candidate == null) throw exception;
                    store.recover();
                    active = store.active();
                    if (window[0] != null)
                        window[0].message(
                                "The update did not start. Your previous game and history have been restored.");
                    game.start(active);
                }
                store.commit();
                if (window[0] != null) window[0].ready(active.gameVersion());
                if (smoke) {
                    SmokeTest.check(game);
                    return;
                }
                open.run();
                System.out.println("TFT ready: " + game.gameUrl());
                while (!quit.await(1, java.util.concurrent.TimeUnit.SECONDS)) {
                    if (!game.running())
                        throw new IOException("The game stopped unexpectedly. Check "
                                + paths.logs().resolve("game.log"));
                }
            } catch (InterruptedException exception) {
                if (!closing.get()) throw exception;
            } finally {
                Thread.interrupted();
                game.close();
                Runtime.getRuntime().removeShutdownHook(shutdown);
                if (window[0] != null) window[0].dispose();
            }
        }
    }

    private static Path option(String[] arguments, String prefix, Path fallback) {
        return Arrays.stream(arguments)
                .filter(argument -> argument.startsWith(prefix))
                .map(argument -> Path.of(argument.substring(prefix.length())))
                .findFirst()
                .orElse(fallback)
                .toAbsolutePath();
    }

    private static String readVersion() {
        var properties = new Properties();
        try (var input = Launcher.class.getResourceAsStream("/launcher-build.properties")) {
            if (input == null) throw new IOException("Missing launcher build identity");
            properties.load(input);
            var version = properties.getProperty("launcher.version");
            Version.parse(version);
            return version;
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
