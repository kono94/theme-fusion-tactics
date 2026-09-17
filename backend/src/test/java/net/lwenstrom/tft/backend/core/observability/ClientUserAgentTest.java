package net.lwenstrom.tft.backend.core.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ClientUserAgentTest {

    @Test
    void classifiesCommonBrowserOperatingSystemAndDeviceFamilies() {
        assertEquals(
                new ClientUserAgent("chrome", "windows", "desktop"),
                ClientUserAgent.classify("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"));
        assertEquals(
                new ClientUserAgent("safari", "ios", "mobile"),
                ClientUserAgent.classify("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 "
                        + "Version/18.6 Mobile/15E148 Safari/604.1"));
        assertEquals(
                new ClientUserAgent("edge", "windows", "desktop"),
                ClientUserAgent.classify("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        + "Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"));
        assertEquals(
                new ClientUserAgent("samsung_internet", "android", "tablet"),
                ClientUserAgent.classify("Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 "
                        + "SamsungBrowser/28.0 Chrome/130.0 Safari/537.36"));
        assertEquals(new ClientUserAgent("bot", "other", "bot"), ClientUserAgent.classify("ExampleCrawler/1.0"));
    }

    @Test
    void keepsMissingAndUnexpectedValuesBounded() {
        assertEquals(ClientUserAgent.UNKNOWN, ClientUserAgent.classify(null));
        assertEquals(ClientUserAgent.UNKNOWN, new ClientUserAgent("custom", "custom", "custom"));
    }
}
