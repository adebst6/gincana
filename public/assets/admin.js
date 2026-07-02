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

const examList = document.querySelector("#exam-list");
const examForm = document.querySelector("#exam-form");
const examId = document.querySelector("#exam-id");
const examTitle = document.querySelector("#exam-title");
const examDescription = document.querySelector("#exam-description");
const examActive = document.querySelector("#exam-active");
const questionsEditor = document.querySelector("#questions-editor");
const addQuestionButton = document.querySelector("#add-question-button");
const newExamButton = document.querySelector("#new-exam-button");
const deleteExamButton = document.querySelector("#delete-exam-button");
const examMessage = document.querySelector("#exam-message");

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
const detailTitle = document.querySelector("#detail-title");
const submissionDetail = document.querySelector("#submission-detail");

const state = {
  exams: [],
  currentExam: null,
  currentExamSubmissions: [],
};
const ADMIN_PASSWORD = "gincana123";
const ADMIN_SESSION_KEY = "gincana_admin_session";

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

async function checkSession() {
  if (localStorage.getItem(ADMIN_SESSION_KEY) === "authenticated") {
    showAdmin();
    await Promise.all([loadScores(), loadExams()]);
    resetExamForm();
  } else {
    showLogin();
  }
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

async function loadExams() {
  state.exams = await GincanaDB.listExams();
  renderExamList();
}

function resetExamForm() {
  state.currentExam = {
    id: "",
    title: "",
    description: "",
    active: true,
    questions: [],
  };
  state.currentExamSubmissions = [];
  renderExamForm();
  hideExamResponses();
}

function selectExam(id) {
  const exam = state.exams.find((item) => String(item.id) === String(id));
  if (!exam) return;
  state.currentExam = JSON.parse(JSON.stringify(exam));
  renderExamForm();
  setMessage(examMessage, "");
  loadExamResponses(exam.id);
}

function absolutePublicUrl(exam) {
  return `${window.location.origin}${exam.publicUrl}`;
}

function renderExamList() {
  if (!state.exams.length) {
    examList.innerHTML = `<p class="form-message">Nenhuma prova criada ainda.</p>`;
    return;
  }

  examList.innerHTML = state.exams
    .map(
      (exam) => `
        <article class="exam-item">
          <div>
            <strong>${escapeHtml(exam.title)}</strong>
            <div class="exam-meta">
              <span class="pill ${exam.active ? "active" : "inactive"}">
                ${exam.active ? "Ativa" : "Inativa"}
              </span>
              <span class="pill">${exam.questions.length} questões</span>
              <span class="pill">${exam.submissionsCount} respostas</span>
            </div>
          </div>
          <div class="exam-meta">
            <span>Meninos: ${formatNumber(exam.totals.Meninos)}</span>
            <span>Meninas: ${formatNumber(exam.totals.Meninas)}</span>
          </div>
          <div class="exam-item-actions">
            <button type="button" class="small-button" data-action="edit-exam" data-id="${exam.id}">
              Editar
            </button>
            <button type="button" class="small-button" data-action="view-responses" data-id="${exam.id}">
              Ver respostas
            </button>
            <a class="small-button" href="${exam.publicUrl}" target="_blank">Abrir</a>
            <button type="button" class="small-button" data-action="copy-link" data-id="${exam.id}">
              Copiar link
            </button>
          </div>
        </article>
      `
    )
    .join("");
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

function normalizeForEditor(question) {
  const copy = { ...question };
  if (!copy.id) copy.id = uid();
  if (!copy.type) copy.type = "single";
  if (!Array.isArray(copy.options)) copy.options = [];
  if ((copy.type === "single" || copy.type === "multi") && copy.options.length === 0) {
    copy.options = ["", ""];
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
  deleteExamButton.classList.toggle("hidden", !exam.id);
  renderQuestions();
}

function renderQuestions() {
  const questions = (state.currentExam?.questions || []).map(normalizeForEditor);
  state.currentExam.questions = questions;

  if (!questions.length) {
    questionsEditor.innerHTML = `<p class="form-message">Adicione uma questão para começar.</p>`;
    return;
  }

  questionsEditor.innerHTML = questions.map(renderQuestion).join("");
}

function renderQuestion(question, index) {
  const isChoice = question.type === "single" || question.type === "multi";
  const imagePreview = question.image
    ? `<img class="image-preview" src="${escapeHtml(question.image)}" alt="Prévia da imagem" />`
    : "";

  return `
    <section class="question-editor" data-question-index="${index}" data-question-id="${escapeHtml(question.id)}">
      <div class="question-grid">
        <label>
          Tipo
          <select data-field="type">
            <option value="single" ${question.type === "single" ? "selected" : ""}>Múltipla escolha</option>
            <option value="multi" ${question.type === "multi" ? "selected" : ""}>Múltipla seleção</option>
            <option value="short" ${question.type === "short" ? "selected" : ""}>Texto curto</option>
            <option value="long" ${question.type === "long" ? "selected" : ""}>Texto longo</option>
          </select>
        </label>
        <label>
          Pontuação
          <input data-field="points" type="number" min="0" step="0.5" value="${escapeHtml(question.points ?? 0)}" />
        </label>
              <button type="button" class="danger-button" data-action="remove-question">Remover</button>
      </div>

      <label>
        Pergunta
        <textarea data-field="prompt" rows="3">${escapeHtml(question.prompt || "")}</textarea>
      </label>

      <div class="image-row">
        <label>
          Imagem opcional por URL ou base64
          <input data-field="image" type="text" value="${escapeHtml(question.image || "")}" />
        </label>
        <label>
          Escolher imagem do computador
          <input data-field="image-file" type="file" accept="image/*" />
        </label>
      </div>
      ${imagePreview}

      ${
        isChoice
          ? `
            <div class="options-editor">
              <h3>Alternativas e resposta correta</h3>
              ${question.options.map((option, optionIndex) => renderOption(question, index, option, optionIndex)).join("")}
              <button type="button" class="secondary-button" data-action="add-option">+ Adicionar alternativa</button>
            </div>
          `
          : `<p class="form-message">Questões de texto ficam salvas para revisão manual.</p>`
      }
    </section>
  `;
}

function renderOption(question, questionIndex, option, optionIndex) {
  const correctName = `correct-${question.id}`;
  const checked =
    question.type === "single"
      ? String(question.correct) === String(optionIndex)
      : Array.isArray(question.correct) && question.correct.map(String).includes(String(optionIndex));
  const inputType = question.type === "single" ? "radio" : "checkbox";

  return `
    <div class="option-row" data-option-index="${optionIndex}">
      <input data-field="option" type="text" value="${escapeHtml(option)}" placeholder="Alternativa ${optionIndex + 1}" />
      <label class="inline-check">
        <input data-field="correct" name="${correctName}" type="${inputType}" value="${optionIndex}" ${checked ? "checked" : ""} />
        Correta
      </label>
      <button type="button" class="small-button" data-action="remove-option">Remover</button>
    </div>
  `;
}

function collectExamForm() {
  const questions = [...questionsEditor.querySelectorAll(".question-editor")].map((card) => {
    const type = card.querySelector('[data-field="type"]').value;
    const rows = [...card.querySelectorAll(".option-row")];
    const options = [];
    const indexMap = new Map();

    rows.forEach((row) => {
      const oldIndex = row.dataset.optionIndex;
      const value = row.querySelector('[data-field="option"]').value.trim();
      if (value) {
        indexMap.set(String(oldIndex), String(options.length));
        options.push(value);
      }
    });

    let correct = "";
    if (type === "single") {
      const selected = rows.find((row) => row.querySelector('[data-field="correct"]')?.checked);
      correct = selected ? indexMap.get(String(selected.dataset.optionIndex)) || "" : "";
    } else if (type === "multi") {
      correct = rows
        .filter((row) => row.querySelector('[data-field="correct"]')?.checked)
        .map((row) => indexMap.get(String(row.dataset.optionIndex)))
        .filter(Boolean);
    }

    return {
      id: card.dataset.questionId || uid(),
      type,
      prompt: card.querySelector('[data-field="prompt"]').value.trim(),
      points: Number(card.querySelector('[data-field="points"]').value || 0),
      image: card.querySelector('[data-field="image"]').value.trim(),
      options,
      correct,
    };
  });

  state.currentExam = {
    id: examId.value,
    title: examTitle.value.trim(),
    description: examDescription.value.trim(),
    active: examActive.checked,
    questions,
  };
}

function ensureChoiceQuestion(question) {
  if (question.type === "single" || question.type === "multi") {
    if (!question.options.length) question.options = ["", ""];
    if (question.type === "multi" && !Array.isArray(question.correct)) question.correct = [];
    if (question.type === "single" && Array.isArray(question.correct)) question.correct = "";
  }
  return question;
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
    if (question.type === "single") {
      question.correct = "";
    } else if (question.type === "multi") {
      question.correct = question.correct
        .map(Number)
        .filter((value) => value !== optionIndex)
        .map((value) => String(value > optionIndex ? value - 1 : value));
    }
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
      // Futuro: trocar data URL por upload para uma pasta /uploads quando houver muitas imagens.
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
    const payload = {
      title: state.currentExam.title,
      description: state.currentExam.description,
      active: state.currentExam.active,
      questions: state.currentExam.questions,
    };
    const id = state.currentExam.id;
    const savedExam = await GincanaDB.saveExam({ id, ...payload });
    await loadExams();
    const saved = state.exams.find((exam) => String(exam.id) === String(savedExam.id));
    if (saved) selectExam(saved.id);
    setMessage(examMessage, "Prova salva. Link público gerado na lista ao lado.", "ok");
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
    resetExamForm();
    setMessage(examMessage, "Prova apagada.", "ok");
  } catch (error) {
    setMessage(examMessage, error.message, "error");
  }
}

function hideExamResponses() {
  examResponsesPanel.classList.add("hidden");
  examResponsesSubtitle.textContent = "Selecione uma prova para ver os envios.";
  examResponseTotal.textContent = "0";
  examResponseBoys.textContent = "0";
  examResponseGirls.textContent = "0";
  examResponseAverage.textContent = "0";
  girlsResponsesList.innerHTML = "";
  boysResponsesList.innerHTML = "";
}

async function loadExamResponses(examId = state.currentExam?.id) {
  if (!examId) {
    hideExamResponses();
    return;
  }

  examResponsesPanel.classList.remove("hidden");
  examResponsesSubtitle.textContent = "Carregando respostas...";
  girlsResponsesList.innerHTML = `<p class="form-message">Carregando...</p>`;
  boysResponsesList.innerHTML = `<p class="form-message">Carregando...</p>`;

  try {
    state.currentExamSubmissions = await GincanaDB.listSubmissions(examId);
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

  examResponsesSubtitle.textContent = exam
    ? `${exam.title} • ${total} ${total === 1 ? "resposta enviada" : "respostas enviadas"}`
    : `${total} respostas enviadas`;
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
            <button type="button" class="small-button" data-action="open-submission" data-id="${submission.id}">
              Ver detalhes
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function answerText(answer, question) {
  if (question.type === "single") {
    return question.options[Number(answer)] || "Sem resposta";
  }
  if (question.type === "multi") {
    if (!Array.isArray(answer) || !answer.length) return "Sem resposta";
    return answer.map((index) => question.options[Number(index)] || `Opção ${Number(index) + 1}`).join(", ");
  }
  return String(answer || "Sem resposta");
}

function correctText(question) {
  if (question.type === "single") {
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
  return question.type === "single" || question.type === "multi";
}

async function openSubmission(id) {
  const submission = await GincanaDB.getSubmission(id);
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
              ${
                hasAutomaticCorrectAnswer(item)
                  ? `<p>Resposta correta: ${escapeHtml(correctText(item))}</p>`
                  : ""
              }
              <p>Pontos ganhos: ${formatNumber(item.awarded)}</p>
              <p>Pontos possíveis: ${formatNumber(item.points)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
  dialog.showModal();
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
    resetExamForm();
  } catch (error) {
    setMessage(scoresMessage, error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  showLogin();
});

tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
scoresForm.addEventListener("submit", saveScores);
newExamButton.addEventListener("click", () => {
  resetExamForm();
  setMessage(examMessage, "");
});
addQuestionButton.addEventListener("click", () => {
  collectExamForm();
  state.currentExam.questions.push(defaultQuestion());
  renderQuestions();
});
questionsEditor.addEventListener("click", handleQuestionClick);
questionsEditor.addEventListener("change", handleQuestionChange);
examForm.addEventListener("submit", saveExam);
deleteExamButton.addEventListener("click", deleteCurrentExam);

examList.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const exam = state.exams.find((item) => String(item.id) === String(target.dataset.id));
  if (!exam) return;

  if (target.dataset.action === "edit-exam") {
    selectExam(exam.id);
  }

  if (target.dataset.action === "view-responses") {
    selectExam(exam.id);
    switchTab("exams");
    examResponsesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (target.dataset.action === "copy-link") {
    await navigator.clipboard.writeText(absolutePublicUrl(exam));
    target.textContent = "Copiado";
    setTimeout(() => {
      target.textContent = "Copiar link";
    }, 1500);
  }
});

refreshExamResponsesButton.addEventListener("click", () => loadExamResponses());

examResponsesPanel.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="open-submission"]');
  if (button) {
    openSubmission(button.dataset.id).catch((error) => {
      examResponsesSubtitle.textContent = error.message;
    });
  }
});

closeDialogButton.addEventListener("click", () => dialog.close());

checkSession().catch(() => showLogin());
