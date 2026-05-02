import { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { BorrowingCreateRequest, Staff } from '../../services/staffService';

interface AddBorrowingModalProps {
  isOpen: boolean;
  staffOptions: Staff[];
  onSave: (data: BorrowingCreateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const getToday = () => new Date().toISOString().split('T')[0];

export default function AddBorrowingModal({
  isOpen,
  staffOptions,
  onSave,
  onCancel,
  isSaving,
}: AddBorrowingModalProps) {
  const [userId, setUserId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [borrowDate, setBorrowDate] = useState(getToday());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setUserId('');
      setAmount('');
      setBorrowDate(getToday());
      setNote('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!userId) {
      nextErrors.user_id = 'Staff member is required.';
    }
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Amount must be greater than 0.';
    }
    if (!borrowDate) {
      nextErrors.borrow_date = 'Borrow date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    onSave({
      user_id: Number(userId),
      amount: Number(amount),
      borrow_date: borrowDate,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[520px] m-4">
      <div className="no-scrollbar relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Add Borrowing
        </h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Record money borrowed by a staff member so the net payable salary stays accurate.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="borrowing-user">Staff Member</Label>
            <select
              id="borrowing-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value ? Number(event.target.value) : '')}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="">Select staff member</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstname} {staff.lastname} {staff.employee_code ? `(${staff.employee_code})` : ''}
                </option>
              ))}
            </select>
            {errors.user_id && <p className="mt-1 text-xs text-red-500">{errors.user_id}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="borrowing-amount">Amount</Label>
              <Input
                id="borrowing-amount"
                type="number"
                min="0"
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isSaving}
                error={Boolean(errors.amount)}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>

            <div>
              <Label htmlFor="borrowing-date">Borrow Date</Label>
              <Input
                id="borrowing-date"
                type="date"
                value={borrowDate}
                onChange={(event) => setBorrowDate(event.target.value)}
                disabled={isSaving}
                error={Boolean(errors.borrow_date)}
              />
              {errors.borrow_date && <p className="mt-1 text-xs text-red-500">{errors.borrow_date}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="borrowing-note">Note</Label>
            <textarea
              id="borrowing-note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              placeholder="Optional reason or repayment note"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Borrowing'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
