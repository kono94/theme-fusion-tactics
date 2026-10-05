package net.lwenstrom.tft.desktop;

import java.util.Optional;
import java.util.function.Consumer;

final class UpdateCoordinator {
    private final UpdateClient client;

    UpdateCoordinator(UpdateClient client) {
        this.client = client;
    }

    Optional<ReleaseManifest> select(
            String currentVersion, Preferences preferences, GameStore store, Dialogs dialogs, Consumer<String> progress)
            throws InterruptedException {
        if (!preferences.checkForUpdates()) return Optional.empty();
        progress.accept("Checking for updates…");
        try {
            var update = client.latest();
            if (update.isEmpty()
                    || Version.parse(update.get().manifest().gameVersion()).compareTo(Version.parse(currentVersion))
                            <= 0) return Optional.empty();
            var release = update.get();
            if (!release.manifest().compatible(Runtime.version().feature(), Launcher.version())) {
                dialogs.installer(release);
                return Optional.empty();
            }
            if (!preferences.automaticUpdates()
                    && !dialogs.update(release.manifest().gameVersion())) return Optional.empty();
            progress.accept("Downloading TFT " + release.manifest().gameVersion() + "…");
            client.download(release, store);
            return Optional.of(release.manifest());
        } catch (InterruptedException exception) {
            throw exception;
        } catch (Exception exception) {
            progress.accept("Update unavailable; starting installed game");
            System.err.println("Update unavailable: " + exception.getMessage());
            return Optional.empty();
        }
    }

    interface Dialogs {
        boolean update(String version);

        void installer(UpdateClient.Update release) throws Exception;
    }
}
