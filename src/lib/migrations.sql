-- agents table
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  framework text NOT NULL CHECK (framework IN ('openai', 'claude', 'langchain', 'custom')),
  api_key_hash text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  created_at timestamptz DEFAULT now()
);

-- decisions table
CREATE TABLE decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id),
  payload text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('email', 'payment', 'api', 'database')),
  decision text NOT NULL CHECK (decision IN ('ALLOW', 'HOLD', 'BLOCK')),
  risk_score int CHECK (risk_score BETWEEN 0 AND 100),
  blast_radius text CHECK (blast_radius IN ('none', 'limited', 'significant', 'catastrophic')),
  reversible boolean,
  intent text,
  reason text,
  guardrail_hit text,
  eval_path text CHECK (eval_path IN ('fast-block', 'llm-eval', 'fail-safe')),
  latency_ms int,
  human_resolution text CHECK (human_resolution IN ('approved', 'rejected')),
  resolved_by text,
  resolved_at timestamptz,
  row_signature text,
  created_at timestamptz DEFAULT now()
);

-- policies table
CREATE TABLE policies (
  id text PRIMARY KEY,
  name text NOT NULL,
  pattern text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('db', 'email', 'payment', 'api', '*')),
  action text NOT NULL CHECK (action IN ('BLOCK', 'HOLD')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  enabled boolean NOT NULL DEFAULT true,
  agent_ids uuid[],
  updated_at timestamptz DEFAULT now()
);

-- operators table
CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  slack_webhook_url text,
  notify_on text NOT NULL DEFAULT 'hold' CHECK (notify_on IN ('hold', 'all')),
  created_at timestamptz DEFAULT now()
);