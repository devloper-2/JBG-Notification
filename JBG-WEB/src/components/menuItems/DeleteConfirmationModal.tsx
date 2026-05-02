import { useState, useEffect } from "react";
import { MenuItem } from "../../types/menuItem";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  menuItem: MenuItem | null;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  menuItem,
  isDeleting,
}) => {
  const [confirmText, setConfirmText] = useState("");

  // Clear input when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (confirmText.toUpperCase() === "DELETE") {
      onConfirm();
    }
  };

  const closeModal = () => {
    setConfirmText("");
    onClose();
  };

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined): string => {
    if (!itemName) return '';
    
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || '';
    }
    
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed.hi || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || '';
        }
        return itemName;
      } catch (e) {
        return itemName;
      }
    }
    
    return '';
  };

  if (!menuItem) return null;

  const itemName = parseItemName(menuItem.item_name);
  const isConfirmDisabled = confirmText.toUpperCase() !== "DELETE" || isDeleting;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Confirm Deletion
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            This action cannot be undone. Please confirm your decision.
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

            {/* Menu Item Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold text-lg">
                    {itemName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {itemName}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    HSN: {menuItem.hsn_code}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Category: {menuItem.category || 'N/A'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Rate: ₹{parseFloat(menuItem.rate).toFixed(2)}
                    </p>
                    <p className={`text-sm ${menuItem.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {menuItem.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm">
                All data associated with this menu item, including pricing information and order history, will be permanently deleted.
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <Label>Type "DELETE" to confirm:</Label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here..."
                disabled={isDeleting}
                className="mt-2"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
                "Delete Menu Item"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;