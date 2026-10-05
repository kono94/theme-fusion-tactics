package net.lwenstrom.tft.desktop;

import java.util.regex.Pattern;

record Version(int major, int minor, int patch, String prerelease) implements Comparable<Version> {
    private static final Pattern FORMAT = Pattern.compile("v?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([A-Za-z0-9.-]+))?");

    static Version parse(String value) {
        if (value == null) throw new IllegalArgumentException("Missing version");
        var matcher = FORMAT.matcher(value);
        if (!matcher.matches()) throw new IllegalArgumentException("Invalid version: " + value);
        return new Version(
                Integer.parseInt(matcher.group(1)),
                Integer.parseInt(matcher.group(2)),
                Integer.parseInt(matcher.group(3)),
                matcher.group(4));
    }

    @Override
    public int compareTo(Version other) {
        var result = Integer.compare(major, other.major);
        if (result == 0) result = Integer.compare(minor, other.minor);
        if (result == 0) result = Integer.compare(patch, other.patch);
        if (result != 0) return result;
        if (prerelease == null) return other.prerelease == null ? 0 : 1;
        if (other.prerelease == null) return -1;
        return prerelease.compareTo(other.prerelease);
    }
}
