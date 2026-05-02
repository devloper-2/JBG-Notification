import { TrashBinIcon } from '../../icons';
import { Borrowing } from '../../services/staffService';

interface BorrowingsTableProps {
  borrowings: Borrowing[];
  loading: boolean;
  error: string | null;
  netPayByUserId: Record<number, string>;
  onDeleteBorrowing: (borrowing: Borrowing) => void;
  onRetry: () => void;
}

const formatCurrency = (amount: string | number) => `₹${Number(amount || 0).toFixed(2)}`;

export default function BorrowingsTable({
  borrowings,
  loading,
  error,
  netPayByUserId,
  onDeleteBorrowing,
  onRetry,
}: BorrowingsTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading borrowings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!borrowings.length) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No borrowings in this period</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a borrowing when staff take an advance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Borrow Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Note</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Net Salary</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {borrowings.map((borrowing) => (
            <tr key={borrowing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{borrowing.staff_name || 'Unknown'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{borrowing.employee_code || 'No employee ID'}</div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{borrowing.borrow_date}</td>
              <td className="px-4 py-4 text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(borrowing.amount)}</td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{borrowing.note || '—'}</td>
              <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(netPayByUserId[borrowing.user_id] || 0)}</td>
              <td className="px-4 py-4 text-right">
                <button
                  onClick={() => onDeleteBorrowing(borrowing)}
                  className="inline-flex rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Delete borrowing"
                >
                  <TrashBinIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
