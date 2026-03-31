import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { HotspotArea } from "../types";

interface HotspotExamProps {
  areas: HotspotArea[];
  imageBase64: string;
  onChange: (selectedAreaIds: string[]) => void;
  currentAnswer?: string[];
  maxSelections?: number; // Límita la cantidad de selecciones
}

export const HotspotExam: React.FC<HotspotExamProps> = ({
  areas,
  imageBase64,
  onChange,
  currentAnswer = [],
  maxSelections = undefined, // Por defecto sin límite
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const selected = Array.isArray(currentAnswer) ? currentAnswer : [];

  const recalculateStageSize = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return;

    const containerWidth =
      containerRef.current?.clientWidth || naturalSize.width;
    const maxHeight = 780;
    let width = containerWidth;
    let height = (width * naturalSize.height) / naturalSize.width;

    if (height > maxHeight) {
      height = maxHeight;
      width = (height * naturalSize.width) / naturalSize.height;
    }

    setStageSize({
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    });
  }, [naturalSize.height, naturalSize.width]);

  useEffect(() => {
    if (!imageBase64) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageBase64;
  }, [imageBase64]);

  useEffect(() => {
    recalculateStageSize();
  }, [recalculateStageSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      recalculateStageSize();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [recalculateStageSize]);

  const handleAreaClick = (areaId: string) => {
    const isAlreadySelected = selected.includes(areaId);

    // Si ya está seleccionado, permitir deseleccionar
    if (isAlreadySelected) {
      const newSelected = selected.filter((id) => id !== areaId);
      onChange(newSelected);
    }
    // Si no está seleccionado, solo permitir si está bajo el límite
    else if (!maxSelections || selected.length < maxSelections) {
      const newSelected = [...selected, areaId];
      onChange(newSelected);
    }
    // Si está sobre el límite, no hacer nada
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="w-full border-2 border-gray-600 rounded overflow-hidden"
      >
        <p className="text-xs text-blue-300 p-2 bg-gray-800">
          🖱️ Click on the areas you consider correct
        </p>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          style={{ background: "#1a1a1a", cursor: "pointer" }}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={stageSize.width}
                height={stageSize.height}
              />
            )}

            {/* Render clickable hotspots - all neutral color during exam */}
            {areas.map((area) => {
              const isSelected = selected.includes(area.id);

              // During exam: all areas are blue (neutral) unless selected (cyan)
              const strokeColor = isSelected ? "#06b6d4" : "#3b82f6"; // Cyan if selected, blue otherwise
              const fillColor = isSelected ? "#06b6d4" : "#3b82f6";
              const opacity = isSelected ? 0.35 : 0.15;

              return (
                <Rect
                  key={area.id}
                  x={(area.x / 100) * stageSize.width}
                  y={(area.y / 100) * stageSize.height}
                  width={(area.width / 100) * stageSize.width}
                  height={(area.height / 100) * stageSize.height}
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill={fillColor}
                  opacity={opacity}
                  onClick={() => handleAreaClick(area.id)}
                  onTap={() => handleAreaClick(area.id)}
                  listening={true}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Area list below canvas */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-300">
          Areas: {selected.length} selected
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {areas.map((area) => {
            const isSelected = selected.includes(area.id);

            return (
              <button
                key={area.id}
                onClick={() => handleAreaClick(area.id)}
                className={`p-3 text-sm rounded border-2 transition-all font-medium ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-500 bg-opacity-30 text-cyan-100"
                    : "border-blue-600 bg-blue-600 bg-opacity-10 text-blue-100 hover:bg-opacity-20"
                }`}
              >
                <span>{area.label || "Unlabeled"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
