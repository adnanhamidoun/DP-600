import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { ExamEngine, ExamResults } from "./components/ExamEngine";
import { ReviewMode } from "./components/ReviewMode";
import { QuestionsBuilder } from "./components/QuestionsBuilder";
import { ExamBuilder, ExamBuildOptions } from "./components/ExamBuilder";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { TrainingResumeModal } from "./components/TrainingResumeModal";
import { ToastProvider } from "./components/Toast";
import { storageUtils } from "./utils/storage";
import { Question } from "./types";
import JSZip from "jszip";
import "./index.css";

type AppView =
  | "dashboard"
  | "exam"
  | "results"
  | "review"
  | "builder"
  | "examBuilder"
  | "trainingBuilder";
type ExamMode = "normal" | "training" | "microsoft";

function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [examResults, setExamResults] = useState<ExamResults | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("normal");
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [examBuildOptions, setExamBuildOptions] = useState<ExamBuildOptions>({
    shuffleQuestions: true,
    shuffleOptions: true,
  });
  const [showTrainingResumeModal, setShowTrainingResumeModal] = useState(false);
  const [trainingState, setTrainingState] = useState<any>(null);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(true);
  const [questionBankError, setQuestionBankError] = useState<string | null>(
    null,
  );

  const shuffleArray = <T,>(list: T[]): T[] => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const pickRandomItem = <T,>(list: T[]): T | null => {
    if (list.length === 0) return null;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  };

  // Remove legacy seeded scenario that used to be auto-created.
  useEffect(() => {
    const loadBackupData = async () => {
      try {
        setIsQuestionBankLoading(true);
        setQuestionBankError(null);

        // Load the specific backup file
        const response = await fetch("/backup-1775084408164.zip", {
          cache: "no-cache",
        });

        if (!response.ok) {
          throw new Error(`No se pudo cargar el backup (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const zip = new JSZip();
        await zip.loadAsync(arrayBuffer);

        // Extract questions, cases, and scenarios from ZIP
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

        // Set questions for display
        if (Array.isArray(questionsData) && questionsData.length > 0) {
          setQuestionBank(questionsData);
        }

        // Import to localStorage (merge mode - doesn't overwrite)
        storageUtils.importBackupData(
          Array.isArray(questionsData) ? questionsData : [],
          Array.isArray(casesData) ? casesData : [],
          "merge",
        );

        // Import scenarios
        if (Array.isArray(scenariosData) && scenariosData.length > 0) {
          const existingScenarios = storageUtils.getScenarios();
          const allScenarios = [...existingScenarios];

          scenariosData.forEach((scn: any) => {
            const exists = allScenarios.find((s) => s.id === scn.id);
            if (!exists) {
              allScenarios.push(scn);
            }
          });

          storageUtils.saveScenarios(allScenarios);
        }
      } catch (error) {
        console.error("Error loading backup data:", error);
        setQuestionBankError(
          "No se pudo cargar el archivo de backup. Usando batería por defecto.",
        );
        // Fallback: load default questions
        try {
          const response = await fetch("/questions-final.json", {
            cache: "no-cache",
          });
          if (response.ok) {
            const loadedQuestions = await response.json();
            setQuestionBank(loadedQuestions);
            storageUtils.importBackupData(loadedQuestions, [], "merge");
          }
        } catch (fallbackError) {
          console.error("Error loading fallback questions:", fallbackError);
        }
      } finally {
        setIsQuestionBankLoading(false);
      }
    };

    loadBackupData();

    const legacyScenarioId = "scn-pyspark-analysis";
    const existingScenarios = storageUtils.getScenarios();
    const hasLegacyScenario = existingScenarios.some(
      (scenario) => scenario.id === legacyScenarioId,
    );

    if (!hasLegacyScenario) {
      return;
    }

    const hasLinkedQuestions = storageUtils
      .getCustomQuestions()
      .some((question) => question.scenarioId === legacyScenarioId);

    if (!hasLinkedQuestions) {
      storageUtils.deleteScenario(legacyScenarioId);
    }

    // Legacy cleanup: failed-history is no longer used for retry flows.
    storageUtils.clearFailedQuestions();
  }, []);

  const handleBuildCustomExam = () => {
    setView("examBuilder");
  };

  const buildMicrosoftStressExam = (pool: Question[]): Question[] => {
    const targetCount = 40 + Math.floor(Math.random() * 21); // 40-60
    const usedIds = new Set<string>();
    const finalQuestions: Question[] = [];

    const caseStudyIds = Array.from(
      new Set(pool.map((q) => q.caseStudyId).filter(Boolean)),
    ) as string[];
    const selectedCaseStudyId = pickRandomItem(caseStudyIds);
    const caseStudyBlock = selectedCaseStudyId
      ? pool.filter((q) => q.caseStudyId === selectedCaseStudyId).slice(0, 7)
      : [];

    caseStudyBlock.forEach((q) => {
      if (!usedIds.has(q.id)) {
        finalQuestions.push(q);
        usedIds.add(q.id);
      }
    });

    const scenarioIds = Array.from(
      new Set(
        pool
          .filter((q) => !usedIds.has(q.id))
          .map((q) => q.scenarioId)
          .filter(Boolean),
      ),
    ) as string[];
    const selectedScenarioId = pickRandomItem(scenarioIds);
    const scenarioBlock = selectedScenarioId
      ? pool
          .filter(
            (q) => q.scenarioId === selectedScenarioId && !usedIds.has(q.id),
          )
          .slice(0, 3)
      : [];

    scenarioBlock.forEach((q) => {
      if (!usedIds.has(q.id)) {
        finalQuestions.push(q);
        usedIds.add(q.id);
      }
    });

    const normalPool = pool.filter(
      (q) => !q.caseStudyId && !q.scenarioId && !usedIds.has(q.id),
    );
    const shuffledNormals = shuffleArray(normalPool);
    const remainingNeeded = Math.max(0, targetCount - finalQuestions.length);
    shuffledNormals.slice(0, remainingNeeded).forEach((q) => {
      if (!usedIds.has(q.id)) {
        finalQuestions.push(q);
        usedIds.add(q.id);
      }
    });

    return finalQuestions;
  };

  const handleStartMicrosoftExam = () => {
    const microsoftQuestions = buildMicrosoftStressExam(allQuestions);

    if (microsoftQuestions.length === 0) {
      window.alert(
        "No hay preguntas disponibles para iniciar el examen Microsoft.",
      );
      return;
    }

    if (microsoftQuestions.length < 40) {
      window.alert(
        `El banco actual no alcanza 40 preguntas normales. Se iniciara con ${microsoftQuestions.length} preguntas.`,
      );
    }

    setSelectedQuestions(microsoftQuestions);
    setExamBuildOptions({
      shuffleQuestions: false,
      shuffleOptions: true,
    });
    setExamMode("microsoft");
    setView("exam");
  };

  const handleStartTraining = () => {
    if (allQuestions.length === 0) {
      window.alert("No hay preguntas disponibles para el entrenamiento.");
      return;
    }

    // Check for saved training state
    const savedState = storageUtils.getTrainingState();
    if (
      savedState &&
      savedState.questionsIds &&
      savedState.questionsIds.length > 0
    ) {
      setTrainingState(savedState);
      setShowTrainingResumeModal(true);
      setView("trainingBuilder");
    } else {
      // Go to training builder to configure
      setView("trainingBuilder");
    }
  };

  const handleStartTrainingWithConfig = (
    questions: Question[],
    shuffle: boolean,
  ) => {
    setSelectedQuestions(questions);
    setExamBuildOptions({
      shuffleQuestions: shuffle,
      shuffleOptions: true,
    });
    setExamMode("training");
    setShowTrainingResumeModal(false);
    setTrainingState(null);
    storageUtils.clearTrainingState();
    setView("exam");
  };

  const _resumeTraining = () => {
    if (!trainingState || !trainingState.questionsIds) return;

    // Reconstruct questions from saved IDs
    const savedIds = trainingState.questionsIds;
    const reconstructed = savedIds
      .map((id: string) =>
        allQuestions.find(
          (q) => q.id === id || q.id === `q-${id}` || id.includes(q.id),
        ),
      )
      .filter((q: Question | undefined) => q !== undefined) as Question[];

    setSelectedQuestions(
      reconstructed.length > 0 ? reconstructed : allQuestions,
    );
    setExamBuildOptions({
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    setExamMode("training");
    setShowTrainingResumeModal(false);
    setView("exam");
  };

  const handleBuildExam = (questions: any[], options: ExamBuildOptions) => {
    setSelectedQuestions(questions);
    setExamBuildOptions(options);
    setExamMode("normal");
    setView("exam");
  };

  const handleExamComplete = (results: ExamResults) => {
    setExamResults(results);

    // Clear training state if in training mode
    if (examMode === "training") {
      storageUtils.clearTrainingState();
    }

    setView("results");
  };

  const handleCancelExam = () => {
    if (window.confirm("¿Estás seguro de que deseas cancelar el examen?")) {
      setView("dashboard");
      setSelectedQuestions([]);
    }
  };

  const handleReviewFailed = () => {
    const failedQuestions = examResults?.failedQuestions || [];
    const uniqueFailedQuestions = failedQuestions.filter(
      (question, index, arr) =>
        arr.findIndex((q) => q.id === question.id) === index,
    );

    if (uniqueFailedQuestions.length === 0) {
      window.alert("No hay preguntas falladas para reintentar.");
      return;
    }

    setSelectedQuestions(uniqueFailedQuestions);
    setExamBuildOptions({
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    setExamMode("training");
    storageUtils.clearTrainingState();
    setView("exam");
  };

  const handleTrainFailedQuestions = () => {
    const failedQuestions = examResults?.failedQuestions || [];
    const uniqueFailedQuestions = failedQuestions.filter(
      (question, index, arr) =>
        arr.findIndex((q) => q.id === question.id) === index,
    );
    if (uniqueFailedQuestions.length === 0) {
      window.alert("No hay preguntas falladas para entrenar.");
      return;
    }

    setSelectedQuestions(uniqueFailedQuestions);
    setExamBuildOptions({
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    setExamMode("training");
    storageUtils.clearTrainingState();
    setView("exam");
  };

  const handleBuildQuestions = () => {
    setView("builder");
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
    setSelectedQuestions([]);
  };

  // Banco fijo final del proyecto (backup-1774714216013)
  const allQuestions = questionBank;
  const questionsToUse =
    selectedQuestions.length > 0 ? selectedQuestions : allQuestions;

  if (isQuestionBankLoading) {
    return (
      <ToastProvider>
        <div className="app-shell flex items-center justify-center p-6">
          <div className="glass-panel p-6 sm:p-8 text-center max-w-lg w-full">
            <h1 className="text-2xl font-semibold mb-2">Cargando batería</h1>
            <p className="subtle-text mb-4">
              Preparando preguntas para iniciar el simulador...
            </p>
            <div className="progress-track h-2">
              <div className="progress-fill h-2 w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </ToastProvider>
    );
  }

  if (questionBankError) {
    return (
      <ToastProvider>
        <div className="app-shell flex items-center justify-center p-6">
          <div className="glass-panel p-6 sm:p-8 text-center max-w-lg w-full">
            <h1 className="text-2xl font-semibold mb-2 text-rose-300">
              Error cargando preguntas
            </h1>
            <p className="subtle-text mb-5">{questionBankError}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reintentar
            </button>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <>
        {view === "dashboard" && (
          <Dashboard
            onBuildQuestions={handleBuildQuestions}
            onBuildCustomExam={handleBuildCustomExam}
            onStartMicrosoftExam={handleStartMicrosoftExam}
            onStartTraining={handleStartTraining}
          />
        )}

        {view === "examBuilder" && (
          <ExamBuilder
            questions={allQuestions}
            scenarios={storageUtils.getScenarios()}
            onBuildExam={handleBuildExam}
            onCancel={handleBackToDashboard}
          />
        )}

        {view === "trainingBuilder" && (
          <>
            {showTrainingResumeModal && trainingState && (
              <TrainingResumeModal
                sessionTime={new Date(trainingState.timestamp).toLocaleString()}
                questions={trainingState.questionsIds?.length || 0}
                progress={Math.round(
                  ((trainingState.currentIndex || 0) /
                    (trainingState.questionsIds?.length || 1)) *
                    100,
                )}
                onResume={_resumeTraining}
                onNew={() => {
                  setShowTrainingResumeModal(false);
                  setTrainingState(null);
                  storageUtils.clearTrainingState();
                }}
              />
            )}
            {!showTrainingResumeModal && (
              <TrainingBuilder
                questions={allQuestions}
                onStartTraining={handleStartTrainingWithConfig}
                onCancel={handleBackToDashboard}
              />
            )}
          </>
        )}

        {view === "exam" && (
          <>
            {showTrainingResumeModal && trainingState && (
              <TrainingResumeModal
                sessionTime={new Date(trainingState.timestamp).toLocaleString()}
                questions={trainingState.questionsIds?.length || 0}
                progress={Math.round(
                  ((trainingState.currentIndex || 0) /
                    (trainingState.questionsIds?.length || 1)) *
                    100,
                )}
                onResume={_resumeTraining}
                onNew={() => {
                  setShowTrainingResumeModal(false);
                  setTrainingState(null);
                  storageUtils.clearTrainingState();
                }}
              />
            )}
            <ExamEngine
              questions={questionsToUse}
              scenarios={storageUtils.getScenarios()}
              mode={examMode}
              shuffleQuestions={examBuildOptions.shuffleQuestions}
              shuffleOptions={examBuildOptions.shuffleOptions}
              initialIndex={trainingState?.currentIndex || 0}
              initialAnswers={trainingState?.answers || {}}
              onComplete={handleExamComplete}
              onCancel={handleCancelExam}
            />
          </>
        )}

        {view === "results" && examResults && (
          <div className="app-shell">
            <div className="app-container max-w-4xl text-center">
              <p className="subtle-text mb-2 text-sm uppercase tracking-[0.18em]">
                {examMode === "training"
                  ? "Resultado de Entrenamiento"
                  : "Resultado"}
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4">
                {examMode === "training"
                  ? "Sesión de entrenamiento completada"
                  : "Examen completado"}
              </h1>
              <div className="glass-panel p-4 sm:p-8 lg:p-12 mb-6">
                {examMode === "training" ? (
                  <>
                    <div className="text-4xl sm:text-5xl font-semibold text-teal-300 mb-2">
                      {examResults.score}%
                    </div>
                    <p className="subtle-text text-sm mb-4">
                      Porcentaje de acierto
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-teal-300 mb-2">
                      {examResults.scaledScore}
                    </div>
                    <p className="subtle-text text-sm mb-4">
                      Escala Microsoft (0-1000)
                    </p>
                  </>
                )}
                <p className="text-base sm:text-xl subtle-text mb-5">
                  Respuestas correctas: {examResults.correctAnswers} /{" "}
                  {examResults.totalQuestions}
                </p>
                <p className="text-sm subtle-text mb-3">
                  Puntuacion ponderada: {examResults.earnedPoints.toFixed(2)} /{" "}
                  {examResults.totalPoints}
                </p>
                {examMode !== "training" && (
                  <>
                    <p className="text-sm subtle-text mb-3">
                      Porcentaje total: {examResults.score}%
                    </p>
                    <p className="text-sm subtle-text mb-1">
                      Puntuacion minima para aprobar: 700
                    </p>
                  </>
                )}
                {examResults.failedQuestions.length > 0 && (
                  <p className="text-lg text-amber-200 mt-3">
                    Preguntas falladas: {examResults.failedQuestions.length}
                  </p>
                )}
              </div>

              {examMode !== "training" &&
                (examResults.passed ? (
                  <div className="glass-panel border-teal-400/30 p-5 mb-6">
                    <p className="text-lg text-teal-100">
                      Aprobado. Has superado el umbral oficial de 700/1000.
                    </p>
                  </div>
                ) : (
                  <div className="glass-panel border-amber-400/30 p-5 mb-6">
                    <p className="text-lg text-amber-100">
                      No alcanzaste 700/1000. Te recomendamos revisar las
                      preguntas falladas.
                    </p>
                  </div>
                ))}

              {examMode === "training" &&
                examResults.failedQuestions.length > 0 && (
                  <div className="glass-panel border-amber-400/30 p-5 mb-6">
                    <p className="text-lg text-amber-100 mb-2">
                      Tienes {examResults.failedQuestions.length} pregunta
                      {examResults.failedQuestions.length !== 1 ? "s" : ""} para
                      revisar
                    </p>
                    <p className="text-sm text-amber-200">
                      Practica con estas preguntas para mejorar tu puntuación
                    </p>
                  </div>
                )}

              <div className="glass-panel p-6 mb-6 text-left">
                <h2 className="text-xl font-semibold mb-4">
                  Desglose por tipo de pregunta
                </h2>
                <div className="space-y-3">
                  {examResults.breakdownByType
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map((item) => (
                      <div key={item.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{item.type}</span>
                          <span className="subtle-text">
                            {item.percentage}% ({item.earned.toFixed(2)} /{" "}
                            {item.total})
                          </span>
                        </div>
                        <div className="progress-track h-2">
                          <div
                            className="progress-fill h-2"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 justify-center max-w-md mx-auto">
                {examMode === "training" ? (
                  <>
                    <button
                      onClick={handleBackToDashboard}
                      className="btn-primary"
                    >
                      Volver al dashboard
                    </button>
                    {examResults.failedQuestions.length > 0 && (
                      <button
                        onClick={handleTrainFailedQuestions}
                        className="btn-secondary"
                      >
                        Entrenar solo fallidas
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBackToDashboard}
                      className="btn-primary"
                    >
                      Volver al dashboard
                    </button>
                    {examResults.failedQuestions.length > 0 && (
                      <button
                        onClick={handleReviewFailed}
                        className="btn-secondary"
                      >
                        Reintentar falladas (este intento)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "review" && <ReviewMode onBack={handleBackToDashboard} />}

        {view === "builder" && (
          <QuestionsBuilder onBack={handleBackToDashboard} />
        )}
      </>
    </ToastProvider>
  );
}

export default App;
