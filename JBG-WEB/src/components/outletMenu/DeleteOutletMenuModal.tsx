import { OutletMenuItem } from '../../types/outletMenu';
import { Modal } from '../ui/modal';

interface DeleteOutletMenuModalProps {
  isOpen: boolean;
  outletMenu: OutletMenuItem | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteOutletMenuModal: React.FC<DeleteOutletMenuModalProps> = ({
  isOpen,
  outletMenu,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  // Helper function to parse menu item name from JSON string
  const parseMenuItemName = (itemName: string): string => {
    try {
      const parsed = JSON.parse(itemName);
      return parsed.default || parsed.en || itemName;
    } catch {
      return itemName;
    }
  };

  if (!isOpen || !outletMenu) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md mx-4">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Delete Outlet Menu Item
          </h2>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-center text-gray-900 dark:text-white mb-4">
            Are you sure you want to delete this outlet menu item?
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu Item:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {parseMenuItemName(outletMenu.menu_item.item_name)}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outlet:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {outletMenu.outlet.name}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Price:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  ₹{parseFloat(outletMenu.custom_price).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            This action cannot be undone. The outlet menu item will be permanently removed.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isDeleting}
          >
            {isDeleting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteOutletMenuModal;