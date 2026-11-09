package net.lwenstrom.tft.backend.core.combat;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import net.lwenstrom.tft.backend.core.model.FieldConditionDefinition;
import net.lwenstrom.tft.backend.core.model.FieldConditionView;
import net.lwenstrom.tft.backend.core.model.GameState;

// Both owners of a pairing share one State, so a condition set by either side affects the whole fight.
public final class FieldConditionTracker {

    public static final class State {
        private final List<String> ownerIds;
        private final List<GameState.CombatEvent> pendingEvents = new ArrayList<>();
        private FieldConditionDefinition active;
        private Long expiresAt;
        private long nextPeriodicAt;

        private State(List<String> ownerIds) {
            this.ownerIds = ownerIds;
        }

        public List<String> ownerIds() {
            return ownerIds;
        }

        public Optional<FieldConditionDefinition> active() {
            return Optional.ofNullable(active);
        }

        public Long expiresAt() {
            return expiresAt;
        }

        public void start(FieldConditionDefinition condition, long durationMs, long now) {
            if (condition == null || condition.clearsField()) {
                active = null;
                expiresAt = null;
                return;
            }
            active = condition;
            expiresAt = durationMs > 0 ? now + durationMs : null;
            nextPeriodicAt = condition.periodicDamage() == null
                    ? Long.MAX_VALUE
                    : now + condition.periodicDamage().intervalMs();
        }

        public boolean extend(long durationMs, long now) {
            if (active == null) {
                return false;
            }
            if (expiresAt != null && durationMs > 0) {
                expiresAt = Math.max(expiresAt, now + durationMs);
            }
            return true;
        }

        public boolean expireIfDue(long now) {
            if (active == null || expiresAt == null || now < expiresAt) {
                return false;
            }
            active = null;
            expiresAt = null;
            return true;
        }

        public boolean takePeriodicTick(long now) {
            if (active == null || active.periodicDamage() == null || now < nextPeriodicAt) {
                return false;
            }
            nextPeriodicAt += active.periodicDamage().intervalMs();
            return true;
        }

        public void queueEvent(GameState.CombatEvent event) {
            pendingEvents.add(event);
        }

        public List<GameState.CombatEvent> drainEvents() {
            var events = List.copyOf(pendingEvents);
            pendingEvents.clear();
            return events;
        }

        public Optional<FieldConditionView> view(long now) {
            return active().map(
                            condition -> condition.toView(expiresAt == null ? null : Math.max(0L, expiresAt - now)));
        }
    }

    private final Map<String, State> states = new HashMap<>();

    public void reset() {
        states.clear();
    }

    public State open(Collection<String> ownerIds) {
        var state = new State(List.copyOf(ownerIds));
        ownerIds.forEach(ownerId -> states.put(ownerId, state));
        return state;
    }

    public void close(Collection<String> ownerIds) {
        ownerIds.forEach(states::remove);
    }

    public Optional<State> stateFor(String ownerId) {
        return ownerId == null ? Optional.empty() : Optional.ofNullable(states.get(ownerId));
    }

    public Optional<FieldConditionDefinition> activeFor(String ownerId) {
        return stateFor(ownerId).flatMap(State::active);
    }

    public Optional<FieldConditionView> view(String ownerId, long now) {
        return stateFor(ownerId).flatMap(state -> state.view(now));
    }
}
