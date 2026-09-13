CREATE TABLE analytics_unit_combat_stat (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES analytics_player_run(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    line_id TEXT NOT NULL,
    definition_id TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    star_level INTEGER NOT NULL CHECK (star_level BETWEEN 1 AND 3),
    damage_dealt INTEGER NOT NULL CHECK (damage_dealt >= 0),
    damage_taken INTEGER NOT NULL CHECK (damage_taken >= 0),
    healing_done INTEGER NOT NULL CHECK (healing_done >= 0),
    shielding_done INTEGER NOT NULL CHECK (shielding_done >= 0),
    UNIQUE (run_id, round_number, line_id)
);

CREATE INDEX idx_analytics_unit_combat_run_round
    ON analytics_unit_combat_stat(run_id, round_number);
CREATE INDEX idx_analytics_unit_combat_line
    ON analytics_unit_combat_stat(line_id);
