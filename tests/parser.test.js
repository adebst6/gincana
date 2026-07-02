const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OFFICIAL_TEMPLATE,
  ExamParseError,
  parseExam,
  parseQuestion,
} = require("../public/assets/parser.js");

const QUESTION_TYPES = [
  "MULTIPLA_ESCOLHA",
  "MULTIPLA_SELECAO",
  "VERDADEIRO_FALSO",
  "TEXTO_CURTO",
  "TEXTO_LONGO",
  "IMAGEM",
];

function questionBlock(type, index) {
  const prompt = `Pergunta de teste ${index + 1}?`;
  const common = `${type}\n\nPergunta: ${prompt}\nPontos: ${index + 1}`;

  if (type === "MULTIPLA_ESCOLHA") {
    return `${common}\n\nA) Alternativa A\nB) Alternativa B\nC) Alternativa C\n\nCorreta: B`;
  }

  if (type === "MULTIPLA_SELECAO") {
    return `${common}\n\nA) Alternativa A\nB) Alternativa B\nC) Alternativa C\n\nCorretas: A,C`;
  }

  if (type === "VERDADEIRO_FALSO") {
    return `${common}\n\nResposta: ${index % 2 === 0 ? "Verdadeiro" : "Falso"}`;
  }

  if (type === "IMAGEM") {
    return `${type}\n\nPergunta: ${prompt}\n\nImagem:\nhttps://example.com/imagem-${index + 1}.jpg\n\nPontos: ${index + 1}\n\nA) Alternativa A\nB) Alternativa B\nC) Alternativa C\n\nCorreta: C`;
  }

  return common;
}

function examText(questionCount) {
  const blocks = Array.from({ length: questionCount }, (_, index) =>
    questionBlock(QUESTION_TYPES[index % QUESTION_TYPES.length], index)
  );

  return `PROVA\nTitulo: Prova com ${questionCount} questões\nTempo: 45\nDescricao: Teste automático.\n\n---\n\n${blocks.join(
    "\n\n---\n\n"
  )}\n\n---`;
}

test("interpreta o modelo oficial completo", () => {
  const exam = parseExam(OFFICIAL_TEMPLATE);

  assert.equal(exam.title, "Gênesis 1 ao 16");
  assert.equal(exam.timeLimitMinutes, 40);
  assert.equal(exam.questions.length, 6);
  assert.deepEqual(
    exam.questions.map((question) => question.type),
    ["single", "multi", "boolean", "short", "long", "image"]
  );
  assert.deepEqual(exam.questions[1].correct, ["0", "1", "3"]);
  assert.equal(exam.questions[5].image, "https://site.com/imagem.jpg");
});

for (const questionCount of [5, 20, 50, 100]) {
  test(`importa prova com ${questionCount} questões`, () => {
    const exam = parseExam(examText(questionCount));

    assert.equal(exam.questions.length, questionCount);
    assert.equal(exam.timeLimitMinutes, 45);
    assert.ok(exam.questions.every((question) => question.id && question.prompt));
    assert.ok(exam.questions.every((question) => Number.isFinite(question.points)));

    if (questionCount >= QUESTION_TYPES.length) {
      assert.deepEqual(
        new Set(exam.questions.map((question) => question.type)),
        new Set(["single", "multi", "boolean", "short", "long", "image"])
      );
    }
  });
}

test("normaliza todas as respostas aceitas em verdadeiro ou falso", () => {
  const trueValues = ["Verdadeiro", "True", "V"];
  const falseValues = ["Falso", "False", "F"];

  trueValues.forEach((value) => {
    const question = parseQuestion(
      `VERDADEIRO_FALSO\nPergunta: Afirmação verdadeira?\nPontos: 2\nResposta: ${value}`
    );
    assert.equal(question.correct, "0");
  });

  falseValues.forEach((value) => {
    const question = parseQuestion(
      `VERDADEIRO_FALSO\nPergunta: Afirmação falsa?\nPontos: 2\nResposta: ${value}`
    );
    assert.equal(question.correct, "1");
  });
});

test("informa a linha de um tipo desconhecido", () => {
  const text = `PROVA\nTitulo: Teste\nTempo: 10\nDescricao: Erro esperado.\n\n---\n\nTIPO_DESCONHECIDO\nPergunta: Teste?\nPontos: 1`;

  assert.throws(
    () => parseExam(text),
    (error) => {
      assert.ok(error instanceof ExamParseError);
      assert.equal(error.message, "Linha 8:\n\nTipo de questão inválido: TIPO_DESCONHECIDO.");
      return true;
    }
  );
});

test("não aceita título vazio e não retorna metadados internos", () => {
  assert.throws(
    () => parseExam("PROVA\nTitulo:\nTempo: 10\n\n---\n\nTEXTO_CURTO\nPergunta: Teste?\nPontos: 1"),
    { message: "Linha 2:\n\nInforme o título da prova." }
  );

  const exam = parseExam(examText(5));
  assert.equal(Object.hasOwn(exam, "__source"), false);
  assert.equal(Object.hasOwn(exam.questions[0], "__source"), false);
});
