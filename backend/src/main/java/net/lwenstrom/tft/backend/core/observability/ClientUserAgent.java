package net.lwenstrom.tft.backend.core.observability;

import java.util.Locale;
import java.util.Set;

public record ClientUserAgent(String browserFamily, String osFamily, String deviceType) {

    public static final String SESSION_ATTRIBUTE = ClientUserAgent.class.getName();

    private static final Set<String> BROWSER_FAMILIES = Set.of(
            "bot", "chrome", "edge", "firefox", "opera", "other", "safari", "samsung_internet", "unknown", "webview");
    private static final Set<String> OS_FAMILIES =
            Set.of("android", "chrome_os", "ios", "linux", "macos", "other", "unknown", "windows");
    private static final Set<String> DEVICE_TYPES = Set.of("bot", "desktop", "mobile", "tablet", "unknown");
    public static final ClientUserAgent UNKNOWN = new ClientUserAgent("unknown", "unknown", "unknown");

    public ClientUserAgent {
        browserFamily = boundedValue(browserFamily, BROWSER_FAMILIES);
        osFamily = boundedValue(osFamily, OS_FAMILIES);
        deviceType = boundedValue(deviceType, DEVICE_TYPES);
    }

    public static ClientUserAgent classify(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return UNKNOWN;
        }

        var normalized = userAgent.toLowerCase(Locale.ROOT);
        var browser = browserFamily(normalized);
        return new ClientUserAgent(browser, osFamily(normalized), deviceType(normalized, browser));
    }

    private static String browserFamily(String userAgent) {
        if (containsAny(userAgent, "bot", "crawler", "spider", "headless")) return "bot";
        if (containsAny(userAgent, "edg/", "edga/", "edgios/")) return "edge";
        if (containsAny(userAgent, "opr/", "opera")) return "opera";
        if (userAgent.contains("samsungbrowser/")) return "samsung_internet";
        if (containsAny(userAgent, "; wv)", " webview/")) return "webview";
        if (containsAny(userAgent, "firefox/", "fxios/")) return "firefox";
        if (containsAny(userAgent, "chrome/", "crios/", "chromium/")) return "chrome";
        if (userAgent.contains("safari/") && userAgent.contains("version/")) return "safari";
        return "other";
    }

    private static String osFamily(String userAgent) {
        if (containsAny(userAgent, "iphone", "ipad", "ipod")
                || (userAgent.contains("macintosh") && userAgent.contains("mobile/"))) {
            return "ios";
        }
        if (userAgent.contains("android")) return "android";
        if (userAgent.contains("windows")) return "windows";
        if (userAgent.contains("cros")) return "chrome_os";
        if (containsAny(userAgent, "macintosh", "mac os x")) return "macos";
        if (userAgent.contains("linux")) return "linux";
        return "other";
    }

    private static String deviceType(String userAgent, String browserFamily) {
        if (browserFamily.equals("bot")) return "bot";
        if (containsAny(userAgent, "ipad", "tablet")
                || (userAgent.contains("android") && !userAgent.contains("mobile"))) {
            return "tablet";
        }
        if (containsAny(userAgent, "mobile", "iphone", "ipod")) return "mobile";
        return "desktop";
    }

    private static boolean containsAny(String value, String... candidates) {
        for (var candidate : candidates) {
            if (value.contains(candidate)) return true;
        }
        return false;
    }

    private static String boundedValue(String value, Set<String> allowedValues) {
        return value != null && allowedValues.contains(value) ? value : "unknown";
    }
}
