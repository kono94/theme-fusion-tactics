# Pokemon Gen 2/3 Icon Batch Prompts

Same pipeline as the Gen 1 set (`../pokemon/ICON_GENERATION_PROMPT.md`): attach the approved style reference
image in the image-generation chat, paste one batch prompt per image, and save each result as
`_generated_batches/gen23-batch-<n>.png` (1024x1024, git-ignored). The quadrant table below maps every batch
quadrant to its `<definitionId>.png` file name for cutting with `scripts/quadrant_cutter.py`.

140 portraits in 35 batches. Background color = the form's most characteristic type (not always its first type, for variety).

## Type Background Colors

- Normal: `#E9E6DE`
- Fire: `#FFD6B8`
- Water: `#BFEFFF`
- Grass: `#C9F3C2`
- Electric: `#FFF4A8`
- Poison: `#E6C6F2`
- Psychic: `#F6C7E6`
- Ground: `#E8D0A5`
- Rock: `#D8D2C4`
- Fighting: `#F5B8A8`
- Ice: `#D7F7FF`
- Dragon: `#CFC8FF`
- Ghost: `#D8C4F0`
- Bug: `#D8F5A6`
- Flying: `#DCE5FF` (new)
- Steel: `#DADDE8` (new)
- Dark: `#C4B8AD` (new)

## Quadrant Map

| Batch | Top-left (q1) | Top-right (q2) | Bottom-left (q3) | Bottom-right (q4) |
|---|---|---|---|---|
| 1 | `chikorita` | `bayleef` | `meganium` | `cyndaquil` |
| 2 | `quilava` | `typhlosion` | `totodile` | `croconaw` |
| 3 | `feraligatr` | `treecko` | `grovyle` | `sceptile` |
| 4 | `torchic` | `combusken` | `blaziken` | `mudkip` |
| 5 | `marshtomp` | `swampert` | `hoothoot` | `noctowl` |
| 6 | `poochyena` | `mightyena` | `zigzagoon` | `linoone` |
| 7 | `wurmple` | `silcoon` | `cascoon` | `beautifly` |
| 8 | `dustox` | `taillow` | `swellow` | `wingull` |
| 9 | `pelipper` | `lotad` | `lombre` | `ludicolo` |
| 10 | `seedot` | `nuzleaf` | `shiftry` | `mareep` |
| 11 | `flaaffy` | `ampharos` | `marill` | `azumarill` |
| 12 | `togepi` | `togetic` | `togekiss` | `natu` |
| 13 | `xatu` | `sneasel` | `weavile` | `murkrow` |
| 14 | `honchkrow` | `houndour` | `houndoom` | `swinub` |
| 15 | `piloswine` | `mamoswine` | `snubbull` | `granbull` |
| 16 | `shroomish` | `breloom` | `makuhita` | `hariyama` |
| 17 | `aron` | `lairon` | `aggron` | `electrike` |
| 18 | `manectric` | `spheal` | `sealeo` | `walrein` |
| 19 | `snorunt` | `glalie` | `froslass` | `phanpy` |
| 20 | `donphan` | `eevee` | `vaporeon` | `jolteon` |
| 21 | `flareon` | `espeon` | `umbreon` | `leafeon` |
| 22 | `glaceon` | `ralts` | `kirlia` | `gardevoir` |
| 23 | `gallade` | `larvitar` | `pupitar` | `tyranitar` |
| 24 | `bagon` | `shelgon` | `salamence` | `beldum` |
| 25 | `metang` | `metagross` | `trapinch` | `vibrava` |
| 26 | `flygon` | `gligar` | `gliscor` | `misdreavus` |
| 27 | `mismagius` | `duskull` | `dusclops` | `dusknoir` |
| 28 | `carvanha` | `sharpedo` | `swablu` | `altaria` |
| 29 | `feebas` | `milotic` | `slakoth` | `vigoroth` |
| 30 | `slaking` | `scizor` | `heracross` | `skarmory` |
| 31 | `steelix` | `blissey` | `wobbuffet` | `miltank` |
| 32 | `absol` | `sableye` | `mawile` | `torkoal` |
| 33 | `castform` | `zangoose` | `seviper` | `lugia` |
| 34 | `ho_oh` | `raikou` | `entei` | `suicune` |
| 35 | `kyogre` | `groudon` | `rayquaza` | `latios` |

## Batch Prompts

### Batch 1: Chikorita, Bayleef, Meganium, Cyndaquil

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Chikorita on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Top-right: Bayleef on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-left: Meganium on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-right: Cyndaquil on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 2: Quilava, Typhlosion, Totodile, Croconaw

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Quilava on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Top-right: Typhlosion on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-left: Totodile on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-right: Croconaw on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 3: Feraligatr, Treecko, Grovyle, Sceptile

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Feraligatr on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Treecko on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-left: Grovyle on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-right: Sceptile on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 4: Torchic, Combusken, Blaziken, Mudkip

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Torchic on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Top-right: Combusken on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-left: Blaziken on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-right: Mudkip on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 5: Marshtomp, Swampert, Hoothoot, Noctowl

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Marshtomp on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Swampert on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-left: Hoothoot on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-right: Noctowl on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 6: Poochyena, Mightyena, Zigzagoon, Linoone

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Poochyena on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Top-right: Mightyena on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Zigzagoon on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-right: Linoone on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 7: Wurmple, Silcoon, Cascoon, Beautifly

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Wurmple on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Top-right: Silcoon on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Bottom-left: Cascoon on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Bottom-right: Beautifly on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 8: Dustox, Taillow, Swellow, Wingull

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Dustox on a flat soft pastel Poison-type background #E6C6F2 with subtle toxic-bubble pixel accents.
Top-right: Taillow on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-left: Swellow on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-right: Wingull on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 9: Pelipper, Lotad, Lombre, Ludicolo

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Pelipper on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Lotad on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-left: Lombre on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-right: Ludicolo on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 10: Seedot, Nuzleaf, Shiftry, Mareep

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Seedot on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Top-right: Nuzleaf on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Shiftry on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-right: Mareep on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 11: Flaaffy, Ampharos, Marill, Azumarill

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Flaaffy on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Top-right: Ampharos on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Bottom-left: Marill on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-right: Azumarill on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 12: Togepi, Togetic, Togekiss, Natu

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Togepi on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Top-right: Togetic on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-left: Togekiss on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-right: Natu on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 13: Xatu, Sneasel, Weavile, Murkrow

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Xatu on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Top-right: Sneasel on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Weavile on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Bottom-right: Murkrow on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 14: Honchkrow, Houndour, Houndoom, Swinub

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Honchkrow on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Top-right: Houndour on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Houndoom on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-right: Swinub on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 15: Piloswine, Mamoswine, Snubbull, Granbull

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Piloswine on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Top-right: Mamoswine on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Bottom-left: Snubbull on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-right: Granbull on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 16: Shroomish, Breloom, Makuhita, Hariyama

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Shroomish on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Top-right: Breloom on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Bottom-left: Makuhita on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Bottom-right: Hariyama on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 17: Aron, Lairon, Aggron, Electrike

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Aron on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Top-right: Lairon on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-left: Aggron on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-right: Electrike on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 18: Manectric, Spheal, Sealeo, Walrein

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Manectric on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Top-right: Spheal on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Bottom-left: Sealeo on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Bottom-right: Walrein on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 19: Snorunt, Glalie, Froslass, Phanpy

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Snorunt on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Top-right: Glalie on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Bottom-left: Froslass on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Bottom-right: Phanpy on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 20: Donphan, Eevee, Vaporeon, Jolteon

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Donphan on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Top-right: Eevee on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-left: Vaporeon on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-right: Jolteon on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 21: Flareon, Espeon, Umbreon, Leafeon

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Flareon on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Top-right: Espeon on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Bottom-left: Umbreon on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-right: Leafeon on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 22: Glaceon, Ralts, Kirlia, Gardevoir

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Glaceon on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Top-right: Ralts on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Bottom-left: Kirlia on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Bottom-right: Gardevoir on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 23: Gallade, Larvitar, Pupitar, Tyranitar

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Gallade on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Top-right: Larvitar on a flat soft pastel Rock-type background #D8D2C4 with subtle pebble pixel accents.
Bottom-left: Pupitar on a flat soft pastel Rock-type background #D8D2C4 with subtle pebble pixel accents.
Bottom-right: Tyranitar on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 24: Bagon, Shelgon, Salamence, Beldum

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Bagon on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Top-right: Shelgon on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Bottom-left: Salamence on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Bottom-right: Beldum on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 25: Metang, Metagross, Trapinch, Vibrava

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Metang on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Top-right: Metagross on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-left: Trapinch on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Bottom-right: Vibrava on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 26: Flygon, Gligar, Gliscor, Misdreavus

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Flygon on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Top-right: Gligar on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Bottom-left: Gliscor on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-right: Misdreavus on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 27: Mismagius, Duskull, Dusclops, Dusknoir

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Mismagius on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Top-right: Duskull on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Bottom-left: Dusclops on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Bottom-right: Dusknoir on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 28: Carvanha, Sharpedo, Swablu, Altaria

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Carvanha on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Sharpedo on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Swablu on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Bottom-right: Altaria on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 29: Feebas, Milotic, Slakoth, Vigoroth

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Feebas on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Milotic on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-left: Slakoth on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-right: Vigoroth on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 30: Slaking, Scizor, Heracross, Skarmory

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Slaking on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Top-right: Scizor on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-left: Heracross on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Bottom-right: Skarmory on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 31: Steelix, Blissey, Wobbuffet, Miltank

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Steelix on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Top-right: Blissey on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-left: Wobbuffet on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Bottom-right: Miltank on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 32: Absol, Sableye, Mawile, Torkoal

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Absol on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Top-right: Sableye on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Bottom-left: Mawile on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-right: Torkoal on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 33: Castform, Zangoose, Seviper, Lugia

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Castform on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Top-right: Zangoose on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-left: Seviper on a flat soft pastel Poison-type background #E6C6F2 with subtle toxic-bubble pixel accents.
Bottom-right: Lugia on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 34: Ho-Oh, Raikou, Entei, Suicune

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Ho-Oh on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Top-right: Raikou on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Bottom-left: Entei on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-right: Suicune on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 35: Kyogre, Groudon, Rayquaza, Latios

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used but the Pokemon should be a tiny little bit more visible, not just the face and shoulders.
Top-left: Kyogre on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Top-right: Groudon on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Bottom-left: Rayquaza on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Bottom-right: Latios on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Style: close-cropped Pokemon portrait with head and upper body visible, modern high-quality pixel art, thick dark navy/black pixel outline, chunky pixel grid, saturated cel-shaded colors, crisp edges, centered and filling most of each quadrant. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

## Unown Letter Batches

Unown is one line with 28 letter variants. Background color = the letter's second type (`?` and `!` use Psychic). Each quadrant must show the actual Pokemon Unown creature design from Pokemon Gold/Silver, not a font letter with an eye: a black body built around one big eye, with thin stick-like limbs that end in small round nubs and only suggest the letter shape. The whole body is visible, because Unown has no head or shoulders.

Attach the official artwork of the four forms after the style reference, in quadrant order, and tell the model to copy each silhouette. Forms that still come out wrong (C, D, O, P, R, T, V, W, Y and `!` did) are regenerated one per image with only that form's official artwork attached, saved as `_generated_batches/gen23-unown-<id>.png` and scaled to 512x512.

| Batch | Top-left (q1) | Top-right (q2) | Bottom-left (q3) | Bottom-right (q4) |
|---|---|---|---|---|
| 36 | `unown_a` | `unown_b` | `unown_c` | `unown_d` |
| 37 | `unown_e` | `unown_f` | `unown_g` | `unown_h` |
| 38 | `unown_i` | `unown_j` | `unown_k` | `unown_l` |
| 39 | `unown_m` | `unown_n` | `unown_o` | `unown_p` |
| 40 | `unown_q` | `unown_r` | `unown_s` | `unown_t` |
| 41 | `unown_u` | `unown_v` | `unown_w` | `unown_x` |
| 42 | `unown_y` | `unown_z` | `unown_question` | `unown_exclamation` |

### Batch 36: Unown A, B, C, D

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown A form exactly as its official design, on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Top-right: Unown B form exactly as its official design, on a flat soft pastel Bug-type background #D8F5A6 with subtle pollen pixel accents.
Bottom-left: Unown C form exactly as its official design, on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Bottom-right: Unown D form exactly as its official design, on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 37: Unown E, F, G, H

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown E form exactly as its official design, on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Top-right: Unown F form exactly as its official design, on a flat soft pastel Fire-type background #FFD6B8 with subtle ember pixel accents.
Bottom-left: Unown G form exactly as its official design, on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Bottom-right: Unown H form exactly as its official design, on a flat soft pastel Ghost-type background #D8C4F0 with subtle wisp pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 38: Unown I, J, K, L

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown I form exactly as its official design, on a flat soft pastel Ice-type background #D7F7FF with subtle snowflake pixel accents.
Top-right: Unown J form exactly as its official design, on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Bottom-left: Unown K form exactly as its official design, on a flat soft pastel Fighting-type background #F5B8A8 with subtle impact-line pixel accents.
Bottom-right: Unown L form exactly as its official design, on a flat soft pastel Grass-type background #C9F3C2 with subtle leaf pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 39: Unown M, N, O, P

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown M form exactly as its official design, on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Top-right: Unown N form exactly as its official design, on a flat soft pastel Normal-type background #E9E6DE with subtle dust pixel accents.
Bottom-left: Unown O form exactly as its official design, on a flat soft pastel Rock-type background #D8D2C4 with subtle pebble pixel accents.
Bottom-right: Unown P form exactly as its official design, on a flat soft pastel Poison-type background #E6C6F2 with subtle toxic-bubble pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 40: Unown Q, R, S, T

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown Q form exactly as its official design, on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Top-right: Unown R form exactly as its official design, on a flat soft pastel Rock-type background #D8D2C4 with subtle pebble pixel accents.
Bottom-left: Unown S form exactly as its official design, on a flat soft pastel Steel-type background #DADDE8 with subtle metal-shard pixel accents.
Bottom-right: Unown T form exactly as its official design, on a flat soft pastel Ground-type background #E8D0A5 with subtle sand-grain pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 41: Unown U, V, W, X

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown U form exactly as its official design, on a flat soft pastel Dark-type background #C4B8AD with subtle crescent-moon and shadow pixel accents.
Top-right: Unown V form exactly as its official design, on a flat soft pastel Poison-type background #E6C6F2 with subtle toxic-bubble pixel accents.
Bottom-left: Unown W form exactly as its official design, on a flat soft pastel Water-type background #BFEFFF with subtle bubble pixel accents.
Bottom-right: Unown X form exactly as its official design, on a flat soft pastel Dragon-type background #CFC8FF with subtle scale-shimmer pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```

### Batch 42: Unown Y, Z, ?, !

```text
Create a single 1024x1024 image split into four equal quadrants for auto-battler unit icons. I will provide a reference image of the style that should be used. Each quadrant shows the real Pokemon Unown (Pokedex #201) in one of its official forms, drawn faithfully to its original Pokemon Gold/Silver sprite and anime design. Unown anatomy, follow it strictly: (1) the largest part is a round black body that is mostly one big white eye with a dark pupil; (2) everything else is THIN black stick-limbs, much thinner than the eye body (about a quarter of the eye's width); (3) EVERY free limb end finishes in a small round black ball nub; (4) the limbs attach to the eye body and only loosely sketch the letter, the way a stick figure sketches a pose; (5) no thick uniform letter strokes, no closed letter outlines, no rectangles, no font shapes. It must look like a strange floating creature first and a letter second, like the official Unown A: an eye body, an antenna with a ball on top, and two thin legs with balls at the feet.
Top-left: Unown Y form exactly as its official design, on a flat soft pastel Flying-type background #DCE5FF with subtle feather and breeze pixel accents.
Top-right: Unown Z form exactly as its official design, on a flat soft pastel Electric-type background #FFF4A8 with subtle spark pixel accents.
Bottom-left: Unown Question Mark form exactly as its official design, on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Bottom-right: Unown Exclamation Mark form exactly as its official design, on a flat soft pastel Psychic-type background #F6C7E6 with subtle psychic aura pixel accents.
Style: modern high-quality pixel art version of the official Unown designs, dark navy/black pixel outline around the eye body, thin limbs, chunky pixel grid, crisp edges, the whole Unown body visible, centered and filling most of each quadrant. Do not draw plain alphabet letters, fonts or typography. No text, no watermark, no UI frame, no decorative border, no black grid lines, no visible divider lines between quadrants.
```
