const examTitle = document.querySelector("#exam-title");
const examDescription = document.querySelector("#exam-description");
const startView = document.querySelector("#start-view");
const startForm = document.querySelector("#start-form");
const participantName = document.querySelector("#participant-name");
const participantGroup = document.querySelector("#participant-group");
const fullscreenOption = document.querySelector("#fullscreen-option");
const examView = document.querySelector("#exam-view");
const successView = document.querySelector("#success-view");
const errorView = document.querySelector("#error-view");
const errorMessage = document.querySelector("#error-message");
const questionsView = document.querySelector("#questions-view");
const publicExamForm = document.querySelector("#public-exam-form");
const examMessage = document.querySelector("#exam-message");
const warningBanner = document.querySelector("#warning-banner");
const timeLimitNotice = document.querySelector("#time-limit-notice");
const progressLabel = document.querySelector("#progress-label");
const progressPercent = document.querySelector("#progress-percent");
const progressFill = document.querySelector("#progress-fill");
const timerDisplay = document.querySelector("#timer-display");
const prevQuestionButton = document.querySelector("#prev-question-button");
const nextQuestionButton = document.querySelector("#next-question-button");
const submitExamButton = document.querySelector("#submit-exam-button");
const confettiLayer = document.querySelector("#confetti-layer");
const successName = document.querySelector("#success-name");
const successGroup = document.querySelector("#success-group");
const successScore = document.querySelector("#success-score");

const pathMatch = window.location.pathname.match(/^\/(?:exam|prova)\/([^/]+)\/?$/);
const examId = new URLSearchParams(window.location.search).get("id") || pathMatch?.[1] || "";
let currentExam = null;
let currentQuestionIndex = 0;
let focusLosses = 0;
let lastLossAt = 0;
let guardsActive = false;
let timerDeadline = null;
let timerInterval = null;
let timeExpired = false;
let isSubmitting = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatScore(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimeLimit(minutes) {
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function setMessage(message, type = "") {
  examMessage.textContent = message;
  examMessage.className = `form-message ${type}`.trim();
}

function showOnly(section) {
  [startView, examView, successView, errorView].forEach((view) => view.classList.add("hidden"));
  section.classList.remove("hidden");
}

async function loadExam() {
  try {
    if (!examId) throw new Error("Link da prova incompleto.");
    currentExam = await GincanaDB.getActiveExam(decodeURIComponent(examId));
    if (!currentExam) throw new Error("Prova indisponível ou inativa.");
    document.title = `Gincana Online | ${currentExam.title}`;
    examTitle.textContent = currentExam.title;
    examDescription.textContent = currentExam.description || "";
    if (currentExam.timeLimitMinutes > 0) {
      timeLimitNotice.textContent = `Tempo limite: ${formatTimeLimit(currentExam.timeLimitMinutes)}. Ao terminar, as respostas serão enviadas automaticamente.`;
      timeLimitNotice.classList.remove("hidden");
    }
    renderQuestions();
    updateQuestionView();
    showOnly(startView);
  } catch (error) {
    examTitle.textContent = "Prova indisponível";
    errorMessage.textContent = error.message;
    showOnly(errorView);
  }
}

function renderQuestions() {
  if (!currentExam.questions.length) {
    questionsView.innerHTML = `
      <section class="public-question empty-question active">
        <div class="question-title">
          <strong>Esta prova ainda não possui perguntas.</strong>
        </div>
      </section>
    `;
    return;
  }

  questionsView.innerHTML = currentExam.questions.map(renderQuestion).join("");
}

function renderQuestion(question, index) {
  const image = question.image
    ? `<img class="question-image" src="${escapeHtml(question.image)}" alt="Imagem da pergunta" />`
    : "";

  return `
    <section class="public-question" data-question-id="${escapeHtml(question.id)}" data-type="${question.type}">
      <div class="question-title">
        <strong>${index + 1}. ${escapeHtml(question.prompt || "Pergunta")}</strong>
        <span class="question-points">${Number(question.points || 0)} pts</span>
      </div>
      ${image}
      ${renderAnswerField(question)}
    </section>
  `;
}

function renderAnswerField(question) {
  if (question.type === "single" || question.type === "boolean" || question.type === "image") {
    return `
      <div class="answer-options">
        ${question.options
          .map(
            (option, index) => `
              <label class="answer-option">
                <input type="radio" name="${escapeHtml(question.id)}" value="${index}" />
                <span>${escapeHtml(option)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    `;
  }

  if (question.type === "multi") {
    return `
      <div class="answer-options">
        ${question.options
          .map(
            (option, index) => `
              <label class="answer-option">
                <input type="checkbox" name="${escapeHtml(question.id)}" value="${index}" />
                <span>${escapeHtml(option)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    `;
  }

  if (question.type === "short") {
    return `<input type="text" data-answer-text placeholder="Resposta curta" />`;
  }

  return `<textarea data-answer-text rows="5" placeholder="Resposta"></textarea>`;
}

function questionBlocks() {
  return [...document.querySelectorAll(".public-question[data-question-id]")];
}

function updateQuestionView() {
  const blocks = questionBlocks();
  const total = blocks.length;

  if (!total) {
    progressLabel.textContent = "Pronto para enviar";
    progressPercent.textContent = "100%";
    progressFill.style.width = "100%";
    prevQuestionButton.classList.add("hidden");
    nextQuestionButton.classList.add("hidden");
    submitExamButton.classList.remove("hidden");
    return;
  }

  currentQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, total - 1));
  blocks.forEach((block, index) => {
    block.classList.toggle("active", index === currentQuestionIndex);
  });

  const current = currentQuestionIndex + 1;
  const percent = Math.round((current / total) * 100);
  progressLabel.textContent = `Pergunta ${current} de ${total}`;
  progressPercent.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
  prevQuestionButton.classList.toggle("hidden", currentQuestionIndex === 0);
  nextQuestionButton.classList.toggle("hidden", currentQuestionIndex === total - 1);
  submitExamButton.classList.toggle("hidden", currentQuestionIndex !== total - 1);
  setMessage("");
}

function goToQuestion(index) {
  currentQuestionIndex = index;
  updateQuestionView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function syncChoiceSelection(event) {
  const input = event.target;
  if (!input.matches('.answer-option input[type="radio"], .answer-option input[type="checkbox"]')) {
    return;
  }

  const question = input.closest(".public-question");
  if (input.type === "radio") {
    question.querySelectorAll(".answer-option").forEach((option) => option.classList.remove("selected"));
  }
  input.closest(".answer-option").classList.toggle("selected", input.checked);
}

function registerFocusLoss() {
  if (!guardsActive) return;
  const now = Date.now();
  if (now - lastLossAt < 900) return;
  lastLossAt = now;
  focusLosses += 1;
  warningBanner.textContent = `Atenção: saída da aba ou perda de foco registrada (${focusLosses}).`;
  warningBanner.classList.remove("hidden");
}

function blockEvent(event) {
  if (!guardsActive) return;
  event.preventDefault();
}

function blockSelection(event) {
  if (!guardsActive) return;
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  event.preventDefault();
}

function activateGuards() {
  guardsActive = true;
  document.body.classList.add("exam-active");
  document.addEventListener("copy", blockEvent);
  document.addEventListener("cut", blockEvent);
  document.addEventListener("paste", blockEvent);
  document.addEventListener("contextmenu", blockEvent);
  document.addEventListener("selectstart", blockSelection);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) registerFocusLoss();
  });
  window.addEventListener("blur", registerFocusLoss);
}

function deactivateGuards() {
  guardsActive = false;
  document.body.classList.remove("exam-active");
  stopTimer();
}

function stopTimer() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
  timerDeadline = null;
}

function updateTimer() {
  if (!timerDeadline) return;
  const remainingSeconds = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
  timerDisplay.textContent = formatCountdown(remainingSeconds);
  timerDisplay.classList.toggle("warning", remainingSeconds <= 60);

  if (remainingSeconds === 0) {
    if (timerInterval) window.clearInterval(timerInterval);
    timerInterval = null;
    timeExpired = true;
    setMessage("Tempo esgotado. Enviando respostas...");
    submitExam();
  }
}

function startTimer() {
  const minutes = Number(currentExam.timeLimitMinutes || 0);
  if (minutes <= 0) {
    timerDisplay.classList.add("hidden");
    return;
  }

  timeExpired = false;
  timerDeadline = Date.now() + minutes * 60 * 1000;
  timerDisplay.classList.remove("hidden");
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 250);
}

async function startExam(event) {
  event.preventDefault();
  if (!participantName.value.trim() || !participantGroup.value) return;

  if (fullscreenOption.checked && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen().catch(() => {});
  }

  currentQuestionIndex = 0;
  activateGuards();
  showOnly(examView);
  updateQuestionView();
  startTimer();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectAnswers() {
  const answers = {};
  document.querySelectorAll(".public-question[data-question-id]").forEach((block) => {
    const qid = block.dataset.questionId;
    const type = block.dataset.type;

    if (type === "single" || type === "boolean" || type === "image") {
      const selected = block.querySelector('input[type="radio"]:checked');
      answers[qid] = selected ? selected.value : "";
    } else if (type === "multi") {
      answers[qid] = [...block.querySelectorAll('input[type="checkbox"]:checked')].map(
        (input) => input.value
      );
    } else {
      answers[qid] = block.querySelector("[data-answer-text]")?.value.trim() || "";
    }
  });
  return answers;
}

function exactMultiMatch(answer, correct) {
  if (!Array.isArray(answer) || !Array.isArray(correct) || !correct.length) return false;
  const answerSet = new Set(answer.map(String));
  const correctSet = new Set(correct.map(String));
  return answerSet.size === correctSet.size && [...answerSet].every((value) => correctSet.has(value));
}

function scoreAnswers(rawAnswers) {
  let score = 0;
  const answers = currentExam.questions.map((question) => {
    const answer = rawAnswers[question.id] ?? (question.type === "multi" ? [] : "");
    let awarded = 0;

    if (
      (question.type === "single" || question.type === "boolean" || question.type === "image") &&
      answer !== "" &&
      question.correct !== "" &&
      String(answer) === String(question.correct)
    ) {
      awarded = Number(question.points || 0);
    }
    if (question.type === "multi" && exactMultiMatch(answer, question.correct)) {
      awarded = Number(question.points || 0);
    }

    score += awarded;
    return {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options || [],
      correct: question.correct,
      points: Number(question.points || 0),
      answer,
      awarded,
    };
  });

  return { score, answers };
}

function createConfetti() {
  const colors = ["#63aaf7", "#ff86ae", "#f8d65d", "#73d9a2"];
  confettiLayer.innerHTML = "";
  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.6}s`;
    piece.style.animationDuration = `${2.2 + Math.random() * 1.2}s`;
    confettiLayer.append(piece);
  }
}

async function submitExam(event) {
  event?.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;
  setMessage(timeExpired ? "Tempo esgotado. Enviando respostas..." : "Enviando...");
  submitExamButton.disabled = true;

  try {
    const result = scoreAnswers(collectAnswers());
    await GincanaDB.createSubmission({
      examId: currentExam.id,
      participantName: participantName.value.trim(),
      groupName: participantGroup.value,
      answers: result.answers,
      score: result.score,
      tabLeaveCount: focusLosses,
    });

    deactivateGuards();
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    successName.textContent = participantName.value.trim();
    successGroup.textContent = participantGroup.value;
    successScore.textContent = formatScore(result.score);
    createConfetti();
    showOnly(successView);
  } catch (error) {
    isSubmitting = false;
    submitExamButton.disabled = false;
    setMessage(error.message, "error");
  }
}

startForm.addEventListener("submit", startExam);
publicExamForm.addEventListener("submit", submitExam);
questionsView.addEventListener("change", syncChoiceSelection);
prevQuestionButton.addEventListener("click", () => goToQuestion(currentQuestionIndex - 1));
nextQuestionButton.addEventListener("click", () => goToQuestion(currentQuestionIndex + 1));

loadExam();
