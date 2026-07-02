const boysScore = document.querySelector("#boys-score");
const girlsScore = document.querySelector("#girls-score");
const boysFill = document.querySelector("#boys-fill");
const girlsFill = document.querySelector("#girls-fill");
const boysPercent = document.querySelector("#boys-percent");
const girlsPercent = document.querySelector("#girls-percent");
const lastUpdate = document.querySelector("#last-update");
const copyPublicScoreButton = document.querySelector("#copy-public-score-button");
const boysCard = document.querySelector(".team-boys");
const girlsCard = document.querySelector(".team-girls");
let previousScores = null;

function formatPercent(value) {
  return `${Math.round(value)}% do total`;
}

function applyScores(payload) {
  const boys = Number(payload.boysPoints || 0);
  const girls = Number(payload.girlsPoints || 0);
  const total = boys + girls;
  const boysShare = total > 0 ? (boys / total) * 100 : 0;
  const girlsShare = total > 0 ? (girls / total) * 100 : 0;

  if (previousScores && previousScores.boys !== boys) {
    pulseCard(boysCard);
  }
  if (previousScores && previousScores.girls !== girls) {
    pulseCard(girlsCard);
  }

  boysScore.textContent = boys;
  girlsScore.textContent = girls;
  boysFill.style.height = `${boysShare}%`;
  girlsFill.style.height = `${girlsShare}%`;
  boysFill.classList.toggle("has-score", boys > 0);
  girlsFill.classList.toggle("has-score", girls > 0);
  boysPercent.textContent = formatPercent(boysShare);
  girlsPercent.textContent = formatPercent(girlsShare);
  lastUpdate.textContent = `Última atualização: ${new Date().toLocaleTimeString("pt-BR")}`;
  previousScores = { boys, girls };
}

function pulseCard(card) {
  card.classList.remove("score-pop");
  window.requestAnimationFrame(() => {
    card.classList.add("score-pop");
  });
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
    document.body.append(helper);
    helper.select();
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

async function copyCurrentScore() {
  const scores = previousScores || {
    boys: Number(boysScore.textContent || 0),
    girls: Number(girlsScore.textContent || 0),
  };
  try {
    await writeClipboardText(scoreShareText(scores.boys, scores.girls));
    showCopyFeedback(copyPublicScoreButton);
  } catch (error) {
    console.error(error);
    lastUpdate.textContent = "Não foi possível copiar agora.";
  }
}

async function loadScores() {
  try {
    applyScores(await GincanaDB.getScores());
  } catch (error) {
    console.error(error);
    lastUpdate.textContent = "Não foi possível atualizar agora.";
  }
}

loadScores();
setInterval(loadScores, 5000);
copyPublicScoreButton.addEventListener("click", copyCurrentScore);
