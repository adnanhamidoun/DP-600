import React, { useState, useEffect, useRef } from "react";
import {
  Question,
  QuestionType,
  CaseStudy,
  Scenario,
  Option,
  BooleanStatement,
  QUESTION_TYPE_DESCRIPTIONS,
} from "../types";
import { storageUtils } from "../utils/storage";
import { getQuestionTypeDescription } from "../utils/questionTypeHelpers";
import { HotspotCanvas } from "./HotspotCanvas";
import { useToast, ToastContainer } from "./Toast";
import { ExamEngine } from "./ExamEngine";
import JSZip from "jszip";

interface QuestionsBuilderProps {
  onBack: () => void;
}

export const QuestionsBuilder: React.FC<QuestionsBuilderProps> = ({
  onBack,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaseStudyId, setEditingCaseStudyId] = useState<string | null>(
    null,
  );
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    "questions" | "cases" | "scenarios" | "review"
  >("questions");
  const [showCaseStudyForm, setShowCaseStudyForm] = useState(false);
  const [filterType, setFilterType] = useState<QuestionType | "all">("all");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [questionFormResetKey, setQuestionFormResetKey] = useState(0);
  const [bulkCounts, setBulkCounts] = useState({
    options: 4,
    dragValues: 4,
    dragAreas: 2,
    statements: 3,
  });

  const [formData, setFormData] = useState<Partial<Question>>({
    type: "single",
    options: [],
    booleanStatements: [],
    correctAnswer: undefined,
  });

  const [caseStudyForm, setCaseStudyForm] = useState<Partial<CaseStudy>>({
    title: "",
    description: "",
    scenario: "",
    exhibits: "",
  });

  const [scenarioForm, setScenarioForm] = useState<Partial<Scenario>>({
    title: "",
    description: "",
    context: "",
    scenarioImage: "",
  });

  const normalizeOptions = (options: Array<Option | string> = []): Option[] => {
    return options.map((opt, idx) => {
      if (typeof opt === "string") {
        return { id: `opt-${idx + 1}`, text: opt };
      }
      return {
        id: opt.id || `opt-${idx + 1}`,
        text: opt.text,
      };
    });
  };

  const clampCount = (count: number, min = 1, max = 30) =>
    Math.max(min, Math.min(max, count));

  const makeId = (prefix: string, index = 0) =>
    `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    setQuestions(storageUtils.getCustomQuestions());
    setCaseStudies(storageUtils.getCaseStudies());
    setScenarios(storageUtils.getScenarios());
  }, []);

  // ==================== QUESTIONS ====================
  const getNextQuestionId = () => {
    if (questions.length === 0) return "Q001";
    const lastNum = Math.max(
      ...questions.map((q) => {
        const match = q.id.match(/Q(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }),
    );
    return `Q${String(lastNum + 1).padStart(3, "0")}`;
  };

  const handleSaveQuestion = () => {
    const builtQuestion = buildQuestionFromForm(
      editingId || getNextQuestionId(),
    );
    if (!builtQuestion) return;

    storageUtils.addCustomQuestion(builtQuestion);
    setQuestions(storageUtils.getCustomQuestions());
    resetQuestionForm();
    toast.success("Question saved!");
  };

  const buildQuestionFromForm = (questionId: string): Question | null => {
    if (formData.type === "boolean") {
      const statements = formData.booleanStatements || [];
      if (statements.length === 0) {
        toast.error("Add at least one statement for True/False");
        return null;
      }
      const hasEmpty = statements.some((s) => !s.text?.trim());
      if (hasEmpty) {
        toast.error("All statements must have text");
        return null;
      }
    }

    if (formData.type === "dragdrop") {
      const items = formData.dragDropItems || [];
      const buckets = formData.dragDropBuckets || [];
      if (items.length === 0 || buckets.length === 0) {
        toast.error("Add values and answer areas for Drag & Drop");
        return null;
      }
      if (items.some((item) => !item.text.trim())) {
        toast.error("Each value must have text");
        return null;
      }
      if (!items.some((item) => !!item.correctBucket)) {
        toast.error("Assign at least one value to a correct area");
        return null;
      }
    }

    const questionText = (formData.question || "").trim();
    const hasQuestionImage = !!formData.questionImage;

    if (!questionText && !hasQuestionImage) {
      toast.error("Please enter question text or upload a question image");
      return null;
    }

    const options = normalizeOptions(
      (formData.options as Array<Option | string>) || [],
    );
    let normalizedCorrectAnswer = formData.correctAnswer as
      | Question["correctAnswer"]
      | number
      | undefined;

    if (
      (formData.type === "single" || formData.type === "dropdown") &&
      typeof normalizedCorrectAnswer === "number"
    ) {
      normalizedCorrectAnswer = options[normalizedCorrectAnswer]?.id;
    }

    if (
      formData.type === "multiple" &&
      typeof normalizedCorrectAnswer === "number"
    ) {
      const optionId = options[normalizedCorrectAnswer]?.id;
      normalizedCorrectAnswer = optionId ? [optionId] : [];
    }

    if (formData.type === "multiple") {
      if (typeof normalizedCorrectAnswer === "string") {
        normalizedCorrectAnswer = [normalizedCorrectAnswer];
      }
      if (!Array.isArray(normalizedCorrectAnswer)) {
        normalizedCorrectAnswer = [];
      }
      const validOptionIds = new Set(options.map((opt) => opt.id));
      normalizedCorrectAnswer = normalizedCorrectAnswer.filter((id) =>
        validOptionIds.has(id),
      );
    }

    if (
      (formData.type === "single" || formData.type === "dropdown") &&
      Array.isArray(normalizedCorrectAnswer)
    ) {
      normalizedCorrectAnswer = normalizedCorrectAnswer[0];
    }

    if (typeof normalizedCorrectAnswer === "number") {
      normalizedCorrectAnswer = undefined;
    }

    if (formData.type === "boolean") {
      normalizedCorrectAnswer = undefined;
    }

    const question: Question = {
      id: questionId,
      type: (formData.type as QuestionType) || "single",
      question: questionText,
      explanation: formData.explanation || "",
      correctAnswer: normalizedCorrectAnswer,
      options,
      steps: formData.steps,
      dragDropItems: formData.dragDropItems,
      dragDropBuckets: formData.dragDropBuckets,
      dragDropTemplate: formData.dragDropTemplate,
      hotspotImage: formData.hotspotImage,
      hotspotAreas: formData.hotspotAreas,
      questionImage: formData.questionImage,
      correctBoxCount: formData.correctBoxCount,
      booleanStatements: formData.booleanStatements,
      caseStudyId: formData.caseStudyId,
      scenarioId: formData.scenarioId,
    };

    return question;
  };

  const handlePreviewQuestion = () => {
    const questionId = editingId || getNextQuestionId();
    const builtQuestion = buildQuestionFromForm(questionId);
    if (!builtQuestion) return;

    // Keep exam data aligned with what is shown in preview.
    storageUtils.addCustomQuestion(builtQuestion);
    setQuestions(storageUtils.getCustomQuestions());
    if (!editingId) {
      setEditingId(questionId);
    }

    setPreviewQuestion(builtQuestion);
    setShowPreview(true);
  };

  const resetQuestionForm = () => {
    setFormData({
      type: "single",
      options: [],
      booleanStatements: [],
      correctAnswer: undefined,
    });
    setEditingId(null);
    setPreviewQuestion(null);
    setShowPreview(false);
    setQuestionFormResetKey((prev) => prev + 1);
  };

  const handleEditQuestion = (q: Question) => {
    setFormData({
      ...q,
      options: normalizeOptions((q.options as Array<Option | string>) || []),
      booleanStatements: q.booleanStatements || [],
      correctAnswer:
        q.type === "multiple"
          ? Array.isArray(q.correctAnswer)
            ? q.correctAnswer
            : q.correctAnswer
              ? [q.correctAnswer]
              : []
          : Array.isArray(q.correctAnswer)
            ? q.correctAnswer[0]
            : q.correctAnswer,
    });
    setEditingId(q.id);
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm("Delete this question?")) {
      storageUtils.deleteCustomQuestion(id);
      setQuestions(storageUtils.getCustomQuestions());
      toast.success("Question deleted");
    }
  };

  const handleAddHotspotArea = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const newArea = {
      id: "area-" + Date.now(),
      label: "Area",
      x,
      y,
      width,
      height,
      correct: false,
    };
    setFormData({
      ...formData,
      hotspotAreas: [...(formData.hotspotAreas || []), newArea],
    });
  };

  const handleUpdateHotspotArea = (idx: number, field: string, value: any) => {
    const areas = formData.hotspotAreas || [];
    areas[idx] = { ...areas[idx], [field]: value };
    setFormData({ ...formData, hotspotAreas: areas });
  };

  const handleRemoveHotspotArea = (idx: number) => {
    const areas = (formData.hotspotAreas || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, hotspotAreas: areas });
  };

  const handleAddDragDropValue = () => {
    const items = formData.dragDropItems || [];
    setFormData({
      ...formData,
      dragDropItems: [
        ...items,
        {
          id: `item-${Date.now()}`,
          text: "",
          correctBucket: "",
        },
      ],
    });
  };

  const handleSetOptionsTotal = (rawCount: number) => {
    const target = clampCount(rawCount, 1, 20);
    const current = normalizeOptions(
      (formData.options as Array<Option | string>) || [],
    );

    let updated = [...current];
    if (updated.length > target) {
      updated = updated.slice(0, target);
    } else {
      for (let i = updated.length; i < target; i++) {
        updated.push({ id: makeId("opt", i), text: "" });
      }
    }

    setFormData({
      ...formData,
      options: updated,
      correctAnswer:
        formData.type === "multiple"
          ? Array.isArray(formData.correctAnswer)
            ? formData.correctAnswer.filter((id) =>
                updated.some((opt) => opt.id === id),
              )
            : []
          : typeof formData.correctAnswer === "string" &&
              updated.some((opt) => opt.id === formData.correctAnswer)
            ? formData.correctAnswer
            : undefined,
    });
  };

  const handleSetDragDropValuesTotal = (rawCount: number) => {
    const target = clampCount(rawCount, 1, 30);
    const current = [...(formData.dragDropItems || [])];
    let updated = [...current];

    if (updated.length > target) {
      updated = updated.slice(0, target);
    } else {
      for (let i = updated.length; i < target; i++) {
        updated.push({ id: makeId("item", i), text: "", correctBucket: "" });
      }
    }

    setFormData({ ...formData, dragDropItems: updated });
  };

  const handleSetDragDropAreasTotal = (rawCount: number) => {
    const target = clampCount(rawCount, 1, 20);
    const currentBuckets = [...(formData.dragDropBuckets || [])];
    const currentItems = [...(formData.dragDropItems || [])];
    let updatedBuckets = [...currentBuckets];

    if (updatedBuckets.length > target) {
      const removedBucketIds = updatedBuckets
        .slice(target)
        .map((bucket) => bucket.id);
      updatedBuckets = updatedBuckets.slice(0, target);

      const updatedItems = currentItems.map((item) =>
        removedBucketIds.includes(item.correctBucket || "")
          ? { ...item, correctBucket: "" }
          : item,
      );

      setFormData({
        ...formData,
        dragDropBuckets: updatedBuckets,
        dragDropItems: updatedItems,
      });
      return;
    }

    for (let i = updatedBuckets.length; i < target; i++) {
      const nextIndex = i + 1;
      updatedBuckets.push({
        id: `slot-${nextIndex}`,
        label: `Answer ${nextIndex}`,
      });
    }

    setFormData({ ...formData, dragDropBuckets: updatedBuckets });
  };

  const handleSetBooleanStatementsTotal = (rawCount: number) => {
    const target = clampCount(rawCount, 1, 30);
    const current = [...(formData.booleanStatements || [])];
    let updated = [...current];

    if (updated.length > target) {
      updated = updated.slice(0, target);
    } else {
      for (let i = updated.length; i < target; i++) {
        updated.push({ id: makeId("stmt", i), text: "", correct: "true" });
      }
    }

    setFormData({ ...formData, booleanStatements: updated });
  };

  const handleUpdateDragDropValue = (
    idx: number,
    field: "text" | "correctBucket",
    value: string,
  ) => {
    const items = [...(formData.dragDropItems || [])];
    items[idx] = { ...items[idx], [field]: value };
    setFormData({ ...formData, dragDropItems: items });
  };

  const handleRemoveDragDropValue = (idx: number) => {
    const items = (formData.dragDropItems || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, dragDropItems: items });
  };

  const handleAddDragDropArea = () => {
    const buckets = formData.dragDropBuckets || [];
    const nextIndex = buckets.length + 1;
    setFormData({
      ...formData,
      dragDropBuckets: [
        ...buckets,
        { id: `slot-${nextIndex}`, label: `Answer ${nextIndex}` },
      ],
    });
  };

  const handleUpdateDragDropArea = (idx: number, label: string) => {
    const buckets = [...(formData.dragDropBuckets || [])];
    buckets[idx] = { ...buckets[idx], label };
    setFormData({ ...formData, dragDropBuckets: buckets });
  };

  const handleRemoveDragDropArea = (idx: number) => {
    const removed = formData.dragDropBuckets?.[idx];
    const buckets = (formData.dragDropBuckets || []).filter(
      (_, i) => i !== idx,
    );
    const items = (formData.dragDropItems || []).map((item) =>
      item.correctBucket === removed?.id
        ? { ...item, correctBucket: "" }
        : item,
    );
    setFormData({
      ...formData,
      dragDropBuckets: buckets,
      dragDropItems: items,
    });
  };

  const handleAddBooleanStatement = () => {
    const statements = formData.booleanStatements || [];
    const newStatement: BooleanStatement = {
      id: `stmt-${Date.now()}`,
      text: "",
      correct: "true",
    };
    setFormData({
      ...formData,
      booleanStatements: [...statements, newStatement],
    });
  };

  const handleUpdateBooleanStatement = (
    idx: number,
    field: keyof BooleanStatement,
    value: string,
  ) => {
    const statements = [...(formData.booleanStatements || [])];
    statements[idx] = { ...statements[idx], [field]: value };
    setFormData({ ...formData, booleanStatements: statements });
  };

  const handleRemoveBooleanStatement = (idx: number) => {
    const statements = (formData.booleanStatements || []).filter(
      (_, i) => i !== idx,
    );
    setFormData({ ...formData, booleanStatements: statements });
  };

  const handleTypeChange = (type: QuestionType) => {
    setFormData({
      ...formData,
      type,
      options: ["single", "multiple", "dropdown"].includes(type)
        ? []
        : undefined,
      dragDropItems: type === "dragdrop" ? [] : undefined,
      dragDropBuckets: type === "dragdrop" ? [] : undefined,
      dragDropTemplate: type === "dragdrop" ? "" : undefined,
      booleanStatements: type === "boolean" ? [] : undefined,
      correctAnswer: type === "multiple" ? [] : undefined,
      hotspotAreas: type === "hotspot" ? [] : undefined,
    });
  };

  // ==================== CASE STUDIES ====================
  const handleSaveCaseStudy = () => {
    if (!caseStudyForm.title) {
      toast.error("Please enter a title");
      return;
    }

    const caseStudy: CaseStudy = {
      id: editingCaseStudyId || "cs-" + Date.now(),
      title: caseStudyForm.title || "",
      description: caseStudyForm.description || "",
      scenario: caseStudyForm.scenario || "",
      businessRequirements: caseStudyForm.businessRequirements,
      existingEnvironment: caseStudyForm.existingEnvironment,
      problemStatement: caseStudyForm.problemStatement,
      exhibits: caseStudyForm.exhibits || "",
      exhibitsImage: caseStudyForm.exhibitsImage,
    };

    storageUtils.addCaseStudy(caseStudy);
    setCaseStudies(storageUtils.getCaseStudies());
    resetCaseStudyForm();
    toast.success("Case study saved!");
  };

  const resetCaseStudyForm = () => {
    setCaseStudyForm({
      title: "",
      description: "",
      scenario: "",
      exhibits: "",
    });
    setEditingCaseStudyId(null);
    setShowCaseStudyForm(false);
  };

  const handleEditCaseStudy = (cs: CaseStudy) => {
    setCaseStudyForm(cs);
    setEditingCaseStudyId(cs.id);
    setShowCaseStudyForm(true);
  };

  const handleDeleteCaseStudy = (id: string) => {
    if (window.confirm("Delete this case study?")) {
      storageUtils.deleteCaseStudy(id);
      setCaseStudies(storageUtils.getCaseStudies());
      setQuestions(storageUtils.getCustomQuestions());
      toast.success("Case study deleted");
    }
  };

  const handleEditScenario = (scn: Scenario) => {
    setScenarioForm(scn);
    setEditingScenarioId(scn.id);
  };

  const normalizeTextForExport = (value?: string) => {
    if (!value) return "";
    return value
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  };

  const normalizeQuestionForExport = (question: Question): Question => ({
    ...question,
    question: normalizeTextForExport(question.question),
    explanation: normalizeTextForExport(question.explanation),
    options: question.options?.map((opt) => ({
      ...opt,
      text: normalizeTextForExport(opt.text),
    })),
    steps: question.steps?.map((step) => ({
      ...step,
      text: normalizeTextForExport(step.text),
    })),
    dragDropItems: question.dragDropItems?.map((item) => ({
      ...item,
      text: normalizeTextForExport(item.text),
    })),
    dragDropBuckets: question.dragDropBuckets?.map((bucket) => ({
      ...bucket,
      label: normalizeTextForExport(bucket.label),
    })),
    dragDropTemplate: question.dragDropTemplate
      ? question.dragDropTemplate.replace(/\r\n/g, "\n").trim()
      : question.dragDropTemplate,
    booleanStatements: question.booleanStatements?.map((statement) => ({
      ...statement,
      text: normalizeTextForExport(statement.text),
    })),
  });

  const normalizeCaseForExport = (cs: CaseStudy): CaseStudy => ({
    ...cs,
    title: normalizeTextForExport(cs.title),
    description: normalizeTextForExport(cs.description),
    scenario: normalizeTextForExport(cs.scenario),
    businessRequirements: normalizeTextForExport(cs.businessRequirements),
    existingEnvironment: normalizeTextForExport(cs.existingEnvironment),
    problemStatement: normalizeTextForExport(cs.problemStatement),
    exhibits: normalizeTextForExport(cs.exhibits),
  });

  const normalizeScenarioForExport = (scn: Scenario): Scenario => ({
    ...scn,
    title: normalizeTextForExport(scn.title),
    description: normalizeTextForExport(scn.description),
    context: normalizeTextForExport(scn.context),
  });

  const buildReadableQuestionsMarkdown = (questionsList: Question[]) => {
    const lines: string[] = [
      "# Questions Export (Readable)",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Total questions: ${questionsList.length}`,
      "",
    ];

    questionsList.forEach((q, idx) => {
      lines.push(`## ${idx + 1}. ${q.id} [${q.type}]`);
      if (q.topic) lines.push(`Topic: ${q.topic}`);
      if (q.category) lines.push(`Category: ${q.category}`);
      lines.push("");
      lines.push("Question:");
      lines.push(q.question || "(empty)");
      lines.push("");

      if (q.options && q.options.length > 0) {
        lines.push("Options:");
        q.options.forEach((opt) => {
          lines.push(`- ${opt.id}: ${opt.text}`);
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

  const resetScenarioForm = () => {
    setScenarioForm({
      title: "",
      description: "",
      context: "",
      scenarioImage: "",
    });
    setEditingScenarioId(null);
  };

  // ==================== EXPORT/IMPORT ====================
  const handleExportAll = async () => {
    try {
      const zip = new JSZip();
      const customQuestions = storageUtils
        .getCustomQuestions()
        .map((q) => normalizeQuestionForExport(q));
      const cases = storageUtils
        .getCaseStudies()
        .map((cs) => normalizeCaseForExport(cs));
      const scenariosList = storageUtils
        .getScenarios()
        .map((scn) => normalizeScenarioForExport(scn));

      zip.file("questions.json", JSON.stringify(customQuestions, null, 2));
      zip.file("cases.json", JSON.stringify(cases, null, 2));
      zip.file("scenarios.json", JSON.stringify(scenariosList, null, 2));
      zip.file(
        "questions-readable.md",
        buildReadableQuestionsMarkdown(customQuestions),
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup-" + Date.now() + ".zip";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Backup created (JSON + readable markdown)");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      await zip.loadAsync(file);

      const questionsFile = zip.file("questions.json");
      const casesFile = zip.file("cases.json");
      const scenariosFile = zip.file("scenarios.json");

      const questionsData = questionsFile
        ? JSON.parse(await questionsFile.async("text"))
        : [];
      const casesData = casesFile
        ? JSON.parse(await casesFile.async("text"))
        : [];
      const scenariosData = scenariosFile
        ? JSON.parse(await scenariosFile.async("text"))
        : [];

      const summary = storageUtils.importBackupData(
        Array.isArray(questionsData) ? questionsData : [],
        Array.isArray(casesData) ? casesData : [],
        importMode,
      );

      // Import scenarios
      if (Array.isArray(scenariosData) && scenariosData.length > 0) {
        const existingScenarios =
          importMode === "replace" ? [] : storageUtils.getScenarios();
        const allScenarios = [...existingScenarios];

        scenariosData.forEach((scn: Scenario) => {
          const exists = allScenarios.find((s) => s.id === scn.id);
          if (!exists) {
            allScenarios.push(scn);
          }
        });

        storageUtils.saveScenarios(allScenarios);
      }

      setQuestions(storageUtils.getCustomQuestions());
      setCaseStudies(storageUtils.getCaseStudies());
      setScenarios(storageUtils.getScenarios());
      toast.success(
        `Import done: ${summary.questionsAfter} questions (${summary.questionsSkippedDuplicates} duplicates cleaned), ${summary.casesAfter} case studies`,
      );
    } catch {
      toast.error("Invalid file");
    } finally {
      e.target.value = "";
    }
  };

  const handleCleanAllTextContent = () => {
    const summary = storageUtils.cleanAllTextContent();
    setQuestions(storageUtils.getCustomQuestions());
    setCaseStudies(storageUtils.getCaseStudies());
    setScenarios(storageUtils.getScenarios());
    toast.success(
      `Text cleaned: ${summary.questions} questions, ${summary.caseStudies} cases, ${summary.scenarios} scenarios`,
    );
  };

  // Helper functions for filtering and review
  const filteredQuestions = questions.filter((q) => {
    const matchesType = filterType === "all" || q.type === filterType;
    return matchesType;
  });

  const selectedQuestion = questions.find((q) => q.id === selectedReviewId);

  return (
    <div className="app-shell">
      <ToastContainer />
      <div className="app-container max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              Authoring
            </p>
            <h1 className="text-3xl font-semibold">
              Question & Case Study Builder
            </h1>
          </div>
          <button onClick={onBack} className="btn-ghost">
            Back
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700/60">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
              activeTab === "questions"
                ? "bg-slate-800/55 text-cyan-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setActiveTab("cases")}
            className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
              activeTab === "cases"
                ? "bg-slate-800/55 text-cyan-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Case Studies
          </button>
          <button
            onClick={() => setActiveTab("scenarios")}
            className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
              activeTab === "scenarios"
                ? "bg-slate-800/55 text-cyan-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Scenarios
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
              activeTab === "review"
                ? "bg-slate-800/55 text-cyan-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Review ({questions.length})
          </button>
        </div>

        {/* QUESTIONS TAB */}
        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <div key={questionFormResetKey} className="glass-panel p-6">
                {/* Question Type */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Question type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      handleTypeChange(e.target.value as QuestionType)
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  >
                    {Object.entries(QUESTION_TYPE_DESCRIPTIONS).map(
                      ([type, { label, category }]) => (
                        <option key={type} value={type}>
                          {label} ({category})
                        </option>
                      ),
                    )}
                  </select>
                  {formData.type && (
                    <p className="mt-2 text-xs text-slate-400 italic">
                      {getQuestionTypeDescription(
                        formData.type as QuestionType,
                      )}
                    </p>
                  )}
                </div>

                {/* Case Study */}
                {caseStudies.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Associated Case Study
                    </label>
                    <select
                      value={formData.caseStudyId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          caseStudyId: e.target.value || undefined,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                    >
                      <option value="">None</option>
                      {caseStudies.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Associated Scenario */}
                {scenarios.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Associated Scenario
                    </label>
                    <select
                      value={formData.scenarioId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scenarioId: e.target.value || undefined,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                    >
                      <option value="">None</option>
                      {scenarios.map((scn) => (
                        <option key={scn.id} value={scn.id}>
                          {scn.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Question Text */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Question
                  </label>
                  <textarea
                    value={formData.question || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-20"
                    placeholder="Enter question..."
                  />
                </div>

                {/* Question Image */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Question Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFormData({
                            ...formData,
                            questionImage: event.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  />
                  {formData.questionImage && (
                    <p className="text-xs text-green-400 mt-1">Image loaded</p>
                  )}
                </div>

                {/* Type-specific fields */}
                {formData.type &&
                  ["single", "multiple", "dropdown"].includes(
                    formData.type,
                  ) && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold mb-2">
                        Options
                      </label>
                      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={bulkCounts.options}
                          onChange={(e) =>
                            setBulkCounts({
                              ...bulkCounts,
                              options: clampCount(
                                parseInt(e.target.value) || 1,
                                1,
                                20,
                              ),
                            })
                          }
                          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() =>
                            handleSetOptionsTotal(bulkCounts.options)
                          }
                          className="px-3 py-2 bg-cyan-700/70 hover:bg-cyan-600/70 rounded text-sm"
                        >
                          Set total options
                        </button>
                        <p className="text-xs subtle-text self-center">
                          Genera o recorta opciones automaticamente.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {normalizeOptions(
                          (formData.options as Array<Option | string>) || [],
                        ).map((opt, idx: number) => {
                          return (
                            <div key={opt.id} className="flex gap-2">
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const opts = normalizeOptions(
                                    (formData.options as Array<
                                      Option | string
                                    >) || [],
                                  );
                                  opts[idx] = {
                                    ...opts[idx],
                                    text: e.target.value,
                                  };
                                  setFormData({
                                    ...formData,
                                    options: opts,
                                  });
                                }}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => {
                                  const opts = normalizeOptions(
                                    (formData.options as Array<
                                      Option | string
                                    >) || [],
                                  ).filter((_, i) => i !== idx);
                                  setFormData({
                                    ...formData,
                                    options: opts,
                                  });
                                }}
                                className="px-3 py-2 bg-red-900 hover:bg-red-800 rounded text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              options: [
                                ...normalizeOptions(
                                  (formData.options as Array<
                                    Option | string
                                  >) || [],
                                ),
                                { id: `opt-${Date.now()}`, text: "" },
                              ],
                            })
                          }
                          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="mt-3">
                        {formData.type === "multiple" ? (
                          <>
                            <label className="block text-sm font-semibold mb-2">
                              Correct Answers
                            </label>
                            <div className="space-y-2 rounded border border-gray-700 bg-gray-800 p-3">
                              {normalizeOptions(
                                (formData.options as Array<Option | string>) ||
                                  [],
                              ).map((opt) => {
                                const selected = Array.isArray(
                                  formData.correctAnswer,
                                )
                                  ? formData.correctAnswer.includes(opt.id)
                                  : false;
                                return (
                                  <label
                                    key={opt.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={(e) => {
                                        const current = Array.isArray(
                                          formData.correctAnswer,
                                        )
                                          ? formData.correctAnswer
                                          : [];
                                        const updated = e.target.checked
                                          ? [...current, opt.id]
                                          : current.filter(
                                              (id) => id !== opt.id,
                                            );
                                        setFormData({
                                          ...formData,
                                          correctAnswer: updated,
                                        });
                                      }}
                                    />
                                    <span>{opt.text || opt.id}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="block text-sm font-semibold mb-2">
                              Correct Answer
                            </label>
                            <select
                              value={
                                typeof formData.correctAnswer === "string"
                                  ? formData.correctAnswer
                                  : ""
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  correctAnswer: e.target.value || undefined,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                            >
                              <option value="">Select correct option...</option>
                              {normalizeOptions(
                                (formData.options as Array<Option | string>) ||
                                  [],
                              ).map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.text || opt.id}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                {/* Hotspot */}
                {formData.type === "dragdrop" && (
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold">
                        Values
                      </label>
                      <button
                        onClick={handleAddDragDropValue}
                        className="px-3 py-1 rounded bg-cyan-700/70 hover:bg-cyan-600/70 text-xs"
                      >
                        + Add value
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={bulkCounts.dragValues}
                        onChange={(e) =>
                          setBulkCounts({
                            ...bulkCounts,
                            dragValues: clampCount(
                              parseInt(e.target.value) || 1,
                              1,
                              30,
                            ),
                          })
                        }
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() =>
                          handleSetDragDropValuesTotal(bulkCounts.dragValues)
                        }
                        className="px-3 py-2 bg-cyan-700/70 hover:bg-cyan-600/70 rounded text-sm"
                      >
                        Set total values
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.dragDropItems || []).map((item, idx) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-gray-800 border border-gray-700 rounded p-2"
                        >
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) =>
                              handleUpdateDragDropValue(
                                idx,
                                "text",
                                e.target.value,
                              )
                            }
                            placeholder={`Value ${idx + 1}`}
                            className="md:col-span-6 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <select
                            value={item.correctBucket || ""}
                            onChange={(e) =>
                              handleUpdateDragDropValue(
                                idx,
                                "correctBucket",
                                e.target.value,
                              )
                            }
                            className="md:col-span-4 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm"
                          >
                            <option value="">
                              Distractor (no answer area)
                            </option>
                            {(formData.dragDropBuckets || []).map((bucket) => (
                              <option key={bucket.id} value={bucket.id}>
                                {bucket.label || bucket.id}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveDragDropValue(idx)}
                            className="md:col-span-2 px-2 py-2 bg-rose-700/70 hover:bg-rose-600/70 rounded text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold">
                        Answer Areas
                      </label>
                      <button
                        onClick={handleAddDragDropArea}
                        className="px-3 py-1 rounded bg-cyan-700/70 hover:bg-cyan-600/70 text-xs"
                      >
                        + Add area
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={bulkCounts.dragAreas}
                        onChange={(e) =>
                          setBulkCounts({
                            ...bulkCounts,
                            dragAreas: clampCount(
                              parseInt(e.target.value) || 1,
                              1,
                              20,
                            ),
                          })
                        }
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() =>
                          handleSetDragDropAreasTotal(bulkCounts.dragAreas)
                        }
                        className="px-3 py-2 bg-cyan-700/70 hover:bg-cyan-600/70 rounded text-sm"
                      >
                        Set total areas
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.dragDropBuckets || []).map((bucket, idx) => (
                        <div
                          key={bucket.id}
                          className="flex gap-2 bg-gray-800 border border-gray-700 rounded p-2"
                        >
                          <div className="px-2 py-2 text-xs text-gray-300 bg-gray-700 rounded">
                            {`{{${bucket.id}}}`}
                          </div>
                          <input
                            type="text"
                            value={bucket.label}
                            onChange={(e) =>
                              handleUpdateDragDropArea(idx, e.target.value)
                            }
                            placeholder={`Area ${idx + 1} label`}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => handleRemoveDragDropArea(idx)}
                            className="px-2 py-2 bg-rose-700/70 hover:bg-rose-600/70 rounded text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Answer Area Template
                      </label>
                      <textarea
                        value={formData.dragDropTemplate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dragDropTemplate: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-32 font-mono text-sm"
                        placeholder={
                          "Example:\nVAR _SalesSince =\n  DATE(2023, 12, 01)\nFILTER(\n  {{slot-1}}(Store, Store[Name], Store[OpenDate]),\n  Store[OpenDate] >= _SalesSince\n)"
                        }
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Use placeholders like {"{{slot-1}}"} that match your
                        Answer Areas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Hotspot */}
                {formData.type === "hotspot" && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Hotspot Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData({
                              ...formData,
                              hotspotImage: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-2"
                    />

                    <div className="mb-3 p-3 bg-gray-800 rounded border border-yellow-600">
                      <label className="block text-sm font-semibold mb-2">
                        Correct areas count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.correctBoxCount || 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            correctBoxCount: parseInt(e.target.value),
                          })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    {formData.hotspotImage && (
                      <div className="p-3 bg-gray-800 rounded border border-green-600">
                        <HotspotCanvas
                          imageBase64={formData.hotspotImage}
                          areas={formData.hotspotAreas || []}
                          onAddArea={handleAddHotspotArea}
                        />
                        <div className="mt-3">
                          <p className="text-sm font-semibold mb-2">
                            Areas ({formData.hotspotAreas?.length || 0})
                          </p>
                          {(formData.hotspotAreas || []).map((area, idx) => (
                            <div
                              key={area.id}
                              className="flex gap-2 p-2 bg-gray-700 rounded mb-2"
                            >
                              <input
                                type="text"
                                value={area.label}
                                onChange={(e) =>
                                  handleUpdateHotspotArea(
                                    idx,
                                    "label",
                                    e.target.value,
                                  )
                                }
                                className="flex-1 bg-gray-600 rounded px-2 py-1 text-sm"
                              />
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={area.correct}
                                  onChange={(e) =>
                                    handleUpdateHotspotArea(
                                      idx,
                                      "correct",
                                      e.target.checked,
                                    )
                                  }
                                />
                                Correct
                              </label>
                              <button
                                onClick={() => handleRemoveHotspotArea(idx)}
                                className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs"
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.type === "boolean" && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold">
                        Statements (Yes/No)
                      </label>
                      <button
                        onClick={handleAddBooleanStatement}
                        className="px-3 py-1 rounded bg-cyan-700/70 hover:bg-cyan-600/70 text-xs"
                      >
                        + Add statement
                      </button>
                    </div>
                    <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={bulkCounts.statements}
                        onChange={(e) =>
                          setBulkCounts({
                            ...bulkCounts,
                            statements: clampCount(
                              parseInt(e.target.value) || 1,
                              1,
                              30,
                            ),
                          })
                        }
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() =>
                          handleSetBooleanStatementsTotal(bulkCounts.statements)
                        }
                        className="px-3 py-2 bg-cyan-700/70 hover:bg-cyan-600/70 rounded text-sm"
                      >
                        Set total statements
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.booleanStatements || []).map(
                        (statement, idx) => (
                          <div
                            key={statement.id}
                            className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center bg-gray-800 border border-gray-700 rounded p-2"
                          >
                            <input
                              type="text"
                              value={statement.text}
                              onChange={(e) =>
                                handleUpdateBooleanStatement(
                                  idx,
                                  "text",
                                  e.target.value,
                                )
                              }
                              placeholder={`Statement ${idx + 1}`}
                              className="md:col-span-4 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                            />
                            <select
                              value={statement.correct}
                              onChange={(e) =>
                                handleUpdateBooleanStatement(
                                  idx,
                                  "correct",
                                  e.target.value as "true" | "false",
                                )
                              }
                              className="md:col-span-1 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm"
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                            <button
                              onClick={() => handleRemoveBooleanStatement(idx)}
                              className="md:col-span-1 px-2 py-2 bg-rose-700/70 hover:bg-rose-600/70 rounded text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ),
                      )}
                      {(formData.booleanStatements || []).length === 0 && (
                        <p className="text-xs text-gray-400">
                          Add statements and mark each one as Yes or No.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Explanation
                  </label>
                  <textarea
                    value={formData.explanation || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, explanation: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-16"
                    placeholder="Explanation..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveQuestion}
                    className="btn-secondary flex-1"
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                  <button
                    onClick={handlePreviewQuestion}
                    className="btn-primary flex-1"
                  >
                    Preview
                  </button>
                  <button
                    onClick={resetQuestionForm}
                    className="btn-ghost flex-1"
                  >
                    New
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - Questions List */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-panel p-3">
                <label className="block text-xs font-semibold subtle-text mb-1">
                  Import mode
                </label>
                <select
                  value={importMode}
                  onChange={(e) =>
                    setImportMode(e.target.value as "replace" | "merge")
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="merge">Combine and clean duplicates</option>
                  <option value="replace">Replace all existing data</option>
                </select>
                <p className="text-xs subtle-text mt-2">
                  Combine keeps existing data and removes duplicates. Replace
                  clears current questions/cases first.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportAll}
                  className="btn-primary flex-1 text-sm"
                >
                  Export
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost flex-1 text-sm"
                >
                  Import
                </button>
              </div>

              <button
                onClick={handleCleanAllTextContent}
                className="btn-secondary w-full text-sm"
              >
                Clean Existing Texts
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleImportFileChange}
                style={{ display: "none" }}
              />

              <div>
                <h2 className="text-lg font-bold mb-3">
                  Questions ({questions.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questions.map((q) => (
                    <div key={q.id} className="glass-panel p-2">
                      <p className="text-xs text-gray-400">{q.type}</p>
                      <p className="text-sm line-clamp-2">{q.question}</p>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="text-xs px-2 py-1 rounded bg-cyan-700/70 hover:bg-cyan-600/70 flex-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-xs px-2 py-1 rounded bg-rose-700/70 hover:bg-rose-600/70 flex-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASE STUDIES TAB */}
        {activeTab === "cases" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              {showCaseStudyForm ? (
                <div className="glass-panel p-6">
                  <h2 className="text-xl font-bold mb-6">
                    {editingCaseStudyId ? "Edit" : "Create"} Case Study
                  </h2>

                  {/* Title */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={caseStudyForm.title || ""}
                      onChange={(e) =>
                        setCaseStudyForm({
                          ...caseStudyForm,
                          title: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                      placeholder="Case study title"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Description
                    </label>
                    <textarea
                      value={caseStudyForm.description || ""}
                      onChange={(e) =>
                        setCaseStudyForm({
                          ...caseStudyForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-20"
                      placeholder="Describe the scenario..."
                    />
                  </div>

                  {/* Exhibits */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Scenario
                    </label>
                    <textarea
                      value={caseStudyForm.scenario || ""}
                      onChange={(e) =>
                        setCaseStudyForm({
                          ...caseStudyForm,
                          scenario: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-24"
                      placeholder="Full case scenario..."
                    />
                  </div>

                  {/* Exhibits */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Exhibits/Details
                    </label>
                    <textarea
                      value={caseStudyForm.exhibits || ""}
                      onChange={(e) =>
                        setCaseStudyForm({
                          ...caseStudyForm,
                          exhibits: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-24"
                      placeholder="Exhibits, data tables, additional information..."
                    />
                  </div>

                  {/* Exhibits Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">
                      Exhibits Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCaseStudyForm({
                              ...caseStudyForm,
                              exhibitsImage: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                    />
                    {caseStudyForm.exhibitsImage && (
                      <p className="text-xs text-green-400 mt-1">
                        Image loaded
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveCaseStudy}
                      className="btn-secondary flex-1"
                    >
                      {editingCaseStudyId ? "Update" : "Create"}
                    </button>
                    <button
                      onClick={resetCaseStudyForm}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCaseStudyForm(true)}
                  className="btn-primary w-full"
                >
                  + Create New Case Study
                </button>
              )}
            </div>

            {/* Sidebar - Case Studies List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-bold mb-3">
                Case Studies ({caseStudies.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {caseStudies.map((cs) => (
                  <div key={cs.id} className="glass-panel p-2">
                    <p className="text-sm font-semibold line-clamp-2">
                      {cs.title}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {cs.description}
                    </p>
                    <div className="text-xs text-cyan-300 mb-1">
                      {questions.filter((q) => q.caseStudyId === cs.id).length}{" "}
                      question(s)
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => handleEditCaseStudy(cs)}
                        className="text-xs px-2 py-1 rounded bg-cyan-700/70 hover:bg-cyan-600/70 flex-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCaseStudy(cs.id)}
                        className="text-xs px-2 py-1 rounded bg-rose-700/70 hover:bg-rose-600/70 flex-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCENARIOS TAB */}
        {activeTab === "scenarios" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Scenario Form */}
            <div className="lg:col-span-2">
              <div className="glass-panel p-6">
                <h2 className="text-2xl font-semibold mb-6">Create Scenario</h2>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Scenario Title
                  </label>
                  <input
                    type="text"
                    value={scenarioForm.title || ""}
                    onChange={(e) =>
                      setScenarioForm({
                        ...scenarioForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                    placeholder="Scenario title (e.g., Contoso Migration, Data Analysis Project)"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Scenario Text / Question
                  </label>
                  <textarea
                    value={scenarioForm.description || ""}
                    onChange={(e) =>
                      setScenarioForm({
                        ...scenarioForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-24"
                    placeholder="Write the scenario statement or question text..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Scenario Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setScenarioForm({
                            ...scenarioForm,
                            scenarioImage: event.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                  />
                  {scenarioForm.scenarioImage && (
                    <div className="mt-3">
                      <img
                        src={scenarioForm.scenarioImage}
                        alt="Scenario preview"
                        className="max-h-40 rounded border border-gray-700"
                      />
                      <button
                        onClick={() =>
                          setScenarioForm({
                            ...scenarioForm,
                            scenarioImage: "",
                          })
                        }
                        className="mt-2 text-xs px-3 py-1 rounded bg-rose-700/70 hover:bg-rose-600/70"
                      >
                        Remove image
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    A scenario can have text, image, or both.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2">
                    Context (Optional)
                  </label>
                  <textarea
                    value={scenarioForm.context || ""}
                    onChange={(e) =>
                      setScenarioForm({
                        ...scenarioForm,
                        context: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-32"
                    placeholder="Additional context or background information..."
                  />
                </div>

                <button
                  onClick={() => {
                    if (!scenarioForm.title?.trim()) {
                      toast.error("Please enter a scenario title");
                      return;
                    }

                    const hasScenarioText = !!(
                      scenarioForm.description?.trim() ||
                      scenarioForm.context?.trim()
                    );
                    const hasScenarioImage = !!scenarioForm.scenarioImage;

                    if (!hasScenarioText && !hasScenarioImage) {
                      toast.error("Add scenario text/question, image, or both");
                      return;
                    }

                    const newScenario: Scenario = {
                      id: scenarioForm.id || `scn-${Date.now()}`,
                      title: scenarioForm.title.trim(),
                      description: scenarioForm.description?.trim() || "",
                      context: scenarioForm.context?.trim() || "",
                      scenarioImage: scenarioForm.scenarioImage || undefined,
                    };
                    storageUtils.addScenario(newScenario);
                    setScenarios(storageUtils.getScenarios());
                    resetScenarioForm();
                    toast.success(
                      editingScenarioId
                        ? "Scenario updated!"
                        : "Scenario created!",
                    );
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
                >
                  {editingScenarioId ? "Update Scenario" : "Create Scenario"}
                </button>
                {editingScenarioId && (
                  <button
                    onClick={() => resetScenarioForm()}
                    className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Scenarios List */}
            <div className="lg:col-span-1">
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Scenarios ({scenarios.length})
                </h2>
                <div className="space-y-3">
                  {scenarios.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No scenarios created yet
                    </p>
                  ) : (
                    scenarios.map((scn) => (
                      <div
                        key={scn.id}
                        className="bg-gray-800 p-3 rounded border border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">{scn.title}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditScenario(scn)}
                              className="text-xs bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40 px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                storageUtils.deleteScenario(scn.id);
                                setScenarios(storageUtils.getScenarios());
                                toast.success("Scenario deleted");
                              }}
                              className="text-xs bg-red-600/20 text-red-300 hover:bg-red-600/40 px-2 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {scn.description && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {scn.description}
                          </p>
                        )}
                        {scn.scenarioImage && (
                          <img
                            src={scn.scenarioImage}
                            alt="Scenario"
                            className="w-full max-h-24 object-cover rounded border border-gray-700 mb-2"
                          />
                        )}
                        {scn.context && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-1 italic">
                            {scn.context}
                          </p>
                        )}
                        <div className="text-xs text-cyan-300">
                          {
                            questions.filter((q) => q.scenarioId === scn.id)
                              .length
                          }{" "}
                          question(s)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === "review" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters and List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm">Filters</h3>

                {/* Filter by Topic */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-2">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                  >
                    <option value="all">All Types</option>
                    <option value="single">Single Choice</option>
                    <option value="multiple">Multiple Choice</option>
                    <option value="boolean">True/False</option>
                    <option value="ordering">Ordering</option>
                    <option value="dragdrop">Drag & Drop</option>
                    <option value="hotspot">Hotspot</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-gray-700 text-xs text-gray-400">
                  Showing {filteredQuestions.length} of {questions.length}
                </div>
              </div>

              {/* Questions List */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-3 text-sm">Questions</h3>
                <div className="space-y-2">
                  {filteredQuestions.length === 0 ? (
                    <p className="text-xs text-gray-500">No questions found</p>
                  ) : (
                    filteredQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setSelectedReviewId(q.id)}
                        className={`w-full text-left p-2 rounded transition-colors text-xs ${
                          selectedReviewId === q.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                        }`}
                      >
                        <div className="font-semibold text-blue-300">
                          {q.id}
                        </div>
                        <div className="line-clamp-2 mt-1">{q.question}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {q.type}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Question Details */}
            <div className="lg:col-span-3">
              {selectedQuestion ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-blue-400">
                        {selectedQuestion.id}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {selectedQuestion.type.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleEditQuestion(selectedQuestion);
                          setActiveTab("questions");
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteQuestion(selectedQuestion.id);
                          setSelectedReviewId(null);
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-4 border-t border-gray-700 pt-4">
                    <div>
                      <h3 className="font-semibold mb-2">Question</h3>
                      <p className="bg-gray-800 p-3 rounded">
                        {selectedQuestion.question}
                      </p>
                    </div>

                    {selectedQuestion.questionImage && (
                      <div>
                        <h3 className="font-semibold mb-2">Question Image</h3>
                        <img
                          src={selectedQuestion.questionImage}
                          alt="Question"
                          className="max-w-full rounded border border-gray-700"
                        />
                      </div>
                    )}

                    {/* Case Study Link */}
                    {selectedQuestion.caseStudyId && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Associated Case Study
                        </h3>
                        <div className="bg-gray-800 p-3 rounded">
                          {caseStudies.find(
                            (cs) => cs.id === selectedQuestion.caseStudyId,
                          )?.title || "Unknown"}
                        </div>
                      </div>
                    )}

                    {/* Type-specific content */}
                    {["single", "multiple", "dropdown"].includes(
                      selectedQuestion.type,
                    ) &&
                      selectedQuestion.options && (
                        <div>
                          <h3 className="font-semibold mb-2">Options</h3>
                          <div className="space-y-1">
                            {selectedQuestion.options.map((opt) => {
                              const optString =
                                typeof opt === "string" ? opt : opt.text;
                              const optionId =
                                typeof opt === "string" ? undefined : opt.id;
                              const isCorrect =
                                !!optionId &&
                                (Array.isArray(selectedQuestion.correctAnswer)
                                  ? selectedQuestion.correctAnswer.includes(
                                      optionId,
                                    )
                                  : selectedQuestion.correctAnswer ===
                                    optionId);
                              return (
                                <div
                                  key={optionId || optString}
                                  className={`p-2 rounded text-sm ${
                                    isCorrect
                                      ? "bg-green-900 text-green-200 font-semibold"
                                      : "bg-gray-800"
                                  }`}
                                >
                                  {isCorrect && "✓ "}
                                  {optString}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Hotspot Info */}
                    {selectedQuestion.type === "dragdrop" && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Drag & Drop Configuration
                        </h3>
                        <div className="bg-gray-800 p-3 rounded space-y-2">
                          <p className="text-sm">
                            Values:{" "}
                            {selectedQuestion.dragDropItems?.length || 0}
                          </p>
                          <p className="text-sm">
                            Answer areas:{" "}
                            {selectedQuestion.dragDropBuckets?.length || 0}
                          </p>
                          {selectedQuestion.dragDropTemplate && (
                            <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                              {selectedQuestion.dragDropTemplate}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hotspot Info */}
                    {selectedQuestion.type === "hotspot" && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Hotspot Configuration
                        </h3>
                        <div className="bg-gray-800 p-3 rounded space-y-2">
                          <p className="text-sm">
                            Areas: {selectedQuestion.hotspotAreas?.length || 0}
                          </p>
                          <p className="text-sm">
                            Correct count:{" "}
                            {selectedQuestion.correctBoxCount || 1}
                          </p>
                          {selectedQuestion.hotspotImage && (
                            <>
                              <p className="text-sm">Image: Yes</p>
                              <img
                                src={selectedQuestion.hotspotImage}
                                alt="Hotspot"
                                className="max-w-full rounded border border-gray-700 mt-2"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedQuestion.type === "boolean" && (
                      <div>
                        <h3 className="font-semibold mb-2">Statements</h3>
                        <div className="space-y-2">
                          {(selectedQuestion.booleanStatements || []).map(
                            (statement) => (
                              <div
                                key={statement.id}
                                className="bg-gray-800 p-3 rounded text-sm flex justify-between gap-2"
                              >
                                <span>{statement.text}</span>
                                <span className="text-emerald-300 font-semibold">
                                  {statement.correct === "true" ? "Yes" : "No"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {selectedQuestion.explanation && (
                      <div>
                        <h3 className="font-semibold mb-2">Explanation</h3>
                        <div className="bg-gray-800 p-3 rounded">
                          {selectedQuestion.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                  <p className="text-gray-400">Select a question to review</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPreview && previewQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto">
          <div className="absolute top-4 right-4 z-50">
            <button onClick={() => setShowPreview(false)} className="btn-ghost">
              Close Preview
            </button>
          </div>
          <div className="min-h-screen pt-16 pb-6">
            <ExamEngine
              questions={[previewQuestion]}
              scenarios={scenarios}
              onComplete={() => setShowPreview(false)}
              onCancel={() => setShowPreview(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
