-- Cloud SQL table for HIPAA-compliant storage of action request comments.
-- Comments (sensitive coach feedback) are migrated out of Supabase
-- (rhwb_action_requests.comments) into this GCP Cloud SQL table.

CREATE TABLE IF NOT EXISTS action_comments (
    id                  SERIAL PRIMARY KEY,
    action_request_id   UUID NOT NULL,             -- FK reference to rhwb_action_requests.id (UUID)
    runner_id           UUID NOT NULL,             -- No PII (UUID from runners_profile)
    requestor_id        UUID NOT NULL,             -- Coach's runner_id (UUID)
    season              TEXT NOT NULL,
    comment             TEXT NOT NULL,
    action_type         TEXT NOT NULL,             -- 'Transfer Runner' or 'Defer Runner'
    source_table        TEXT NOT NULL DEFAULT 'rhwb_action_requests',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_action_comment UNIQUE (action_request_id)
);

CREATE INDEX IF NOT EXISTS idx_action_comment_runner ON action_comments (runner_id, season);
CREATE INDEX IF NOT EXISTS idx_action_comment_requestor ON action_comments (requestor_id, season);
