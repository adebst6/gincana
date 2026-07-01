#!/usr/bin/env python3
import hashlib
import hmac
import json
import mimetypes
import os
import re
import sys
import traceback
import uuid
from datetime import datetime, timezone
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb
except ImportError:  # pragma: no cover - handled at runtime with a clear message.
    psycopg = None
    dict_row = None
    Jsonb = None


ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"
SCHEMA_PATH = ROOT / "supabase" / "schema.sql"

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
DATABASE_URL = os.environ.get("DATABASE_URL", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "troque-este-segredo-em-producao")
SESSION_COOKIE = "gincana_session"

GROUPS = ("Meninos", "Meninas")
QUESTION_TYPES = {"single", "multi", "short", "long"}
DB_READY = False
DB_INIT_ERROR = None


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect_db():
    if psycopg is None:
        raise RuntimeError("Instale as dependências com: pip install -r requirements.txt")
    if not DATABASE_URL:
        raise RuntimeError("Defina DATABASE_URL para conectar ao PostgreSQL/Supabase.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10)


def load_json_value(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, str):
        return json.loads(value)
    return value


def serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    return str(value)


def number_value(value):
    return float(value or 0)


def init_db():
    if not SCHEMA_PATH.exists():
        raise RuntimeError(f"Schema não encontrado: {SCHEMA_PATH}")
    with connect_db() as conn:
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
        for group in GROUPS:
            conn.execute(
                """
                INSERT INTO scores (group_name, points, updated_at)
                VALUES (%s, 0, %s)
                ON CONFLICT (group_name) DO NOTHING
                """,
                (group, now_iso()),
            )


def log_exception(context, exc):
    print(
        f"[{now_iso()}] {context}: {exc.__class__.__name__}: {exc}",
        file=sys.stderr,
    )
    traceback.print_exc()


def ensure_db_ready():
    global DB_READY, DB_INIT_ERROR

    if DB_READY:
        return True

    try:
        init_db()
    except Exception as exc:  # pragma: no cover - depends on deployed DB/network.
        DB_READY = False
        DB_INIT_ERROR = exc
        log_exception("Falha ao inicializar o banco de dados", exc)
        return False

    DB_READY = True
    DB_INIT_ERROR = None
    print(f"[{now_iso()}] Banco de dados inicializado.", file=sys.stderr)
    return True


def db_error_payload():
    detail = ""
    if DB_INIT_ERROR is not None:
        detail = f"{DB_INIT_ERROR.__class__.__name__}: {DB_INIT_ERROR}"

    return {
        "error": "Banco de dados indisponível.",
        "details": detail,
        "hint": "Na Vercel, use a connection string do Supabase Pooler em DATABASE_URL.",
    }


def session_token():
    return hmac.new(
        SESSION_SECRET.encode("utf-8"), b"gincana-admin", hashlib.sha256
    ).hexdigest()


def parse_cookie(header):
    jar = cookies.SimpleCookie()
    if header:
        jar.load(header)
    return {key: morsel.value for key, morsel in jar.items()}


def slugify(value):
    text = value.strip().lower()
    text = (
        text.replace("á", "a")
        .replace("à", "a")
        .replace("ã", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "prova"


def make_unique_slug(conn, title):
    base = slugify(title)
    while True:
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
        exists = conn.execute(
            "SELECT 1 FROM exams WHERE slug = %s", (candidate,)
        ).fetchone()
        if not exists:
            return candidate


def normalize_questions(raw_questions):
    questions = []
    for item in raw_questions if isinstance(raw_questions, list) else []:
        q_type = item.get("type")
        if q_type not in QUESTION_TYPES:
            continue

        options = []
        if q_type in {"single", "multi"}:
            options = [
                str(option).strip()
                for option in item.get("options", [])
                if str(option).strip()
            ]

        correct = item.get("correct")
        if q_type == "single":
            correct = str(correct) if correct is not None else ""
        elif q_type == "multi":
            correct = [str(value) for value in correct] if isinstance(correct, list) else []
        else:
            correct = ""

        try:
            points = float(item.get("points", 0))
        except (TypeError, ValueError):
            points = 0

        questions.append(
            {
                "id": str(item.get("id") or uuid.uuid4().hex),
                "type": q_type,
                "prompt": str(item.get("prompt", "")).strip(),
                "options": options,
                "correct": correct,
                "points": max(points, 0),
                "image": str(item.get("image", "")).strip(),
            }
        )
    return questions


def public_question(question):
    return {
        "id": question["id"],
        "type": question["type"],
        "prompt": question["prompt"],
        "options": question["options"],
        "points": question["points"],
        "image": question.get("image", ""),
    }


def exact_multi_match(answer, correct):
    answer_set = {str(value) for value in answer} if isinstance(answer, list) else set()
    correct_set = {str(value) for value in correct} if isinstance(correct, list) else set()
    return answer_set == correct_set and bool(correct_set)


def score_submission(questions, answers):
    total = 0.0
    snapshots = []

    for question in questions:
        qid = question["id"]
        q_type = question["type"]
        answer = answers.get(qid, [] if q_type == "multi" else "")
        awarded = 0.0

        if q_type == "single" and str(answer) == str(question.get("correct", "")):
            awarded = question["points"]
        elif q_type == "multi" and exact_multi_match(answer, question.get("correct", [])):
            awarded = question["points"]

        total += awarded
        snapshots.append(
            {
                "questionId": qid,
                "type": q_type,
                "prompt": question["prompt"],
                "options": question.get("options", []),
                "answer": answer,
                "correct": question.get("correct", ""),
                "points": question["points"],
                "awarded": awarded,
                "image": question.get("image", ""),
            }
        )

    return total, snapshots


class Handler(BaseHTTPRequestHandler):
    server_version = "GincanaOnline/1.0"

    def handle_one_request(self):
        try:
            return super().handle_one_request()
        except Exception as exc:  # pragma: no cover - safety net for serverless logs.
            path = getattr(self, "path", "")
            method = getattr(self, "command", "")
            log_exception(f"Erro não tratado na request {method} {path}", exc)
            try:
                self.send_json(
                    {
                        "error": "Erro interno no servidor.",
                        "details": f"{exc.__class__.__name__}: {exc}",
                    },
                    status=500,
                )
            except Exception:
                pass

    def require_database(self):
        if ensure_db_ready():
            return True
        self.send_json(db_error_payload(), status=503)
        return False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/session":
            return self.send_json({"authenticated": self.is_authenticated()})

        if path == "/api/scores":
            if not self.require_database():
                return
            return self.handle_get_scores()

        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return

        if path.startswith("/api/public/exams/"):
            if not self.require_database():
                return
            slug = path.removeprefix("/api/public/exams/").strip("/")
            return self.handle_get_public_exam(slug)

        if path == "/api/admin/exams":
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_get_admin_exams()

        if path == "/api/admin/submissions":
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_get_submissions(parse_qs(parsed.query))

        match = re.fullmatch(r"/api/admin/submissions/(\d+)", path)
        if match:
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_get_submission_detail(int(match.group(1)))

        if path == "/":
            return self.serve_file(PUBLIC_DIR / "index.html")
        if path == "/admin":
            return self.serve_file(PUBLIC_DIR / "admin.html")
        if path.startswith("/prova/"):
            return self.serve_file(PUBLIC_DIR / "exam.html")

        safe_path = (PUBLIC_DIR / path.lstrip("/")).resolve()
        if PUBLIC_DIR in safe_path.parents and safe_path.is_file():
            return self.serve_file(safe_path)

        return self.send_error_json(404, "Página não encontrada.")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/login":
            return self.handle_login()

        if path == "/api/logout":
            return self.handle_logout()

        if path == "/api/admin/exams":
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_save_exam()

        match = re.fullmatch(r"/api/public/exams/([^/]+)/submissions", path)
        if match:
            if not self.require_database():
                return
            return self.handle_submit_exam(match.group(1))

        return self.send_error_json(404, "Rota não encontrada.")

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/scores":
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_update_scores()

        match = re.fullmatch(r"/api/admin/exams/(\d+)", path)
        if match:
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_save_exam(int(match.group(1)))

        return self.send_error_json(404, "Rota não encontrada.")

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        match = re.fullmatch(r"/api/admin/exams/(\d+)", path)
        if match:
            if not self.require_auth():
                return
            if not self.require_database():
                return
            return self.handle_delete_exam(int(match.group(1)))
        return self.send_error_json(404, "Rota não encontrada.")

    def log_message(self, fmt, *args):
        print(f"[{now_iso()}] {self.address_string()} - {fmt % args}")

    def is_authenticated(self):
        jar = parse_cookie(self.headers.get("Cookie"))
        token = jar.get(SESSION_COOKIE, "")
        return hmac.compare_digest(token, session_token())

    def require_auth(self):
        if self.is_authenticated():
            return True
        self.send_error_json(401, "Acesso administrativo necessário.")
        return False

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error_json(400, "JSON inválido.")
            return None

    def send_json(self, payload, status=200, extra_headers=None):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def send_error_json(self, status, message):
        self.send_json({"error": message}, status=status)

    def serve_file(self, path):
        if not path.exists():
            return self.send_error_json(404, "Arquivo não encontrado.")
        mime, _ = mimetypes.guess_type(path)
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_login(self):
        body = self.read_json()
        if body is None:
            return
        if not ADMIN_PASSWORD:
            return self.send_error_json(500, "ADMIN_PASSWORD não configurada no servidor.")
        if str(body.get("password", "")) != ADMIN_PASSWORD:
            return self.send_error_json(401, "Senha inválida.")

        header = (
            f"{SESSION_COOKIE}={session_token()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800"
        )
        self.send_json({"ok": True}, extra_headers={"Set-Cookie": header})

    def handle_logout(self):
        header = f"{SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
        self.send_json({"ok": True}, extra_headers={"Set-Cookie": header})

    def handle_get_scores(self):
        with connect_db() as conn:
            rows = conn.execute(
                "SELECT group_name, points, updated_at FROM scores ORDER BY group_name"
            ).fetchall()
        scores = {row["group_name"]: row["points"] for row in rows}
        updated_at = max((row["updated_at"] for row in rows), default=now_iso())
        return self.send_json(
            {
                "scores": {
                    "Meninos": int(scores.get("Meninos", 0)),
                    "Meninas": int(scores.get("Meninas", 0)),
                },
                "updatedAt": serialize_datetime(updated_at),
            }
        )

    def handle_update_scores(self):
        body = self.read_json()
        if body is None:
            return

        with connect_db() as conn:
            for group in GROUPS:
                try:
                    points = int(body.get(group, 0))
                except (TypeError, ValueError):
                    points = 0
                conn.execute(
                    """
                    INSERT INTO scores (group_name, points, updated_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT(group_name)
                    DO UPDATE SET points = excluded.points, updated_at = excluded.updated_at
                    """,
                    (group, max(points, 0), now_iso()),
                )
        return self.handle_get_scores()

    def handle_get_admin_exams(self):
        with connect_db() as conn:
            rows = conn.execute(
                """
                SELECT e.*,
                       COUNT(s.id) AS submissions_count,
                       COALESCE(SUM(CASE WHEN s.group_name = 'Meninos' THEN s.auto_score ELSE 0 END), 0) AS boys_score,
                       COALESCE(SUM(CASE WHEN s.group_name = 'Meninas' THEN s.auto_score ELSE 0 END), 0) AS girls_score
                FROM exams e
                LEFT JOIN submissions s ON s.exam_id = e.id
                GROUP BY e.id
                ORDER BY e.created_at DESC
                """
            ).fetchall()

        exams = []
        for row in rows:
            exams.append(
                {
                    "id": row["id"],
                    "slug": row["slug"],
                    "title": row["title"],
                    "description": row["description"],
                    "active": bool(row["active"]),
                    "questions": load_json_value(row["questions_json"], []),
                    "createdAt": serialize_datetime(row["created_at"]),
                    "updatedAt": serialize_datetime(row["updated_at"]),
                    "publicUrl": f"/prova/{row['slug']}",
                    "submissionsCount": row["submissions_count"],
                    "totals": {
                        "Meninos": number_value(row["boys_score"]),
                        "Meninas": number_value(row["girls_score"]),
                    },
                }
            )
        return self.send_json({"exams": exams})

    def handle_save_exam(self, exam_id=None):
        body = self.read_json()
        if body is None:
            return

        title = str(body.get("title", "")).strip()
        if not title:
            return self.send_error_json(400, "Informe o título da prova.")

        description = str(body.get("description", "")).strip()
        active = 1 if body.get("active", True) else 0
        questions = normalize_questions(body.get("questions", []))

        # Evolução futura: validar obrigatoriedade por tipo de questão e permitir pontuação parcial.
        with connect_db() as conn:
            if exam_id:
                exists = conn.execute("SELECT id FROM exams WHERE id = %s", (exam_id,)).fetchone()
                if not exists:
                    return self.send_error_json(404, "Prova não encontrada.")
                conn.execute(
                    """
                    UPDATE exams
                    SET title = %s, description = %s, active = %s, questions_json = %s, updated_at = %s
                    WHERE id = %s
                    """,
                    (
                        title,
                        description,
                        bool(active),
                        Jsonb(questions),
                        now_iso(),
                        exam_id,
                    ),
                )
            else:
                slug = make_unique_slug(conn, title)
                conn.execute(
                    """
                    INSERT INTO exams (slug, title, description, active, questions_json, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        slug,
                        title,
                        description,
                        bool(active),
                        Jsonb(questions),
                        now_iso(),
                        now_iso(),
                    ),
                )

        return self.handle_get_admin_exams()

    def handle_delete_exam(self, exam_id):
        with connect_db() as conn:
            used = conn.execute(
                "SELECT COUNT(*) AS total FROM submissions WHERE exam_id = %s", (exam_id,)
            ).fetchone()["total"]
            if used:
                return self.send_error_json(
                    409,
                    "Esta prova já possui respostas. Desative a prova em vez de apagar.",
                )
            conn.execute("DELETE FROM exams WHERE id = %s", (exam_id,))
        return self.handle_get_admin_exams()

    def handle_get_public_exam(self, slug):
        with connect_db() as conn:
            row = conn.execute(
                "SELECT * FROM exams WHERE slug = %s AND active = TRUE", (slug,)
            ).fetchone()

        if not row:
            return self.send_error_json(404, "Prova não encontrada ou inativa.")

        questions = load_json_value(row["questions_json"], [])
        return self.send_json(
            {
                "exam": {
                    "id": row["id"],
                    "slug": row["slug"],
                    "title": row["title"],
                    "description": row["description"],
                    "questions": [public_question(question) for question in questions],
                }
            }
        )

    def handle_submit_exam(self, slug):
        body = self.read_json()
        if body is None:
            return

        name = str(body.get("name", "")).strip()
        group = str(body.get("group", "")).strip()
        answers = body.get("answers", {})
        if not name:
            return self.send_error_json(400, "Informe seu nome.")
        if group not in GROUPS:
            return self.send_error_json(400, "Informe um grupo válido.")
        if not isinstance(answers, dict):
            return self.send_error_json(400, "Respostas inválidas.")

        try:
            focus_losses = int(body.get("focusLosses", 0))
        except (TypeError, ValueError):
            focus_losses = 0

        with connect_db() as conn:
            row = conn.execute(
                "SELECT * FROM exams WHERE slug = %s AND active = TRUE", (slug,)
            ).fetchone()
            if not row:
                return self.send_error_json(404, "Prova não encontrada ou inativa.")

            questions = load_json_value(row["questions_json"], [])
            auto_score, snapshots = score_submission(questions, answers)
            conn.execute(
                """
                INSERT INTO submissions
                    (exam_id, participant_name, group_name, answers_json, auto_score, focus_losses, submitted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    row["id"],
                    name,
                    group,
                    Jsonb(snapshots),
                    auto_score,
                    max(focus_losses, 0),
                    now_iso(),
                ),
            )

        return self.send_json({"ok": True, "autoScore": number_value(auto_score)})

    def handle_get_submissions(self, query):
        filters = []
        params = []

        exam_id = (query.get("exam_id") or [""])[0]
        group = (query.get("group") or [""])[0]
        name = (query.get("name") or [""])[0].strip()

        if exam_id:
            filters.append("s.exam_id = %s")
            params.append(exam_id)
        if group in GROUPS:
            filters.append("s.group_name = %s")
            params.append(group)
        if name:
            filters.append("s.participant_name ILIKE %s")
            params.append(f"%{name}%")

        where = f"WHERE {' AND '.join(filters)}" if filters else ""

        with connect_db() as conn:
            rows = conn.execute(
                f"""
                SELECT s.id, s.participant_name, s.group_name, s.auto_score,
                       s.focus_losses, s.submitted_at, e.title AS exam_title, e.id AS exam_id
                FROM submissions s
                JOIN exams e ON e.id = s.exam_id
                {where}
                ORDER BY s.submitted_at DESC
                """,
                params,
            ).fetchall()
            summary_rows = conn.execute(
                f"""
                SELECT s.group_name, COALESCE(SUM(s.auto_score), 0) AS total
                FROM submissions s
                JOIN exams e ON e.id = s.exam_id
                {where}
                GROUP BY s.group_name
                """,
                params,
            ).fetchall()

        summary = {"Meninos": 0, "Meninas": 0}
        for row in summary_rows:
            summary[row["group_name"]] = number_value(row["total"])

        return self.send_json(
            {
                "submissions": [
                    {
                        "id": row["id"],
                        "name": row["participant_name"],
                        "group": row["group_name"],
                        "examId": row["exam_id"],
                        "examTitle": row["exam_title"],
                        "autoScore": number_value(row["auto_score"]),
                        "focusLosses": row["focus_losses"],
                        "submittedAt": serialize_datetime(row["submitted_at"]),
                    }
                    for row in rows
                ],
                "summary": summary,
            }
        )

    def handle_get_submission_detail(self, submission_id):
        with connect_db() as conn:
            row = conn.execute(
                """
                SELECT s.*, e.title AS exam_title
                FROM submissions s
                JOIN exams e ON e.id = s.exam_id
                WHERE s.id = %s
                """,
                (submission_id,),
            ).fetchone()

        if not row:
            return self.send_error_json(404, "Resposta não encontrada.")

        return self.send_json(
            {
                "submission": {
                    "id": row["id"],
                    "name": row["participant_name"],
                    "group": row["group_name"],
                    "examTitle": row["exam_title"],
                    "autoScore": number_value(row["auto_score"]),
                    "focusLosses": row["focus_losses"],
                    "submittedAt": serialize_datetime(row["submitted_at"]),
                    "answers": load_json_value(row["answers_json"], []),
                }
            }
        )


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Gincana Online rodando em http://{HOST}:{PORT}")
    print(f"ADM: http://{HOST}:{PORT}/admin")
    print("Senha ADM configurada por ADMIN_PASSWORD.")
    print("Banco de dados será inicializado na primeira request que usa dados.")
    server.serve_forever()


if __name__ == "__main__":
    main()
