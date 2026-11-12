package net.lwenstrom.tft.backend.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityPattern;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class DataLoaderVariantTest {
    private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

    @Test
    void expandsATemplateIntoOneDefinitionPerVariant() {
        var units = parse(template("""
                {"id": "glyph_a", "name": "Glyph A", "traits": ["Fire"], "shopWeight": 3},
                {"id": "glyph_b", "name": "Glyph B", "traits": ["Water"], "wildcardTrait": true,
                 "ability": {"name": "Splash", "description": "Heals $value.", "type": "HEAL",
                             "pattern": "SURROUND", "values": [1, 2, 3], "range": [1, 1, 1]}}
                """));

        assertEquals(
                List.of("glyph_a", "glyph_b"),
                units.stream().map(UnitDefinition::id).toList());
        var first = units.get(0);
        var second = units.get(1);
        assertEquals("glyph", first.lineId());
        assertEquals("glyph", first.variantGroup());
        assertEquals("Glyph A", first.name());
        assertEquals(List.of("Fire"), first.traits());
        assertEquals(3, first.shopWeight());
        assertFalse(first.hasWildcardTrait());
        assertEquals("Mark", first.ability().name());
        assertEquals(2, first.cost());
        assertEquals(List.of(600, 1000, 2000), first.maxHealth());

        assertEquals(1, second.shopWeight());
        assertTrue(second.hasWildcardTrait());
        assertEquals(AbilityType.HEAL, second.ability().type());
        assertEquals(AbilityPattern.SURROUND, second.ability().pattern());
    }

    @Test
    void plainUnitsHaveNoVariantGroup() {
        var unit = new UnitDefinition(
                "plain",
                "Plain",
                1,
                net.lwenstrom.tft.backend.core.model.UnitRole.DAMAGE,
                List.of(1, 1, 1),
                List.of(1, 1, 1),
                List.of(1, 1, 1),
                List.of(0, 0, 0),
                List.of(0, 0, 0),
                List.of(1f, 1f, 1f),
                List.of(1, 1, 1),
                List.of(),
                null);

        assertNull(unit.variantGroup());
        assertEquals(1, unit.shopWeight());
        assertFalse(unit.hasWildcardTrait());
    }

    @Test
    void rejectsDuplicateVariantIds() {
        var error = assertThrows(IllegalStateException.class, () -> parse(template("""
                        {"id": "glyph_a", "name": "Glyph A", "traits": ["Fire"]},
                        {"id": "glyph_a", "name": "Glyph A2", "traits": ["Water"]}
                        """)));

        assertTrue(error.getMessage().contains("Duplicate unit id glyph_a"), error.getMessage());
    }

    @Test
    void rejectsNonPositiveShopWeights() {
        var error = assertThrows(IllegalStateException.class, () -> parse(template("""
                        {"id": "glyph_a", "name": "Glyph A", "traits": ["Fire"], "shopWeight": 0}
                        """)));

        assertTrue(error.getMessage().contains("positive shopWeight"), error.getMessage());
    }

    @Test
    void rejectsVariantsWithoutTraits() {
        var error = assertThrows(IllegalStateException.class, () -> parse(template("""
                        {"id": "glyph_a", "name": "Glyph A"}
                        """)));

        assertTrue(error.getMessage().contains("glyph_a needs traits"), error.getMessage());
    }

    @Test
    void rejectsUnknownVariantTraitsAtStartup() {
        GameModeProvider provider = new GameModeProvider() {
            @Override
            public GameMode getMode() {
                return GameMode.ONEPIECE;
            }

            @Override
            public String getUnitsPath() {
                return "/units/unknown_variant_trait_units.json";
            }
        };
        var dataLoader = new DataLoader(new GameModeRegistry(List.of(provider)), JSON_MAPPER);

        var error = assertThrows(IllegalStateException.class, dataLoader::loadData);

        assertTrue(error.getMessage().contains("glyph_b references unknown trait Not A Trait"), error.getMessage());
    }

    @Test
    void traitChoiceStarOffersEveryMissingTraitToNonWildcardVariants() throws Exception {
        var units = DataLoader.parseUnits(JSON_MAPPER, JSON_MAPPER.readTree("""
                [{"id": "glyph", "name": "Glyph", "cost": 1, "role": "SUPPORT",
                  "maxHealth": [1, 2, 3], "maxMana": [1, 1, 1], "attackDamage": [1, 2, 3],
                  "abilityPower": [0, 0, 0], "defense": [1, 1, 1], "attackSpeed": [1, 1, 1],
                  "range": [1, 1, 1], "traits": ["Water"], "traitChoiceStar": 2,
                  "variants": [
                    {"id": "glyph_a", "name": "Glyph A", "traits": ["Water"]},
                    {"id": "glyph_b", "name": "Glyph B", "traits": ["Water"], "wildcardTrait": true,
                     "wildcardTraitStar": 2}
                  ]}]
                """), List.of("Water", "Fire", "Grass"));

        var letter = units.get(0);
        assertFalse(letter.isPending(1, null));
        assertTrue(letter.isPending(2, null));
        assertEquals(List.of("fire", "grass"), letter.branchIdsAt(2));
        assertEquals(List.of("Water", "Grass"), letter.formAt(3, "grass").traits());
        assertEquals("glyph_a", letter.formAt(2, "grass").definitionId());
        DataLoader.validateUnitForms(letter);
        assertTrue(units.get(1).forms().isEmpty());
        assertFalse(units.get(1).hasWildcardTraitAt(1));
        assertTrue(units.get(1).hasWildcardTraitAt(2));
    }

    @Test
    void gen23RegistersTwentyEightLetterVariantsButNotTheirTemplate() {
        var dataLoader = new DataLoader(new GameModeRegistry(TestHelpers.allModeProviders()), JSON_MAPPER);

        var variants = dataLoader.getVariants(GameMode.POKEMON_GEN23, "unown");

        assertEquals(28, variants.size());
        assertNull(dataLoader.getUnitDefinition(GameMode.POKEMON_GEN23, "unown"));
        assertTrue(variants.stream().allMatch(variant -> variant.lineId().equals("unown") && variant.cost() == 2));
        assertTrue(variants.stream().allMatch(variant -> variant.traits().equals(List.of("Psychic"))));
        var letter = dataLoader.getUnitDefinition(GameMode.POKEMON_GEN23, "unown_q");
        assertEquals(2, letter.branchPoint());
        assertEquals(16, letter.branchIdsAt(2).size());
        assertFalse(letter.offersBranch("psychic"));
        assertEquals(List.of("Psychic", "Dark"), letter.formAt(2, "dark").traits());
        assertEquals("unown_q", letter.formAt(3, "dark").definitionId());
        var question = dataLoader.getUnitDefinition(GameMode.POKEMON_GEN23, "unown_question");
        var exclamation = dataLoader.getUnitDefinition(GameMode.POKEMON_GEN23, "unown_exclamation");
        assertTrue(question.hasWildcardTrait());
        assertTrue(exclamation.hasWildcardTrait());
        assertFalse(question.hasWildcardTraitAt(1));
        assertTrue(question.hasWildcardTraitAt(2));
        assertEquals(-1, question.branchPoint());
        assertEquals(-1, exclamation.branchPoint());
        assertEquals(List.of("Psychic"), question.traits());
        assertEquals(List.of("Psychic"), exclamation.traits());
        assertEquals(AbilityPattern.LINE, exclamation.ability().pattern());
        assertTrue(
                exclamation.ability().getValueForLevel(1) > question.ability().getValueForLevel(1));
        var weights =
                variants.stream().collect(Collectors.groupingBy(UnitDefinition::shopWeight, Collectors.counting()));
        assertEquals(26L, weights.get(2));
        assertEquals(2L, weights.get(1));
    }

    @Test
    void wireShapeExposesTheGroupButNotTheShopWeight() {
        var units = parse(template("""
                {"id": "glyph_a", "name": "Glyph A", "traits": ["Fire"], "shopWeight": 2},
                {"id": "glyph_b", "name": "Glyph B", "traits": ["Fire"], "wildcardTrait": true}
                """));

        var plain = JSON_MAPPER.readTree(JSON_MAPPER.writeValueAsString(units.get(0)));
        var wildcard = JSON_MAPPER.readTree(JSON_MAPPER.writeValueAsString(units.get(1)));

        assertEquals("glyph", plain.get("variantGroup").asString());
        assertFalse(plain.has("shopWeight"));
        assertFalse(plain.has("wildcardTrait"));
        assertTrue(wildcard.get("wildcardTrait").asBoolean());
    }

    private static List<UnitDefinition> parse(String json) {
        return DataLoader.parseUnits(JSON_MAPPER, JSON_MAPPER.readTree(json));
    }

    private static String template(String variants) {
        return """
                [{
                  "id": "glyph", "lineId": "glyph", "name": "Glyph", "cost": 2, "role": "SUPPORT",
                  "maxHealth": [600, 1000, 2000], "maxMana": [50, 50, 50], "attackDamage": [40, 70, 130],
                  "abilityPower": [0, 0, 0], "defense": [20, 20, 20], "attackSpeed": [0.7, 0.7, 0.7],
                  "range": [3, 3, 3], "traits": ["Psychic"],
                  "ability": {"name": "Mark", "description": "Deals $value damage.", "type": "DAMAGE",
                              "pattern": "SINGLE", "values": [100, 200, 400], "range": [3, 3, 4]},
                  "variants": [%s]
                }]
                """.formatted(variants);
    }
}
