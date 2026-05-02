import * as XLSX from 'xlsx';

export interface ParsedImportResult<T> {
  rows: T[];
  preview: T[];
  errors: string[];
  headers: string[];
}

export interface ParsedStaffImportRow {
  firstname: string;
  lastname: string;
  employee_code?: string;
  phone_number?: string;
  role_id?: number;
  salary_per_hour?: number;
}

export interface ParsedTimesheetImportRow {
  employee_code?: string;
  employee_name?: string;
  date: string;
  time: string;
  direction: string;
  mode?: string;
}

const normalizeHeader = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').trim();

const normalizeValue = (value: unknown) => String(value ?? '').trim();

const pad = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (year: number, month: number, day: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return '';
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${year}-${pad(month)}-${pad(day)}`;
};

const normalizeImportedDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashParts = trimmed.replace(/[.]/g, '/').split('/').map((part) => part.trim());
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      return toIsoDate(Number(slashParts[0]), Number(slashParts[1]), Number(slashParts[2]));
    }

    const first = Number(slashParts[0]);
    const second = Number(slashParts[1]);
    const yearValue = Number(slashParts[2]);
    const year = slashParts[2].length === 2 ? (yearValue >= 70 ? 1900 + yearValue : 2000 + yearValue) : yearValue;

    if (first > 12 && second <= 12) {
      return toIsoDate(year, second, first);
    }

    if (second > 12 && first <= 12) {
      return toIsoDate(year, first, second);
    }

    return toIsoDate(year, first, second);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};

const normalizeImportedTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    return '';
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || '0');
  const meridiem = match[4]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return '';
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return '';
    }

    if (meridiem === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  }

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return '';
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const downloadTextFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const readSpreadsheet = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [] as Record<string, unknown>[];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  });
};

const isRowEmpty = (row: Record<string, unknown>) => Object.values(row).every((value) => normalizeValue(value) === '');

const buildNormalizedRowMap = (row: Record<string, unknown>) => {
  const map = new Map<string, string>();
  Object.entries(row).forEach(([key, value]) => {
    map.set(normalizeHeader(key), normalizeValue(value));
  });
  return map;
};

const getMappedValue = (normalizedRow: Map<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = normalizedRow.get(alias);
    if (value !== undefined) {
      return value;
    }
  }
  return '';
};

const parseRoleId = (value: string) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'admin') {
    return 1;
  }
  if (normalized === 'manager') {
    return 2;
  }
  if (normalized === 'staff') {
    return 3;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
};

const parseMoney = (value: string) => {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : NaN;
};

export const downloadStaffImportSample = () => {
  const sample = [
    'First Name,Last Name,Emp ID,Phone Number,Role,Salary Per Hour',
    'John,Doe,1001,919876543210,Staff,120',
    'Jane,Smith,1002,919812345678,Manager,180',
  ].join('\n');
  downloadTextFile(sample, 'staff-import-sample.csv');
};

export const downloadTimesheetImportSample = () => {
  const sample = [
    'Emp ID,Name,Date,Time,Direction,Mode',
    '1001,John Doe,2024-03-15,09:00:15,Check-In,Fingerprint',
    '1001,John Doe,2024-03-15,18:05:00,Check-Out,Fingerprint',
    '1002,Jane Smith,2024-03-15,09:15:30,Check-In,Card',
  ].join('\n');
  downloadTextFile(sample, 'timesheet-import-sample.csv');
};

export const parseStaffImportFile = async (file: File): Promise<ParsedImportResult<ParsedStaffImportRow>> => {
  const rawRows = (await readSpreadsheet(file)).filter((row) => !isRowEmpty(row));
  const headers = Object.keys(rawRows[0] || {}).map((header) => normalizeHeader(header));

  if (!rawRows.length) {
    return {
      rows: [],
      preview: [],
      errors: ['The selected file is empty. Download the sample and match the same format.'],
      headers,
    };
  }

  const hasFirstNameHeader = headers.some((header) => ['firstname', 'first name', 'first_name'].includes(header));
  const hasLastNameHeader = headers.some((header) => ['lastname', 'last name', 'last_name'].includes(header));

  if (!hasFirstNameHeader || !hasLastNameHeader) {
    return {
      rows: [],
      preview: [],
      errors: ['Invalid staff import format. Download the sample and use the same headers.'],
      headers,
    };
  }

  const errors: string[] = [];
  const rows = rawRows.map((row, index) => {
    const normalizedRow = buildNormalizedRowMap(row);
    const firstname = getMappedValue(normalizedRow, ['firstname', 'first name', 'first_name']);
    const lastname = getMappedValue(normalizedRow, ['lastname', 'last name', 'last_name']);
    const employeeCode = getMappedValue(normalizedRow, ['employee code', 'emp id', 'employee_code', 'emp_id']);
    const phoneNumber = getMappedValue(normalizedRow, ['phone number', 'phone', 'phone_number', 'mobile']);
    const roleValue = getMappedValue(normalizedRow, ['role', 'role id', 'role_id']);
    const salaryValue = getMappedValue(normalizedRow, ['salary per hour', 'salary_per_hour', 'hourly rate', 'rate']);
    const parsedRoleId = parseRoleId(roleValue);
    const parsedSalary = parseMoney(salaryValue);

    if (!firstname) {
      errors.push(`Row ${index + 1}: First Name is required.`);
    }
    if (!lastname) {
      errors.push(`Row ${index + 1}: Last Name is required.`);
    }
    if (roleValue && (!Number.isFinite(parsedRoleId) || ![1, 2, 3].includes(parsedRoleId as number))) {
      errors.push(`Row ${index + 1}: Role must be Admin, Manager, Staff, 1, 2 or 3.`);
    }
    if (salaryValue && (!Number.isFinite(parsedSalary) || (parsedSalary as number) < 0)) {
      errors.push(`Row ${index + 1}: Salary Per Hour must be a non-negative number.`);
    }

    return {
      firstname,
      lastname,
      employee_code: employeeCode || undefined,
      phone_number: phoneNumber || undefined,
      role_id: Number.isFinite(parsedRoleId) ? parsedRoleId : undefined,
      salary_per_hour: Number.isFinite(parsedSalary) ? parsedSalary : undefined,
    };
  });

  return {
    rows,
    preview: rows.slice(0, 5),
    errors,
    headers,
  };
};

export const parseTimesheetImportFile = async (file: File): Promise<ParsedImportResult<ParsedTimesheetImportRow>> => {
  const rawRows = (await readSpreadsheet(file)).filter((row) => !isRowEmpty(row));
  const headers = Object.keys(rawRows[0] || {}).map((header) => normalizeHeader(header));

  if (!rawRows.length) {
    return {
      rows: [],
      preview: [],
      errors: ['The selected file is empty. Download the sample and match the same format.'],
      headers,
    };
  }

  const hasDateHeader = headers.includes('date');
  const hasTimeHeader = headers.includes('time');
  const hasDirectionHeader = headers.includes('direction');
  const hasEmployeeReference = headers.some((header) => ['employee code', 'emp id', 'employee_code', 'emp_id', 'name', 'employee name', 'employee_name'].includes(header));

  if (!hasDateHeader || !hasTimeHeader || !hasDirectionHeader || !hasEmployeeReference) {
    return {
      rows: [],
      preview: [],
      errors: ['Invalid timesheet import format. Download the sample and use the same headers.'],
      headers,
    };
  }

  const errors: string[] = [];
  const rows = rawRows.map((row, index) => {
    const normalizedRow = buildNormalizedRowMap(row);
    const employeeCode = getMappedValue(normalizedRow, ['employee code', 'emp id', 'employee_code', 'emp_id']);
    const employeeName = getMappedValue(normalizedRow, ['name', 'employee name', 'employee_name']);
    const rawDate = getMappedValue(normalizedRow, ['date']);
    const rawTime = getMappedValue(normalizedRow, ['time']);
    const date = normalizeImportedDate(rawDate);
    const time = normalizeImportedTime(rawTime);
    const direction = getMappedValue(normalizedRow, ['direction']);
    const mode = getMappedValue(normalizedRow, ['mode']);

    if (!employeeCode && !employeeName) {
      errors.push(`Row ${index + 1}: Emp ID or Name is required.`);
    }
    if (!rawDate) {
      errors.push(`Row ${index + 1}: Date is required.`);
    } else if (!date) {
      errors.push(`Row ${index + 1}: Date format is invalid.`);
    }
    if (!rawTime) {
      errors.push(`Row ${index + 1}: Time is required.`);
    } else if (!time) {
      errors.push(`Row ${index + 1}: Time format is invalid.`);
    }
    if (!direction) {
      errors.push(`Row ${index + 1}: Direction is required.`);
    }

    return {
      employee_code: employeeCode || undefined,
      employee_name: employeeName || undefined,
      date,
      time,
      direction,
      mode: mode || undefined,
    };
  });

  return {
    rows,
    preview: rows.slice(0, 5),
    errors,
    headers,
  };
};