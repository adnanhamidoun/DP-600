import React from "react";

interface FormattedTextProps {
  text?: string;
  className?: string;
}

const normalizeForDisplay = (value?: string) => {
  if (!value) return "";
  return value.replace(/\r\n/g, "\n").trim();
};

const isBulletLine = (line: string) => /^[-*\u2022]\s+/.test(line.trim());
const isNumberedLine = (line: string) => /^\d+\.\s+/.test(line.trim());

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  className = "",
}) => {
  const normalized = normalizeForDisplay(text);

  if (!normalized) {
    return null;
  }

  const blocks = normalized.split(/\n\s*\n/);

  return (
    <div className={className}>
      {blocks.map((rawBlock, blockIndex) => {
        const lines = rawBlock
          .split("\n")
          .map((line) => line.trimEnd())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          return null;
        }

        if (lines.every((line) => isBulletLine(line))) {
          return (
            <ul
              key={`block-bullets-${blockIndex}`}
              className="list-disc pl-6 space-y-1"
            >
              {lines.map((line, lineIndex) => (
                <li key={`bullet-${blockIndex}-${lineIndex}`}>
                  {line.replace(/^[-*\u2022]\s+/, "")}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => isNumberedLine(line))) {
          return (
            <ol
              key={`block-numbers-${blockIndex}`}
              className="list-decimal pl-6 space-y-1"
            >
              {lines.map((line, lineIndex) => (
                <li key={`number-${blockIndex}-${lineIndex}`}>
                  {line.replace(/^\d+\.\s+/, "")}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`block-text-${blockIndex}`}
            className="whitespace-pre-wrap break-words"
          >
            {lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
};
