package net.lwenstrom.tft.backend.core.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

// Sealed interface for ability modifiers that enhance or alter ability behavior.
// Modifiers are backend-only and don't require frontend animation changes.
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = ScalingModifier.class, name = "SCALING"),
    @JsonSubTypes.Type(value = ConditionalModifier.class, name = "CONDITIONAL"),
    @JsonSubTypes.Type(value = LifestealModifier.class, name = "LIFESTEAL"),
    @JsonSubTypes.Type(value = ExecuteModifier.class, name = "EXECUTE"),
    @JsonSubTypes.Type(value = StunModifier.class, name = "STUN"),
    @JsonSubTypes.Type(value = KnockbackModifier.class, name = "KNOCKBACK"),
    @JsonSubTypes.Type(value = DotModifier.class, name = "DOT"),
    @JsonSubTypes.Type(value = FieldConditionModifier.class, name = "FIELD_CONDITION")
})
public sealed interface AbilityModifier
        permits ScalingModifier,
                ConditionalModifier,
                LifestealModifier,
                ExecuteModifier,
                StunModifier,
                KnockbackModifier,
                DotModifier,
                FieldConditionModifier {}
