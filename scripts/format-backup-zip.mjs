import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const [, , inputPathArg, outputPathArg] = process.argv;

if (!inputPathArg) {
  console.error(
    "Usage: node scripts/format-backup-zip.mjs <input.zip> [output.zip]",
  );
  process.exit(1);
}

const inputPath = path.resolve(inputPathArg);
const outputPath = outputPathArg
  ? path.resolve(outputPathArg)
  : inputPath.replace(/\.zip$/i, "") + "-formatted.zip";

const normalizeText = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const normalizeTemplateText = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeQuestion = (question) => ({
  ...question,
  question: normalizeText(question.question),
  explanation: normalizeText(question.explanation),
  options: Array.isArray(question.options)
    ? question.options.map((opt, idx) => {
        if (typeof opt === "string") {
          return { id: `opt-${idx + 1}`, text: normalizeText(opt) };
        }
        return {
          ...opt,
          text: normalizeText(opt?.text),
        };
      })
    : question.options,
  steps: Array.isArray(question.steps)
    ? question.steps.map((step) => ({
        ...step,
        text: normalizeText(step?.text),
      }))
    : question.steps,
  dragDropItems: Array.isArray(question.dragDropItems)
    ? question.dragDropItems.map((item) => ({
        ...item,
        text: normalizeText(item?.text),
      }))
    : question.dragDropItems,
  dragDropBuckets: Array.isArray(question.dragDropBuckets)
    ? question.dragDropBuckets.map((bucket, idx) => ({
        ...bucket,
        id: bucket?.id || `slot-${idx + 1}`,
        label: normalizeText(bucket?.label || `Answer ${idx + 1}`),
      }))
    : question.dragDropBuckets,
  dragDropTemplate: normalizeTemplateText(question.dragDropTemplate),
  booleanStatements: Array.isArray(question.booleanStatements)
    ? question.booleanStatements.map((statement) => ({
        ...statement,
        text: normalizeText(statement?.text),
      }))
    : question.booleanStatements,
});

const normalizeCase = (caseStudy) => ({
  ...caseStudy,
  title: normalizeText(caseStudy.title),
  description: normalizeText(caseStudy.description),
  scenario: normalizeText(caseStudy.scenario),
  businessRequirements: normalizeText(caseStudy.businessRequirements),
  existingEnvironment: normalizeText(caseStudy.existingEnvironment),
  problemStatement: normalizeText(caseStudy.problemStatement),
  exhibits: normalizeText(caseStudy.exhibits),
});

const normalizeScenario = (scenario) => ({
  ...scenario,
  title: normalizeText(scenario.title),
  description: normalizeText(scenario.description),
  context: normalizeText(scenario.context),
});

const buildReadableQuestionsMarkdown = (questions) => {
  const lines = [
    "# Questions Export (Readable)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total questions: ${questions.length}`,
    "",
  ];

  questions.forEach((q, idx) => {
    lines.push(`## ${idx + 1}. ${q.id || "NO_ID"} [${q.type || "unknown"}]`);
    if (q.topic) lines.push(`Topic: ${q.topic}`);
    if (q.category) lines.push(`Category: ${q.category}`);
    lines.push("");
    lines.push("Question:");
    lines.push(q.question || "(empty)");
    lines.push("");

    if (Array.isArray(q.options) && q.options.length > 0) {
      lines.push("Options:");
      q.options.forEach((opt) => {
        lines.push(`- ${opt.id || "opt"}: ${opt.text || ""}`);
      });
      lines.push("");
    }

    if (q.dragDropTemplate) {
      lines.push("DragDropTemplate:");
      lines.push("```text");
      lines.push(q.dragDropTemplate);
      lines.push("```");
      lines.push("");
    }

    if (q.explanation) {
      lines.push("Explanation:");
      lines.push(q.explanation);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
};

const parseJsonFile = async (zip, fileName) => {
  const file = zip.file(fileName);
  if (!file) return [];
  const text = await file.async("text");
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
};

try {
  const inputBuffer = await fs.readFile(inputPath);
  const zip = await JSZip.loadAsync(inputBuffer);

  const questions = (await parseJsonFile(zip, "questions.json")).map(
    normalizeQuestion,
  );
  const cases = (await parseJsonFile(zip, "cases.json")).map(normalizeCase);
  const scenarios = (await parseJsonFile(zip, "scenarios.json")).map(
    normalizeScenario,
  );

  zip.file("questions.json", JSON.stringify(questions, null, 2));
  zip.file("cases.json", JSON.stringify(cases, null, 2));
  zip.file("scenarios.json", JSON.stringify(scenarios, null, 2));
  zip.file("questions-readable.md", buildReadableQuestionsMarkdown(questions));

  const outputBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  await fs.writeFile(outputPath, outputBuffer);

  console.log("Backup formatted successfully.");
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Cases: ${cases.length}`);
  console.log(`Scenarios: ${scenarios.length}`);
} catch (error) {
  console.error("Failed to format backup ZIP.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
