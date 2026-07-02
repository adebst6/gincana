const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const logoutButton = document.querySelector("#logout-button");
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");

const scoresForm = document.querySelector("#scores-form");
const scoreBoys = document.querySelector("#score-boys");
const scoreGirls = document.querySelector("#score-girls");
const scoresMessage = document.querySelector("#scores-message");
const copyScoresButton = document.querySelector("#copy-scores-button");

const examViews = document.querySelectorAll(".exam-admin-view");
const examListView = document.querySelector("#exam-list-view");
const examDetailView = document.querySelector("#exam-detail-view");
const examEditorView = document.querySelector("#exam-editor-view");
const examResponsesView = document.querySelector("#exam-responses-view");
const examList = document.querySelector("#exam-list");
const newExamButton = document.querySelector("#new-exam-button");
const importExamButton = document.querySelector("#import-exam-button");

const backDetailButton = document.querySelector("#back-detail-button");
const detailEditButton = document.querySelector("#detail-edit-button");
const detailResponsesButton = document.querySelector("#detail-responses-button");
const detailExamTitle = document.querySelector("#detail-exam-title");
const detailExamDescription = document.querySelector("#detail-exam-description");
const detailExamStatus = document.querySelector("#detail-exam-status");
const detailExamQuestions = document.querySelector("#detail-exam-questions");
const detailExamResponses = document.querySelector("#detail-exam-responses");
const detailExamTime = document.querySelector("#detail-exam-time");
const detailExamCamera = document.querySelector("#detail-exam-camera");
const detailExamBoys = document.querySelector("#detail-exam-boys");
const detailExamGirls = document.querySelector("#detail-exam-girls");
const detailPublicLink = document.querySelector("#detail-public-link");
const detailCopyLinkButton = document.querySelector("#detail-copy-link-button");
const detailOpenLink = document.querySelector("#detail-open-link");

const backEditorButton = document.querySelector("#back-editor-button");
const editorViewTitle = document.querySelector("#editor-view-title");
const examForm = document.querySelector("#exam-form");
const examId = document.querySelector("#exam-id");
const examTitle = document.querySelector("#exam-title");
const examDescription = document.querySelector("#exam-description");
const examActive = document.querySelector("#exam-active");
const examTimeLimit = document.querySelector("#exam-time-limit");
const examCameraMonitoring = document.querySelector("#exam-camera-monitoring");
const examCameraIntervalField = document.querySelector("#exam-camera-interval-field");
const examCameraInterval = document.querySelector("#exam-camera-interval");
const questionsEditor = document.querySelector("#questions-editor");
const addQuestionButton = document.querySelector("#add-question-button");
const deleteExamButton = document.querySelector("#delete-exam-button");
const examMessage = document.querySelector("#exam-message");

const backResponsesButton = document.querySelector("#back-responses-button");
const editFromResponsesButton = document.querySelector("#edit-from-responses-button");
const responsesExamTitle = document.querySelector("#responses-exam-title");
const examResponsesPanel = document.querySelector("#exam-responses-panel");
const examResponsesSubtitle = document.querySelector("#exam-responses-subtitle");
const refreshExamResponsesButton = document.querySelector("#refresh-exam-responses-button");
const examResponseTotal = document.querySelector("#exam-response-total");
const examResponseBoys = document.querySelector("#exam-response-boys");
const examResponseGirls = document.querySelector("#exam-response-girls");
const examResponseAverage = document.querySelector("#exam-response-average");
const girlsResponsesList = document.querySelector("#girls-responses-list");
const boysResponsesList = document.querySelector("#boys-responses-list");

const dialog = document.querySelector("#submission-dialog");
const closeDialogButton = document.querySelector("#close-dialog-button");
const deleteSubmissionButton = document.querySelector("#delete-submission-button");
const detailTitle = document.querySelector("#detail-title");
const submissionDetail = document.querySelector("#submission-detail");

const importExamDialog = document.querySelector("#import-exam-dialog");
const importExamForm = document.querySelector("#import-exam-form");
const importExamText = document.querySelector("#import-exam-text");
const importCameraMonitoring = document.querySelector("#import-camera-monitoring");
const importCameraIntervalField = document.querySelector("#import-camera-interval-field");
const importCameraInterval = document.querySelector("#import-camera-interval");
const importExamMessage = document.querySelector("#import-exam-message");
const closeImportDialogButton = document.querySelector("#close-import-dialog-button");
const cancelImportButton = document.querySelector("#cancel-import-button");
const copyExamTemplateButton = document.querySelector("#copy-exam-template-button");
const downloadExamTemplateButton = document.querySelector("#download-exam-template-button");
const submitImportButton = document.querySelector("#submit-import-button");
const adminToast = document.querySelector("#admin-toast");

const state = {
  exams: [],
  currentExam: null,
  currentExamSubmissions: [],
  examView: "list",
};

const ADMIN_PASSWORD = "gincana123";
const ADMIN_SESSION_KEY = "gincana_admin_session";
let toastTimer = null;
let openedSubmissionId = "";

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function normalizeCameraInterval(value) {
  const interval = Number(value || 60);
  return [30, 60, 120].includes(interval) ? interval : 60;
}

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function showAdmin() {
  loginView.classList.add("hidden");
  adminView.classList.remove("hidden");
}

function showLogin() {
  adminView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

function switchTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${name}`));
}

function showExamView(view) {
  state.examView = view;
  examViews.forEach((section) => section.classList.add("hidden"));
  const target = {
    list: examListView,
    detail: examDetailView,
    editor: examEditorView,
    responses: examResponsesView,
  }[view];
  target?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateRoute(view, id = "", replace = false) {
  const url = new URL(window.location.href);
  if (view === "scores") {
    url.searchParams.delete("view");
    url.searchParams.delete("exam");
  } else {
    url.searchParams.set("view", view);
    if (id) url.searchParams.set("exam", id);
    else url.searchParams.delete("exam");
  }
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function currentExamById(id) {
  return state.exams.find((exam) => String(exam.id) === String(id));
}

function setCurrentExam(id) {
  const exam = currentExamById(id);
  if (!exam) return false;
  state.currentExam = JSON.parse(JSON.stringify(exam));
  return true;
}

function navigateToExamList({ historyMode = "push" } = {}) {
  switchTab("exams");
  showExamView("list");
  renderExamList();
  if (historyMode !== "none") updateRoute("exams", "", historyMode === "replace");
}

function navigateToExamDetail(id, { historyMode = "push" } = {}) {
  if (!setCurrentExam(id)) {
    navigateToExamList({ historyMode: "replace" });
    return;
  }
  switchTab("exams");
  renderExamDetail();
  showExamView("detail");
  if (historyMode !== "none") updateRoute("exam-detail", id, historyMode === "replace");
}

function navigateToExamEditor(id = "", { historyMode = "push" } = {}) {
  if (id) {
    if (!setCurrentExam(id)) {
      navigateToExamList({ historyMode: "replace" });
      return;
    }
  } else {
    resetExamForm();
  }
  renderExamForm();
  setMessage(examMessage, "");
  editorViewTitle.textContent = id ? "Editar prova" : "Nova prova";
  switchTab("exams");
  showExamView("editor");
  if (historyMode !== "none") updateRoute("exam-editor", id, historyMode === "replace");
}

async function navigateToExamResponses(id, { historyMode = "push" } = {}) {
  if (!setCurrentExam(id)) {
    navigateToExamList({ historyMode: "replace" });
    return;
  }
  switchTab("exams");
  responsesExamTitle.textContent = state.currentExam.title;
  showExamView("responses");
  if (historyMode !== "none") updateRoute("exam-responses", id, historyMode === "replace");
  await loadExamResponses(id);
}

async function applyRoute() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const id = params.get("exam") || "";

  if (view === "exams") return navigateToExamList({ historyMode: "none" });
  if (view === "exam-detail" && id) return navigateToExamDetail(id, { historyMode: "none" });
  if (view === "exam-editor") return navigateToExamEditor(id, { historyMode: "none" });
  if (view === "exam-responses" && id) {
    return navigateToExamResponses(id, { historyMode: "none" });
  }

  switchTab("scores");
}

async function checkSession() {
  if (localStorage.getItem(ADMIN_SESSION_KEY) !== "authenticated") {
    showLogin();
    return;
  }

  showAdmin();
  await Promise.all([loadScores(), loadExams()]);
  await applyRoute();
}

async function loadScores() {
  const scores = await GincanaDB.getScores();
  scoreBoys.value = scores.boysPoints;
  scoreGirls.value = scores.girlsPoints;
}

async function saveScores(event) {
  event.preventDefault();
  setMessage(scoresMessage, "Salvando...");
  try {
    await GincanaDB.saveScores({
      boysPoints: scoreBoys.value,
      girlsPoints: scoreGirls.value,
    });
    setMessage(scoresMessage, "Pontuação salva.", "ok");
  } catch (error) {
    setMessage(scoresMessage, error.message, "error");
  }
}

function scoreShareText(boys, girls) {
  return `meninos: ${boys} pontos\n\nmeninas: ${girls} pontos`;
}

async function writeClipboardText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    const activeDialog = document.querySelector("dialog[open]");
    (activeDialog || document.body).append(helper);
    helper.focus();
    helper.select();
    helper.setSelectionRange(0, helper.value.length);
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw error;
  }
}

function showCopyFeedback(button) {
  const icon = button.querySelector(".copy-icon");
  icon.textContent = "✓";
  button.classList.add("copied");
  button.setAttribute("aria-label", "Pontuação copiada");
  setTimeout(() => {
    icon.textContent = "⧉";
    button.classList.remove("copied");
    button.setAttribute("aria-label", "Copiar pontuação");
  }, 1600);
}

async function copyAdminScores() {
  try {
    await writeClipboardText(scoreShareText(Number(scoreBoys.value || 0), Number(scoreGirls.value || 0)));
    showCopyFeedback(copyScoresButton);
  } catch (error) {
    setMessage(scoresMessage, "Não foi possível copiar agora.", "error");
  }
}

async function loadExams() {
  state.exams = await GincanaDB.listExams();
  renderExamList();
}

function defaultQuestion() {
  return {
    id: uid(),
    type: "single",
    prompt: "",
    options: ["", ""],
    correct: "",
    points: 1,
    image: "",
  };
}

function resetExamForm() {
  state.currentExam = {
    id: "",
    title: "",
    description: "",
    active: true,
    timeLimitMinutes: 0,
    cameraMonitoring: false,
    cameraIntervalSeconds: 60,
    questions: [defaultQuestion()],
  };
  state.currentExamSubmissions = [];
}

function absolutePublicUrl(exam) {
  return `${window.location.origin}${exam.publicUrl}`;
}

function renderExamList() {
  if (!state.exams.length) {
    examList.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma prova criada</h3>
        <p>Crie a primeira prova para gerar um link público.</p>
        <button type="button" class="primary-button" data-action="new-exam">+ Nova prova</button>
      </div>
    `;
    return;
  }

  examList.innerHTML = state.exams
    .map(
      (exam) => `
        <article class="exam-item">
          <button type="button" class="exam-card-main" data-action="view-exam" data-id="${exam.id}">
            <div class="exam-card-title-row">
              <strong>${escapeHtml(exam.title)}</strong>
              <span class="pill ${exam.active ? "active" : "inactive"}">
                ${exam.active ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div class="exam-meta">
              <span>${exam.questions.length} ${exam.questions.length === 1 ? "pergunta" : "perguntas"}</span>
              <span>${exam.submissionsCount} ${exam.submissionsCount === 1 ? "resposta" : "respostas"}</span>
              <span>${exam.timeLimitMinutes > 0 ? `${exam.timeLimitMinutes} min` : "Sem limite"}</span>
              <span>${exam.cameraMonitoring ? `Fotos a cada ${exam.cameraIntervalSeconds}s` : "Sem fotos"}</span>
            </div>
          </button>
          <div class="exam-item-actions">
            <button type="button" class="small-button" data-action="edit-exam" data-id="${exam.id}">Editar prova</button>
            <button type="button" class="small-button" data-action="view-responses" data-id="${exam.id}">Ver respostas</button>
            <button type="button" class="small-button" data-action="copy-link" data-id="${exam.id}">Copiar link</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderExamDetail() {
  const exam = state.currentExam;
  if (!exam) return;
  detailExamTitle.textContent = exam.title;
  detailExamDescription.textContent = exam.description || "Sem descrição.";
  detailExamStatus.textContent = exam.active ? "Ativa" : "Inativa";
  detailExamStatus.className = `pill ${exam.active ? "active" : "inactive"}`;
  detailExamQuestions.textContent = String(exam.questions.length);
  detailExamResponses.textContent = String(exam.submissionsCount || 0);
  detailExamTime.textContent = exam.timeLimitMinutes > 0 ? `${exam.timeLimitMinutes} min` : "Sem limite";
  detailExamCamera.textContent = exam.cameraMonitoring
    ? `A cada ${exam.cameraIntervalSeconds}s`
    : "Desativado";
  detailExamBoys.textContent = formatNumber(exam.totals.Meninos);
  detailExamGirls.textContent = formatNumber(exam.totals.Meninas);
  detailPublicLink.value = absolutePublicUrl(exam);
  detailOpenLink.href = exam.publicUrl;
}

function normalizeForEditor(question) {
  const copy = { ...question };
  if (!copy.id) copy.id = uid();
  if (!copy.type) copy.type = "single";
  if (!Array.isArray(copy.options)) copy.options = [];
  if (copy.type === "boolean") {
    copy.options = ["Verdadeiro", "Falso"];
  } else if (copy.type === "single" || copy.type === "multi" || copy.type === "image") {
    while (copy.options.length < 2) copy.options.push("");
  }
  if (copy.type === "multi" && !Array.isArray(copy.correct)) copy.correct = [];
  if (copy.type !== "multi" && copy.correct == null) copy.correct = "";
  return copy;
}

function renderExamForm() {
  const exam = state.currentExam || {};
  examId.value = exam.id || "";
  examTitle.value = exam.title || "";
  examDescription.value = exam.description || "";
  examActive.checked = exam.active !== false;
  examTimeLimit.value = exam.timeLimitMinutes || 0;
  examCameraMonitoring.checked = exam.cameraMonitoring === true;
  examCameraInterval.value = String(exam.cameraIntervalSeconds || 60);
  syncCameraSettings();
  deleteExamButton.classList.toggle("hidden", !exam.id);
  renderQuestions();
}

function editorCameraSettings() {
  const enabled = examCameraMonitoring.checked === true;
  return {
    cameraMonitoring: enabled,
    cameraIntervalSeconds: enabled ? normalizeCameraInterval(examCameraInterval.value) : 60,
  };
}

function importCameraSettings() {
  const enabled = importCameraMonitoring.checked === true;
  return {
    cameraMonitoring: enabled,
    cameraIntervalSeconds: enabled ? normalizeCameraInterval(importCameraInterval.value) : 60,
  };
}

function syncCameraSettings() {
  const enabled = examCameraMonitoring.checked;
  examCameraIntervalField.classList.toggle("hidden", !enabled);
  examCameraInterval.disabled = !enabled;
}

function syncImportCameraSettings() {
  const enabled = importCameraMonitoring.checked;
  importCameraIntervalField.classList.toggle("hidden", !enabled);
  importCameraInterval.disabled = !enabled;
}

function renderQuestions() {
  const questions = (state.currentExam?.questions || []).map(normalizeForEditor);
  state.currentExam.questions = questions;

  if (!questions.length) {
    questionsEditor.innerHTML = `
      <div class="empty-state compact">
        <h3>Esta prova ainda não tem perguntas</h3>
        <p>Adicione uma pergunta para começar.</p>
      </div>
    `;
    return;
  }

  questionsEditor.innerHTML = questions.map(renderQuestion).join("");
}

function renderQuestion(question, index) {
  const isChoice =
    question.type === "single" ||
    question.type === "multi" ||
    question.type === "boolean" ||
    question.type === "image";
  const imagePreview = question.image
    ? `<img class="image-preview" src="${escapeHtml(question.image)}" alt="Prévia da imagem" />`
    : "";

  return `
    <section class="question-editor" data-question-index="${index}" data-question-id="${escapeHtml(question.id)}">
      <div class="question-editor-heading">
        <div>
          <span class="question-index">Pergunta ${index + 1}</span>
          <span class="question-type-label">${question.type === "single" ? "Múltipla escolha" : question.type === "multi" ? "Múltipla seleção" : question.type === "boolean" ? "Verdadeiro ou falso" : question.type === "image" ? "Imagem" : question.type === "short" ? "Texto curto" : "Texto longo"}</span>
        </div>
        <div class="question-order-actions">
          <button type="button" class="small-button icon-order-button" data-action="move-question-up" aria-label="Subir pergunta ${index + 1}" title="Subir pergunta" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="small-button icon-order-button" data-action="move-question-down" aria-label="Descer pergunta ${index + 1}" title="Descer pergunta" ${index === state.currentExam.questions.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="danger-button question-remove-button" data-action="remove-question">Remover</button>
        </div>
      </div>

      <div class="question-grid">
        <label>
          Tipo
          <select data-field="type">
            <option value="single" ${question.type === "single" ? "selected" : ""}>Múltipla escolha</option>
            <option value="multi" ${question.type === "multi" ? "selected" : ""}>Múltipla seleção</option>
            <option value="boolean" ${question.type === "boolean" ? "selected" : ""}>Verdadeiro ou falso</option>
            <option value="image" ${question.type === "image" ? "selected" : ""}>Imagem</option>
            <option value="short" ${question.type === "short" ? "selected" : ""}>Texto curto</option>
            <option value="long" ${question.type === "long" ? "selected" : ""}>Texto longo</option>
          </select>
        </label>
        <label>
          Pontos
          <input data-field="points" type="number" min="0" step="0.5" value="${escapeHtml(question.points ?? 0)}" />
        </label>
      </div>

      <label>
        Texto da pergunta
        <textarea data-field="prompt" rows="3">${escapeHtml(question.prompt || "")}</textarea>
      </label>

      <div class="image-row">
        <label>
          Imagem por URL (opcional)
          <input data-field="image" type="url" value="${escapeHtml(question.image || "")}" placeholder="https://..." />
        </label>
        <label>
          Ou escolher do computador
          <input data-field="image-file" type="file" accept="image/*" />
        </label>
      </div>
      ${imagePreview}

      ${
        isChoice
          ? `
            <div class="options-editor">
              <div class="options-heading">
                <div>
                  <h3>Alternativas</h3>
                  <p>${question.type === "multi" ? "Marque todas as alternativas corretas." : "Marque uma alternativa correta."}</p>
                </div>
                ${question.type === "boolean" ? "" : '<button type="button" class="secondary-button" data-action="add-option">+ Adicionar alternativa</button>'}
              </div>
              <div class="option-list">
                ${question.options.map((option, optionIndex) => renderOption(question, option, optionIndex)).join("")}
              </div>
            </div>
          `
          : `<p class="text-question-note">A resposta será salva para revisão manual.</p>`
      }
    </section>
  `;
}

function renderOption(question, option, optionIndex) {
  const correctName = `correct-${question.id}`;
  const checked =
    question.type === "single" || question.type === "boolean" || question.type === "image"
      ? String(question.correct) === String(optionIndex)
      : Array.isArray(question.correct) && question.correct.map(String).includes(String(optionIndex));
  const inputType =
    question.type === "single" || question.type === "boolean" || question.type === "image"
      ? "radio"
      : "checkbox";
  const fixedOption = question.type === "boolean";

  return `
    <div class="option-row" data-option-index="${optionIndex}">
      <label class="correct-choice">
        <input data-field="correct" name="${correctName}" type="${inputType}" value="${optionIndex}" ${checked ? "checked" : ""} />
        <span>Correta</span>
      </label>
      <input data-field="option" type="text" value="${escapeHtml(option)}" placeholder="Alternativa ${optionIndex + 1}" aria-label="Texto da alternativa ${optionIndex + 1}" ${fixedOption ? "readonly" : ""} />
      ${fixedOption ? "" : `<button type="button" class="small-button option-remove-button" data-action="remove-option" aria-label="Remover alternativa ${optionIndex + 1}">Remover</button>`}
    </div>
  `;
}

function collectExamForm() {
  const questions = [...questionsEditor.querySelectorAll(".question-editor")].map((card) => {
    const type = card.querySelector('[data-field="type"]').value;
    const rows = [...card.querySelectorAll(".option-row")];
    const options = rows.map((row) => row.querySelector('[data-field="option"]').value);

    let correct = "";
    if (type === "single" || type === "boolean" || type === "image") {
      const selected = rows.find((row) => row.querySelector('[data-field="correct"]')?.checked);
      correct = selected?.dataset.optionIndex ?? "";
    } else if (type === "multi") {
      correct = rows
        .filter((row) => row.querySelector('[data-field="correct"]')?.checked)
        .map((row) => String(row.dataset.optionIndex));
    }

    return {
      id: card.dataset.questionId || uid(),
      type,
      prompt: card.querySelector('[data-field="prompt"]').value,
      points: Number(card.querySelector('[data-field="points"]').value || 0),
      image: card.querySelector('[data-field="image"]').value,
      options,
      correct,
    };
  });

  const cameraSettings = editorCameraSettings();
  state.currentExam = {
    id: examId.value,
    title: examTitle.value,
    description: examDescription.value,
    active: examActive.checked,
    timeLimitMinutes: Math.max(0, Math.floor(Number(examTimeLimit.value || 0))),
    cameraMonitoring: cameraSettings.cameraMonitoring,
    cameraIntervalSeconds: cameraSettings.cameraIntervalSeconds,
    questions,
  };
}

function ensureChoiceQuestion(question) {
  if (question.type === "boolean") {
    question.options = ["Verdadeiro", "Falso"];
    if (Array.isArray(question.correct)) question.correct = "";
  } else if (question.type === "single" || question.type === "multi" || question.type === "image") {
    while (question.options.length < 2) question.options.push("");
    if (question.type === "multi" && !Array.isArray(question.correct)) question.correct = [];
    if ((question.type === "single" || question.type === "image") && Array.isArray(question.correct)) {
      question.correct = "";
    }
  }
  return question;
}

function sanitizeQuestion(question, questionIndex) {
  const optionMap = new Map();
  const options = [];
  (question.options || []).forEach((option, oldIndex) => {
    const value = String(option || "").trim();
    if (value) {
      optionMap.set(String(oldIndex), String(options.length));
      options.push(value);
    }
  });

  let correct = "";
  if (question.type === "single" || question.type === "boolean" || question.type === "image") {
    correct = optionMap.get(String(question.correct)) ?? "";
  } else if (question.type === "multi") {
    correct = (Array.isArray(question.correct) ? question.correct : [])
      .map((value) => optionMap.get(String(value)))
      .filter((value) => value != null);
  }

  const clean = {
    ...question,
    prompt: question.prompt.trim(),
    image: question.image.trim(),
    options,
    correct,
  };

  if (clean.type === "boolean") clean.options = ["Verdadeiro", "Falso"];

  if (!clean.prompt) throw new Error(`Escreva o texto da pergunta ${questionIndex + 1}.`);
  if (
    (clean.type === "single" || clean.type === "multi" || clean.type === "boolean" || clean.type === "image") &&
    clean.options.length < 2
  ) {
    throw new Error(`Adicione pelo menos duas alternativas na pergunta ${questionIndex + 1}.`);
  }
  if (
    (clean.type === "single" || clean.type === "boolean" || clean.type === "image") &&
    clean.correct === ""
  ) {
    throw new Error(`Marque a resposta correta da pergunta ${questionIndex + 1}.`);
  }
  if (clean.type === "multi" && clean.correct.length === 0) {
    throw new Error(`Marque ao menos uma resposta correta na pergunta ${questionIndex + 1}.`);
  }
  if (clean.type === "image" && !clean.image) {
    throw new Error(`Informe a imagem da pergunta ${questionIndex + 1}.`);
  }
  return clean;
}

function handleQuestionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest(".question-editor");
  collectExamForm();
  const questionIndex = card ? Number(card.dataset.questionIndex) : -1;
  const action = button.dataset.action;

  if (action === "remove-question") {
    state.currentExam.questions.splice(questionIndex, 1);
  }

  if (action === "add-option") {
    state.currentExam.questions[questionIndex].options.push("");
  }

  if (action === "remove-option") {
    const optionIndex = Number(button.closest(".option-row").dataset.optionIndex);
    const question = state.currentExam.questions[questionIndex];
    question.options.splice(optionIndex, 1);
    if (question.type === "single" || question.type === "image") {
      if (question.correct !== "") {
        const selected = Number(question.correct);
        question.correct = selected === optionIndex ? "" : String(selected > optionIndex ? selected - 1 : selected);
      }
    } else if (question.type === "multi") {
      question.correct = question.correct
        .map(Number)
        .filter((value) => value !== optionIndex)
        .map((value) => String(value > optionIndex ? value - 1 : value));
    }
  }

  if (action === "move-question-up" && questionIndex > 0) {
    [state.currentExam.questions[questionIndex - 1], state.currentExam.questions[questionIndex]] = [
      state.currentExam.questions[questionIndex],
      state.currentExam.questions[questionIndex - 1],
    ];
  }

  if (action === "move-question-down" && questionIndex < state.currentExam.questions.length - 1) {
    [state.currentExam.questions[questionIndex + 1], state.currentExam.questions[questionIndex]] = [
      state.currentExam.questions[questionIndex],
      state.currentExam.questions[questionIndex + 1],
    ];
  }

  renderQuestions();
}

function handleQuestionChange(event) {
  if (event.target.matches('[data-field="type"]')) {
    collectExamForm();
    state.currentExam.questions = state.currentExam.questions.map(ensureChoiceQuestion);
    renderQuestions();
  }

  if (event.target.matches('[data-field="image-file"]')) {
    const file = event.target.files?.[0];
    if (!file) return;

    const card = event.target.closest(".question-editor");
    const imageInput = card.querySelector('[data-field="image"]');
    const reader = new FileReader();
    reader.onload = () => {
      // Futuro: mover imagens para o Supabase Storage quando o volume crescer.
      imageInput.value = reader.result;
      collectExamForm();
      renderQuestions();
    };
    reader.readAsDataURL(file);
  }
}

async function saveExam(event) {
  event.preventDefault();
  collectExamForm();
  setMessage(examMessage, "Salvando...");

  try {
    const cameraSettings = editorCameraSettings();
    const payload = {
      title: state.currentExam.title.trim(),
      description: state.currentExam.description.trim(),
      active: state.currentExam.active,
      timeLimitMinutes: state.currentExam.timeLimitMinutes,
      cameraMonitoring: cameraSettings.cameraMonitoring,
      cameraIntervalSeconds: cameraSettings.cameraIntervalSeconds,
      questions: state.currentExam.questions.map(sanitizeQuestion),
    };
    const savedExam = await GincanaDB.saveExam({ id: state.currentExam.id, ...payload });
    await loadExams();
    navigateToExamDetail(savedExam.id);
  } catch (error) {
    setMessage(examMessage, error.message, "error");
  }
}

async function deleteCurrentExam() {
  collectExamForm();
  const id = state.currentExam.id;
  if (!id) return;
  if (!confirm("Apagar esta prova e todas as respostas dela?")) return;

  try {
    await GincanaDB.deleteExam(id);
    await loadExams();
    navigateToExamList();
  } catch (error) {
    setMessage(examMessage, error.message, "error");
  }
}

function resetResponseSummary() {
  examResponsesSubtitle.textContent = "Carregando respostas...";
  examResponseTotal.textContent = "0";
  examResponseBoys.textContent = "0";
  examResponseGirls.textContent = "0";
  examResponseAverage.textContent = "0";
  girlsResponsesList.innerHTML = `<p class="form-message">Carregando...</p>`;
  boysResponsesList.innerHTML = `<p class="form-message">Carregando...</p>`;
}

async function loadExamResponses(examIdValue = state.currentExam?.id) {
  if (!examIdValue) return;
  resetResponseSummary();

  try {
    state.currentExamSubmissions = await GincanaDB.listSubmissions(examIdValue);
    renderExamResponses(state.currentExamSubmissions);
  } catch (error) {
    examResponsesSubtitle.textContent = error.message;
    girlsResponsesList.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
    boysResponsesList.innerHTML = "";
  }
}

function renderExamResponses(submissions) {
  const exam = state.currentExam;
  const total = submissions.length;
  const boysTotal = submissions
    .filter((submission) => submission.group === "Meninos")
    .reduce((sum, submission) => sum + Number(submission.autoScore || 0), 0);
  const girlsTotal = submissions
    .filter((submission) => submission.group === "Meninas")
    .reduce((sum, submission) => sum + Number(submission.autoScore || 0), 0);
  const average = total ? (boysTotal + girlsTotal) / total : 0;

  exam.submissionsCount = total;
  exam.totals = { Meninos: boysTotal, Meninas: girlsTotal };
  const storedExam = currentExamById(exam.id);
  if (storedExam) {
    storedExam.submissionsCount = total;
    storedExam.totals = { ...exam.totals };
  }

  examResponsesSubtitle.textContent = `${total} ${total === 1 ? "resposta enviada" : "respostas enviadas"}`;
  examResponseTotal.textContent = String(total);
  examResponseBoys.textContent = formatNumber(boysTotal);
  examResponseGirls.textContent = formatNumber(girlsTotal);
  examResponseAverage.textContent = formatNumber(average);

  renderGroupResponses(girlsResponsesList, "Meninas", submissions);
  renderGroupResponses(boysResponsesList, "Meninos", submissions);
}

function renderGroupResponses(container, group, submissions) {
  const groupSubmissions = submissions.filter((submission) => submission.group === group);

  if (!groupSubmissions.length) {
    container.innerHTML = `<p class="form-message">Nenhuma resposta deste grupo ainda.</p>`;
    return;
  }

  container.innerHTML = groupSubmissions
    .map(
      (submission) => `
        <article class="participant-card ${group === "Meninas" ? "girls" : "boys"}">
          <div>
            <strong>${escapeHtml(submission.name)}</strong>
            <div class="participant-meta">
              <span>${escapeHtml(submission.group)}</span>
              <span>${new Date(submission.submittedAt).toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <div class="participant-score-row">
            <span>Pontos: <strong>${formatNumber(submission.autoScore)}</strong></span>
            <span>Saídas: <strong>${submission.focusLosses}</strong></span>
            <div class="participant-actions">
              <button type="button" class="small-button" data-action="open-submission" data-id="${submission.id}">Ver detalhes</button>
              <button type="button" class="danger-button participant-delete-button" data-action="delete-submission" data-id="${submission.id}">Excluir</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function answerText(answer, question) {
  if (question.type === "single" || question.type === "boolean" || question.type === "image") {
    if (answer === "" || answer == null) return "Sem resposta";
    return question.options[Number(answer)] || "Sem resposta";
  }
  if (question.type === "multi") {
    if (!Array.isArray(answer) || !answer.length) return "Sem resposta";
    return answer.map((index) => question.options[Number(index)] || `Opção ${Number(index) + 1}`).join(", ");
  }
  return String(answer || "Sem resposta");
}

function correctText(question) {
  if (question.type === "single" || question.type === "boolean" || question.type === "image") {
    if (question.correct === "" || question.correct == null) return "Sem gabarito";
    return question.options[Number(question.correct)] || "Sem gabarito";
  }
  if (question.type === "multi") {
    if (!Array.isArray(question.correct) || !question.correct.length) return "Sem gabarito";
    return question.correct
      .map((index) => question.options[Number(index)] || `Opção ${Number(index) + 1}`)
      .join(", ");
  }
  return "Revisão manual";
}

function hasAutomaticCorrectAnswer(question) {
  return (
    question.type === "single" ||
    question.type === "multi" ||
    question.type === "boolean" ||
    question.type === "image"
  );
}

function validMonitoringSnapshots(submission) {
  return (submission.monitoringSnapshots || []).filter((snapshot) => {
    const image = String(snapshot?.image || "");
    return image.startsWith("data:image/jpeg;base64,") || image.startsWith("data:image/png;base64,");
  });
}

function renderMonitoringGallery(submission) {
  const snapshots = validMonitoringSnapshots(submission);
  if (!submission.cameraConsentAt && !snapshots.length) return "";

  return `
    <section class="monitoring-detail">
      <div class="monitoring-detail-heading">
        <div>
          <p class="eyebrow">Monitoramento</p>
          <h3>Fotos durante a prova</h3>
        </div>
        <span>${snapshots.length} ${snapshots.length === 1 ? "foto" : "fotos"}</span>
      </div>
      ${
        submission.cameraConsentAt
          ? `<p class="monitoring-consent-time">Consentimento registrado em ${new Date(submission.cameraConsentAt).toLocaleString("pt-BR")}.</p>`
          : ""
      }
      <div class="monitoring-gallery">
        ${snapshots
          .map(
            (snapshot, index) => `
              <figure class="monitoring-photo">
                <a class="monitoring-photo-link" href="${escapeHtml(snapshot.image)}" target="_blank" rel="noopener" title="Abrir foto maior">
                  <img src="${escapeHtml(snapshot.image)}" alt="Foto de monitoramento ${index + 1}" loading="eager" decoding="async" />
                </a>
                <figcaption>
                  <span>
                    ${new Date(snapshot.capturedAt).toLocaleString("pt-BR")}
                    ${snapshot.kind === "start" ? " · Início" : snapshot.kind === "final" ? " · Final" : ""}
                  </span>
                  <span>Abrir maior</span>
                </figcaption>
              </figure>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

async function openSubmission(id) {
  const submission = await GincanaDB.getSubmission(id);
  openedSubmissionId = submission.id;
  deleteSubmissionButton.dataset.id = submission.id;
  submission.examTitle = state.currentExam?.title || "Prova";
  detailTitle.textContent = `${submission.name} - ${submission.examTitle}`;
  submissionDetail.innerHTML = `
    <div class="summary-row">
      <div class="mini-stat">${escapeHtml(submission.group)}</div>
      <div class="mini-stat">Pontos: <strong>${formatNumber(submission.autoScore)}</strong></div>
      <div class="mini-stat">Saídas da aba: <strong>${submission.focusLosses}</strong></div>
      <div class="mini-stat">${new Date(submission.submittedAt).toLocaleString("pt-BR")}</div>
    </div>
    <div class="detail-list">
      ${submission.answers
        .map(
          (item, index) => `
            <article class="answer-block">
              <p><strong>Pergunta ${index + 1}</strong></p>
              <p>${escapeHtml(item.prompt || "Pergunta")}</p>
              <p>Resposta enviada: ${escapeHtml(answerText(item.answer, item))}</p>
              ${hasAutomaticCorrectAnswer(item) ? `<p>Resposta correta: ${escapeHtml(correctText(item))}</p>` : ""}
              <p>Pontos ganhos: ${formatNumber(item.awarded)}</p>
              <p>Pontos possíveis: ${formatNumber(item.points)}</p>
            </article>
          `
        )
        .join("")}
    </div>
    ${renderMonitoringGallery(submission)}
  `;
  dialog.showModal();
}

async function deleteSubmissionById(id) {
  const submission = state.currentExamSubmissions.find((item) => String(item.id) === String(id));
  if (!submission) return;
  if (!confirm(`Excluir a resposta de ${submission.name}? Esta ação não pode ser desfeita.`)) return;

  try {
    await GincanaDB.deleteSubmission(submission.id);
    state.currentExamSubmissions = state.currentExamSubmissions.filter(
      (item) => String(item.id) !== String(submission.id)
    );

    if (String(openedSubmissionId) === String(submission.id)) {
      dialog.close();
      openedSubmissionId = "";
      deleteSubmissionButton.dataset.id = "";
    }

    renderExamResponses(state.currentExamSubmissions);
    showToast("Resposta excluída com sucesso.");
  } catch (error) {
    examResponsesSubtitle.textContent = error.message;
  }
}

async function copyExamLink(exam, button) {
  await navigator.clipboard.writeText(absolutePublicUrl(exam));
  const original = button.textContent;
  button.textContent = "Copiado";
  setTimeout(() => {
    button.textContent = original;
  }, 1500);
}

function showToast(message) {
  if (toastTimer) window.clearTimeout(toastTimer);
  adminToast.textContent = message;
  adminToast.classList.remove("hidden");
  toastTimer = window.setTimeout(() => adminToast.classList.add("hidden"), 3200);
}

function openImportExamDialog() {
  setMessage(importExamMessage, "");
  syncImportCameraSettings();
  importExamDialog.showModal();
  importExamText.focus();
}

function closeImportExamDialog() {
  importExamDialog.close();
  setMessage(importExamMessage, "");
}

async function copyExamTemplate() {
  try {
    await writeClipboardText(ExamTextParser.OFFICIAL_TEMPLATE);
    const original = copyExamTemplateButton.textContent;
    copyExamTemplateButton.textContent = "Modelo copiado";
    window.setTimeout(() => {
      copyExamTemplateButton.textContent = original;
    }, 1600);
  } catch (error) {
    setMessage(importExamMessage, "Não foi possível copiar o modelo.", "error");
  }
}

function downloadExamTemplate() {
  const file = new Blob([ExamTextParser.OFFICIAL_TEMPLATE], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-prova-gincana.txt";
  (importExamDialog.open ? importExamDialog : document.body).append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importExamFromText(event) {
  event.preventDefault();
  setMessage(importExamMessage, "Validando prova...");
  submitImportButton.disabled = true;

  try {
    if (!window.ExamTextParser) throw new Error("O importador não foi carregado.");
    const exam = {
      ...ExamTextParser.parseExam(importExamText.value),
      ...importCameraSettings(),
    };
    setMessage(importExamMessage, "Salvando prova...");
    const savedExam = await GincanaDB.saveExam(exam);
    await loadExams();
    importExamDialog.close();
    importExamText.value = "";
    navigateToExamDetail(savedExam.id);
    showToast("Prova importada com sucesso.");
  } catch (error) {
    setMessage(importExamMessage, error.message, "error");
  } finally {
    submitImportButton.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "Entrando...");
  if (document.querySelector("#password").value !== ADMIN_PASSWORD) {
    setMessage(loginMessage, "Senha incorreta.", "error");
    return;
  }

  localStorage.setItem(ADMIN_SESSION_KEY, "authenticated");
  setMessage(loginMessage, "");
  showAdmin();
  try {
    await Promise.all([loadScores(), loadExams()]);
    await applyRoute();
  } catch (error) {
    setMessage(scoresMessage, error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  showLogin();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.tab === "scores") {
      switchTab("scores");
      updateRoute("scores");
    } else {
      navigateToExamList();
    }
  });
});

scoresForm.addEventListener("submit", saveScores);
copyScoresButton.addEventListener("click", copyAdminScores);
newExamButton.addEventListener("click", () => navigateToExamEditor());
importExamButton.addEventListener("click", openImportExamDialog);
backDetailButton.addEventListener("click", () => navigateToExamList());
backEditorButton.addEventListener("click", () => navigateToExamList());
backResponsesButton.addEventListener("click", () => navigateToExamDetail(state.currentExam.id));
detailEditButton.addEventListener("click", () => navigateToExamEditor(state.currentExam.id));
detailResponsesButton.addEventListener("click", () => navigateToExamResponses(state.currentExam.id));
editFromResponsesButton.addEventListener("click", () => navigateToExamEditor(state.currentExam.id));
detailCopyLinkButton.addEventListener("click", () => copyExamLink(state.currentExam, detailCopyLinkButton));

addQuestionButton.addEventListener("click", () => {
  collectExamForm();
  state.currentExam.questions.push(defaultQuestion());
  renderQuestions();
});

questionsEditor.addEventListener("click", handleQuestionClick);
questionsEditor.addEventListener("change", handleQuestionChange);
examForm.addEventListener("submit", saveExam);
examCameraMonitoring.addEventListener("change", syncCameraSettings);
importCameraMonitoring.addEventListener("change", syncImportCameraSettings);
deleteExamButton.addEventListener("click", deleteCurrentExam);

examList.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "new-exam") return navigateToExamEditor();

  const exam = currentExamById(target.dataset.id);
  if (!exam) return;
  if (target.dataset.action === "view-exam") navigateToExamDetail(exam.id);
  if (target.dataset.action === "edit-exam") navigateToExamEditor(exam.id);
  if (target.dataset.action === "view-responses") await navigateToExamResponses(exam.id);
  if (target.dataset.action === "copy-link") await copyExamLink(exam, target);
});

refreshExamResponsesButton.addEventListener("click", () => loadExamResponses());
examResponsesPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "open-submission") {
    openSubmission(button.dataset.id).catch((error) => {
      examResponsesSubtitle.textContent = error.message;
    });
  }

  if (button.dataset.action === "delete-submission") {
    deleteSubmissionById(button.dataset.id);
  }
});

closeDialogButton.addEventListener("click", () => {
  dialog.close();
});
deleteSubmissionButton.addEventListener("click", () => deleteSubmissionById(deleteSubmissionButton.dataset.id));
dialog.addEventListener("close", () => {
  openedSubmissionId = "";
  deleteSubmissionButton.dataset.id = "";
});
importExamForm.addEventListener("submit", importExamFromText);
closeImportDialogButton.addEventListener("click", closeImportExamDialog);
cancelImportButton.addEventListener("click", closeImportExamDialog);
copyExamTemplateButton.addEventListener("click", copyExamTemplate);
downloadExamTemplateButton.addEventListener("click", downloadExamTemplate);
window.addEventListener("popstate", () => {
  if (localStorage.getItem(ADMIN_SESSION_KEY) === "authenticated") applyRoute();
});

checkSession().catch(() => showLogin());
