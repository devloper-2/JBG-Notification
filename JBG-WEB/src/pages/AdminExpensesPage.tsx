import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import expenseService, { Expense, ExpenseCreateRequest, ExpenseUpdateRequest } from '../services/expenseService';
import outletService from '../services/outletService';
import { Outlet } from '../types/outlet';
import DatePicker from '../components/form/date-picker';
import ExpensesList from '../components/expenses/ExpensesList';
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import EditExpenseModal from '../components/expenses/EditExpenseModal';
import DeleteExpenseModal from '../components/expenses/DeleteExpenseModal';

const AdminExpensesPage: React.FC = () => {
  // Outlets & filters
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Expenses data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('0.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRUD modal state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiErrors, setApiErrors] = useState<{
    message: string;
    fieldErrors: Record<string, string>;
  } | null>(null);

  // Load outlets on mount
  useEffect(() => {
    loadOutlets();
  }, []);

  // Load expenses when outlet or dates change
  useEffect(() => {
    if (selectedOutletId) {
      loadExpenses();
    } else {
      setExpenses([]);
      setTotalAmount('0.00');
    }
  }, [selectedOutletId, startDate, endDate]);

  const loadOutlets = async () => {
    try {
      const outletsData = await outletService.getOutlets();
      setOutlets(outletsData);
      if (outletsData.length > 0) {
        setSelectedOutletId(outletsData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading outlets:', err);
      setError('Failed to load outlets');
    }
  };

  const loadExpenses = useCallback(async () => {
    if (!selectedOutletId) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await expenseService.getExpensesByOutlet(selectedOutletId, params);
      setExpenses(response.data || []);
      setTotalAmount(response.totalAmount || '0.00');
    } catch (err: any) {
      console.error('Error loading expenses:', err);
      setError(err.message || 'Failed to load expenses');
      setExpenses([]);
      setTotalAmount('0.00');
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId, startDate, endDate]);

  const formatCurrency = (amount: string | number) =>
    `₹${parseFloat(amount.toString()).toFixed(2)}`;

  const getDateRangeLabel = () => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return 'All Dates';
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // ─── Add handlers ────────────────────────────────────────────────────────────
  const handleAddExpense = () => {
    setApiErrors(null);
    setIsAddModalOpen(true);
  };

  const handleSaveNewExpense = async (data: ExpenseCreateRequest) => {
    if (!selectedOutletId) return;
    try {
      setIsSaving(true);
      setApiErrors(null);
      await expenseService.addExpense(selectedOutletId, data);
      setIsAddModalOpen(false);
      loadExpenses();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to add expense';
      setApiErrors({ message, fieldErrors: err.response?.data?.fieldErrors || {} });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddModalOpen(false);
    setApiErrors(null);
  };

  // ─── Edit handlers ────────────────────────────────────────────────────────────
  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleSaveExpense = async (data: ExpenseUpdateRequest) => {
    if (!selectedOutletId || !selectedExpense) return;
    try {
      setIsSaving(true);
      setApiErrors(null);
      await expenseService.updateExpense(selectedOutletId, selectedExpense.id, data);
      setIsEditModalOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update expense';
      setApiErrors({ message, fieldErrors: err.response?.data?.fieldErrors || {} });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedExpense(null);
    setApiErrors(null);
  };

  // ─── Delete handlers ──────────────────────────────────────────────────────────
  const handleDeleteExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedOutletId || !selectedExpense) return;
    try {
      setIsDeleting(true);
      await expenseService.deleteExpense(selectedOutletId, selectedExpense.id);
      setIsDeleteModalOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedExpense(null);
  };

  // ─── Export helpers ───────────────────────────────────────────────────────────
  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportDetailedReport = () => {
    if (expenses.length === 0) return;
    const outletName = outlets.find((o) => o.id === selectedOutletId)?.name || 'Unknown';
    const csvContent = [
      `Detailed Expenses Report - ${outletName}`,
      `Date Range: ${getDateRangeLabel()}`,
      `Generated on: ${new Date().toLocaleString()}`,
      `Total Entries: ${expenses.length}`,
      '',
      'ID,Description,Amount,Date',
      ...expenses.map((e) => [e.id, `"${e.description}"`, e.amount, `"${formatDate(e.created_at)}"`].join(',')),
      '',
      'EXPENSE SUMMARY',
      `Total Entries:,${expenses.length}`,
      `Total Amount:,${formatCurrency(totalAmount)}`,
    ].join('\n');
    triggerDownload(
      csvContent,
      `detailed_expenses_${outletName.replace(/\s+/g, '_').toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.csv`
    );
  };

  const exportToCSV = () => {
    if (expenses.length === 0) return;
    const outletName = outlets.find((o) => o.id === selectedOutletId)?.name || 'Unknown';
    const csvContent = [
      `Expenses Export - ${outletName}`,
      `Date Range: ${getDateRangeLabel()}`,
      `Generated on: ${new Date().toLocaleString()}`,
      '',
      'ID,Description,Amount,Date',
      ...expenses.map((e) => [e.id, `"${e.description}"`, e.amount, `"${formatDate(e.created_at)}"`].join(',')),
    ].join('\n');
    triggerDownload(
      csvContent,
      `expenses_${outletName.replace(/\s+/g, '_').toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.csv`
    );
  };

  return (
    <>
      <Helmet>
        <title>Admin Expenses | JBG</title>
      </Helmet>

      <div className="space-y-6">
        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Expenses Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View, manage and export expenses across all outlets
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add Expense */}
            <button
              onClick={handleAddExpense}
              disabled={!selectedOutletId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Expense
            </button>

            {/* Detailed Report */}
            <button
              onClick={exportDetailedReport}
              disabled={loading || expenses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Detailed Report
            </button>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              disabled={loading || expenses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Outlet Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Outlet
              </label>
              <select
                value={selectedOutletId || ''}
                onChange={(e) => setSelectedOutletId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select an outlet...</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <DatePicker
              id="start-date"
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

            {/* End Date */}
            <DatePicker
              id="end-date"
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
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* ── Quick Stats ───────────────────────────────────────────────────────── */}
        {selectedOutletId && !loading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Entries</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {expenses.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                -{formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        )}

        {/* ── Expenses List ─────────────────────────────────────────────────────── */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 lg:p-4">
          <ExpensesList
            expenses={expenses}
            loading={loading}
            error={error}
            selectedOutletId={selectedOutletId}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onRetry={loadExpenses}
          />
        </div>

        {/* ── Summary Box ───────────────────────────────────────────────────────── */}
        {selectedOutletId && expenses.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-red-200 dark:border-gray-600 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Expenses Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entries
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {expenses.length}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onSave={handleSaveNewExpense}
        onCancel={handleCancelAdd}
        isSaving={isSaving}
        apiErrors={apiErrors}
      />

      <EditExpenseModal
        isOpen={isEditModalOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
        apiErrors={apiErrors}
      />

      <DeleteExpenseModal
        isOpen={isDeleteModalOpen}
        expense={selectedExpense}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default AdminExpensesPage;

