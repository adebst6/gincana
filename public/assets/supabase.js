const SUPABASE_URL = "https://lydvlvxxgbcqdpyfccvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TQZagWoAfhqXgL5K0rq4cw_iwNAvq2F";

if (!window.supabase?.createClient) {
  throw new Error("Nao foi possivel carregar a biblioteca do Supabase.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function databaseError(error, fallback) {
  if (!error) return;
  console.error("[Gincana Online] Supabase:", error);
  throw new Error(error.message || fallback);
}

function publicExamUrl(id) {
  return `/exam/${encodeURIComponent(id)}`;
}

function normalizeCameraInterval(value) {
  const interval = Number(value || 60);
  return [30, 60, 120].includes(interval) ? interval : 60;
}

function mapExam(row, stats = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    active: row.active !== false,
    timeLimitMinutes: Number(row.time_limit_minutes || 0),
    cameraMonitoring: row.camera_monitoring === true,
    cameraIntervalSeconds: normalizeCameraInterval(row.camera_interval_seconds),
    questions: Array.isArray(row.questions) ? row.questions : [],
    createdAt: row.created_at,
    publicUrl: publicExamUrl(row.id),
    submissionsCount: stats.count || 0,
    totals: {
      Meninos: stats.boys || 0,
      Meninas: stats.girls || 0,
    },
  };
}

function mapSubmission(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    name: row.participant_name,
    group: row.group_name,
    answers: Array.isArray(row.answers) ? row.answers : [],
    autoScore: Number(row.score || 0),
    focusLosses: Number(row.tab_leave_count || 0),
    cameraConsentAt: row.camera_consent_at || null,
    monitoringSnapshots: Array.isArray(row.monitoring_snapshots) ? row.monitoring_snapshots : [],
    submittedAt: row.created_at,
  };
}

async function getScores() {
  const { data, error } = await supabaseClient
    .from("scores")
    .select("id,boys_points,girls_points,updated_at")
    .eq("id", 1)
    .maybeSingle();
  databaseError(error, "Nao foi possivel carregar a pontuacao.");

  return {
    boysPoints: Number(data?.boys_points || 0),
    girlsPoints: Number(data?.girls_points || 0),
    updatedAt: data?.updated_at || null,
  };
}

async function saveScores({ boysPoints, girlsPoints }) {
  const payload = {
    id: 1,
    boys_points: Math.max(0, Number(boysPoints || 0)),
    girls_points: Math.max(0, Number(girlsPoints || 0)),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseClient
    .from("scores")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  databaseError(error, "Nao foi possivel salvar a pontuacao.");
  return data;
}

async function listExams() {
  const [examResult, submissionResult] = await Promise.all([
    supabaseClient.from("exams").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("submissions").select("exam_id,group_name,score"),
  ]);
  databaseError(examResult.error, "Nao foi possivel carregar as provas.");
  databaseError(submissionResult.error, "Nao foi possivel resumir as respostas.");

  const statsByExam = new Map();
  (submissionResult.data || []).forEach((submission) => {
    const stats = statsByExam.get(submission.exam_id) || { count: 0, boys: 0, girls: 0 };
    stats.count += 1;
    if (submission.group_name === "Meninos") stats.boys += Number(submission.score || 0);
    if (submission.group_name === "Meninas") stats.girls += Number(submission.score || 0);
    statsByExam.set(submission.exam_id, stats);
  });

  return (examResult.data || []).map((exam) => mapExam(exam, statsByExam.get(exam.id)));
}

async function getActiveExam(id) {
  const { data, error } = await supabaseClient
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  databaseError(error, "Nao foi possivel carregar a prova.");
  return data ? mapExam(data) : null;
}

async function saveExam(exam) {
  const payload = {
    title: exam.title,
    description: exam.description || "",
    active: exam.active !== false,
    time_limit_minutes: Math.max(0, Math.floor(Number(exam.timeLimitMinutes || 0))),
    camera_monitoring: exam.cameraMonitoring === true,
    camera_interval_seconds: normalizeCameraInterval(exam.cameraIntervalSeconds),
    questions: Array.isArray(exam.questions) ? exam.questions : [],
  };

  const query = exam.id
    ? supabaseClient.from("exams").update(payload).eq("id", exam.id)
    : supabaseClient.from("exams").insert(payload);
  const { data, error } = await query.select().single();
  databaseError(error, "Nao foi possivel salvar a prova.");
  return mapExam(data);
}

async function deleteExam(id) {
  const { error } = await supabaseClient.from("exams").delete().eq("id", id);
  databaseError(error, "Nao foi possivel apagar a prova.");
}

async function listSubmissions(examId) {
  const { data, error } = await supabaseClient
    .from("submissions")
    .select("id,exam_id,participant_name,group_name,score,tab_leave_count,camera_consent_at,created_at")
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });
  databaseError(error, "Nao foi possivel carregar as respostas.");
  return (data || []).map(mapSubmission);
}

async function getSubmission(id) {
  const { data, error } = await supabaseClient
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();
  databaseError(error, "Nao foi possivel abrir a resposta.");
  return mapSubmission(data);
}

async function deleteSubmission(id) {
  const { error } = await supabaseClient.from("submissions").delete().eq("id", id);
  databaseError(error, "Nao foi possivel excluir a resposta.");
}

async function createSubmission(submission) {
  const payload = {
    exam_id: submission.examId,
    participant_name: submission.participantName,
    group_name: submission.groupName,
    answers: submission.answers,
    score: submission.score,
    tab_leave_count: submission.tabLeaveCount,
    camera_consent_at: submission.cameraConsentAt || null,
    monitoring_snapshots: Array.isArray(submission.monitoringSnapshots)
      ? submission.monitoringSnapshots
      : [],
  };
  const { data, error } = await supabaseClient
    .from("submissions")
    .insert(payload)
    .select("id,created_at")
    .single();
  databaseError(error, "Nao foi possivel enviar a resposta.");
  return data;
}

window.GincanaDB = {
  getScores,
  saveScores,
  listExams,
  getActiveExam,
  saveExam,
  deleteExam,
  listSubmissions,
  getSubmission,
  deleteSubmission,
  createSubmission,
};
