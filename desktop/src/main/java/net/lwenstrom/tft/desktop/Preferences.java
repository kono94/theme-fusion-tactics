package net.lwenstrom.tft.desktop;

import java.io.IOException;

record Preferences(boolean checkForUpdates, boolean automaticUpdates) {
    static Preferences load(AppPaths paths) throws IOException {
        if (java.nio.file.Files.exists(paths.preferences())) {
            return JsonFiles.read(paths.preferences(), Preferences.class);
        }
        var defaults = new Preferences(true, false);
        JsonFiles.write(paths.preferences(), defaults);
        return defaults;
    }
}
