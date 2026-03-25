import React, { useState, useEffect } from "react";
import { storageUtils } from "../utils/storage";
import { TopicProgress } from "../types";

interface DashboardProps {
  onStartExam?: (mode: "normal" | "training") => void;
  onReviewFailed?: () => void;
  onBuildQuestions?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartExam,
  onReviewFailed,
  onBuildQuestions,
}) => {
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const sessions = storageUtils.getSessions();
    const failed = storageUtils.getFailedQuestions();
    setFailedCount(failed.length);
    setTopicProgress(storageUtils.getProgressByTopic(sessions));
  }, []);

  const totalSessions = storageUtils.getSessions().length;
  const avgScore =
    topicProgress.length > 0
      ? Math.round(
          topicProgress.reduce((sum, topic) => sum + topic.percentage, 0) /
            topicProgress.length,
        )
      : 0;

  return (
    <div className="app-shell">
      <div className="app-container">
        {/* Header */}
        <div className="mb-10">
          <p className="subtle-text mb-2 text-sm uppercase tracking-[0.18em]">
            DP-600 Prep Studio
          </p>
          <h1 className="text-4xl font-semibold mb-2 sm:text-5xl">
            Simulador de Examen
          </h1>
          <p className="subtle-text max-w-2xl">
            Practica con un flujo claro, revisa progreso y mejora cada intento.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel p-5">
            <div className="subtle-text text-sm mb-1">Sesiones completadas</div>
            <div className="metric-value">{totalSessions}</div>
          </div>
          <div className="glass-panel p-5">
            <div className="subtle-text text-sm mb-1">Puntuación promedio</div>
            <div className="metric-value">{avgScore}%</div>
          </div>
          <div className="glass-panel p-5">
            <div className="subtle-text text-sm mb-1">Preguntas falladas</div>
            <div className="metric-value text-rose-300">{failedCount}</div>
          </div>
          <div className="glass-panel p-5">
            <div className="subtle-text text-sm mb-1">Tópicos estudiados</div>
            <div className="metric-value">{topicProgress.length}</div>
          </div>
        </div>

        {/* Progreso por tema */}
        {topicProgress.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-5">Progreso por tema</h2>
            <div className="space-y-3">
              {topicProgress.map((topic) => (
                <div key={topic.topic} className="glass-panel p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{topic.topic}</span>
                    <span className="text-sm subtle-text">
                      {topic.correct} / {topic.total}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                  <div className="text-right text-sm text-emerald-300 mt-1">
                    {topic.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            onClick={() => onStartExam?.("normal")}
            className="btn-primary"
          >
            Examen normal
          </button>
          <button
            onClick={() => onStartExam?.("training")}
            className="btn-secondary"
          >
            Modo entrenamiento
          </button>
          {failedCount > 0 && (
            <button onClick={onReviewFailed} className="btn-secondary">
              Revisar falladas ({failedCount})
            </button>
          )}
          <button onClick={onBuildQuestions} className="btn-ghost">
            Crear preguntas
          </button>
        </div>
      </div>
    </div>
  );
};
