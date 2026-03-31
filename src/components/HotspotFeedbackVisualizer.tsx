import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { HotspotArea } from "../types";

interface HotspotFeedbackVisualizerProps {
  areas: HotspotArea[];
  imageBase64: string;
  correctAreaIds: string[];
  userSelectedIds: string[];
}

export const HotspotFeedbackVisualizer: React.FC<
  HotspotFeedbackVisualizerProps
> = ({ areas, imageBase64, correctAreaIds, userSelectedIds }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const recalculateStageSize = () => {
    if (!naturalSize.width || !naturalSize.height) return;

    const containerWidth =
      containerRef.current?.clientWidth || naturalSize.width;
    const maxHeight = 400;
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
  };

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
  }, [naturalSize]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      recalculateStageSize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs font-semibold text-slate-300">
        📍 Áreas que debiste marcar:
      </p>
      <div
        ref={containerRef}
        className="w-full border border-slate-600/60 rounded-lg overflow-hidden bg-slate-900/40"
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          style={{ background: "#1a1a1a" }}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={stageSize.width}
                height={stageSize.height}
              />
            )}

            {/* Render feedback hotspots with color coding */}
            {areas.map((area) => {
              const isCorrect = correctAreaIds.includes(area.id);
              const isUserSelected = userSelectedIds.includes(area.id);

              // Green: correct answer
              // Red: user selected wrong
              // Orange: correct but user missed
              let strokeColor = "#94a3b8"; // Neutral gray for other areas
              let fillColor = "#475569";
              let opacity = 0.1;

              if (isCorrect) {
                if (isUserSelected) {
                  // User marked it correctly
                  strokeColor = "#10b981"; // Green
                  fillColor = "#10b981";
                  opacity = 0.35;
                } else {
                  // User missed this correct area
                  strokeColor = "#f59e0b"; // Orange/Amber
                  fillColor = "#f59e0b";
                  opacity = 0.3;
                }
              } else if (isUserSelected) {
                // User marked it wrong
                strokeColor = "#ef4444"; // Red
                fillColor = "#ef4444";
                opacity = 0.25;
              }

              return (
                <Rect
                  key={area.id}
                  x={(area.x / 100) * stageSize.width}
                  y={(area.y / 100) * stageSize.height}
                  width={(area.width / 100) * stageSize.width}
                  height={(area.height / 100) * stageSize.height}
                  stroke={strokeColor}
                  strokeWidth={3}
                  fill={fillColor}
                  opacity={opacity}
                  listening={false}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-700/50">
          <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500/40" />
          <span className="text-emerald-200">Correcta</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-700/50">
          <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-500/40" />
          <span className="text-amber-200">Faltó marcar</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-700/50">
          <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-500/40" />
          <span className="text-red-200">Incorrecta</span>
        </div>
      </div>
    </div>
  );
};
