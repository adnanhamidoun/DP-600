import React, { useEffect, useState } from "react";
import { Question, Scenario, SCENARIO_PREAMBLE } from "../types";
import {
  OrderingQuestion,
  DragDropQuestion,
  DropdownQuestion,
} from "./QuestionTypes";
import { HotspotExam } from "./HotspotExam";
import { HotspotFeedbackVisualizer } from "./HotspotFeedbackVisualizer";
import { storageUtils } from "../utils/storage";
import { FormattedText } from "./FormattedText";

interface ExamEngineProps {
  questions: Question[];
  scenarios?: Scenario[];
  mode?: "normal" | "training" | "microsoft";
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  initialIndex?: number;
  initialAnswers?: Record<string, unknown>;
  onComplete: (results: ExamResults) => void;
  onCancel: () => void;
}

export interface ExamResults {
  totalQuestions: number;
  correctAnswers: number;
  failedQuestions: Question[];
  answers: Record<string, unknown>;
  score: number;
  scaledScore: number;
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  breakdownByType: Array<{
    type: Question["type"];
    total: number;
    earned: number;
    percentage: number;
  }>;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  questions,
  scenarios = [],
  mode = "normal",
  shuffleQuestions = true,
  shuffleOptions = true,
  initialIndex = 0,
  initialAnswers = {},
  onComplete,
  onCancel,
}) => {
  const MICROSOFT_EXAM_DURATION_SECONDS = 120 * 60;

  const shuffleArray = <T,>(list: T[]): T[] => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const prepareQuestionsForSession = (
    inputQuestions: Question[],
  ): Question[] => {
    const withPreparedOptions = inputQuestions.map((question) => {
      if (
        shuffleOptions &&
        (question.type === "single" ||
          question.type === "multiple" ||
          question.type === "dropdown") &&
        question.options
      ) {
        return {
          ...question,
          options: shuffleArray(question.options),
        };
      }

      // Shuffle drag-drop items to avoid memorizing positions
      if (
        shuffleOptions &&
        question.type === "dragdrop" &&
        question.dragDropItems
      ) {
        return {
          ...question,
          dragDropItems: shuffleArray(question.dragDropItems),
        };
      }

      // Hotspot and other fixed-layout types keep their original internal order.
      return question;
    });

    return shuffleQuestions
      ? shuffleArray(withPreparedOptions)
      : withPreparedOptions;
  };

  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() =>
    prepareQuestionsForSession(questions),
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers] =
    useState<Record<string, unknown>>(initialAnswers);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [timeoutSubmitted, setTimeoutSubmitted] = useState(false);
  const [showingTrainingFeedback, setShowingTrainingFeedback] = useState(false);

  const isTrainingMode = mode === "training";
  const isMicrosoftMode = mode === "microsoft";

  const formatTime = (totalSeconds: number) => {
    const safe = Math.max(0, totalSeconds);
    const hours = Math.floor(safe / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((safe % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (safe % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    setSessionQuestions(prepareQuestionsForSession(questions));
    setCurrentIndex(0);
    setAnswers({});
    setTimeoutSubmitted(false);
    setShowingTrainingFeedback(false);
  }, [questions, shuffleQuestions, shuffleOptions]);

  useEffect(() => {
    if (isMicrosoftMode) {
      setTimeLeftSeconds(MICROSOFT_EXAM_DURATION_SECONDS);
      setTimeoutSubmitted(false);
    } else {
      setTimeLeftSeconds(null);
      setTimeoutSubmitted(false);
    }
  }, [isMicrosoftMode, sessionQuestions.length]);

  useEffect(() => {
    if (!isMicrosoftMode || timeLeftSeconds === null || timeLeftSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return prev;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isMicrosoftMode, timeLeftSeconds]);

  // Auto-save training state with throttle (max every 5 seconds)
  useEffect(() => {
    if (!isTrainingMode) return;

    const timeoutId = window.setTimeout(() => {
      try {
        storageUtils.saveTrainingState({
          questionsIds: sessionQuestions.map((q) => q.id),
          currentIndex,
          answers,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("Failed to save training state:", err);
      }
    }, 5000); // Save every 5 seconds

    return () => window.clearTimeout(timeoutId);
  }, [isTrainingMode, currentIndex, answers, sessionQuestions]);

  if (sessionQuestions.length === 0) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-lg w-full">
          <h1 className="text-2xl font-semibold mb-3">No hay preguntas</h1>
          <p className="subtle-text mb-5">
            Carga o crea preguntas para empezar una simulación.
          </p>
          <button onClick={onCancel} className="btn-primary">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentIndex];
  const isLastQuestion = currentIndex === sessionQuestions.length - 1;

  const getStrictPartialScore = (
    correctIds: string[],
    selectedIds: string[],
  ) => {
    if (correctIds.length === 0) return 0;

    const correctSet = new Set(correctIds);
    const selectedSet = new Set(selectedIds);

    // Invalid attempt: selecting more answers than allowed yields zero.
    if (selectedSet.size > correctSet.size) {
      return 0;
    }

    const correctSelections = Array.from(selectedSet).filter((id) =>
      correctSet.has(id),
    ).length;

    return correctSelections / correctSet.size;
  };

  const calculateQuestionPoints = (question: Question, userAnswer: unknown) => {
    if (question.type === "single" || question.type === "dropdown") {
      return userAnswer === question.correctAnswer ? 1 : 0;
    }

    if (question.type === "boolean") {
      const statements = question.booleanStatements || [];
      const userMap = (userAnswer as Record<string, "true" | "false">) || {};
      if (statements.length === 0) return 0;
      const correct = statements.filter(
        (s) => userMap[s.id] === s.correct,
      ).length;
      return correct / statements.length;
    }

    if (question.type === "multiple") {
      const correctIds = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];
      const selectedIds = Array.isArray(userAnswer)
        ? (userAnswer as string[])
        : [];
      return getStrictPartialScore(correctIds, selectedIds);
    }

    if (question.type === "ordering") {
      const correctOrder = question.steps?.map((s) => s.id).join(",");
      const userOrder = (userAnswer as any)?.map((s: any) => s.id).join(",");
      return correctOrder === userOrder ? 1 : 0;
    }

    if (question.type === "dragdrop") {
      const userAssignments = (userAnswer as Record<string, string>) || {};
      const items = question.dragDropItems || [];
      const requiredItems = items.filter((item) => !!item.correctBucket);
      const distractorItems = items.filter((item) => !item.correctBucket);

      if (requiredItems.length === 0) return 0;

      const hasIncorrectPlacement = requiredItems.some(
        (item) =>
          userAssignments[item.id] !== undefined &&
          userAssignments[item.id] !== item.correctBucket,
      );
      if (hasIncorrectPlacement) {
        return 0;
      }

      const hasUsedDistractor = distractorItems.some(
        (item) => userAssignments[item.id] !== undefined,
      );
      if (hasUsedDistractor) {
        return 0;
      }

      const correctPlacements = requiredItems.filter(
        (item) => userAssignments[item.id] === item.correctBucket,
      ).length;

      return correctPlacements / requiredItems.length;
    }

    if (question.type === "hotspot") {
      const selectedIds = (userAnswer as string[]) || [];
      const correctIds =
        question.hotspotAreas?.filter((a) => a.correct).map((a) => a.id) || [];
      return getStrictPartialScore(correctIds, selectedIds);
    }

    if (question.type === "casestudy") {
      return JSON.stringify(userAnswer) ===
        JSON.stringify(question.correctAnswer)
        ? 1
        : 0;
    }

    return 0;
  };

  const hasAnswer = (question: Question, userAnswer: unknown) => {
    if (userAnswer === undefined || userAnswer === null) return false;

    if (question.type === "multiple" || question.type === "hotspot") {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }

    if (question.type === "dragdrop") {
      return (
        typeof userAnswer === "object" &&
        userAnswer !== null &&
        Object.keys(userAnswer as Record<string, string>).length > 0
      );
    }

    if (question.type === "boolean") {
      const map = (userAnswer as Record<string, "true" | "false">) || {};
      return Object.keys(map).length > 0;
    }

    return true;
  };

  const getCorrectAnswerText = (question: Question) => {
    if (question.type === "single" || question.type === "dropdown") {
      const id =
        typeof question.correctAnswer === "string"
          ? question.correctAnswer
          : "";
      const option = question.options?.find((o) => o.id === id);
      return option?.text || "No definida";
    }

    if (question.type === "multiple") {
      const ids = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];
      const labels = ids
        .map((id) => question.options?.find((o) => o.id === id)?.text || id)
        .filter(Boolean);
      return labels.length > 0 ? labels.join(" | ") : "No definida";
    }

    if (question.type === "boolean") {
      const statements = question.booleanStatements || [];
      if (statements.length === 0) return "No definida";
      return statements
        .map((s) => `${s.text}: ${s.correct === "true" ? "Yes" : "No"}`)
        .join(" | ");
    }

    if (question.type === "ordering") {
      const ordered = question.steps || [];
      if (ordered.length === 0) return "No definida";
      return ordered.map((s) => s.text).join(" -> ");
    }

    if (question.type === "dragdrop") {
      const items = question.dragDropItems || [];
      const buckets = question.dragDropBuckets || [];
      const mappings = items
        .filter((item) => !!item.correctBucket)
        .map((item) => {
          const bucketLabel =
            buckets.find((b) => b.id === item.correctBucket)?.label ||
            item.correctBucket;
          return `${item.text} -> ${bucketLabel}`;
        });
      return mappings.length > 0 ? mappings.join(" | ") : "No definida";
    }

    if (question.type === "hotspot") {
      const areas = question.hotspotAreas?.filter((a) => a.correct) || [];
      return areas.length > 0
        ? areas.map((a) => a.label || a.id).join(" | ")
        : "No definida";
    }

    return "No definida";
  };

  const getDragDropSolvedAssignments = (question: Question) => {
    if (question.type !== "dragdrop") return {};
    return (question.dragDropItems || []).reduce<Record<string, string>>(
      (acc, item) => {
        if (item.correctBucket) {
          acc[item.id] = item.correctBucket;
        }
        return acc;
      },
      {},
    );
  };

  const currentUserAnswer = answers[currentQuestion.id];
  const currentHasAnswer = hasAnswer(currentQuestion, currentUserAnswer);
  const currentPoints = calculateQuestionPoints(
    currentQuestion,
    currentUserAnswer,
  );
  const currentIsPerfect = currentPoints === 1;

  // Obtener el case study si la pregunta pertenece a uno
  const caseStudy = currentQuestion.caseStudyId
    ? storageUtils
        .getCaseStudies()
        .find((c) => c.id === currentQuestion.caseStudyId)
    : null;

  // Obtener el scenario si la pregunta pertenece a uno
  const scenario = currentQuestion.scenarioId
    ? scenarios.find((s) => s.id === currentQuestion.scenarioId)
    : null;

  const handleSingleSelect = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleMultipleSelect = (optionId: string) => {
    setAnswers((prev) => {
      const current = (prev[currentQuestion.id] as string[]) || [];
      const newAnswers = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [currentQuestion.id]: newAnswers,
      };
    });
  };

  const handleAnswer = (value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleBooleanStatementAnswer = (
    statementId: string,
    value: "true" | "false",
  ) => {
    setAnswers((prev) => {
      const current =
        (prev[currentQuestion.id] as Record<string, "true" | "false">) || {};
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          [statementId]: value,
        },
      };
    });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      if (isTrainingMode) {
        // En modo entrenamiento, primero mostrar feedback si no está mostrando
        if (!showingTrainingFeedback && currentHasAnswer) {
          setShowingTrainingFeedback(true);
        } else {
          // Luego avanzar a la siguiente pregunta
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          setShowingTrainingFeedback(false);
          // Save immediately on question change
          try {
            storageUtils.saveTrainingState({
              questionsIds: sessionQuestions.map((q) => q.id),
              currentIndex: nextIndex,
              answers,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error("Failed to save training state:", err);
          }
        }
      } else {
        // En otros modos, avanzar directamente
        setCurrentIndex((prev) => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setShowingTrainingFeedback(false);
      // Save immediately on question change
      if (isTrainingMode) {
        try {
          storageUtils.saveTrainingState({
            questionsIds: sessionQuestions.map((q) => q.id),
            currentIndex: prevIndex,
            answers,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("Failed to save training state:", err);
        }
      }
    }
  };

  const handleFinish = () => {
    const failedQuestions: Question[] = [];
    let correctCount = 0;
    let earnedPoints = 0;
    let totalPoints = 0;
    const typeTotals = new Map<
      Question["type"],
      { total: number; earned: number }
    >();

    sessionQuestions.forEach((question) => {
      const userAnswer = answers[question.id];
      const points = calculateQuestionPoints(question, userAnswer);

      totalPoints += 1;
      earnedPoints += points;

      const currentType = typeTotals.get(question.type) || {
        total: 0,
        earned: 0,
      };
      currentType.total += 1;
      currentType.earned += points;
      typeTotals.set(question.type, currentType);

      const isCorrect = points === 1;

      if (!isCorrect) {
        failedQuestions.push(question);
      } else {
        correctCount++;
      }
    });

    const percentageScore =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const scaledScore =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) : 0;
    const breakdownByType = Array.from(typeTotals.entries()).map(
      ([type, values]) => ({
        type,
        total: values.total,
        earned: values.earned,
        percentage:
          values.total > 0
            ? Math.round((values.earned / values.total) * 100)
            : 0,
      }),
    );

    const results: ExamResults = {
      totalQuestions: sessionQuestions.length,
      correctAnswers: correctCount,
      failedQuestions,
      answers,
      score: percentageScore,
      scaledScore,
      passed: scaledScore >= 700,
      earnedPoints,
      totalPoints,
      breakdownByType,
    };

    onComplete(results);
  };

  useEffect(() => {
    if (
      isMicrosoftMode &&
      timeLeftSeconds === 0 &&
      !timeoutSubmitted &&
      sessionQuestions.length > 0
    ) {
      setTimeoutSubmitted(true);
      handleFinish();
    }
  }, [
    isMicrosoftMode,
    timeLeftSeconds,
    timeoutSubmitted,
    sessionQuestions.length,
  ]);

  return (
    <div className="app-shell">
      <div className="app-container max-w-4xl exam-typography">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              {isTrainingMode
                ? "Entrenamiento"
                : isMicrosoftMode
                  ? "Simulacion Microsoft"
                  : "Simulacion"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-1">
              DP-600 Exam
            </h1>
            <p className="subtle-text text-sm sm:text-base">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
            {isMicrosoftMode && timeLeftSeconds !== null && (
              <div className="px-2.5 sm:px-3 py-2 rounded-lg border border-amber-400/50 bg-amber-900/20 text-amber-100 text-xs sm:text-sm font-semibold">
                Tiempo: {formatTime(timeLeftSeconds)}
              </div>
            )}
            <button onClick={onCancel} className="btn-ghost px-3 py-2 text-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="progress-track h-1.5">
            <div
              className="progress-fill h-1.5"
              style={{
                width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Scenario Preamble + Description (Show first if it exists) */}
        {scenario && (
          <div className="glass-panel p-4 sm:p-6 mb-6 space-y-4">
            <p className="text-base subtle-text whitespace-pre-wrap leading-relaxed">
              {SCENARIO_PREAMBLE}
            </p>
            {scenario.description && (
              <>
                <div className="border-t border-slate-700/50"></div>
                <div>
                  <p className="text-sm font-semibold subtle-text mb-2">
                    Scenario Description:
                  </p>
                  <FormattedText
                    text={scenario.description}
                    className="text-sm space-y-2"
                  />
                </div>
              </>
            )}
            {scenario.scenarioImage && (
              <>
                <div className="border-t border-slate-700/50"></div>
                <div>
                  <p className="text-sm font-semibold subtle-text mb-2">
                    Scenario Image:
                  </p>
                  <img
                    src={scenario.scenarioImage}
                    alt="Scenario"
                    className="max-w-full h-auto rounded-xl border border-slate-700/50"
                  />
                </div>
              </>
            )}
            {scenario.context && (
              <>
                <div className="border-t border-slate-700/50"></div>
                <div>
                  <p className="text-sm font-semibold subtle-text mb-2">
                    Context:
                  </p>
                  <FormattedText
                    text={scenario.context}
                    className="text-sm space-y-2"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Case Study */}
        {caseStudy && (
          <div className="glass-panel p-4 sm:p-6 mb-6 space-y-4">
            <h3 className="text-xl font-semibold">
              Case Study: {caseStudy.title}
            </h3>

            {caseStudy.description && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Description
                </p>
                <FormattedText
                  text={caseStudy.description}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.scenario && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Scenario
                </p>
                <FormattedText
                  text={caseStudy.scenario}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.businessRequirements && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Business Requirements
                </p>
                <FormattedText
                  text={caseStudy.businessRequirements}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.existingEnvironment && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Existing Environment
                </p>
                <FormattedText
                  text={caseStudy.existingEnvironment}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.problemStatement && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Problem Statement
                </p>
                <FormattedText
                  text={caseStudy.problemStatement}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.exhibits && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Additional Details
                </p>
                <FormattedText
                  text={caseStudy.exhibits}
                  className="text-sm space-y-2"
                />
              </div>
            )}

            {caseStudy.exhibitsImage && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Exhibits Image
                </p>
                <img
                  src={caseStudy.exhibitsImage}
                  alt="Case study exhibits"
                  className="max-w-full h-auto rounded-xl border border-slate-600/60"
                />
              </div>
            )}
          </div>
        )}

        {/* Question */}
        <div className="glass-panel p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
          {/* Tags */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/70 text-slate-100 border border-slate-600/70">
              {currentQuestion.type}
            </span>
            {currentQuestion.category && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/70 text-slate-100 border border-slate-600/70">
                {currentQuestion.category}
              </span>
            )}
          </div>

          {/* Enunciado */}
          <FormattedText
            text={currentQuestion.question}
            className="text-[1.2rem] sm:text-[1.55rem] lg:text-[1.95rem] font-semibold leading-[1.45] mb-6 sm:mb-8 space-y-3"
          />

          {/* Question Image (if present) */}
          {currentQuestion.questionImage && (
            <div className="mb-8 p-4 rounded-xl border border-slate-700/70 bg-slate-900/45">
              <img
                src={currentQuestion.questionImage}
                alt="Question context"
                className="max-w-full h-auto max-h-96 rounded"
              />
            </div>
          )}

          {/* Respuestas según el tipo */}
          <div className="space-y-4">
            {currentQuestion.type === "single" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isUserSelected =
                    answers[currentQuestion.id] === option.id;
                  const isCorrect = option.id === currentQuestion.correctAnswer;
                  const shouldHighlightCorrect =
                    isTrainingMode &&
                    showingTrainingFeedback &&
                    !currentIsPerfect &&
                    isCorrect;
                  const shouldShowIncorrect =
                    isTrainingMode &&
                    showingTrainingFeedback &&
                    !currentIsPerfect &&
                    isUserSelected &&
                    !isCorrect;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                        shouldHighlightCorrect
                          ? "border-emerald-400/60 bg-emerald-500/25 hover:bg-emerald-500/35 shadow-lg shadow-emerald-500/20"
                          : shouldShowIncorrect
                            ? "border-rose-400/60 bg-rose-500/20 hover:bg-rose-500/25 shadow-lg shadow-rose-500/15"
                            : "border-slate-700/70 bg-slate-900/45 hover:bg-slate-800/65 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option.id}
                        checked={isUserSelected}
                        onChange={() => handleSingleSelect(option.id)}
                        disabled={isTrainingMode && showingTrainingFeedback}
                        className="w-5 h-5 mr-4 mt-0.5 flex-shrink-0"
                      />
                      <FormattedText
                        text={option.text}
                        className="text-[1.03rem] sm:text-[1.08rem] leading-relaxed space-y-1"
                      />
                      {shouldHighlightCorrect && (
                        <span className="ml-auto text-emerald-300 font-semibold text-sm">
                          ✓
                        </span>
                      )}
                      {shouldShowIncorrect && (
                        <span className="ml-auto text-rose-300 font-semibold text-sm">
                          ✗
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === "multiple" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isUserSelected = (
                    answers[currentQuestion.id] as string[]
                  )?.includes(option.id);
                  const correctIds = Array.isArray(
                    currentQuestion.correctAnswer,
                  )
                    ? currentQuestion.correctAnswer
                    : currentQuestion.correctAnswer
                      ? [currentQuestion.correctAnswer]
                      : [];
                  const isCorrect = correctIds.includes(option.id);
                  const shouldHighlightCorrect =
                    isTrainingMode &&
                    showingTrainingFeedback &&
                    !currentIsPerfect &&
                    isCorrect;
                  const shouldShowIncorrect =
                    isTrainingMode &&
                    showingTrainingFeedback &&
                    !currentIsPerfect &&
                    isUserSelected &&
                    !isCorrect;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                        shouldHighlightCorrect
                          ? "border-emerald-400/60 bg-emerald-500/25 hover:bg-emerald-500/35 shadow-lg shadow-emerald-500/20"
                          : shouldShowIncorrect
                            ? "border-rose-400/60 bg-rose-500/20 hover:bg-rose-500/25 shadow-lg shadow-rose-500/15"
                            : "border-slate-700/70 bg-slate-900/45 hover:bg-slate-800/65 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isUserSelected || false}
                        onChange={() => handleMultipleSelect(option.id)}
                        disabled={isTrainingMode && showingTrainingFeedback}
                        className="w-5 h-5 mr-4 mt-0.5 flex-shrink-0"
                      />
                      <FormattedText
                        text={option.text}
                        className="text-[1.03rem] sm:text-[1.08rem] leading-relaxed space-y-1"
                      />
                      {shouldHighlightCorrect && (
                        <span className="ml-auto text-emerald-300 font-semibold text-sm">
                          ✓
                        </span>
                      )}
                      {shouldShowIncorrect && (
                        <span className="ml-auto text-rose-300 font-semibold text-sm">
                          ✗
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === "dropdown" && currentQuestion.options && (
              <DropdownQuestion
                options={currentQuestion.options}
                onChange={handleSingleSelect}
                currentAnswer={answers[currentQuestion.id] as string}
              />
            )}

            {currentQuestion.type === "boolean" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-700/70 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900/65">
                    <tr>
                      <th className="text-left p-3 font-semibold">
                        Statements
                      </th>
                      <th className="p-3 font-semibold text-center">Yes</th>
                      <th className="p-3 font-semibold text-center">No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentQuestion.booleanStatements || []).map(
                      (statement) => {
                        const answerMap =
                          (answers[currentQuestion.id] as Record<
                            string,
                            "true" | "false"
                          >) || {};
                        return (
                          <tr
                            key={statement.id}
                            className="border-t border-slate-700/60"
                          >
                            <td className="p-3">
                              <FormattedText
                                text={statement.text}
                                className="text-sm space-y-1"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`${currentQuestion.id}-${statement.id}`}
                                checked={answerMap[statement.id] === "true"}
                                onChange={() =>
                                  handleBooleanStatementAnswer(
                                    statement.id,
                                    "true",
                                  )
                                }
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`${currentQuestion.id}-${statement.id}`}
                                checked={answerMap[statement.id] === "false"}
                                onChange={() =>
                                  handleBooleanStatementAnswer(
                                    statement.id,
                                    "false",
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {currentQuestion.type === "ordering" && currentQuestion.steps && (
              <OrderingQuestion
                steps={currentQuestion.steps}
                onChange={(steps) => handleAnswer(steps)}
                currentAnswer={answers[currentQuestion.id] as any}
              />
            )}

            {currentQuestion.type === "dragdrop" &&
              currentQuestion.dragDropItems &&
              currentQuestion.dragDropBuckets && (
                <DragDropQuestion
                  items={currentQuestion.dragDropItems}
                  buckets={currentQuestion.dragDropBuckets}
                  template={currentQuestion.dragDropTemplate}
                  onChange={(assignments) => handleAnswer(assignments)}
                  currentAnswer={
                    answers[currentQuestion.id] as Record<string, string>
                  }
                />
              )}

            {currentQuestion.type === "hotspot" &&
              currentQuestion.hotspotAreas && (
                <div className="space-y-4">
                  <HotspotExam
                    key={currentQuestion.id}
                    areas={currentQuestion.hotspotAreas}
                    imageBase64={currentQuestion.hotspotImage || ""}
                    onChange={(selectedIds: string[]) =>
                      handleAnswer(selectedIds)
                    }
                    currentAnswer={answers[currentQuestion.id] as string[]}
                    maxSelections={currentQuestion.correctBoxCount}
                  />
                </div>
              )}
          </div>

          {isTrainingMode && showingTrainingFeedback && currentHasAnswer && (
            <div
              className={`mt-6 sm:mt-8 rounded-xl border-2 p-4 sm:p-6 backdrop-blur-sm ${
                currentIsPerfect
                  ? "border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 via-emerald-900/30 to-slate-900/40 shadow-lg shadow-emerald-500/25"
                  : "border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-amber-900/30 to-slate-900/40 shadow-lg shadow-amber-500/25"
              }`}
            >
              <div className="mb-3 p-2 bg-slate-900/50 rounded border-l-4 border-slate-500 text-xs font-mono text-slate-400">
                Pregunta #{currentQuestion.id}
              </div>

              <div className="flex items-start sm:items-center gap-3 mb-4">
                {currentIsPerfect ? (
                  <>
                    <div className="text-3xl">🎯</div>
                    <div>
                      <p className="font-bold text-lg text-emerald-300">
                        ¡Respuesta Correcta!
                      </p>
                      <p className="text-sm text-emerald-200">
                        Excelente trabajo
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl">
                      {currentPoints > 0 ? "📊" : "❌"}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-amber-300">
                        {currentPoints > 0
                          ? "Respuesta Parcialmente Correcta"
                          : "Respuesta Incorrecta"}
                      </p>
                      <p className="text-sm text-amber-200">
                        Puntuación: {(currentPoints * 100).toFixed(0)}%
                      </p>
                    </div>
                  </>
                )}
              </div>

              {!currentIsPerfect && (
                <div className="space-y-3 mb-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-300">
                    📍 Respuesta correcta:
                  </p>
                  {currentQuestion.type === "boolean" ? (
                    <div className="overflow-x-auto rounded-lg border border-emerald-500/30">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-900/30 text-emerald-100">
                          <tr>
                            <th className="text-left p-3 font-semibold">
                              Statement
                            </th>
                            <th className="text-center p-3 font-semibold">
                              Correcto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(currentQuestion.booleanStatements || []).map(
                            (statement) => (
                              <tr
                                key={statement.id}
                                className="border-t border-emerald-500/20"
                              >
                                <td className="p-3 text-slate-200">
                                  <FormattedText
                                    text={statement.text}
                                    className="text-sm space-y-1"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-emerald-700/40 text-emerald-100 border border-emerald-500/40">
                                    {statement.correct === "true"
                                      ? "Yes"
                                      : "No"}
                                  </span>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : currentQuestion.type === "dragdrop" ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200 mb-3">
                          Solucion completa
                        </p>
                        <DragDropQuestion
                          items={currentQuestion.dragDropItems || []}
                          buckets={currentQuestion.dragDropBuckets || []}
                          template={currentQuestion.dragDropTemplate}
                          currentAnswer={getDragDropSolvedAssignments(
                            currentQuestion,
                          )}
                          onChange={() => {}}
                          readOnly
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-emerald-900/40 border-l-3 border-emerald-400 rounded text-sm text-emerald-200">
                      {getCorrectAnswerText(currentQuestion)}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.explanation && (
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 space-y-2 mb-4">
                  <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    💡 Explicación:
                  </p>
                  <FormattedText
                    text={currentQuestion.explanation}
                    className="text-sm text-slate-300 space-y-2 leading-relaxed"
                  />
                </div>
              )}

              {currentQuestion.type === "hotspot" &&
                currentQuestion.hotspotAreas && (
                  <HotspotFeedbackVisualizer
                    areas={currentQuestion.hotspotAreas}
                    imageBase64={currentQuestion.hotspotImage || ""}
                    correctAreaIds={
                      currentQuestion.hotspotAreas
                        ?.filter((a) => a.correct)
                        .map((a) => a.id) || []
                    }
                    userSelectedIds={
                      (answers[currentQuestion.id] as string[]) || []
                    }
                  />
                )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="btn-ghost w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                className="btn-primary w-full sm:w-auto"
              >
                {isTrainingMode && !showingTrainingFeedback && currentHasAnswer
                  ? "Ver respuesta →"
                  : isTrainingMode && showingTrainingFeedback
                    ? "Siguiente →"
                    : "Next →"}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="btn-secondary w-full sm:w-auto"
              >
                Finish Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
