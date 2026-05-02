import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  DollarLineIcon,
  DownloadIcon,
  PlusIcon,
  TimeIcon,
} from '../icons';
import Button from '../components/ui/button/Button';
import AddBorrowingModal from '../components/staff/AddBorrowingModal';
import AddStaffModal from '../components/staff/AddStaffModal';
import BorrowingsTable from '../components/staff/BorrowingsTable';
import BulkImportStaffModal from '../components/staff/BulkImportStaffModal';
import DeleteBorrowingModal from '../components/staff/DeleteBorrowingModal';
import DeleteStaffModal from '../components/staff/DeleteStaffModal';
import EditStaffModal from '../components/staff/EditStaffModal';
import StaffList from '../components/staff/StaffList';
import TimesheetImportModal from '../components/staff/TimesheetImportModal';
import TimesheetModal from '../components/staff/TimesheetModal';
import outletService from '../services/outletService';
import staffService, {
  AdminStaffResponse,
  Borrowing,
  BorrowingCreateRequest,
  BorrowingsResponse,
  Staff,
  StaffCreateRequest,
  StaffImportRow,
  StaffListSummary,
  StaffUpdateRequest,
  TimesheetImportRow,
} from '../services/staffService';
import { Outlet } from '../types/outlet';
import { useAuth } from '../context/AuthContext';

type ApiFormErrors = {
  message: string;
  fieldErrors: Record<string, string>;
} | null;

type Notice = {
  type: 'success' | 'error';
  text: string;
} | null;

const emptySummary: StaffListSummary = {
  totalMinutes: 0,
  totalHours: 0,
  totalBillableAmount: '0.00',
  totalBorrowedAmount: '0.00',
  totalNetPayableAmount: '0.00',
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const toDateString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: toDateString(start),
    endDate: toDateString(now),
  };
};

const formatCurrency = (amount: string | number | undefined) => `₹${Number(amount || 0).toFixed(2)}`;
const formatHours = (hours: number | string | undefined) => `${Number(hours || 0).toFixed(2)} hrs`;

const buildFormErrors = (error: any): ApiFormErrors => {
  const responseData = error?.response?.data;
  const message = responseData?.message || error?.message || 'Request failed';
  const fieldErrors: Record<string, string> = responseData?.fieldErrors || {};
  return { message, fieldErrors };
};

const buildServerErrors = (error: any) => {
  const responseData = error?.response?.data;
  return {
    message: responseData?.message || error?.message || 'Request failed',
    errors: Array.isArray(responseData?.errors) ? responseData.errors : [],
  };
};

export default function AdminStaffPage() {
  const { user } = useAuth();
  const isOutletUser = Boolean(user && !user.is_admin);
  const outletCustomerId = user?.customer_id || null;
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(() => (isOutletUser ? outletCustomerId : null));
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffListSummary>(emptySummary);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [borrowingsTotal, setBorrowingsTotal] = useState('0.00');

  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingBorrowings, setLoadingBorrowings] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [borrowingsError, setBorrowingsError] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isTimesheetImportModalOpen, setIsTimesheetImportModalOpen] = useState(false);
  const [isAddBorrowingModalOpen, setIsAddBorrowingModalOpen] = useState(false);
  const [isDeleteBorrowingModalOpen, setIsDeleteBorrowingModalOpen] = useState(false);

  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [isImportingStaff, setIsImportingStaff] = useState(false);
  const [isImportingTimesheet, setIsImportingTimesheet] = useState(false);
  const [isSavingBorrowing, setIsSavingBorrowing] = useState(false);
  const [isDeletingBorrowing, setIsDeletingBorrowing] = useState(false);

  const [apiErrors, setApiErrors] = useState<ApiFormErrors>(null);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [bulkImportMessage, setBulkImportMessage] = useState<string | null>(null);
  const [timesheetImportErrors, setTimesheetImportErrors] = useState<string[]>([]);
  const [timesheetImportMessage, setTimesheetImportMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const invalidRange = Boolean(startDate && endDate && startDate > endDate);

  const netPayByUserId = useMemo(
    () => Object.fromEntries(staffList.map((staff) => [staff.id, staff.net_payable_amount || '0.00'])),
    [staffList]
  );

  const selectedOutletName = useMemo(
    () => {
      if (isOutletUser) {
        return 'My Outlet';
      }
      return outlets.find((outlet) => outlet.id === selectedOutletId)?.name || 'Selected Outlet';
    },
    [outlets, selectedOutletId, isOutletUser]
  );

  const resetImportFeedback = () => {
    setBulkImportErrors([]);
    setBulkImportMessage(null);
    setTimesheetImportErrors([]);
    setTimesheetImportMessage(null);
  };

  const loadOutlets = useCallback(async () => {
    if (isOutletUser) {
      if (outletCustomerId) {
        setSelectedOutletId(outletCustomerId);
      }
      setOutlets([]);
      return;
    }

    try {
      const outletData = await outletService.getOutlets();
      setOutlets(outletData);
      if (outletData.length && !selectedOutletId) {
        setSelectedOutletId(outletData[0].id);
      }
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Failed to load outlets' });
    }
  }, [selectedOutletId, isOutletUser, outletCustomerId]);

  useEffect(() => {
    if (isOutletUser && outletCustomerId) {
      setSelectedOutletId(outletCustomerId);
    }
  }, [isOutletUser, outletCustomerId]);

  const loadStaff = useCallback(async () => {
    if (!selectedOutletId || invalidRange) {
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);
      const response: AdminStaffResponse = await staffService.getStaffByOutlet(selectedOutletId, {
        startDate,
        endDate,
      });
      setStaffList(response.data || []);
      setStaffSummary(response.summary || emptySummary);
    } catch (error: any) {
      setStaffError(error?.response?.data?.message || error.message || 'Failed to load staff payroll data');
      setStaffList([]);
      setStaffSummary(emptySummary);
    } finally {
      setLoadingStaff(false);
    }
  }, [selectedOutletId, startDate, endDate, invalidRange]);

  const loadBorrowings = useCallback(async () => {
    if (!selectedOutletId || invalidRange) {
      return;
    }

    try {
      setLoadingBorrowings(true);
      setBorrowingsError(null);
      const response: BorrowingsResponse = await staffService.getBorrowingsByOutlet(selectedOutletId, {
        startDate,
        endDate,
      });
      setBorrowings(response.data || []);
      setBorrowingsTotal(response.totalAmount || '0.00');
    } catch (error: any) {
      setBorrowingsError(error?.response?.data?.message || error.message || 'Failed to load borrowings');
      setBorrowings([]);
      setBorrowingsTotal('0.00');
    } finally {
      setLoadingBorrowings(false);
    }
  }, [selectedOutletId, startDate, endDate, invalidRange]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  useEffect(() => {
    if (!selectedOutletId) {
      setStaffList([]);
      setBorrowings([]);
      setStaffSummary(emptySummary);
      return;
    }

    if (invalidRange) {
      setStaffError('End date must be after or equal to start date.');
      setBorrowingsError('End date must be after or equal to start date.');
      return;
    }

    loadStaff();
    loadBorrowings();
  }, [selectedOutletId, startDate, endDate, invalidRange, loadStaff, loadBorrowings]);

  const refreshAll = useCallback(() => {
    loadStaff();
    loadBorrowings();
  }, [loadStaff, loadBorrowings]);

  const handleSaveNewStaff = async (data: StaffCreateRequest) => {
    if (!selectedOutletId) {
      return;
    }

    try {
      setIsSavingStaff(true);
      setApiErrors(null);
      await staffService.addStaff(selectedOutletId, data);
      setIsAddModalOpen(false);
      setNotice({ type: 'success', text: 'Staff member added successfully.' });
      await loadStaff();
    } catch (error: any) {
      setApiErrors(buildFormErrors(error));
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleSaveEditedStaff = async (data: StaffUpdateRequest) => {
    if (!selectedOutletId || !selectedStaff) {
      return;
    }

    try {
      setIsSavingStaff(true);
      setApiErrors(null);
      await staffService.updateStaff(selectedOutletId, selectedStaff.id, data);
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      setNotice({ type: 'success', text: 'Staff member updated successfully.' });
      await loadStaff();
    } catch (error: any) {
      setApiErrors(buildFormErrors(error));
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedOutletId || !selectedStaff) {
      return;
    }

    try {
      setIsDeletingStaff(true);
      await staffService.deleteStaff(selectedOutletId, selectedStaff.id);
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      setNotice({ type: 'success', text: 'Staff member deleted successfully.' });
      await refreshAll();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || error.message || 'Failed to delete staff member.' });
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const handleBulkImportStaff = async (rows: StaffImportRow[]) => {
    if (!selectedOutletId) {
      return;
    }

    try {
      setIsImportingStaff(true);
      setBulkImportErrors([]);
      setBulkImportMessage(null);
      const response = await staffService.bulkImportStaff(selectedOutletId, rows);
      setIsBulkImportModalOpen(false);
      setNotice({ type: 'success', text: response.message || 'Staff imported successfully.' });
      await loadStaff();
    } catch (error: any) {
      const parsed = buildServerErrors(error);
      setBulkImportErrors(parsed.errors);
      setBulkImportMessage(parsed.message);
    } finally {
      setIsImportingStaff(false);
    }
  };

  const handleImportTimesheet = async (rows: TimesheetImportRow[]) => {
    if (!selectedOutletId) {
      return;
    }

    try {
      setIsImportingTimesheet(true);
      setTimesheetImportErrors([]);
      setTimesheetImportMessage(null);
      const response = await staffService.importTimesheet(selectedOutletId, rows);
      setIsTimesheetImportModalOpen(false);
      setNotice({
        type: 'success',
        text: response.warnings?.length
          ? `${response.message}. ${response.warnings.length} warning(s) were skipped during import.`
          : response.message || 'Timesheet imported successfully.',
      });
      await refreshAll();
    } catch (error: any) {
      const parsed = buildServerErrors(error);
      setTimesheetImportErrors(parsed.errors);
      setTimesheetImportMessage(parsed.message);
    } finally {
      setIsImportingTimesheet(false);
    }
  };

  const handleAddBorrowing = async (data: BorrowingCreateRequest) => {
    if (!selectedOutletId) {
      return;
    }

    try {
      setIsSavingBorrowing(true);
      await staffService.addBorrowing(selectedOutletId, data);
      setIsAddBorrowingModalOpen(false);
      setNotice({ type: 'success', text: 'Borrowing added successfully.' });
      await refreshAll();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || error.message || 'Failed to add borrowing.' });
    } finally {
      setIsSavingBorrowing(false);
    }
  };

  const handleDeleteBorrowing = async () => {
    if (!selectedOutletId || !selectedBorrowing) {
      return;
    }

    try {
      setIsDeletingBorrowing(true);
      await staffService.deleteBorrowing(selectedOutletId, selectedBorrowing.id);
      setIsDeleteBorrowingModalOpen(false);
      setSelectedBorrowing(null);
      setNotice({ type: 'success', text: 'Borrowing deleted successfully.' });
      await refreshAll();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.response?.data?.message || error.message || 'Failed to delete borrowing.' });
    } finally {
      setIsDeletingBorrowing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isOutletUser ? 'Staff | JBG' : 'Admin Staff | JBG'}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Payroll</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {isOutletUser
                ? 'Manage your outlet staff, import attendance machine data, review timesheets, and track borrowings.'
                : 'Manage staff, import attendance machine data, review timesheets, and track borrowings by outlet.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { resetImportFeedback(); setIsBulkImportModalOpen(true); }} disabled={!selectedOutletId} startIcon={<DownloadIcon className="h-4 w-4" />}>
              Import Staff
            </Button>
            <Button size="sm" variant="outline" onClick={() => { resetImportFeedback(); setIsTimesheetImportModalOpen(true); }} disabled={!selectedOutletId} startIcon={<TimeIcon className="h-4 w-4" />}>
              Import Timesheet
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAddBorrowingModalOpen(true)} disabled={!selectedOutletId || !staffList.length} startIcon={<DollarLineIcon className="h-4 w-4" />}>
              Add Borrowing
            </Button>
            <Button size="sm" onClick={() => { setApiErrors(null); setIsAddModalOpen(true); }} disabled={!selectedOutletId} startIcon={<PlusIcon className="h-4 w-4" />}>
              Add Staff
            </Button>
          </div>
        </div>

        {notice && (
          <div className={`rounded-xl border p-4 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400'}`}>
            {notice.text}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className={`grid grid-cols-1 gap-4 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {!isOutletUser && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Outlet</label>
                <select
                  value={selectedOutletId || ''}
                  onChange={(event) => setSelectedOutletId(event.target.value ? Number(event.target.value) : null)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Select outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const range = getCurrentMonthRange();
                  setStartDate(range.startDate);
                  setEndDate(range.endDate);
                }}
              >
                Reset To Current Month
              </Button>
            </div>
          </div>

          {invalidRange && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              End date must be after or equal to start date.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Staff Count</div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{staffList.length}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{selectedOutletName}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Hours</div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatHours(staffSummary.totalHours)}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Filtered period</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Billable Payroll</div>
            <div className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(staffSummary.totalBillableAmount)}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Gross amount</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Borrowed Amount</div>
            <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(borrowingsTotal)}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Salary advances</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Net Payroll</div>
            <div className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(staffSummary.totalNetPayableAmount)}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">After borrowings</div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Payroll Table</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rate, hours, billable amount, and net salary by employee.</p>
            </div>
          </div>
          <StaffList
            staff={staffList}
            loading={loadingStaff}
            error={staffError}
            selectedOutletId={selectedOutletId}
            onEditStaff={(staff) => {
              const fallbackEmail = user && staff.id === user.id ? user.email : undefined;
              setSelectedStaff({ ...staff, email: staff.email || fallbackEmail });
              setApiErrors(null);
              setIsEditModalOpen(true);
            }}
            onDeleteStaff={(staff) => {
              setSelectedStaff(staff);
              setIsDeleteModalOpen(true);
            }}
            onOpenTimesheet={(staff) => {
              setSelectedStaff(staff);
              setIsTimesheetModalOpen(true);
            }}
            onRetry={refreshAll}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Borrowings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track advances taken by staff and keep the net payable amount accurate.</p>
            </div>
          </div>
          <BorrowingsTable
            borrowings={borrowings}
            loading={loadingBorrowings}
            error={borrowingsError}
            netPayByUserId={netPayByUserId}
            onDeleteBorrowing={(borrowing) => {
              setSelectedBorrowing(borrowing);
              setIsDeleteBorrowingModalOpen(true);
            }}
            onRetry={loadBorrowings}
          />
        </section>
      </div>

      <AddStaffModal
        isOpen={isAddModalOpen}
        onSave={handleSaveNewStaff}
        onCancel={() => {
          setIsAddModalOpen(false);
          setApiErrors(null);
        }}
        isSaving={isSavingStaff}
        apiErrors={apiErrors}
      />

      <EditStaffModal
        isOpen={isEditModalOpen}
        staff={selectedStaff}
        onSave={handleSaveEditedStaff}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
          setApiErrors(null);
        }}
        isSaving={isSavingStaff}
        apiErrors={apiErrors}
      />

      <DeleteStaffModal
        isOpen={isDeleteModalOpen}
        staff={selectedStaff}
        onConfirm={handleDeleteStaff}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedStaff(null);
        }}
        isDeleting={isDeletingStaff}
      />

      <TimesheetModal
        isOpen={isTimesheetModalOpen}
        outletId={selectedOutletId}
        staff={selectedStaff}
        onClose={() => {
          setIsTimesheetModalOpen(false);
          setSelectedStaff(null);
        }}
        onChanged={refreshAll}
      />

      <BulkImportStaffModal
        isOpen={isBulkImportModalOpen}
        isImporting={isImportingStaff}
        serverErrors={bulkImportErrors}
        serverMessage={bulkImportMessage}
        onClose={() => {
          setIsBulkImportModalOpen(false);
          setBulkImportErrors([]);
          setBulkImportMessage(null);
        }}
        onImport={handleBulkImportStaff}
      />

      <TimesheetImportModal
        isOpen={isTimesheetImportModalOpen}
        isImporting={isImportingTimesheet}
        serverErrors={timesheetImportErrors}
        serverMessage={timesheetImportMessage}
        onClose={() => {
          setIsTimesheetImportModalOpen(false);
          setTimesheetImportErrors([]);
          setTimesheetImportMessage(null);
        }}
        onImport={handleImportTimesheet}
      />

      <AddBorrowingModal
        isOpen={isAddBorrowingModalOpen}
        staffOptions={staffList}
        onSave={handleAddBorrowing}
        onCancel={() => setIsAddBorrowingModalOpen(false)}
        isSaving={isSavingBorrowing}
      />

      <DeleteBorrowingModal
        isOpen={isDeleteBorrowingModalOpen}
        borrowing={selectedBorrowing}
        isDeleting={isDeletingBorrowing}
        onCancel={() => {
          setIsDeleteBorrowingModalOpen(false);
          setSelectedBorrowing(null);
        }}
        onConfirm={handleDeleteBorrowing}
      />
    </>
  );
}