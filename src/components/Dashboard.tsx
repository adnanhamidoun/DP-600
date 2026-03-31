import React from "react";

interface DashboardProps {
  onBuildQuestions?: () => void;
  onBuildCustomExam?: () => void;
  onStartMicrosoftExam?: () => void;
  onStartTraining?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onBuildQuestions,
  onBuildCustomExam,
  onStartMicrosoftExam,
  onStartTraining,
}) => {
  return (
    <div className="app-shell">
      <div className="app-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Panel principal
          </h1>
        </div>

        <div className="glass-panel p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Opciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            <button onClick={onBuildQuestions} className="btn-ghost">
              Crear preguntas
            </button>
            <button onClick={onBuildCustomExam} className="btn-primary">
              Crear examen
            </button>
            <button onClick={onStartTraining} className="btn-secondary">
              Entrenamiento
            </button>
            <button onClick={onStartMicrosoftExam} className="btn-secondary">
              Iniciar examen Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
