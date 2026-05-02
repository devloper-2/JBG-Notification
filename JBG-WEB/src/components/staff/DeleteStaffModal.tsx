import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { Staff } from "../../services/staffService";

interface DeleteStaffModalProps {
  isOpen: boolean;
  staff: Staff | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteStaffModal: React.FC<DeleteStaffModalProps> = ({
  isOpen,
  staff,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!staff) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h4 className="mb-2 text-center text-2xl font-semibold text-gray-800 dark:text-white/90">
          Delete Staff Member
        </h4>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete this staff member? This action cannot be undone.
        </p>

        {/* Staff Summary */}
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  {staff.firstname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {staff.firstname} {staff.lastname}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {staff.employee_code ? `Emp ID: ${staff.employee_code}` : staff.phone_number || 'No phone number'}
                </p>
              </div>
            </div>
            <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              ID #{staff.id}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-900"
          >
            {isDeleting ? 'Deleting...' : 'Delete Staff'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteStaffModal;
