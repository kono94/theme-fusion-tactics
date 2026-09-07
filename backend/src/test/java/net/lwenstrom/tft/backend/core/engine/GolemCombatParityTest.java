package net.lwenstrom.tft.backend.core.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import net.lwenstrom.tft.backend.core.DataLoader;
import net.lwenstrom.tft.backend.core.GameModeRegistry;
import net.lwenstrom.tft.backend.core.combat.AbilityCaster;
import net.lwenstrom.tft.backend.core.combat.DefaultAbilityCaster;
import net.lwenstrom.tft.backend.core.combat.NearestEnemyTargetSelector;
import net.lwenstrom.tft.backend.core.model.GameMode;
import net.lwenstrom.tft.backend.game.pokemon.PokemonGameModeProvider;
import net.lwenstrom.tft.backend.test.MockUnit;
import net.lwenstrom.tft.backend.test.TestHelpers;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GolemCombatParityTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final DataLoader loader =
            new DataLoader(new GameModeRegistry(List.of(new PokemonGameModeProvider(mapper))), mapper);

    @Test
    void ownershipAndMirroredPositionsDoNotChangeGolemDamage() {
        var baseline = run(false, false);
        assertTrue(
                baseline.casts() > 0 && baseline.attackDamage() > 0 && baseline.manaGained() > 0, baseline.toString());
        assertEquals(baseline, run(true, false));
        assertEquals(baseline, run(false, true));
        assertEquals(baseline, run(true, true));
        System.out.println("Golem controlled parity: " + baseline);
    }

    private Diagnostics run(boolean bot, boolean mirrored) {
        var system = TestHelpers.createPokemonCombatSystem();
        var sourcePlayer = new Player("source", GameMode.POKEMON, loader, TestHelpers.createSeededRandomProvider());
        var enemyPlayer = new Player("enemy", GameMode.POKEMON, loader, TestHelpers.createSeededRandomProvider());
        sourcePlayer.setBot(bot);
        enemyPlayer.setBot(!bot);
        var golem = new CountingGolem(loader.getAllUnits(GameMode.POKEMON).stream()
                .filter(def -> def.id().equals("geodude"))
                .findFirst()
                .orElseThrow());
        golem.setOwnerId(sourcePlayer.getId());
        golem.setPosition(4, mirrored ? 3 : 2);
        golem.setManaGainMultiplier(1.2f);
        golem.setAbilityDamageMultiplier(1.08f);
        TestHelpers.addUnitToPlayer(sourcePlayer, golem);
        for (var i = 0; i < 3; i++) {
            var enemy = MockUnit.create("target-" + i, enemyPlayer.getId())
                    .withPosition(3 + i, mirrored ? 2 : 3)
                    .withHealth(100000, 100000)
                    .withAttackDamage(1)
                    .withTraits(Set.of("Normal"));
            TestHelpers.addUnitToPlayer(enemyPlayer, enemy);
        }
        var casts = 0;
        var hits = 0;
        var attackDamage = 0;
        var spellDamage = 0;
        for (long time = 0; time < 20000; time += 100) {
            var result = system.simulateTick(List.of(sourcePlayer, enemyPlayer), time);
            var castThisTick = false;
            for (var event : result.events()) {
                if (!golem.getId().equals(event.sourceId())
                        || !(event.type().equals("DAMAGE") || event.type().equals("SKILL"))) continue;
                if (event.skillName() == null) attackDamage += event.value();
                else {
                    spellDamage += event.value();
                    hits++;
                    castThisTick = true;
                }
            }
            if (castThisTick) casts++;
        }
        return new Diagnostics(casts, hits, attackDamage, spellDamage, golem.manaGained);
    }

    @Test
    void executeBonusUsesEachVictimsHealth() {
        var golem = new StandardGameUnit(
                loader.getAllUnits(GameMode.POKEMON).stream()
                        .filter(def -> def.id().equals("geodude"))
                        .findFirst()
                        .orElseThrow(),
                3);
        golem.setOwnerId("source");
        golem.setPosition(0, 0);
        var low = MockUnit.create("low", "enemy").withPosition(1, 0).withHealth(300, 1000);
        var healthy = MockUnit.create("healthy", "enemy").withPosition(2, 0).withHealth(1000, 1000);
        var damage = new ArrayList<Integer>();
        new DefaultAbilityCaster()
                .castAbility(
                        golem,
                        List.of(golem, low, healthy),
                        new NearestEnemyTargetSelector(),
                        new AbilityCaster.CombatStatCallback() {
                            @Override
                            public void onDamage(String id, String name, String target, int value) {
                                damage.add(value);
                            }
                        },
                        0);
        assertTrue(damage.get(0) > damage.get(1));
        assertEquals(364, damage.get(1));
    }

    private record Diagnostics(int casts, int targetsHit, int attackDamage, int spellDamage, int manaGained) {}

    private static class CountingGolem extends StandardGameUnit {
        private int manaGained;

        CountingGolem(UnitDefinition definition) {
            super(definition, 3);
        }

        @Override
        public void gainMana(int amount) {
            var previous = getMana();
            super.gainMana(amount);
            manaGained += getMana() - previous;
        }
    }
}
