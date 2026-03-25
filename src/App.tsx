import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { ExamEngine, ExamResults } from "./components/ExamEngine";
import { ReviewMode } from "./components/ReviewMode";
import { QuestionsBuilder } from "./components/QuestionsBuilder";
import { ToastProvider } from "./components/Toast";
import { storageUtils } from "./utils/storage";
import { examQuestions } from "./data/questions";
import "./index.css";

type AppView = "dashboard" | "exam" | "results" | "review" | "builder";
type ExamMode = "normal" | "training";

function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [examResults, setExamResults] = useState<ExamResults | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("normal");

  const handleStartExam = (mode: ExamMode = "normal") => {
    setExamMode(mode);
    setView("exam");
  };

  const handleExamComplete = (results: ExamResults) => {
    setExamResults(results);

    // Guardar sesión
    const session = {
      sessionId: Date.now().toString(),
      startDate: new Date().toISOString(),
      totalQuestions: results.totalQuestions,
      correctAnswers: results.correctAnswers,
      failedQuestions: results.failedQuestions,
      answers: results.answers,
    };
    storageUtils.addSession(session);

    // Guardar preguntas falladas
    results.failedQuestions.forEach((question) => {
      storageUtils.addFailedQuestion(question);
    });

    setView("results");
  };

  const handleCancelExam = () => {
    if (window.confirm("¿Estás seguro de que deseas cancelar el examen?")) {
      setView("dashboard");
    }
  };

  const handleReviewFailed = () => {
    setView("review");
  };

  const handleBuildQuestions = () => {
    setView("builder");
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
  };

  // Combinar preguntas: predefinidas + personalizadas
  const customQuestions = storageUtils.getCustomQuestions();
  const allQuestions = [...examQuestions, ...customQuestions];

  return (
    <ToastProvider>
      <>
        {view === "dashboard" && (
          <Dashboard
            onStartExam={handleStartExam}
            onReviewFailed={handleReviewFailed}
            onBuildQuestions={handleBuildQuestions}
          />
        )}

        {view === "exam" && (
          <ExamEngine
            questions={allQuestions}
            mode={examMode}
            onComplete={handleExamComplete}
            onCancel={handleCancelExam}
          />
        )}

        {view === "results" && examResults && (
          <div className="app-shell">
            <div className="app-container max-w-4xl text-center">
              <p className="subtle-text mb-2 text-sm uppercase tracking-[0.18em]">
                Resultado
              </p>
              <h1 className="text-4xl font-semibold mb-4">Examen completado</h1>
              <div className="glass-panel p-8 sm:p-12 mb-6">
                <div className="text-6xl font-semibold text-cyan-300 mb-4">
                  {examResults.score}%
                </div>
                <p className="text-xl subtle-text mb-5">
                  Respuestas correctas: {examResults.correctAnswers} /{" "}
                  {examResults.totalQuestions}
                </p>
                <p className="text-sm subtle-text mb-3">
                  Puntuacion ponderada: {examResults.earnedPoints.toFixed(2)} /{" "}
                  {examResults.totalPoints}
                </p>
                {examResults.failedQuestions.length > 0 && (
                  <p className="text-lg text-amber-300">
                    Preguntas falladas: {examResults.failedQuestions.length}
                  </p>
                )}
              </div>

              {examResults.score >= 70 ? (
                <div className="glass-panel border-emerald-400/30 p-5 mb-6">
                  <p className="text-lg text-emerald-200">
                    Felicidades, has superado el examen.
                  </p>
                </div>
              ) : (
                <div className="glass-panel border-rose-400/30 p-5 mb-6">
                  <p className="text-lg text-rose-200">
                    Te recomendamos revisar las preguntas falladas.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={handleBackToDashboard} className="btn-primary">
                  Volver al dashboard
                </button>
                {examResults.failedQuestions.length > 0 && (
                  <button
                    onClick={handleReviewFailed}
                    className="btn-secondary"
                  >
                    Revisar falladas
                  </button>
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
