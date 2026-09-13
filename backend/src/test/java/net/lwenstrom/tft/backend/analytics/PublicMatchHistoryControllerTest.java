package net.lwenstrom.tft.backend.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class PublicMatchHistoryControllerTest {
    private final PublicMatchHistoryRepository repository = mock(PublicMatchHistoryRepository.class);
    private final PublicMatchHistoryController controller = new PublicMatchHistoryController(repository);

    @Test
    void returnsThePublicHistoryResponseWithoutPrivateIdentifiers() {
        var response = new PublicMatchHistoryRepository.Response(List.of(new PublicMatchHistoryRepository.Match(
                "pokemon",
                Instant.parse("2026-09-13T18:00:00Z"),
                14,
                3,
                List.of(new PublicMatchHistoryRepository.FinalBoardUnit("mewtwo", "mewtwo", 1, List.of())))));
        when(repository.latest()).thenReturn(response);

        var result = controller.latest();

        assertThat(result.getBody()).isSameAs(response);
        assertThat(result.getHeaders().getCacheControl()).isEqualTo("no-store");
        verify(repository).latest();
    }
}
