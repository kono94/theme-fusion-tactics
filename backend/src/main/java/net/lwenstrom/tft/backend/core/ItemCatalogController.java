package net.lwenstrom.tft.backend.core;

import java.util.List;
import lombok.RequiredArgsConstructor;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.core.model.ItemDefinition;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class ItemCatalogController {
    private final DataLoader dataLoader;
    private final GameModeRegistry gameModeRegistry;

    @GetMapping("/api/items")
    public List<ItemDefinition> getItems(@RequestParam(required = false) String mode) {
        try {
            var resolvedMode = mode != null ? GameMode.fromString(mode) : gameModeRegistry.getDefaultMode();
            return dataLoader.getItems(resolvedMode);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mode is invalid", exception);
        }
    }
}
