import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import DatePicker from '../components/form/date-picker';
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import EditExpenseModal from '../components/expenses/EditExpenseModal';
import DeleteExpenseModal from '../components/expenses/DeleteExpenseModal';
import ExpensesList from '../components/expenses/ExpensesList';
import expenseService, {
  Expense,
  ExpenseCategory,
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
} from '../services/expenseService';
import { useAuth } from '../context/AuthContext';
import Input from '../components/form/input/InputField';
import Button from '../components/ui/button/Button';

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const customerId = user?.customer_id || 0;

  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [apiErrors, setApiErrors] = useState<{
    message: string;
    fieldErrors: Record<string, string>;
  } | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  const loadExpenses = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoadingExpenses(true);
      setExpensesError(null);

      const params: {
        startDate?: string;
        endDate?: string;
      } = {};

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await expenseService.getOutletExpenses(customerId, params);
      setExpenses(response.success && Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load expenses';
      setExpensesError(message);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, [customerId, startDate, endDate]);

  const loadCategories = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoadingCategories(true);
      setCategoryError(null);
      const response = await expenseService.getExpenseCategories(customerId);
      setCategories(response.data || []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load categories';
      setCategoryError(message);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    loadExpenses();
    loadCategories();
  }, [customerId, loadExpenses, loadCategories]);

  const formatCurrency = (amount: string | number) =>
    `₹${parseFloat(amount.toString()).toFixed(2)}`;

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
  }, [expenses]);

  const handleAddExpense = () => {
    setApiErrors(null);
    setIsAddModalOpen(true);
  };

  const handleSaveNewExpense = async (data: ExpenseCreateRequest & { category_id?: number }) => {
    if (!customerId) return;

    try {
      setIsSavingExpense(true);
      setApiErrors(null);

      await expenseService.addOutletExpense({
        customer_id: customerId,
        description: data.description,
        amount: data.amount,
        category_id: data.category_id,
      });

      setIsAddModalOpen(false);
      loadExpenses();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to add expense';
      setApiErrors({ message, fieldErrors: err.response?.data?.fieldErrors || {} });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleSaveExpense = async (data: ExpenseUpdateRequest) => {
    if (!selectedExpense) return;

    try {
      setIsSavingExpense(true);
      setApiErrors(null);
      await expenseService.updateOutletExpense(selectedExpense.id, data);
      setIsEditModalOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update expense';
      setApiErrors({ message, fieldErrors: err.response?.data?.fieldErrors || {} });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!selectedExpense) return;

    try {
      setIsDeletingExpense(true);
      await expenseService.deleteOutletExpense(selectedExpense.id);
      setIsDeleteModalOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleAddCategory = async () => {
    if (!customerId || !newCategoryName.trim()) return;

    try {
      setIsSavingCategory(true);
      setCategoryError(null);
      await expenseService.addExpenseCategory(customerId, newCategoryName.trim());
      setNewCategoryName('');
      loadCategories();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to add category';
      setCategoryError(message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const startEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const handleSaveCategory = async () => {
    if (!customerId || !editingCategory || !editCategoryName.trim()) return;

    try {
      setIsSavingCategory(true);
      setCategoryError(null);
      await expenseService.updateExpenseCategory(customerId, editingCategory.id, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName('');
      loadCategories();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update category';
      setCategoryError(message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (!customerId) return;

    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) return;

    try {
      setIsSavingCategory(true);
      setCategoryError(null);
      await expenseService.deleteExpenseCategory(customerId, category.id);
      loadCategories();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to delete category';
      setCategoryError(message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  if (!customerId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
        Customer profile is missing. Please login again to manage expenses.
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Expenses | JBG</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track outlet expenses and maintain expense categories.
            </p>
          </div>

          {activeTab === 'expenses' ? (
            <Button onClick={handleAddExpense}>Add Expense</Button>
          ) : null}
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'expenses'
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'categories'
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Categories
          </button>
        </div>

        {activeTab === 'expenses' ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DatePicker
                id="outlet-expenses-start-date"
                label="Start Date"
                placeholder="Select start date"
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    const d = selectedDates[0];
                    setStartDate(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    );
                  } else {
                    setStartDate('');
                  }
                }}
              />

              <DatePicker
                id="outlet-expenses-end-date"
                label="End Date"
                placeholder="Select end date"
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    const d = selectedDates[0];
                    setEndDate(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    );
                  } else {
                    setEndDate('');
                  }
                }}
              />

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-11 w-full rounded-lg bg-gray-600 px-4 text-sm font-medium text-white transition hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Entries</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {!loadingExpenses && !expensesError && expenses.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Recent Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(expenses.map((e) => e.category_id).filter(Boolean))).map((categoryId) => (
                    <span
                      key={categoryId}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      {categoryMap[Number(categoryId)] || `Category #${categoryId}`}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <ExpensesList
              expenses={expenses}
              loading={loadingExpenses}
              error={expensesError}
              selectedOutletId={customerId}
              categoryMap={categoryMap}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onRetry={loadExpenses}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Add Category</h3>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="text"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isSavingCategory}
                />
                <Button onClick={handleAddCategory} disabled={isSavingCategory || !newCategoryName.trim()}>
                  {isSavingCategory ? 'Saving...' : 'Add Category'}
                </Button>
              </div>
              {categoryError ? (
                <p className="mt-3 text-sm text-red-500">{categoryError}</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Categories</h3>
              </div>

              {loadingCategories ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading categories...</p>
              ) : categories.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No categories found.</p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <div key={category.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID #{category.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditCategory(category)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingCategory ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                <h4 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">Edit Category</h4>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    disabled={isSavingCategory}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveCategory} disabled={isSavingCategory || !editCategoryName.trim()}>
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditCategoryName('');
                      }}
                      disabled={isSavingCategory}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onSave={handleSaveNewExpense}
        onCancel={() => {
          setIsAddModalOpen(false);
          setApiErrors(null);
        }}
        isSaving={isSavingExpense}
        categories={categories}
        apiErrors={apiErrors}
      />

      <EditExpenseModal
        isOpen={isEditModalOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedExpense(null);
          setApiErrors(null);
        }}
        isSaving={isSavingExpense}
        categories={categories}
        apiErrors={apiErrors}
      />

      <DeleteExpenseModal
        isOpen={isDeleteModalOpen}
        expense={selectedExpense}
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedExpense(null);
        }}
        isDeleting={isDeletingExpense}
      />
    </>
  );
};

export default ExpensesPage;
