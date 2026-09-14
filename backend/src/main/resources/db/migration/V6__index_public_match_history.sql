CREATE INDEX idx_analytics_match_public_history
    ON analytics_match(status, ended_at DESC, id DESC);
