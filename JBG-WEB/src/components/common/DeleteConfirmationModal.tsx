import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  itemDetails?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  confirmText?: string; // Default is "DELETE"
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title = "Confirm Deletion",
  message = "This action cannot be undone. Please confirm your decision.",
  itemName = "this item",
  itemDetails = [],
  onConfirm,
  onCancel,
  isDeleting,
  confirmText = "DELETE",
}) => {
  const [inputText, setInputText] = useState("");

  // Clear input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputText("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputText.toUpperCase() === confirmText.toUpperCase()) {
      onConfirm();
    }
  };

  const closeModal = () => {
    setInputText("");
    onCancel();
  };

  const isConfirmDisabled = inputText.toUpperCase() !== confirmText.toUpperCase() || isDeleting;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            {message}
          </p>
        </div>

        <div className="flex flex-col">
          <div className="custom-scrollbar h-auto overflow-y-auto px-2 pb-3">
            {/* Warning Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>

            {/* Item Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
                Item to Delete: {itemName}
              </h4>
              {itemDetails.length > 0 && (
                <div className="space-y-1">
                  {itemDetails.map((detail, index) => (
                    <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      {detail}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm">
                Once deleted, this item cannot be recovered.
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <Label>Type "{confirmText}" to confirm:</Label>
              <Input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type ${confirmText} here...`}
                disabled={isDeleting}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={closeModal} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                `Delete ${itemName}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;