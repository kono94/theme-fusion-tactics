# One Piece Unit Set Design

> Historical roster design, retained for reference. Current units, abilities, traits, and evolution
> forms are defined in the [live catalog](../backend/src/main/resources/data/units_onepiece.json);
> use [backend context](../backend/BACKEND_CONTEXT.md) for implemented mechanics.

> **55 units** | **7 Origins** | Abilities balanced for implementation effort

---

## Ability System

### Implemented Types
| Type | Effect |
|------|--------|
| `DAMAGE` | Deal damage (SINGLE/LINE/SURROUND) |
| `STUN` | Skip N ticks |
| `HEAL` | Restore HP |
| `BUFF_ATK` | +ATK% to allies |
| `BUFF_SPD` | +AS% to allies |

### Modifiers (Implemented)
- `EXECUTE` - Bonus damage to low HP
- `LIFESTEAL` - Heal from damage dealt
- `SCALING` - Scale with missing HP/etc

### Easy to Add (Simple State Changes)
| Feature | Complexity | Example Units |
|---------|------------|---------------|
| Knockback | Move position | Kuma, Jinbei |
| Shield | Absorb damage first | Perospero |
| Burn/DoT | Damage over time | Ace, Akainu |
| Debuff | Reduce enemy damage% | Smoker |
| Summon | Spawn temp units | Cracker |
| Revive | Resurrect dead ally | Big Mom |
| Dodge | % miss chance | Katakuri |

### Avoid (Complex Logic)
- Teleport, Untargetable, Taunt

---

## Unit Roster

### STRAW HAT (10)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Luffy | 1 | Fighter | DAMAGE SINGLE + Execute |
| Nami | 1 | Navigator | STUN LINE |
| Usopp | 1 | Sniper | BUFF_ATK |
| Zoro | 2 | Swordsman | DAMAGE SURROUND |
| Sanji | 2 | Fighter | BUFF_SPD |
| Chopper | 2 | Doctor | HEAL SINGLE |
| Robin | 3 | Mage | DAMAGE SINGLE + STUN |
| Franky | 3 | Tank | DAMAGE LINE |
| Brook | 4 | Swordsman, Musician | STUN SURROUND (freeze) |
| Jinbei | 4 | Fighter, Tank | DAMAGE SURROUND + Knockback |

---

### MARINE (9)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Koby | 1 | Fighter | HEAL self |
| Helmeppo | 1 | Swordsman | DAMAGE SINGLE |
| Tashigi | 2 | Swordsman | DAMAGE SINGLE |
| Hina | 2 | Tank | STUN SINGLE |
| Smoker | 3 | Tank | Debuff enemies (-DMG%) |
| Garp | 4 | Fighter | DAMAGE SINGLE + SCALING |
| Sengoku | 4 | Support, Tank | BUFF_ATK team |
| Kizaru | 5 | Assassin | DAMAGE LINE (high) |
| Akainu | 5 | Fighter | DAMAGE SURROUND + Burn DoT |

---

### WARLORD (7)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Buggy | 1 | Assassin | DAMAGE SURROUND |
| Moria | 2 | Mage | DAMAGE + LIFESTEAL |
| Crocodile | 3 | Mage | DAMAGE SURROUND + LIFESTEAL |
| Kuma | 3 | Tank | DAMAGE SURROUND + Knockback |
| Doflamingo | 4 | Mage, Assassin | DAMAGE LINE (high) |
| Mihawk | 4 | Swordsman | DAMAGE LINE (max range) |
| Hancock | 4 | Mage | STUN SURROUND (long) |

---

### BEAST PIRATES (9)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Gifter | 1 | Fighter | DAMAGE SINGLE |
| Headliner | 1 | Berserker | BUFF_ATK self |
| Ulti | 2 | Berserker | DAMAGE SINGLE (high) |
| Page One | 2 | Tank | BUFF_ATK + Shield self |
| Sasaki | 3 | Tank | DAMAGE LINE + Knockback |
| Who's Who | 3 | Assassin | DAMAGE SINGLE (fast) |
| Queen | 4 | Tank, Mage | DAMAGE SURROUND + Burn DoT |
| King | 4 | Fighter, Berserker | DAMAGE SURROUND + SCALING |
| Kaido | 5 | Tank, Berserker | DAMAGE SURROUND + STUN + EXECUTE |

---

### BIG MOM PIRATES (8)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Chess Soldiers | 1 | Tank | BUFF_ATK small |
| Prometheus | 1 | Mage | DAMAGE SURROUND + Burn |
| Perospero | 2 | Mage | Shield ally |
| Daifuku | 2 | Fighter | DAMAGE SINGLE |
| Cracker | 3 | Swordsman | Summon 2 biscuit soldiers |
| Smoothie | 3 | Berserker | DAMAGE + LIFESTEAL |
| Katakuri | 5 | Fighter | DAMAGE SINGLE + Dodge buff |
| Big Mom | 5 | Mage, Tank | DAMAGE SURROUND + Revive ally |

---

### REVOLUTIONARY (6)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Hack | 1 | Fighter | DAMAGE SINGLE |
| Koala | 2 | Fighter, Support | BUFF_ATK |
| Belo Betty | 2 | Support | BUFF_ATK (strong) |
| Ivankov | 3 | Support | HEAL SURROUND |
| Sabo | 4 | Fighter | DAMAGE SINGLE + Burn DoT |
| Dragon | 5 | Mage | DAMAGE SURROUND + Debuff enemies |

---

### WHITEBEARD PIRATES (6)

| Name | Cost | Class | Ability |
|------|------|-------|---------|
| Thatch | 1 | Swordsman | DAMAGE SINGLE |
| Jozu | 2 | Tank | Shield self (high) |
| Vista | 3 | Swordsman | DAMAGE SURROUND + Bleed DoT |
| Ace | 4 | Mage, Fighter | DAMAGE SURROUND + Burn DoT |
| Marco | 4 | Support, Mage | HEAL SURROUND (HoT) |
| Whitebeard | 5 | Fighter | DAMAGE SURROUND + SCALING |

---

## Trait Effects

### Origins
| Trait | 2 | 4 | 6 |
|-------|---|---|---|
| Straw Hat | +200 HP, +10% AS | +400 HP, +25% AS | +700 HP, +50% AS |
| Marine | +25 Armor/MR | +60 Armor/MR | +100 Armor/MR |
| Warlord | +25% Ability DMG | +40% Ability DMG | +60% Ability DMG |
| Beast Pirates | +15% DMG <70% HP | +30% DMG <70% HP | +50% DMG <50% HP |
| Big Mom | Heal 10% DMG dealt | Heal 20% | Heal 30% + Revive |
| Revolutionary | +10% AS | +25% AS | +45% AS |
| Whitebeard | +15% ATK | +30% ATK | +50% ATK + Shield on ally death |

### Classes
| Trait | 2 | 4 | 6 |
|-------|---|---|---|
| Fighter | +150 HP | +350 HP | +700 HP |
| Swordsman | 30% extra attack | 55% | 80% |
| Tank | +200 HP | +500 HP | - |
| Assassin | +20% DMG | +45% DMG | - |
| Mage | +15% Mana/atk | +30% | +50% |
| Support | +20 Start Mana | +50 Start Mana | - |
| Berserker | +20% AS <60% HP | +40% AS <40% HP | - |
| Sniper | +10% DMG/cell | +20% DMG/cell | - |

**Unique**: Navigator (1: +gold), Doctor (1: +heal%), Musician (1: team AS on cast)

---

## New Ability Types to Implement

| Type | Priority | Implementation |
|------|----------|----------------|
| SHIELD | High | Add shield field, absorbs damage |
| DOT (Burn) | High | Tick counter, damage per tick |
| DEBUFF | Medium | Damage reduction multiplier |
| KNOCKBACK | Medium | Alter unit position |
| SUMMON | Medium | Spawn temp units |
| REVIVE | Low | Respawn dead ally |
| DODGE | Low | Miss chance on attacks |

---

## Stats Reference

| Cost | HP | ATK | AS | Ability |
|------|-----|-----|-----|---------|
| 1 | 400-600 | 35-50 | 0.5-0.65 | 150-250 |
| 2 | 550-750 | 45-65 | 0.55-0.7 | 200-350 |
| 3 | 700-900 | 55-80 | 0.6-0.75 | 300-500 |
| 4 | 850-1100 | 70-100 | 0.65-0.8 | 400-700 |
| 5 | 1000-1400 | 85-120 | 0.7-0.85 | 600-1000 |

**Star Scaling**: 2★ = 1.8× | 3★ = 3.24×
