-- Cola hacia agente de contenido y otros (spec: forecast → content)
-- psql "$DATABASE_URL" -f apps/api/src/db/migrations/20260206120000_agent_tasks.sql

CREATE TABLE IF NOT EXISTS agent_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    task_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    agent_target text NOT NULL DEFAULT 'content-agent',
    processed_at timestamptz,
    last_error text
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks (status, created_at);
