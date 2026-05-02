import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import {
  ParsedTimesheetImportRow,
  downloadTimesheetImportSample,
  parseTimesheetImportFile,
} from '../../utils/staffImport';

interface TimesheetImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  serverErrors?: string[];
  serverMessage?: string | null;
  onClose: () => void;
  onImport: (rows: ParsedTimesheetImportRow[]) => void;
}

export default function TimesheetImportModal({
  isOpen,
  isImporting,
  serverErrors,
  serverMessage,
  onClose,
  onImport,
}: TimesheetImportModalProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedTimesheetImportRow[]>([]);
  const [preview, setPreview] = useState<ParsedTimesheetImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setRows([]);
      setPreview([]);
      setErrors([]);
      setIsParsing(false);
    }
  }, [isOpen]);

  const combinedErrors = useMemo(() => [...errors, ...(serverErrors || [])], [errors, serverErrors]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseTimesheetImportFile(file);
      setRows(parsed.rows);
      setPreview(parsed.preview);
      setErrors(parsed.errors);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl m-4">
      <div className="no-scrollbar relative w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Import Timesheet</h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Upload machine attendance data in CSV or XLSX format. The browser parses the file locally before sending only the rows to the backend.
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={downloadTimesheetImportSample}>
            Download Sample
          </Button>
          <label className="inline-flex cursor-pointer rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Choose File
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          </label>
          {fileName && <span className="text-sm text-gray-600 dark:text-gray-300">{fileName}</span>}
        </div>

        {isParsing && <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Parsing file...</p>}
        {serverMessage && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">{serverMessage}</div>}

        {combinedErrors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Validation failed. Download the sample and match the same format.</p>
            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-300">
              {combinedErrors.slice(0, 10).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {preview.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
              Previewing {preview.length} of {rows.length} parsed rows
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Emp ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.map((row, index) => (
                    <tr key={`${row.employee_code || row.employee_name || 'row'}-${index}`}>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.employee_code || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.employee_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.time}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.direction}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.mode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onImport(rows)}
            disabled={isImporting || isParsing || !rows.length || combinedErrors.length > 0}
          >
            {isImporting ? 'Importing...' : `Import ${rows.length || ''} Rows`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
