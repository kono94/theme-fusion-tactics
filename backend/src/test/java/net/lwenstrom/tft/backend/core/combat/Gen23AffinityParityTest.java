package net.lwenstrom.tft.backend.core.combat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Set;
import net.lwenstrom.tft.backend.test.MockUnit;
import org.junit.jupiter.api.Test;

class Gen23AffinityParityTest {
    private final ElementalAffinityConfig config =
            new ElementalAffinityLoader().load("/data/affinities_pokemongen23.json");
    private final DamageResolver resolver = new DamageResolver(config);

    @Test
    void usesSeventeenTypesWithoutFairy() {
        assertEquals(17, config.elements().size());
        assertFalse(config.elements().contains("fairy"));
    }

    @Test
    void steelResistsGhostAndDark() {
        var steel = MockUnit.create("mawile", "two").withTraits(Set.of("Steel"));
        var ghost = MockUnit.create("duskull", "one").withTraits(Set.of("Ghost"));
        var dark = MockUnit.create("poochyena", "one").withTraits(Set.of("Dark"));

        assertEquals(80, resolver.apply(ghost, steel, 100));
        assertEquals(80, resolver.apply(dark, steel, 100));
    }

    @Test
    void keepsTheSharedTypeChart() {
        var water = MockUnit.create("mudkip", "one").withTraits(Set.of("Water"));
        var fire = MockUnit.create("torchic", "two").withTraits(Set.of("Fire"));
        var dragon = MockUnit.create("bagon", "two").withTraits(Set.of("Dragon"));
        var fighting = MockUnit.create("makuhita", "one").withTraits(Set.of("Fighting"));
        var dark = MockUnit.create("sableye", "two").withTraits(Set.of("Dark"));

        assertEquals(120, resolver.apply(water, fire, 100));
        assertEquals(80, resolver.apply(fire, water, 100));
        assertEquals(120, resolver.apply(dragon, dragon, 100));
        assertEquals(120, resolver.apply(fighting, dark, 100));
    }
}
