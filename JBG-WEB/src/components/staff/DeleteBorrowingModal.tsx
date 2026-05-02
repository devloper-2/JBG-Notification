import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import { Borrowing } from '../../services/staffService';

interface DeleteBorrowingModalProps {
  isOpen: boolean;
  borrowing: Borrowing | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const formatCurrency = (amount: string | number) => `₹${Number(amount || 0).toFixed(2)}`;

export default function DeleteBorrowingModal({
  isOpen,
  borrowing,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteBorrowingModalProps) {
  if (!borrowing) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          Delete Borrowing
        </h4>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          This will remove the borrowing record from payroll calculations for the selected period.
        </p>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{borrowing.staff_name || 'Unknown staff'}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{borrowing.employee_code || 'No employee ID'}</div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Borrow Date</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{borrowing.borrow_date}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Amount</div>
              <div className="mt-1 font-medium text-red-600 dark:text-red-400">-{formatCurrency(borrowing.amount)}</div>
            </div>
          </div>
          {borrowing.note && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-700 dark:text-gray-200">Note:</span> {borrowing.note}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Borrowing'}
          </button>
        </div>
      </div>
    </Modal>
  );
}