
import type { AbilityDefinition, UnitRole } from '../types'

export interface TraitEffect {
    minUnits: number;
    description: string;
    style: 'bronze' | 'silver' | 'gold' | 'prismatic';
    values?: Record<string, unknown>;
}

export interface TraitRosterUnit {
    lineId: string
    cost: number
    starLevel: number
    definitionId: string
    name: string
    role: UnitRole
    maxHealth: number
    maxMana: number
    attackDamage: number
    abilityPower: number
    defense: number
    attackSpeed: number
    range: number
    traits: string[]
    ability: AbilityDefinition | null
    formattedAbilityDescription: string
}

export interface TraitDefinition {
    id: string; // "straw_hat", "fighter" - normalized
    name: string; // "Straw Hat", "Fighter"
    description: string;
    effects: TraitEffect[];
    type: string;
    targetScope?: 'SELF' | 'TEAM';
    iconColor: string; // Simple hex for placeholder
    iconGlyph?: string;
    effectType?: string;
    units?: TraitRosterUnit[];
}

// Global store for traits, populated by App.vue from backend
export const TRAIT_DATA: Record<string, TraitDefinition> = {};

export const setTraitData = (traits: TraitDefinition[]) => {
    // Clear existing for hot-swap
    Object.keys(TRAIT_DATA).forEach(key => delete TRAIT_DATA[key]);
    traits.forEach(trait => {
        TRAIT_DATA[trait.id] = trait;
        TRAIT_DATA[normalizeTraitId(trait.id)] = trait;
    });
};

// Helper to normalize trait names to IDs
export const normalizeTraitId = (name: string): string => {
    return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export const getTraitGlyph = (trait: TraitDefinition): string =>
    trait.iconGlyph?.trim() || trait.name.trim().charAt(0) || '•';

export const getTraitData = (name: string): TraitDefinition | null => {
    const id = normalizeTraitId(name);
    return TRAIT_DATA[id] || null;
}
