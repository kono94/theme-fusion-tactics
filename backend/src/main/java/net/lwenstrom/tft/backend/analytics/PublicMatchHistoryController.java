package net.lwenstrom.tft.backend.analytics;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/match-history")
@RequiredArgsConstructor
public class PublicMatchHistoryController {
    private final PublicMatchHistoryRepository repository;

    @GetMapping
    ResponseEntity<PublicMatchHistoryRepository.Response> latest() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(repository.latest());
    }
}
