import { useState } from 'react';
import { AngleDownIcon, AngleUpIcon, PencilIcon, TimeIcon, TrashBinIcon } from '../../icons';
import { Staff } from '../../services/staffService';
import DocumentPreviewModal from './DocumentPreviewModal';

interface StaffListProps {
  staff: Staff[];
  loading: boolean;
  error: string | null;
  selectedOutletId: number | null;
  onEditStaff: (staff: Staff) => void;
  onDeleteStaff: (staff: Staff) => void;
  onOpenTimesheet: (staff: Staff) => void;
  onRetry: () => void;
}

type SortField = 'employee_code' | 'firstname' | 'role_id' | 'salary_per_hour' | 'total_billable_amount' | 'net_payable_amount';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (amount: string | number | undefined) => `₹${Number(amount || 0).toFixed(2)}`;
const formatHours = (hours: number | string | undefined) => `${Number(hours || 0).toFixed(2)} hrs`;

export default function StaffList({
  staff,
  loading,
  error,
  selectedOutletId,
  onEditStaff,
  onDeleteStaff,
  onOpenTimesheet,
  onRetry,
}: StaffListProps) {
  const [sortField, setSortField] = useState<SortField>('firstname');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [previewDocumentName, setPreviewDocumentName] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const getRoleName = (roleId: number) => ({ 1: 'Admin', 2: 'Manager', 3: 'Staff' }[roleId] || `Role ${roleId}`);

  const sortedStaff = [...staff].sort((left, right) => {
    const getValue = (member: Staff) => {
      switch (sortField) {
        case 'employee_code':
          return (member.employee_code || '').toLowerCase();
        case 'firstname':
          return `${member.firstname} ${member.lastname}`.toLowerCase();
        case 'role_id':
          return member.role_id;
        case 'salary_per_hour':
          return Number(member.salary_per_hour || 0);
        case 'total_billable_amount':
          return Number(member.total_billable_amount || 0);
        case 'net_payable_amount':
          return Number(member.net_payable_amount || 0);
        default:
          return 0;
      }
    };

    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue < rightValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (leftValue > rightValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <div className="ml-1 flex flex-col opacity-30">
          <AngleUpIcon className="-mb-1 h-3 w-3" />
          <AngleDownIcon className="h-3 w-3" />
        </div>
      );
    }

    return (
      <div className="ml-1 flex flex-col">
        <AngleUpIcon className={`-mb-1 h-3 w-3 ${sortDirection === 'asc' ? 'text-brand-600' : 'opacity-30'}`} />
        <AngleDownIcon className={`h-3 w-3 ${sortDirection === 'desc' ? 'text-brand-600' : 'opacity-30'}`} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading staff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
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

  if (!selectedOutletId) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No outlet selected</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose an outlet to load staff payroll data.</p>
        </div>
      </div>
    );
  }

  if (!staff.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No staff found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add staff or import them in bulk for the selected outlet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('employee_code')} className="inline-flex items-center">
                  Emp ID
                  <SortIcon field="employee_code" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('firstname')} className="inline-flex items-center">
                  Staff
                  <SortIcon field="firstname" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('role_id')} className="inline-flex items-center">
                  Role
                  <SortIcon field="role_id" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('salary_per_hour')} className="inline-flex items-center">
                  Rate / Hour
                  <SortIcon field="salary_per_hour" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('total_billable_amount')} className="inline-flex items-center">
                  Billable
                  <SortIcon field="total_billable_amount" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Borrowed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <button onClick={() => handleSort('net_payable_amount')} className="inline-flex items-center">
                  Net Pay
                  <SortIcon field="net_payable_amount" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Document</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedStaff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">{member.employee_code || `#${member.id}`}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      {member.firstname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{member.firstname} {member.lastname}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{member.phone_number || 'No phone number'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{getRoleName(member.role_id)}</td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(member.salary_per_hour)}</td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatHours(member.total_hours)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(member.total_billable_amount)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-red-600 dark:text-red-400">-{formatCurrency(member.total_borrowed_amount)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(member.net_payable_amount)}</td>
                <td className="px-4 py-4 text-sm">
                  {member.documentUrl ? (
                    <button
                      onClick={() => {
                        setPreviewDocument(member.documentUrl || null);
                        setPreviewDocumentName(`${member.firstname}_${member.lastname}_document`);
                      }}
                      className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                    >
                      Preview
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onOpenTimesheet(member)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                      title="Open timesheet"
                    >
                      <TimeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditStaff(member)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                      title="Edit staff"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteStaff(member)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete staff"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentPreviewModal
        isOpen={Boolean(previewDocument)}
        documentUrl={previewDocument}
        documentName={previewDocumentName}
        onClose={() => {
          setPreviewDocument(null);
          setPreviewDocumentName('');
        }}
      />
    </>
  );
}
