package net.lwenstrom.tft.backend.game.onepiece;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import net.lwenstrom.tft.backend.core.engine.UnitDefinition;
import net.lwenstrom.tft.backend.core.model.AbilityType;
import net.lwenstrom.tft.backend.core.model.UnitRole;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

class OnePieceDataValidationTest {
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void onePieceUnitsDefineApprovedRolesAndDefense() throws Exception {
        var units = loadOnePieceUnits();
        var expectedIdsByRole = Map.of(
                UnitRole.DAMAGE,
                Set.of(
                        "luffy_v1",
                        "zoro_v1",
                        "sanji_v1",
                        "helmeppo_v1",
                        "tashigi_v1",
                        "kizaru_v1",
                        "akainu_v1",
                        "buggy_v1",
                        "crocodile_v1",
                        "doflamingo_v1",
                        "mihawk_v1",
                        "gifter_v1",
                        "ulti_v1",
                        "whos_who_v1",
                        "king_v1",
                        "prometheus_v1",
                        "daifuku_v1",
                        "smoothie_v1",
                        "katakuri_v1",
                        "hack_v1",
                        "sabo_v1",
                        "dragon_v1",
                        "thatch_v1",
                        "vista_v1",
                        "ace_v1"),
                UnitRole.TANK,
                Set.of(
                        "franky_v1",
                        "jinbei_v1",
                        "smoker_v1",
                        "garp_v1",
                        "kuma_v1",
                        "page_one_v1",
                        "sasaki_v1",
                        "kaido_v1",
                        "chess_soldiers_v1",
                        "cracker_v1",
                        "big_mom_v1",
                        "jozu_v1",
                        "whitebeard_v1"),
                UnitRole.SUPPORT,
                Set.of(
                        "nami_v1",
                        "usopp_v1",
                        "chopper_v1",
                        "robin_v1",
                        "brook_v1",
                        "koby_v1",
                        "hina_v1",
                        "sengoku_v1",
                        "moria_v1",
                        "hancock_v1",
                        "headliner_v1",
                        "queen_v1",
                        "perospero_v1",
                        "koala_v1",
                        "belo_betty_v1",
                        "ivankov_v1",
                        "marco_v1"));

        assertEquals(55, units.size());
        for (var unit : units) {
            assertTrue(
                    expectedIdsByRole.get(unit.role()).contains(unit.id()),
                    unit.name() + " has unexpected role " + unit.role());
            assertEquals(3, unit.defense().size(), unit.name() + " must define DEF for all star levels");
            assertTrue(
                    unit.defense().stream().allMatch(defense -> defense > 0), unit.name() + " must have positive DEF");
        }
    }

    @Test
    void onePieceKitConversionsUseRoleUtilityAbilities() throws Exception {
        var unitsById = loadOnePieceUnits().stream().collect(Collectors.toMap(UnitDefinition::id, unit -> unit));
        var expectedAbilities = Map.of(
                "sanji_v1", new AbilityExpectation(AbilityType.DAMAGE, List.of(280, 504, 907)),
                "robin_v1", new AbilityExpectation(AbilityType.STUN, List.of(1, 2, 3)),
                "moria_v1", new AbilityExpectation(AbilityType.DEBUFF_DEF, List.of(12, 21, 34)),
                "page_one_v1", new AbilityExpectation(AbilityType.BUFF_DEF, List.of(12, 22, 35)),
                "queen_v1", new AbilityExpectation(AbilityType.DEBUFF_DEF, List.of(14, 25, 40)),
                "hancock_v1", new AbilityExpectation(AbilityType.STUN, List.of(1, 1, 2)),
                "katakuri_v1", new AbilityExpectation(AbilityType.DAMAGE, List.of(966, 1739, 3130)),
                "chess_soldiers_v1", new AbilityExpectation(AbilityType.BUFF_DEF, List.of(10, 18, 30)),
                "cracker_v1", new AbilityExpectation(AbilityType.BUFF_DEF, List.of(20, 35, 60)),
                "jozu_v1", new AbilityExpectation(AbilityType.BUFF_DEF, List.of(18, 32, 55)));

        expectedAbilities.forEach((unitId, expected) -> {
            var ability = unitsById.get(unitId).ability();
            assertEquals(expected.type(), ability.type(), unitId);
            assertEquals(expected.values(), ability.values(), unitId);
        });
        assertEquals(List.of(40, 35, 45), unitsById.get("robin_v1").maxMana());
        assertEquals(1.75f, unitsById.get("hancock_v1").ability().getStunDurationForLevel(3));
    }

    @Test
    void sniperIsOneUnitSelfTrait() throws Exception {
        var traits = loadOnePieceTraits();

        var sniper = traits.stream()
                .filter(trait -> "Sniper".equals(trait.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing Sniper trait"));

        assertEquals("SELF", sniper.get("targetScope"));
        assertEquals("DISTANCE_DAMAGE", sniper.get("effectType"));

        @SuppressWarnings("unchecked")
        var effects = (List<Map<String, Object>>) sniper.get("effects");
        assertEquals(1, effects.size());
        assertEquals(1, effects.getFirst().get("minUnits"));

        @SuppressWarnings("unchecked")
        var values = (Map<String, Object>) effects.getFirst().get("values");
        assertEquals(0.1, ((Number) values.get("damagePerCell")).doubleValue());
    }

    @Test
    void akainuPremiumAoeDamageIncludesRecoveryBuff() throws Exception {
        var akainu = loadOnePieceUnits().stream()
                .filter(unit -> unit.id().equals("akainu_v1"))
                .findFirst()
                .orElseThrow();

        assertEquals(List.of(649, 1166, 2100), akainu.ability().values());
    }

    private List<UnitDefinition> loadOnePieceUnits() throws Exception {
        InputStream is = getClass().getResourceAsStream("/data/units_onepiece.json");
        assertNotNull(is);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private List<Map<String, Object>> loadOnePieceTraits() throws Exception {
        InputStream is = getClass().getResourceAsStream("/data/traits_onepiece.json");
        assertNotNull(is);
        return jsonMapper.readValue(is, new TypeReference<>() {});
    }

    private record AbilityExpectation(AbilityType type, List<Integer> values) {}
}
