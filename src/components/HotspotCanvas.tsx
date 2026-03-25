import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { HotspotArea } from "../types";

interface HotspotCanvasProps {
  imageBase64: string;
  areas: HotspotArea[];
  onAddArea: (x: number, y: number, width: number, height: number) => void;
}

export const HotspotCanvas: React.FC<HotspotCanvasProps> = ({
  imageBase64,
  areas,
  onAddArea,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

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

  const handleMouseDown = () => {
    const stage = stageRef.current;
    if (!stage || !image) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    setIsDrawing(true);
    setStartPos({
      x: (pos.x / stageSize.width) * 100,
      y: (pos.y / stageSize.height) * 100,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !image) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const endX = (pos.x / stageSize.width) * 100;
    const endY = (pos.y / stageSize.height) * 100;

    const x = Math.min(startPos.x, endX);
    const y = Math.min(startPos.y, endY);
    const width = Math.abs(endX - startPos.x);
    const height = Math.abs(endY - startPos.y);

    if (width > 2 && height > 2) {
      onAddArea(
        Math.round(x * 10) / 10,
        Math.round(y * 10) / 10,
        Math.round(width * 10) / 10,
        Math.round(height * 10) / 10,
      );
    }

    setIsDrawing(false);
  };

  const handleMouseMove = () => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = isDrawing
        ? "crosshair"
        : "pointer";
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full border-2 border-gray-600 rounded overflow-hidden"
    >
      <p className="text-xs text-blue-300 p-2 bg-gray-800">
        📍 Arrastra para dibujar rectángulos sobre la imagen
      </p>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
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

          {/* Dibuja rectángulos */}
          {areas.map((area) => (
            <Rect
              key={area.id}
              x={(area.x / 100) * stageSize.width}
              y={(area.y / 100) * stageSize.height}
              width={(area.width / 100) * stageSize.width}
              height={(area.height / 100) * stageSize.height}
              stroke={area.correct ? "#22c55e" : "#eab308"}
              strokeWidth={2}
              fill={area.correct ? "#22c55e" : "#eab308"}
              opacity={0.2}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
