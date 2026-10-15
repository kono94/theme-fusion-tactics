# Pokemon Unit Set Design

> Historical roster design, retained for reference. Current units, abilities, traits, and evolution
> forms are defined in the [live catalog](../backend/src/main/resources/data/units_pokemon.json);
> use [backend context](../backend/BACKEND_CONTEXT.md) for implemented mechanics.
55 purchasable lines with Kanto base Pokemon and cross-generation evolutions where useful.
## Cost Distribution
- Cost 1: 12 lines - Bulbasaur, Charmander, Squirtle, Caterpie, Weedle, Pidgey, Rattata, Spearow, Nidoran-F, Nidoran-M, Oddish, Poliwag
- Cost 2: 13 lines - Pikachu, Sandshrew, Vulpix, Jigglypuff, Zubat, Psyduck, Mankey, Growlithe, Tentacool, Geodude, Ponyta, Slowpoke, Magnemite
- Cost 3: 11 lines - Abra, Machop, Bellsprout, Doduo, Seel, Grimer, Shellder, Gastly, Krabby, Horsea, Dratini
- Cost 4: 12 lines - Farfetch'd, Hitmonlee, Hitmonchan, Kangaskhan, Mr. Mime, Pinsir, Lapras, Tauros, Ditto, Porygon, Lickitung, Jynx
- Cost 5: 7 lines - Snorlax, Aerodactyl, Articuno, Zapdos, Moltres, Mewtwo, Mew

## Evolution Rules
- Low-cost lines evolve by star level using `forms`; 4-cost and 5-cost units are single-form.
- Dratini is a 3-cost line: Dratini -> Dragonair -> Dragonite.
- Zubat, Horsea, Magnemite, and Mankey use later-generation final evolutions.
- Slowpoke uses Slowbro at 2-star and 3-star; Slowking is intentionally unused.

## Traits
- Normal (origin): ATK_BUFF
- Fire (origin): ABILITY_DAMAGE
- Water (origin): MANA_GAIN
- Grass (origin): HP
- Electric (origin): AS
- Psychic (origin): START_MANA
- Ground (origin): ARMOR_AND_MR
- Rock (origin): ARMOR_AND_MR
- Flying (origin): AS
- Poison (origin): LOW_HP_DAMAGE
- Bug (origin): EXTRA_ATTACK_CHANCE
- Fighting (origin): ATK_BUFF
- Ice (origin): ARMOR_AND_MR
- Dragon (origin): ABILITY_DAMAGE
- Ghost (origin): LIFESTEAL
- Steel (origin): ARMOR_AND_MR
- Starter (class): HP_AND_AS
- Striker (class): ATK_BUFF
- Defender (class): HP
- Speedster (class): LOW_HP_AS
- Caster (class): MANA_GAIN
- Support (class): HEAL_AMP
- Ranger (class): DISTANCE_DAMAGE
- Legendary (class): ABILITY_DAMAGE
