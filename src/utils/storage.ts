import { ExamSession, Question, TopicProgress, CaseStudy } from "../types";

const STORAGE_KEY = "dp600_exam_sessions";
const FAILED_QUESTIONS_KEY = "dp600_failed_questions";
const CUSTOM_QUESTIONS_KEY = "dp600_custom_questions";
const CASE_STUDIES_KEY = "dp600_case_studies";
type ImportMode = "replace" | "merge";

const toCanonicalQuestionId = (index: number) =>
  `Q${String(index + 1).padStart(3, "0")}`;

const normalizeQuestion = (question: Question): Question => {
  const normalizedOptions = question.options?.map((opt, idx) => {
    if (typeof opt === "string") {
      return { id: `opt-${idx + 1}`, text: opt };
    }
    return opt;
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
        ? legacyText
        : currentText || `Value ${idx + 1}`;

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
      label: bucket.label || `Answer ${idx + 1}`,
    }),
  );

  return {
    ...question,
    options: normalizedOptions,
    correctAnswer: normalizedCorrectAnswer,
    dragDropItems:
      mergedDragDropItems.length > 0
        ? mergedDragDropItems
        : normalizedDragDropItems,
    dragDropBuckets: normalizedDragDropBuckets,
  };
};

const normalizeCaseStudy = (caseStudy: CaseStudy): CaseStudy => ({
  ...caseStudy,
  title: (caseStudy.title || "").trim(),
  description: (caseStudy.description || "").trim(),
  scenario: (caseStudy.scenario || "").trim(),
  businessRequirements: caseStudy.businessRequirements?.trim(),
  existingEnvironment: caseStudy.existingEnvironment?.trim(),
  problemStatement: caseStudy.problemStatement?.trim(),
  exhibits: (caseStudy.exhibits || "").trim(),
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
  const data = localStorage.getItem(FAILED_QUESTIONS_KEY);
  if (!data) return;
  const failed: Question[] = JSON.parse(data);
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
    localStorage.setItem(FAILED_QUESTIONS_KEY, JSON.stringify(remapped));
  }
};

const remapQuestionIdsInSessions = (idMap: Map<string, string>) => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return;
  const sessions: ExamSession[] = JSON.parse(data);
  let changed = false;

  const remappedSessions = sessions.map((session) => {
    let sessionChanged = false;

    const remappedFailed = session.failedQuestions.map((question) => {
      const newId = idMap.get(question.id);
      if (newId && newId !== question.id) {
        sessionChanged = true;
        return { ...question, id: newId };
      }
      return question;
    });

    const remappedAnswers: Record<string, unknown> = {};
    Object.entries(session.answers || {}).forEach(([key, value]) => {
      const newKey = idMap.get(key) || key;
      if (newKey !== key) {
        sessionChanged = true;
      }
      remappedAnswers[newKey] = value;
    });

    if (sessionChanged) {
      changed = true;
      return {
        ...session,
        failedQuestions: remappedFailed,
        answers: remappedAnswers,
      };
    }
    return session;
  });

  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remappedSessions));
  }
};

export const storageUtils = {
  // Sesiones
  saveSessions: (sessions: ExamSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  getSessions: (): ExamSession[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  addSession: (session: ExamSession) => {
    const sessions = storageUtils.getSessions();
    sessions.push(session);
    storageUtils.saveSessions(sessions);
  },

  // Preguntas falladas
  saveFailedQuestions: (questions: Question[]) => {
    localStorage.setItem(FAILED_QUESTIONS_KEY, JSON.stringify(questions));
  },

  getFailedQuestions: (): Question[] => {
    const data = localStorage.getItem(FAILED_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
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
    localStorage.removeItem(FAILED_QUESTIONS_KEY);
  },

  // Preguntas personalizadas
  saveCustomQuestions: (questions: Question[]) => {
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(questions));
  },

  getCustomQuestions: (): Question[] => {
    const data = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    const parsed: Question[] = data ? JSON.parse(data) : [];
    const normalized = parsed.map((q) => normalizeQuestion(q));
    const { canonical, idMap, changed } = canonicalizeQuestionIds(normalized);

    if (changed) {
      localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(canonical));
      remapQuestionIdsInFailed(idMap);
      remapQuestionIdsInSessions(idMap);
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
    localStorage.removeItem(CUSTOM_QUESTIONS_KEY);
  },

  // Casos de estudio
  saveCaseStudies: (caseStudies: CaseStudy[]) => {
    localStorage.setItem(CASE_STUDIES_KEY, JSON.stringify(caseStudies));
  },

  getCaseStudies: (): CaseStudy[] => {
    const data = localStorage.getItem(CASE_STUDIES_KEY);
    return data ? JSON.parse(data) : [];
  },

  addCaseStudy: (caseStudy: CaseStudy) => {
    const studies = storageUtils.getCaseStudies();
    const index = studies.findIndex((c) => c.id === caseStudy.id);
    if (index >= 0) {
      studies[index] = caseStudy;
    } else {
      studies.push(caseStudy);
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
    localStorage.removeItem(CASE_STUDIES_KEY);
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

  // Progreso por tópico
  getProgressByTopic: (sessions: ExamSession[]): TopicProgress[] => {
    const topicMap = new Map<string, { total: number; correct: number }>();

    sessions.forEach((session) => {
      session.answers &&
        Object.entries(session.answers).forEach(() => {
          // Lógica simplificada
        });
    });

    return Array.from(topicMap.entries()).map(
      ([topic, { total, correct }]) => ({
        topic,
        total,
        correct,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      }),
    );
  },
};
