import { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { StaffCreateRequest } from '../../services/staffService';

const ADMIN_ROLE_ID = 1;

interface AddStaffModalProps {
  isOpen: boolean;
  onSave: (data: StaffCreateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> } | null;
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
}) => {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [salaryPerHour, setSalaryPerHour] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdminRole = roleId === ADMIN_ROLE_ID;

  useEffect(() => {
    if (!isOpen) {
      setFirstname('');
      setLastname('');
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setRoleId('');
      setEmployeeCode('');
      setSalaryPerHour('');
      setDocument(null);
      setDocumentPreview(null);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (apiErrors?.fieldErrors) {
      setErrors((prev) => ({ ...prev, ...apiErrors.fieldErrors }));
    }
  }, [apiErrors]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!firstname.trim()) {
      nextErrors.firstname = 'First name is required.';
    }
    if (!lastname.trim()) {
      nextErrors.lastname = 'Last name is required.';
    }
    if (!roleId) {
      nextErrors.role_id = 'Role is required.';
    }
    if (isAdminRole && !email.trim()) {
      nextErrors.email = 'Email is required for admin role.';
    }
    if (isAdminRole && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (isAdminRole && !password.trim()) {
      nextErrors.password = 'Password is required for admin role.';
    }
    if (isAdminRole && password.trim().length > 0 && password.trim().length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    if (salaryPerHour && (Number.isNaN(Number(salaryPerHour)) || Number(salaryPerHour) < 0)) {
      nextErrors.salary_per_hour = 'Salary per hour must be a non-negative number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleDocumentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocument(file);
      setDocumentPreview(file.name);
    }
  };

  const handleRemoveDocument = () => {
    setDocument(null);
    setDocumentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    onSave({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: isAdminRole ? email.trim() : undefined,
      password: isAdminRole ? password.trim() : undefined,
      phone_number: phoneNumber.trim() || undefined,
      role_id: Number(roleId),
      employee_code: employeeCode.trim() || undefined,
      salary_per_hour: salaryPerHour ? Number(salaryPerHour) : undefined,
      document: document || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[640px] m-4">
      <div className="no-scrollbar relative w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl shadow-gray-200/60 dark:bg-gray-900 dark:shadow-black/30 lg:p-8">
        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Add Staff Member
        </h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Create a staff profile with payroll details. Employee ID is optional and will be auto-generated if left empty.
        </p>

        {apiErrors?.message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{apiErrors.message}</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Basic Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-firstname">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-firstname"
                  type="text"
                  placeholder="John"
                  value={firstname}
                  onChange={(event) => {
                    setFirstname(event.target.value);
                    if (errors.firstname) {
                      setErrors((prev) => ({ ...prev, firstname: '' }));
                    }
                  }}
                  disabled={isSaving}
                  error={Boolean(errors.firstname)}
                />
                {errors.firstname && <p className="mt-1 text-xs text-red-500">{errors.firstname}</p>}
              </div>

              <div>
                <Label htmlFor="add-lastname">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-lastname"
                  type="text"
                  placeholder="Doe"
                  value={lastname}
                  onChange={(event) => {
                    setLastname(event.target.value);
                    if (errors.lastname) {
                      setErrors((prev) => ({ ...prev, lastname: '' }));
                    }
                  }}
                  disabled={isSaving}
                  error={Boolean(errors.lastname)}
                />
                {errors.lastname && <p className="mt-1 text-xs text-red-500">{errors.lastname}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Employment</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-employee-code">Employee ID</Label>
                <Input
                  id="add-employee-code"
                  type="text"
                  placeholder="1001 or EMP-001"
                  value={employeeCode}
                  onChange={(event) => setEmployeeCode(event.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="add-role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <select
                  id="add-role"
                  value={roleId}
                  onChange={(event) => {
                    const nextRole = event.target.value ? Number(event.target.value) : '';
                    setRoleId(nextRole);
                    if (nextRole !== ADMIN_ROLE_ID) {
                      setEmail('');
                      setPassword('');
                      setErrors((prev) => ({ ...prev, email: '', password: '' }));
                    }
                    if (errors.role_id) {
                      setErrors((prev) => ({ ...prev, role_id: '' }));
                    }
                  }}
                  disabled={isSaving}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Select role</option>
                  <option value="1">Admin</option>
                  <option value="2">Manager</option>
                  <option value="3">Staff</option>
                </select>
                {errors.role_id && <p className="mt-1 text-xs text-red-500">{errors.role_id}</p>}
              </div>
            </div>
          </div>

          {isAdminRole && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-900/20">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Admin Account Credentials</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="add-email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    disabled={isSaving}
                    error={Boolean(errors.email)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="add-password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    disabled={isSaving}
                    error={Boolean(errors.password)}
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Compensation & Contact</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-salary">Salary Per Hour</Label>
                <Input
                  id="add-salary"
                  type="number"
                  min="0"
                  step={0.01}
                  placeholder="0.00"
                  value={salaryPerHour}
                  onChange={(event) => {
                    setSalaryPerHour(event.target.value);
                    if (errors.salary_per_hour) {
                      setErrors((prev) => ({ ...prev, salary_per_hour: '' }));
                    }
                  }}
                  disabled={isSaving}
                  error={Boolean(errors.salary_per_hour)}
                />
                {errors.salary_per_hour && <p className="mt-1 text-xs text-red-500">{errors.salary_per_hour}</p>}
              </div>

              <div>
                <Label htmlFor="add-phone">Phone Number</Label>
                <PhoneInput
                  country="in"
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value)}
                  disabled={isSaving}
                  inputClass="!h-11 !w-full !rounded-lg !border !border-gray-300 dark:!border-gray-700 !bg-white dark:!bg-gray-900 !text-gray-900 dark:!text-white/90 !pl-[72px] !pr-3 focus:!border-brand-300"
                  buttonClass="!w-[64px] !rounded-l-lg !border !border-r-0 !border-gray-300 dark:!border-gray-700 !bg-white dark:!bg-gray-900"
                  dropdownClass="!text-sm"
                  inputProps={{
                    id: 'add-phone',
                  }}
                  containerClass="w-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <Label htmlFor="add-document">Document (Optional)</Label>
            <input
              ref={fileInputRef}
              id="add-document"
              type="file"
              onChange={handleDocumentSelect}
              disabled={isSaving}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.ppt,.pptx"
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:file:bg-blue-900/40 dark:file:text-blue-300"
            />

            {documentPreview && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <span className="truncate text-sm text-gray-700 dark:text-gray-300">{documentPreview}</span>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  disabled={isSaving}
                  className="ml-3 text-sm font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Staff'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddStaffModal;
