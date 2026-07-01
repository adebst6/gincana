CREATE TABLE IF NOT EXISTS scores (
    group_name TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scores_group_name_check CHECK (group_name IN ('Meninos', 'Meninas'))
);

CREATE TABLE IF NOT EXISTS exams (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    questions_json JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
    participant_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    answers_json JSONB NOT NULL DEFAULT '[]'::JSONB,
    auto_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (auto_score >= 0),
    focus_losses INTEGER NOT NULL DEFAULT 0 CHECK (focus_losses >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT submissions_group_name_check CHECK (group_name IN ('Meninos', 'Meninas'))
);

CREATE INDEX IF NOT EXISTS idx_exams_slug_active ON exams (slug, active);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON submissions (exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_group_name ON submissions (group_name);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_name ON submissions (participant_name);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions (submitted_at DESC);
