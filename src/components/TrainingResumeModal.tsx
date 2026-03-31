import React from "react";

interface TrainingResumeModalProps {
  sessionTime: string;
  questions: number;
  progress: number;
  onResume: () => void;
  onNew: () => void;
}

export const TrainingResumeModal: React.FC<TrainingResumeModalProps> = ({
  sessionTime,
  questions,
  progress,
  onResume,
  onNew,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel p-4 sm:p-6 md:p-8 max-w-md w-full rounded-2xl">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Entrenamiento en progreso
          </h2>
          <p className="text-sm text-slate-400">
            Se encontró una sesión guardada
          </p>
        </div>

        <div className="space-y-4 mb-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Tiempo guardado:</span>
            <span className="font-semibold text-slate-200">{sessionTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Total de preguntas:</span>
            <span className="font-semibold text-slate-200">{questions}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-sm text-slate-400">Progreso:</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-semibold text-slate-200 text-sm">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={onNew} className="btn-ghost w-full">
            Empezar de nuevo
          </button>
          <button onClick={onResume} className="btn-primary w-full">
            Continuar
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Tu progreso se guardará automáticamente mientras entrenas
        </p>
      </div>
    </div>
  );
};
