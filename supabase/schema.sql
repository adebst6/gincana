BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migra automaticamente o schema antigo usado pela versao Python.
DO $$
BEGIN
    IF to_regclass('public.submissions') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'answers_json'
       ) THEN
        ALTER TABLE public.submissions RENAME TO submissions_legacy;
    END IF;

    IF to_regclass('public.exams') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'questions_json'
       ) THEN
        ALTER TABLE public.exams RENAME TO exams_legacy;
    END IF;

    IF to_regclass('public.scores') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'group_name'
       ) THEN
        ALTER TABLE public.scores RENAME TO scores_legacy;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.scores (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    boys_points INTEGER NOT NULL DEFAULT 0 CHECK (boys_points >= 0),
    girls_points INTEGER NOT NULL DEFAULT 0 CHECK (girls_points >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    questions JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    group_name TEXT NOT NULL CHECK (group_name IN ('Meninos', 'Meninas')),
    answers JSONB NOT NULL DEFAULT '[]'::JSONB,
    score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (score >= 0),
    tab_leave_count INTEGER NOT NULL DEFAULT 0 CHECK (tab_leave_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
    legacy_exam RECORD;
    new_exam_id UUID;
BEGIN
    IF to_regclass('public.scores_legacy') IS NOT NULL THEN
        INSERT INTO public.scores (id, boys_points, girls_points, updated_at)
        SELECT
            1,
            COALESCE(MAX(points) FILTER (WHERE group_name = 'Meninos'), 0),
            COALESCE(MAX(points) FILTER (WHERE group_name = 'Meninas'), 0),
            COALESCE(MAX(updated_at), NOW())
        FROM public.scores_legacy
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF to_regclass('public.exams_legacy') IS NOT NULL THEN
        FOR legacy_exam IN SELECT * FROM public.exams_legacy LOOP
            new_exam_id := gen_random_uuid();
            INSERT INTO public.exams (id, title, description, active, questions, created_at)
            VALUES (
                new_exam_id,
                legacy_exam.title,
                COALESCE(legacy_exam.description, ''),
                legacy_exam.active,
                COALESCE(legacy_exam.questions_json, '[]'::JSONB),
                legacy_exam.created_at
            );

            IF to_regclass('public.submissions_legacy') IS NOT NULL THEN
                INSERT INTO public.submissions (
                    id, exam_id, participant_name, group_name, answers,
                    score, tab_leave_count, created_at
                )
                SELECT
                    gen_random_uuid(),
                    new_exam_id,
                    participant_name,
                    group_name,
                    COALESCE(answers_json, '[]'::JSONB),
                    auto_score,
                    focus_losses,
                    submitted_at
                FROM public.submissions_legacy
                WHERE exam_id = legacy_exam.id;
            END IF;
        END LOOP;
    END IF;
END
$$;

INSERT INTO public.scores (id, boys_points, girls_points)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.submissions_legacy;
DROP TABLE IF EXISTS public.exams_legacy;
DROP TABLE IF EXISTS public.scores_legacy;

CREATE INDEX IF NOT EXISTS idx_exams_active ON public.exams (active);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON public.submissions (exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_group_name ON public.submissions (group_name);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions (created_at DESC);

-- MVP sem Supabase Auth: o navegador usa a chave publica para administrar os dados.
-- Isso e intencionalmente simples e NAO deve ser tratado como seguranca de producao.
ALTER TABLE public.scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO anon, authenticated;

COMMIT;
