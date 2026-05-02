import React from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Please confirm",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[520px] m-4">
      <div className="relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
        <h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{message}</p>

        <div className="flex justify-end items-center gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isProcessing}>
            {cancelLabel}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isProcessing} className="bg-brand-500 hover:bg-brand-600 text-white">
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
