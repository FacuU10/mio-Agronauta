CREATE TABLE IF NOT EXISTS demo_contact_submissions (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  organization text,
  role text,
  hectares_range text,
  locality text,
  message text,
  source_path text NOT NULL,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_contact_submissions_created_at_idx
  ON demo_contact_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS demo_contact_submissions_email_idx
  ON demo_contact_submissions (email);
