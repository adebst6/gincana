const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

test("contrato de monitoramento e salvo no Supabase", () => {
  const source = readProjectFile("public/assets/supabase.js");

  assert.match(source, /cameraMonitoring:\s*row\.camera_monitoring === true/);
  assert.match(source, /cameraIntervalSeconds:\s*normalizeCameraInterval\(row\.camera_interval_seconds\)/);
  assert.match(source, /camera_monitoring:\s*exam\.cameraMonitoring === true/);
  assert.match(source, /camera_interval_seconds:\s*normalizeCameraInterval\(exam\.cameraIntervalSeconds\)/);
});

test("paginas carregam a versao atual do cliente Supabase", () => {
  for (const page of ["public/index.html", "public/admin.html", "public/exam.html"]) {
    assert.match(readProjectFile(page), /\/assets\/supabase\.js\?v=5/);
  }
});

test("galeria de monitoramento preserva fotos verticais", () => {
  const styles = readProjectFile("public/assets/styles.css");
  const admin = readProjectFile("public/admin.html");
  const exam = readProjectFile("public/exam.html");

  assert.match(styles, /\.monitoring-photo img\s*\{[^}]*object-fit:\s*contain;/);
  assert.doesNotMatch(styles, /\.monitoring-photo img\s*\{[^}]*object-fit:\s*cover;/);
  assert.match(admin, /\/assets\/styles\.css\?v=11/);
  assert.match(admin, /\/assets\/admin\.js\?v=10/);
  assert.match(exam, /\/assets\/styles\.css\?v=11/);
  assert.match(exam, /\/assets\/exam\.js\?v=5/);
});
