import { Question, CaseStudy, Scenario } from "../types";

const DB_NAME = "DP600ExamDB";
const DB_VERSION = 1;
const FAILED_QUESTIONS_STORE = "failedQuestions";
const CUSTOM_QUESTIONS_STORE = "customQuestions";
const CASE_STUDIES_STORE = "caseStudies";
const SCENARIOS_STORE = "scenarios";
type ImportMode = "replace" | "merge";

// Cache en memoria para operaciones rápidas
const cache = {
  failedQuestions: null as Question[] | null,
  customQuestions: null as Question[] | null,
  caseStudies: null as CaseStudy[] | null,
  scenarios: null as Scenario[] | null,
};

let dbInstance: IDBDatabase | null = null;

// Inicializar IndexedDB con stores
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Crear stores si no existen
      const storeNames = [
        FAILED_QUESTIONS_STORE,
        CUSTOM_QUESTIONS_STORE,
        CASE_STUDIES_STORE,
        SCENARIOS_STORE,
      ];

      storeNames.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      });
    };
  });
};

// Helper para leer de IndexedDB
const readFromStore = (storeName: string): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    } catch (error) {
      reject(error);
    }
  });
};

// Helper para escribir a IndexedDB
const writeToStore = (storeName: string, data: any[]): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      // Limpiar store y escribir datos nuevos
      store.clear();
      data.forEach((item) => store.add(item));

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Precargar todo al inicio
const preloadCache = async () => {
  try {
    const [failedQuestions, customQuestions, caseStudies, scenarios] =
      await Promise.all([
        readFromStore(FAILED_QUESTIONS_STORE),
        readFromStore(CUSTOM_QUESTIONS_STORE),
        readFromStore(CASE_STUDIES_STORE),
        readFromStore(SCENARIOS_STORE),
      ]);

    cache.failedQuestions = failedQuestions;
    cache.customQuestions = customQuestions;
    cache.caseStudies = caseStudies;
    cache.scenarios = scenarios;
  } catch (error) {
    console.error("Error preloading cache:", error);
  }
};

// Iniciar precarga al cargar el módulo
preloadCache();

const toCanonicalQuestionId = (index: number) =>
  `Q${String(index + 1).padStart(3, "0")}`;

const normalizeText = (value?: string): string => {
  if (!value) return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const normalizeTemplateText = (value?: string): string => {
  if (!value) return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeQuestion = (question: Question): Question => {
  const normalizedOptions = question.options?.map((opt, idx) => {
    if (typeof opt === "string") {
      return { id: `opt-${idx + 1}`, text: normalizeText(opt) };
    }
    return {
      ...opt,
      text: normalizeText(opt.text),
    };
  });

  const resolveOptionIdByIndex = (index: number): string | undefined => {
    if (!normalizedOptions || index < 0 || index >= normalizedOptions.length) {
      return undefined;
    }
    return normalizedOptions[index]?.id;
  };

  let normalizedCorrectAnswer = question.correctAnswer;
  if (typeof normalizedCorrectAnswer === "number") {
    normalizedCorrectAnswer = resolveOptionIdByIndex(normalizedCorrectAnswer);
  }

  const normalizedDragDropItems = question.dragDropItems?.map((item, idx) => {
    const legacyText =
      (item as unknown as { label?: string; value?: string; name?: string })
        .label ||
      (item as unknown as { label?: string; value?: string; name?: string })
        .value ||
      (item as unknown as { label?: string; value?: string; name?: string })
        .name;
    const currentText = item.text?.trim() || "";
    const shouldReplaceGeneric = /^item\s*\d+$/i.test(currentText);
    const text =
      (!currentText || shouldReplaceGeneric) && legacyText
        ? normalizeText(legacyText)
        : normalizeText(currentText || `Value ${idx + 1}`);

    const legacyBucketId =
      (item as unknown as { bucketId?: string }).bucketId || undefined;

    return {
      ...item,
      text,
      correctBucket: item.correctBucket || legacyBucketId || "",
    };
  });

  const legacyValuesRaw = question as unknown as {
    values?: unknown;
    dragDropValues?: unknown;
    items?: unknown;
  };

  const coerceStringArray = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    return input
      .map((v) => (typeof v === "string" ? v : ""))
      .map((v) => v.trim())
      .filter((v) => !!v);
  };

  const legacyValues = [
    ...coerceStringArray(legacyValuesRaw.values),
    ...coerceStringArray(legacyValuesRaw.dragDropValues),
    ...coerceStringArray(legacyValuesRaw.items),
  ];

  const mergedDragDropItems = [...(normalizedDragDropItems || [])];
  if (legacyValues.length > 0) {
    const existingTexts = new Set(
      mergedDragDropItems.map((item) => item.text.trim().toLowerCase()),
    );
    legacyValues.forEach((legacyText) => {
      const key = legacyText.toLowerCase();
      if (!existingTexts.has(key)) {
        mergedDragDropItems.push({
          id: `item-legacy-${Date.now()}-${existingTexts.size + 1}`,
          text: legacyText,
          correctBucket: "",
        });
        existingTexts.add(key);
      }
    });
  }

  const normalizedDragDropBuckets = question.dragDropBuckets?.map(
    (bucket, idx) => ({
      ...bucket,
      id: bucket.id || `slot-${idx + 1}`,
      label: normalizeText(bucket.label || `Answer ${idx + 1}`),
    }),
  );

  return {
    ...question,
    question: normalizeText(question.question),
    explanation: normalizeText(question.explanation),
    options: normalizedOptions,
    correctAnswer: normalizedCorrectAnswer,
    steps: question.steps?.map((step) => ({
      ...step,
      text: normalizeText(step.text),
    })),
    dragDropItems:
      mergedDragDropItems.length > 0
        ? mergedDragDropItems
        : normalizedDragDropItems,
    dragDropBuckets: normalizedDragDropBuckets,
    dragDropTemplate: normalizeTemplateText(question.dragDropTemplate),
    booleanStatements: question.booleanStatements?.map((statement) => ({
      ...statement,
      text: normalizeText(statement.text),
    })),
  };
};

const normalizeCaseStudy = (caseStudy: CaseStudy): CaseStudy => ({
  ...caseStudy,
  title: normalizeText(caseStudy.title),
  description: normalizeText(caseStudy.description),
  scenario: normalizeText(caseStudy.scenario),
  businessRequirements: normalizeText(caseStudy.businessRequirements),
  existingEnvironment: normalizeText(caseStudy.existingEnvironment),
  problemStatement: normalizeText(caseStudy.problemStatement),
  exhibits: normalizeText(caseStudy.exhibits),
});

const normalizeScenario = (scenario: Scenario): Scenario => ({
  ...scenario,
  title: normalizeText(scenario.title),
  description: normalizeText(scenario.description),
  context: normalizeText(scenario.context),
});

const questionFingerprint = (question: Question): string => {
  const normalized = normalizeQuestion(question);
  const correctAnswerNormalized = Array.isArray(normalized.correctAnswer)
    ? [...normalized.correctAnswer].sort()
    : normalized.correctAnswer || "";

  return JSON.stringify({
    type: normalized.type,
    question: (normalized.question || "").trim().toLowerCase(),
    explanation: (normalized.explanation || "").trim().toLowerCase(),
    correctAnswer: correctAnswerNormalized,
    options: (normalized.options || []).map((o) =>
      (o.text || "").trim().toLowerCase(),
    ),
    steps: (normalized.steps || []).map((s) =>
      (s.text || "").trim().toLowerCase(),
    ),
    dragDropItems: (normalized.dragDropItems || []).map((i) => ({
      text: (i.text || "").trim().toLowerCase(),
      correctBucket: i.correctBucket || "",
    })),
    dragDropBuckets: (normalized.dragDropBuckets || []).map((b) => ({
      id: b.id,
      label: (b.label || "").trim().toLowerCase(),
    })),
    dragDropTemplate: (normalized.dragDropTemplate || "").trim(),
    hotspotAreas: (normalized.hotspotAreas || []).map((a) => ({
      label: (a.label || "").trim().toLowerCase(),
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      correct: a.correct,
    })),
    correctBoxCount: normalized.correctBoxCount || 0,
    booleanStatements: (normalized.booleanStatements || []).map((s) => ({
      text: (s.text || "").trim().toLowerCase(),
      correct: s.correct,
    })),
    caseStudyId: normalized.caseStudyId || "",
    questionImage: normalized.questionImage || "",
    hotspotImage: normalized.hotspotImage || "",
  });
};

const caseStudyFingerprint = (caseStudy: CaseStudy): string => {
  const normalized = normalizeCaseStudy(caseStudy);
  return JSON.stringify({
    title: normalized.title.toLowerCase(),
    description: (normalized.description || "").toLowerCase(),
    scenario: (normalized.scenario || "").toLowerCase(),
    businessRequirements: (normalized.businessRequirements || "").toLowerCase(),
    existingEnvironment: (normalized.existingEnvironment || "").toLowerCase(),
    problemStatement: (normalized.problemStatement || "").toLowerCase(),
    exhibits: (normalized.exhibits || "").toLowerCase(),
    exhibitsImage: normalized.exhibitsImage || "",
  });
};

const canonicalizeQuestionIds = (questions: Question[]) => {
  const idMap = new Map<string, string>();
  let changed = false;

  const canonical = questions.map((question, index) => {
    const newId = toCanonicalQuestionId(index);
    if (question.id !== newId) {
      changed = true;
      idMap.set(question.id, newId);
      return { ...question, id: newId };
    }
    idMap.set(question.id, question.id);
    return question;
  });

  return { canonical, idMap, changed };
};

const remapQuestionIdsInFailed = (idMap: Map<string, string>) => {
  const failed = cache.failedQuestions || [];
  let changed = false;

  const remapped = failed.map((question) => {
    const newId = idMap.get(question.id);
    if (newId && newId !== question.id) {
      changed = true;
      return { ...question, id: newId };
    }
    return question;
  });

  if (changed) {
    storageUtils.saveFailedQuestions(remapped);
  }
};

export const storageUtils = {
  // Preguntas falladas
  saveFailedQuestions: (questions: Question[]) => {
    cache.failedQuestions = questions;
    writeToStore(FAILED_QUESTIONS_STORE, questions).catch(console.error);
  },

  getFailedQuestions: (): Question[] => {
    return cache.failedQuestions || [];
  },

  addFailedQuestion: (question: Question) => {
    const failed = storageUtils.getFailedQuestions();
    // Evitar duplicados
    if (!failed.find((q) => q.id === question.id)) {
      failed.push(question);
      storageUtils.saveFailedQuestions(failed);
    }
  },

  clearFailedQuestions: () => {
    cache.failedQuestions = [];
    writeToStore(FAILED_QUESTIONS_STORE, []).catch(console.error);
  },

  // Preguntas personalizadas
  saveCustomQuestions: (questions: Question[]) => {
    cache.customQuestions = questions;
    writeToStore(CUSTOM_QUESTIONS_STORE, questions).catch(console.error);
  },

  getCustomQuestions: (): Question[] => {
    const data = cache.customQuestions || [];
    const parsed: Question[] = data;
    const normalized = parsed.map((q) => normalizeQuestion(q));
    const { canonical, idMap, changed } = canonicalizeQuestionIds(normalized);

    if (changed) {
      cache.customQuestions = canonical;
      writeToStore(CUSTOM_QUESTIONS_STORE, canonical).catch(console.error);
      remapQuestionIdsInFailed(idMap);
    }

    return canonical;
  },

  addCustomQuestion: (question: Question) => {
    const custom = storageUtils.getCustomQuestions();
    const normalized = normalizeQuestion(question);
    const index = custom.findIndex((q) => q.id === normalized.id);
    if (index >= 0) {
      custom[index] = normalized; // Actualizar
    } else {
      custom.push(normalized); // Crear
    }
    storageUtils.saveCustomQuestions(custom);
  },

  deleteCustomQuestion: (questionId: string) => {
    const custom = storageUtils.getCustomQuestions();
    const updated = custom.filter((q) => q.id !== questionId);
    storageUtils.saveCustomQuestions(updated);
  },

  clearCustomQuestions: () => {
    cache.customQuestions = [];
    writeToStore(CUSTOM_QUESTIONS_STORE, []).catch(console.error);
  },

  // Casos de estudio
  saveCaseStudies: (caseStudies: CaseStudy[]) => {
    const normalized = caseStudies.map((caseStudy) =>
      normalizeCaseStudy(caseStudy),
    );
    cache.caseStudies = normalized;
    writeToStore(CASE_STUDIES_STORE, normalized).catch(console.error);
  },

  getCaseStudies: (): CaseStudy[] => {
    return cache.caseStudies || [];
  },

  addCaseStudy: (caseStudy: CaseStudy) => {
    const studies = storageUtils.getCaseStudies();
    const normalized = normalizeCaseStudy(caseStudy);
    const index = studies.findIndex((c) => c.id === normalized.id);
    if (index >= 0) {
      studies[index] = normalized;
    } else {
      studies.push(normalized);
    }
    storageUtils.saveCaseStudies(studies);
  },

  deleteCaseStudy: (caseStudyId: string) => {
    const studies = storageUtils.getCaseStudies();
    const updated = studies.filter((c) => c.id !== caseStudyId);
    storageUtils.saveCaseStudies(updated);
    // También remover la asociación de preguntas
    const questions = storageUtils.getCustomQuestions();
    const updatedQuestions = questions.map((q) =>
      q.caseStudyId === caseStudyId ? { ...q, caseStudyId: undefined } : q,
    );
    storageUtils.saveCustomQuestions(updatedQuestions);
  },

  clearCaseStudies: () => {
    cache.caseStudies = [];
    writeToStore(CASE_STUDIES_STORE, []).catch(console.error);
  },

  // ========== SCENARIOS ==========
  saveScenarios: (scenarios: Scenario[]) => {
    const normalized = scenarios.map((scenario) => normalizeScenario(scenario));
    cache.scenarios = normalized;
    writeToStore(SCENARIOS_STORE, normalized).catch(console.error);
  },

  getScenarios: (): Scenario[] => {
    return cache.scenarios || [];
  },

  addScenario: (scenario: Scenario) => {
    const scenarios = storageUtils.getScenarios();
    const normalized = normalizeScenario(scenario);
    const index = scenarios.findIndex((s) => s.id === normalized.id);
    if (index >= 0) {
      scenarios[index] = normalized;
    } else {
      scenarios.push(normalized);
    }
    storageUtils.saveScenarios(scenarios);
  },

  deleteScenario: (scenarioId: string) => {
    const scenarios = storageUtils.getScenarios();
    const updated = scenarios.filter((s) => s.id !== scenarioId);
    storageUtils.saveScenarios(updated);
    // Also remove scenario association from questions
    const questions = storageUtils.getCustomQuestions();
    const updatedQuestions = questions.map((q) =>
      q.scenarioId === scenarioId ? { ...q, scenarioId: undefined } : q,
    );
    storageUtils.saveCustomQuestions(updatedQuestions);
  },

  clearScenarios: () => {
    cache.scenarios = [];
    writeToStore(SCENARIOS_STORE, []).catch(console.error);
  },

  importBackupData: (
    importedQuestions: Question[],
    importedCaseStudies: CaseStudy[],
    mode: ImportMode = "merge",
  ) => {
    const cleanQuestions = (
      Array.isArray(importedQuestions) ? importedQuestions : []
    ).map((q) => normalizeQuestion(q));
    const cleanCaseStudies = (
      Array.isArray(importedCaseStudies) ? importedCaseStudies : []
    ).map((c) => normalizeCaseStudy(c));

    const existingQuestions =
      mode === "replace" ? [] : storageUtils.getCustomQuestions();
    const existingCases =
      mode === "replace" ? [] : storageUtils.getCaseStudies();

    const byQuestionId = new Map<string, Question>();
    existingQuestions.forEach((q) => byQuestionId.set(q.id, q));
    cleanQuestions.forEach((q) => byQuestionId.set(q.id, q));

    const dedupedQuestions: Question[] = [];
    const seenQuestionFingerprint = new Set<string>();
    byQuestionId.forEach((q) => {
      const fp = questionFingerprint(q);
      if (!seenQuestionFingerprint.has(fp)) {
        seenQuestionFingerprint.add(fp);
        dedupedQuestions.push(q);
      }
    });

    const byCaseId = new Map<string, CaseStudy>();
    existingCases.forEach((c) => byCaseId.set(c.id, c));
    cleanCaseStudies.forEach((c) => byCaseId.set(c.id, c));

    const dedupedCases: CaseStudy[] = [];
    const seenCaseFingerprint = new Set<string>();
    byCaseId.forEach((c) => {
      const fp = caseStudyFingerprint(c);
      if (!seenCaseFingerprint.has(fp)) {
        seenCaseFingerprint.add(fp);
        dedupedCases.push(c);
      }
    });

    storageUtils.saveCustomQuestions(dedupedQuestions);
    storageUtils.saveCaseStudies(dedupedCases);

    return {
      questionsBefore: existingQuestions.length,
      questionsImported: cleanQuestions.length,
      questionsAfter: dedupedQuestions.length,
      questionsSkippedDuplicates:
        existingQuestions.length +
        cleanQuestions.length -
        dedupedQuestions.length,
      casesBefore: existingCases.length,
      casesImported: cleanCaseStudies.length,
      casesAfter: dedupedCases.length,
      casesSkippedDuplicates:
        existingCases.length + cleanCaseStudies.length - dedupedCases.length,
    };
  },

  cleanAllTextContent: () => {
    const currentQuestions = storageUtils.getCustomQuestions();
    const currentCases = storageUtils.getCaseStudies();
    const currentScenarios = storageUtils.getScenarios();
    const currentFailed = storageUtils.getFailedQuestions();

    const cleanedQuestions = currentQuestions.map((q) => normalizeQuestion(q));
    const cleanedCases = currentCases.map((c) => normalizeCaseStudy(c));
    const cleanedScenarios = currentScenarios.map((s) => normalizeScenario(s));
    const cleanedFailed = currentFailed.map((q) => normalizeQuestion(q));

    storageUtils.saveCustomQuestions(cleanedQuestions);
    storageUtils.saveCaseStudies(cleanedCases);
    storageUtils.saveScenarios(cleanedScenarios);
    storageUtils.saveFailedQuestions(cleanedFailed);

    return {
      questions: cleanedQuestions.length,
      caseStudies: cleanedCases.length,
      scenarios: cleanedScenarios.length,
      failedQuestions: cleanedFailed.length,
    };
  },

  // Training Mode State Persistence
  saveTrainingState: (state: {
    questionsIds: string[];
    currentIndex: number;
    answers: Record<string, unknown>;
    timestamp: number;
  }) => {
    try {
      // Compress answers: stringify arrays/objects to reduce size
      const compressedAnswers: Record<string, unknown> = {};
      Object.entries(state.answers).forEach(([key, value]) => {
        if (
          Array.isArray(value) ||
          (typeof value === "object" && value !== null)
        ) {
          compressedAnswers[key] = JSON.stringify(value);
        } else {
          compressedAnswers[key] = value;
        }
      });

      const compressedState = {
        questionsIds: state.questionsIds,
        currentIndex: state.currentIndex,
        answers: compressedAnswers,
        timestamp: state.timestamp,
      };

      const json = JSON.stringify(compressedState);

      // Check size before saving (localStorage typically ~5-10MB, cap at 100KB for safety)
      if (json.length > 100 * 1024) {
        console.warn(
          "Training state too large, only saving index and question IDs",
        );
        const minimalState = {
          questionsIds: state.questionsIds,
          currentIndex: state.currentIndex,
          answers: {},
          timestamp: state.timestamp,
        };
        localStorage.setItem("_trainingState", JSON.stringify(minimalState));
      } else {
        localStorage.setItem("_trainingState", json);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        try {
          // Fallback: save only progress, not answers
          const minimalState = {
            questionsIds: state.questionsIds,
            currentIndex: state.currentIndex,
            answers: {},
            timestamp: state.timestamp,
          };
          localStorage.setItem("_trainingState", JSON.stringify(minimalState));
        } catch {
          console.error("Failed to save training state");
        }
      }
    }
  },

  getTrainingState: () => {
    const stored = localStorage.getItem("_trainingState");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);

      // Decompress answers
      if (parsed.answers) {
        const decompressedAnswers: Record<string, unknown> = {};
        Object.entries(parsed.answers).forEach(([key, value]) => {
          if (typeof value === "string") {
            try {
              decompressedAnswers[key] = JSON.parse(value);
            } catch {
              decompressedAnswers[key] = value;
            }
          } else {
            decompressedAnswers[key] = value;
          }
        });
        parsed.answers = decompressedAnswers;
      }

      return parsed;
    } catch {
      return null;
    }
  },

  clearTrainingState: () => {
    localStorage.removeItem("_trainingState");
  },
};
