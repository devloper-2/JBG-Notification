import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import {
  Staff,
  StaffTimesheetResponse,
  TimesheetEntry,
} from '../../services/staffService';
import staffService from '../../services/staffService';

interface TimesheetModalProps {
  isOpen: boolean;
  outletId: number | null;
  staff: Staff | null;
  onClose: () => void;
  onChanged: () => void;
}

interface EditFormState {
  entryId: number;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string;
  mode: string;
  note: string;
}

const formatCurrency = (amount: string | number) => `₹${Number(amount || 0).toFixed(2)}`;
const formatHours = (hours: number | string) => `${Number(hours || 0).toFixed(2)} hrs`;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Open';
  }

  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

export default function TimesheetModal({
  isOpen,
  outletId,
  staff,
  onClose,
  onChanged,
}: TimesheetModalProps) {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [data, setData] = useState<StaffTimesheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<EditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const range = getCurrentMonthRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setEditingEntry(null);
    }
  }, [isOpen, staff?.id]);

  useEffect(() => {
    const loadTimesheet = async () => {
      if (!isOpen || !outletId || !staff) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await staffService.getStaffTimesheet(outletId, staff.id, {
          startDate,
          endDate,
        });
        setData(response);
      } catch (loadError: any) {
        setError(loadError.response?.data?.message || loadError.message || 'Failed to load timesheet');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadTimesheet();
  }, [isOpen, outletId, staff, startDate, endDate]);

  const openEditor = (entry: TimesheetEntry) => {
    setEditingEntry({
      entryId: entry.id,
      work_date: entry.work_date,
      clock_in_at: toDateTimeLocalValue(entry.clock_in_at),
      clock_out_at: toDateTimeLocalValue(entry.clock_out_at),
      mode: entry.mode || '',
      note: entry.note || '',
    });
  };

  const handleSaveEntry = async () => {
    if (!outletId || !staff || !editingEntry) {
      return;
    }

    try {
      setIsSaving(true);
      await staffService.updateTimesheetEntry(outletId, staff.id, editingEntry.entryId, {
        work_date: editingEntry.work_date,
        clock_in_at: editingEntry.clock_in_at,
        clock_out_at: editingEntry.clock_out_at || null,
        mode: editingEntry.mode || undefined,
        note: editingEntry.note || undefined,
      });

      const refreshed = await staffService.getStaffTimesheet(outletId, staff.id, {
        startDate,
        endDate,
      });
      setData(refreshed);
      setEditingEntry(null);
      onChanged();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || saveError.message || 'Failed to update timesheet entry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-7xl m-4">
      <div className="relative w-full max-w-7xl overflow-hidden rounded-3xl bg-white dark:bg-gray-900">
        <div className="max-h-[88vh] overflow-y-auto p-4 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Timesheet</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {staff ? `${staff.firstname} ${staff.lastname}` : 'Staff member'} {staff?.employee_code ? `• ${staff.employee_code}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading timesheet...</div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Days Worked</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.summary.days_worked}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Hours</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatHours(data.summary.total_hours)}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Billable</div>
                  <div className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.summary.total_billable_amount)}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Borrowed</div>
                  <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(data.summary.total_borrowed_amount)}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Net Payable</div>
                  <div className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(data.summary.net_payable_amount)}</div>
                </div>
              </div>

              {editingEntry && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/10">
                  <div className="mb-4 flex items-center justify-between">
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white">Adjust Timesheet Entry</h5>
                    <button
                      onClick={() => setEditingEntry(null)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Cancel Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Work Date</label>
                      <Input
                        type="date"
                        value={editingEntry.work_date}
                        onChange={(event) => setEditingEntry((previous) => previous ? { ...previous, work_date: event.target.value } : previous)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Clock In</label>
                      <Input
                        type="datetime-local"
                        value={editingEntry.clock_in_at}
                        onChange={(event) => setEditingEntry((previous) => previous ? { ...previous, clock_in_at: event.target.value } : previous)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Clock Out</label>
                      <Input
                        type="datetime-local"
                        value={editingEntry.clock_out_at}
                        onChange={(event) => setEditingEntry((previous) => previous ? { ...previous, clock_out_at: event.target.value } : previous)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
                      <Input
                        type="text"
                        value={editingEntry.mode}
                        onChange={(event) => setEditingEntry((previous) => previous ? { ...previous, mode: event.target.value } : previous)}
                        placeholder="Fingerprint / Card"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Note</label>
                    <textarea
                      rows={3}
                      value={editingEntry.note}
                      onChange={(event) => setEditingEntry((previous) => previous ? { ...previous, note: event.target.value } : previous)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                      placeholder="Adjustment note"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEntry} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Adjustment'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1.9fr]">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-white">Daily Totals</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Billable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.dailyTotals.map((day) => (
                          <tr key={day.work_date}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{day.work_date}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatHours(day.total_hours)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(day.total_billable_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-white">Entries</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock In</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock Out</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mode</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.work_date}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(entry.clock_in_at)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(entry.clock_out_at)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatHours(entry.total_hours)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.mode || '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => openEditor(entry)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                              >
                                Adjust
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No timesheet data found</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Import attendance data or adjust the date range.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}