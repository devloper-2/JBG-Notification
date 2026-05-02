import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { ExpenseCategory } from "../../services/expenseService";

interface AddExpenseModalProps {
  isOpen: boolean;
  onSave: (data: { description: string; amount: number; category_id?: number }) => void;
  onCancel: () => void;
  isSaving: boolean;
  categories?: ExpenseCategory[];
  apiErrors?: { message: string; fieldErrors: Record<string, string> } | null;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  isSaving,
  categories = [],
  apiErrors,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setAmount('');
      setCategoryId('');
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (apiErrors?.fieldErrors) {
      setErrors((prev) => ({ ...prev, ...apiErrors.fieldErrors }));
    }
  }, [apiErrors]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload: { description: string; amount: number; category_id?: number } = {
      description: description.trim(),
      amount: parseFloat(amount),
    };

    if (categoryId) {
      payload.category_id = Number(categoryId);
    }

    onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[500px] m-4">
      <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Add Expense
        </h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Enter the details for the new expense entry.
        </p>

        {apiErrors?.message && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{apiErrors.message}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="add-description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="add-description"
              type="text"
              placeholder="e.g. Electricity bill, Supplies..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
              }}
              disabled={isSaving}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          <div>
            <Label htmlFor="add-amount">
              Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="add-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
              }}
              disabled={isSaving}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="add-category">Category (Optional)</Label>
            <select
              id="add-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Expense'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddExpenseModal;
