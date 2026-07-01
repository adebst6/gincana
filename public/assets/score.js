const boysScore = document.querySelector("#boys-score");
const girlsScore = document.querySelector("#girls-score");
const boysFill = document.querySelector("#boys-fill");
const girlsFill = document.querySelector("#girls-fill");
const boysPercent = document.querySelector("#boys-percent");
const girlsPercent = document.querySelector("#girls-percent");
const lastUpdate = document.querySelector("#last-update");
const boysCard = document.querySelector(".team-boys");
const girlsCard = document.querySelector(".team-girls");
let previousScores = null;

function formatPercent(value) {
  return `${Math.round(value)}% do total`;
}

function applyScores(payload) {
  const boys = Number(payload.scores.Meninos || 0);
  const girls = Number(payload.scores.Meninas || 0);
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
  boysFill.style.width = `${boysShare}%`;
  girlsFill.style.width = `${girlsShare}%`;
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

async function loadScores() {
  try {
    const response = await fetch("/api/scores", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Falha ao carregar a pontuação.");
    }
    applyScores(await response.json());
  } catch (error) {
    lastUpdate.textContent = "Não foi possível atualizar agora.";
  }
}

loadScores();
setInterval(loadScores, 3000);
