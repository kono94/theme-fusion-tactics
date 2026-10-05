package net.lwenstrom.tft.desktop;

import java.util.Map;

public record ReleaseManifest(
        String gameVersion,
        int requiredJava,
        String minimumLauncherVersion,
        String jarAsset,
        String sha256,
        Map<String, String> installerAssets) {
    public ReleaseManifest {
        Version.parse(gameVersion);
        Version.parse(minimumLauncherVersion);
        if (requiredJava < 25) throw new IllegalArgumentException("Invalid Java requirement");
        if (jarAsset == null || !jarAsset.matches("[A-Za-z0-9._-]+\\.jar")) {
            throw new IllegalArgumentException("Invalid JAR asset name");
        }
        if (sha256 == null || !sha256.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("Invalid SHA-256 checksum");
        }
        installerAssets = installerAssets == null ? Map.of() : Map.copyOf(installerAssets);
        if (installerAssets.values().stream().anyMatch(name -> !name.matches("[A-Za-z0-9._-]+"))) {
            throw new IllegalArgumentException("Invalid installer asset name");
        }
    }

    boolean compatible(int javaVersion, String launcherVersion) {
        return requiredJava == javaVersion
                && Version.parse(launcherVersion).compareTo(Version.parse(minimumLauncherVersion)) >= 0;
    }
}
