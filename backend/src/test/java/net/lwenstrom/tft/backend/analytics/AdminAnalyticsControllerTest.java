package net.lwenstrom.tft.backend.analytics;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class AdminAnalyticsControllerTest {
    private final AdminAnalyticsRepository repository = mock(AdminAnalyticsRepository.class);
    private final AdminAnalyticsController controller = new AdminAnalyticsController(repository);

    @Test
    void rejectsPlacementsOutsideTheEightPlayerRange() {
        assertThatThrownBy(() -> controller.runs(null, null, null, null, null, 9, null, null, null, null, 50))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        exception -> org.assertj.core.api.Assertions.assertThat(
                                        exception.getStatusCode().value())
                                .isEqualTo(400));
    }

    @Test
    void canonicalizesModeAndForwardsExactUnknownBuildFilters() {
        controller.summary("1970-01-01T00:00:00Z", "1970-01-01T00:00:01Z", "one_piece", "unknown", "unknown");

        verify(repository).summary(0, 1_000, "ONEPIECE", "unknown", "unknown");
    }

    @Test
    void unitPresenceUsesTheProtectedCohortQuery() {
        controller.unitPresence("1970-01-01T00:00:00Z", "1970-01-01T00:00:01Z", "pokemon", "2.0.0", "abc123");

        verify(repository).unitPresence(0, 1_000, "POKEMON", "2.0.0", "abc123");
    }
}
