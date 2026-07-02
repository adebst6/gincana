(function exposeExamTextParser(root, factory) {
  const parser = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = parser;
  }

  if (root) {
    root.ExamTextParser = parser;
  }
})(typeof window !== "undefined" ? window : globalThis, function createExamTextParser() {
  "use strict";

  const OFFICIAL_TEMPLATE = `PROVA
Titulo: Gênesis 1 ao 16
Tempo: 40
Monitoramento: Sim
IntervaloFotos: 60
Descricao: Primeira fase da gincana.

---

MULTIPLA_ESCOLHA

Pergunta: Quem construiu a arca?
Pontos: 5

A) Moisés
B) Abraão
C) Noé
D) Isaque

Correta: C

---

MULTIPLA_SELECAO

Pergunta: Quais personagens aparecem em Gênesis 12?
Pontos: 8

A) Abraão
B) Ló
C) José
D) Sara

Corretas: A,B,D

---

VERDADEIRO_FALSO

Pergunta: Deus criou o homem antes da luz.
Pontos: 3

Resposta: Falso

---

TEXTO_CURTO

Pergunta: O que significa fé?
Pontos: 5

---

TEXTO_LONGO

Pergunta: Explique a importância da aliança de Deus com Abraão.
Pontos: 15

---

IMAGEM

Pergunta: O que esta imagem representa?

Imagem:
https://site.com/imagem.jpg

Pontos: 10

A) Torre de Babel
B) Jardim do Éden
C) Arca de Noé

Correta: B

---`;

  const TYPE_MAP = Object.freeze({
    MULTIPLA_ESCOLHA: "single",
    MULTIPLA_SELECAO: "multi",
    VERDADEIRO_FALSO: "boolean",
    TEXTO_CURTO: "short",
    TEXTO_LONGO: "long",
    IMAGEM: "image",
  });

  class ExamParseError extends Error {
    constructor(line, description) {
      super(`Linha ${Math.max(1, Number(line) || 1)}:\n\n${description}`);
      this.name = "ExamParseError";
      this.line = Math.max(1, Number(line) || 1);
    }
  }

  function fail(line, description) {
    throw new ExamParseError(line, description);
  }

  function normalizeText(text) {
    return String(text ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  }

  function createLineRecords(text, startLine = 1) {
    return normalizeText(text)
      .split("\n")
      .map((value, index) => ({ number: startLine + index, value }));
  }

  function hasContent(lines) {
    return lines.some((line) => line.value.trim());
  }

  function firstContentLine(lines) {
    return lines.find((line) => line.value.trim()) || lines[0] || { number: 1, value: "" };
  }

  function splitBlocks(lines) {
    const blocks = [];
    let current = [];

    lines.forEach((line) => {
      if (line.value.trim() === "---") {
        if (hasContent(current)) blocks.push(current);
        current = [];
        return;
      }
      current.push(line);
    });

    if (hasContent(current)) blocks.push(current);
    return blocks;
  }

  function readField(lines, label) {
    const prefix = `${label}:`;
    const index = lines.findIndex((line) => line.value.trim().startsWith(prefix));
    if (index < 0) return null;

    const line = lines[index];
    return {
      index,
      line: line.number,
      value: line.value.trim().slice(prefix.length).trim(),
    };
  }

  function readRequiredField(lines, label, fallbackLine, description) {
    const field = readField(lines, label);
    if (!field) fail(fallbackLine, description);
    if (!field.value) fail(field.line, description);
    return field;
  }

  function isFieldLine(value) {
    const labels = ["Pergunta", "Pontos", "Correta", "Corretas", "Resposta", "Imagem"];
    const trimmed = String(value || "").trim();
    return labels.some((label) => trimmed.startsWith(`${label}:`));
  }

  function parseNonNegativeNumber(field, description) {
    const number = Number(String(field.value).replace(",", "."));
    if (!Number.isFinite(number) || number < 0) fail(field.line, description);
    return number;
  }

  function parseMonitoringFlag(field) {
    const normalized = String(field?.value || "")
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (["sim", "s", "true", "1", "ativado", "ativa", "ativo"].includes(normalized)) return true;
    if (
      ["nao", "não", "n", "false", "0", "desativado", "desativada", "inativo", "inativa"].includes(
        normalized
      )
    ) {
      return false;
    }

    fail(field.line, 'Use "Sim" ou "Não" no campo Monitoramento.');
  }

  function parseCameraInterval(field) {
    if (!field) return 60;
    const interval = parseNonNegativeNumber(
      field,
      "O intervalo das fotos deve ser 30, 60 ou 120 segundos."
    );
    if (![30, 60, 120].includes(interval)) {
      fail(field.line, "O intervalo das fotos deve ser 30, 60 ou 120 segundos.");
    }
    return interval;
  }

  function isAsciiLetter(value) {
    if (!value || value.length !== 1) return false;
    const code = value.toUpperCase().charCodeAt(0);
    return code >= 65 && code <= 90;
  }

  function parseAlternative(line) {
    const value = line.value.trim();
    if (value.length < 2 || value[1] !== ")" || !isAsciiLetter(value[0])) return null;
    return {
      label: value[0].toUpperCase(),
      text: value.slice(2).trim(),
      line: line.number,
    };
  }

  function parseAlternatives(lines) {
    const alternatives = lines.map(parseAlternative).filter(Boolean);
    const labels = new Set();

    alternatives.forEach((alternative) => {
      if (!alternative.text) fail(alternative.line, `A alternativa ${alternative.label} está vazia.`);
      if (labels.has(alternative.label)) fail(alternative.line, `A alternativa ${alternative.label} está repetida.`);
      labels.add(alternative.label);
    });

    return alternatives;
  }

  function mapCorrectLabel(label, alternatives, line) {
    const normalized = String(label || "").trim().toUpperCase();
    const index = alternatives.findIndex((alternative) => alternative.label === normalized);
    if (index < 0) fail(line, `A resposta correta "${normalized || label}" não corresponde a uma alternativa.`);
    return String(index);
  }

  function normalizeBooleanAnswer(value, line) {
    const normalized = String(value || "").trim().toLocaleLowerCase("pt-BR");
    if (["verdadeiro", "true", "v"].includes(normalized)) return "0";
    if (["falso", "false", "f"].includes(normalized)) return "1";
    fail(line, 'A resposta deve ser "Verdadeiro" ou "Falso".');
  }

  function createQuestionId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `question-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function attachQuestionMetadata(question, metadata) {
    Object.defineProperty(question, "__source", {
      value: metadata,
      enumerable: false,
    });
    return question;
  }

  function normalizeQuestionLines(block, startLine = 1) {
    if (Array.isArray(block)) return block;
    return createLineRecords(block, startLine);
  }

  function parseQuestion(block, startLine = 1) {
    const lines = normalizeQuestionLines(block, startLine);
    const typeLine = firstContentLine(lines);
    const sourceType = typeLine.value.trim();
    const type = TYPE_MAP[sourceType];

    if (!type) fail(typeLine.number, `Tipo de questão inválido: ${sourceType || "vazio"}.`);

    const promptField = readRequiredField(
      lines,
      "Pergunta",
      typeLine.number,
      "Informe a pergunta."
    );
    const pointsField = readRequiredField(
      lines,
      "Pontos",
      typeLine.number,
      "Informe os pontos da questão."
    );
    const points = parseNonNegativeNumber(pointsField, "Os pontos devem ser um número maior ou igual a zero.");
    const alternatives = parseAlternatives(lines);

    let options = [];
    let correct = "";
    let image = "";
    let answerLine = typeLine.number;

    if (sourceType === "MULTIPLA_ESCOLHA" || sourceType === "IMAGEM") {
      const correctField = readRequiredField(
        lines,
        "Correta",
        typeLine.number,
        "Informe a alternativa correta."
      );
      answerLine = correctField.line;
      options = alternatives.map((alternative) => alternative.text);
      correct = mapCorrectLabel(correctField.value, alternatives, correctField.line);
    }

    if (sourceType === "MULTIPLA_SELECAO") {
      const correctField = readRequiredField(
        lines,
        "Corretas",
        typeLine.number,
        "Informe as alternativas corretas."
      );
      answerLine = correctField.line;
      options = alternatives.map((alternative) => alternative.text);
      const labels = correctField.value
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      if (!labels.length) fail(correctField.line, "Informe ao menos uma alternativa correta.");
      correct = [...new Set(labels.map((label) => mapCorrectLabel(label, alternatives, correctField.line)))];
    }

    if (sourceType === "VERDADEIRO_FALSO") {
      const answerField = readRequiredField(
        lines,
        "Resposta",
        typeLine.number,
        "Informe a resposta da questão."
      );
      answerLine = answerField.line;
      options = ["Verdadeiro", "Falso"];
      correct = normalizeBooleanAnswer(answerField.value, answerField.line);
    }

    if (sourceType === "IMAGEM") {
      const imageField = readField(lines, "Imagem");
      if (!imageField) fail(typeLine.number, "Informe a URL da imagem.");
      image = imageField.value;

      if (!image) {
        const nextLine = lines.slice(imageField.index + 1).find((line) => line.value.trim());
        if (!nextLine || isFieldLine(nextLine.value)) {
          fail(imageField.line, "Informe a URL da imagem.");
        }
        image = nextLine.value.trim();
      }
    }

    const question = attachQuestionMetadata(
      {
        id: createQuestionId(),
        type,
        prompt: promptField.value,
        points,
        options,
        correct,
        image,
      },
      {
        type: sourceType,
        typeLine: typeLine.number,
        promptLine: promptField.line,
        pointsLine: pointsField.line,
        answerLine,
      }
    );

    validateQuestion(question);
    return question;
  }

  function validateQuestion(question, questionIndex = 0) {
    const source = question?.__source || {};
    const fallbackLine = source.typeLine || questionIndex + 1;
    const automatic =
      question?.type === "single" ||
      question?.type === "multi" ||
      question?.type === "boolean" ||
      question?.type === "image";

    if (!question || !String(question.prompt || "").trim()) {
      fail(source.promptLine || fallbackLine, "Informe a pergunta.");
    }

    if (!Number.isFinite(Number(question.points)) || Number(question.points) < 0) {
      fail(source.pointsLine || fallbackLine, "Os pontos devem ser um número maior ou igual a zero.");
    }

    if (automatic && (!Array.isArray(question.options) || question.options.length < 2)) {
      fail(fallbackLine, "Adicione pelo menos duas alternativas.");
    }

    if (
      (question.type === "single" || question.type === "boolean" || question.type === "image") &&
      question.correct === ""
    ) {
      fail(source.answerLine || fallbackLine, "Informe a resposta correta.");
    }

    if (question.type === "multi" && (!Array.isArray(question.correct) || !question.correct.length)) {
      fail(source.answerLine || fallbackLine, "Informe ao menos uma resposta correta.");
    }

    if (source.type === "IMAGEM" && !String(question.image || "").trim()) {
      fail(fallbackLine, "Informe a URL da imagem.");
    }

    return true;
  }

  function validateExam(exam) {
    const source = exam?.__source || {};
    const fallbackLine = source.headerLine || 1;

    if (!exam || !String(exam.title || "").trim()) {
      fail(source.titleLine || fallbackLine, "Informe o título da prova.");
    }

    if (!Number.isInteger(Number(exam.timeLimitMinutes)) || Number(exam.timeLimitMinutes) < 0) {
      fail(source.timeLine || fallbackLine, "O tempo deve ser um número inteiro maior ou igual a zero.");
    }

    if (!Array.isArray(exam.questions) || !exam.questions.length) {
      fail(fallbackLine, "Adicione ao menos uma questão à prova.");
    }

    exam.questions.forEach((question, index) => validateQuestion(question, index));
    return true;
  }

  function cleanQuestion(question) {
    return {
      id: question.id,
      type: question.type,
      prompt: String(question.prompt || "").trim(),
      points: Number(question.points),
      options: Array.isArray(question.options) ? [...question.options] : [],
      correct: Array.isArray(question.correct) ? [...question.correct] : question.correct,
      image: String(question.image || "").trim(),
    };
  }

  function parseExam(text) {
    const lines = createLineRecords(text);
    const blocks = splitBlocks(lines);
    const header = blocks.shift();

    if (!header) fail(1, "Cole uma prova no formato oficial.");

    const headerLine = firstContentLine(header);
    if (headerLine.value.trim() !== "PROVA") {
      fail(headerLine.number, 'A primeira linha deve ser "PROVA".');
    }

    const titleField = readRequiredField(header, "Titulo", headerLine.number, "Informe o título da prova.");
    const timeField = readRequiredField(header, "Tempo", headerLine.number, "Informe o tempo da prova.");
    const monitoringField = readField(header, "Monitoramento");
    const intervalField = readField(header, "IntervaloFotos");
    const descriptionField = readField(header, "Descricao");
    const time = parseNonNegativeNumber(
      timeField,
      "O tempo deve ser um número inteiro maior ou igual a zero."
    );
    if (!Number.isInteger(time)) {
      fail(timeField.line, "O tempo deve ser um número inteiro maior ou igual a zero.");
    }

    const exam = {
      title: titleField.value,
      description: descriptionField?.value || "",
      timeLimitMinutes: time,
      cameraMonitoring: monitoringField ? parseMonitoringFlag(monitoringField) : false,
      cameraIntervalSeconds: parseCameraInterval(intervalField),
      active: true,
      questions: blocks.map((block) => parseQuestion(block)),
    };

    Object.defineProperty(exam, "__source", {
      value: {
        headerLine: headerLine.number,
        titleLine: titleField.line,
        timeLine: timeField.line,
      },
      enumerable: false,
    });

    validateExam(exam);

    return {
      title: exam.title.trim(),
      description: exam.description.trim(),
      timeLimitMinutes: exam.timeLimitMinutes,
      cameraMonitoring: exam.cameraMonitoring,
      cameraIntervalSeconds: exam.cameraIntervalSeconds,
      active: true,
      questions: exam.questions.map(cleanQuestion),
    };
  }

  return {
    OFFICIAL_TEMPLATE,
    ExamParseError,
    parseExam,
    parseQuestion,
    validateExam,
    validateQuestion,
  };
});
