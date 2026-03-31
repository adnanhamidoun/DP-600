import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-md w-full mx-0 sm:mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-3 text-gray-50">{title}</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors font-medium text-white ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
