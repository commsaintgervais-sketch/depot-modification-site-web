CREATE TABLE requests (
 id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, service TEXT NOT NULL,
 title TEXT NOT NULL, page TEXT NOT NULL, category TEXT NOT NULL, comment TEXT NOT NULL,
 media_link TEXT NOT NULL DEFAULT '', files JSONB NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
 notified_at TIMESTAMPTZ, notification_error TEXT, mail_started_at TIMESTAMPTZ
);
CREATE INDEX requests_completed_idx ON requests(completed_at);
CREATE TABLE login_attempts (ip TEXT PRIMARY KEY, attempts INTEGER NOT NULL, since TIMESTAMPTZ NOT NULL DEFAULT now());
