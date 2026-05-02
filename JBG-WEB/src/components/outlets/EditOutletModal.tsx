import { useState, useEffect } from "react";
import { PlusIcon, TrashBinIcon } from "../../icons";
import { Outlet, BankDetail, OutletUpdateRequest, Tax } from "../../types/outlet";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import outletService from "../../services/outletService";

interface EditOutletModalProps {
  isOpen: boolean;
  outlet: Outlet | null;
  onSave: (data: OutletUpdateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
}

interface FormData {
  name: string;
  mobile: string;
  email: string;
  gst_no: string;
  pan_no: string;
  country_code: string;
  address: string;
  pos_password: string;
  terms_condition: string;
  is_active: boolean;
  bank_details: BankDetail[];
  taxes: Tax[];
  logo: File | null;
  current_logo?: string | null;
}

const initialBankDetail: BankDetail = {
  account_name: "",
  account_no: "",
  ifsc_code: "",
  bank_name: "",
  branch_name: "",
  address: "",
  is_primary: false,
  is_active: true,
};

const initialTax: Tax = {
  tax_name: "",
  tax_value: 0,
  is_active: true,
};

const EditOutletModal: React.FC<EditOutletModalProps> = ({
  isOpen,
  outlet,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    mobile: "",
    email: "",
    gst_no: "",
    pan_no: "",
    country_code: "+91",
    address: "",
    pos_password: "",
    terms_condition: "",
    is_active: true,
    bank_details: [],
    taxes: [],
    logo: null,
    current_logo: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<{ index: number; tax: Tax } | null>(null);
  const [isDeletingTax, setIsDeletingTax] = useState(false);

  useEffect(() => {
    if (outlet) {
      setFormData({
        name: outlet.name || "",
        mobile: outlet.mobile || "",
        email: outlet.email || "",
        gst_no: outlet.gst_no || "",
        pan_no: outlet.pan_no || "",
        country_code: outlet.country_code || "+91",
        address: outlet.address || "",
        pos_password: "",
        terms_condition: outlet.terms_condition || "",
        is_active: true,
        bank_details: outlet.bank_details.length > 0
          ? outlet.bank_details.map(bank => ({ ...bank, is_active: true }))
          : [{ ...initialBankDetail, is_primary: true }],
        taxes: outlet.taxes && outlet.taxes.length > 0
          ? outlet.taxes.map(tax => ({ ...tax })) // Preserve original is_active status
          : [],
        logo: null,
        current_logo: outlet.logo || null,
      });
      setErrors({});
    }
  }, [outlet]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    if (field === 'logo' && value === null) {
      // When removing logo, clear both new logo and current logo reference
      setFormData(prev => ({ ...prev, logo: null, current_logo: null }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear the error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateField = (field: keyof FormData, value: any): string => {
    switch (field) {
      case 'name':
        return !String(value).trim() ? "Outlet name is required" : "";
      case 'mobile':
        return !String(value).trim() ? "Mobile number is required" : "";
      case 'address':
        return !String(value).trim() ? "Address is required" : "";
      case 'country_code':
        return !String(value).trim() ? "Country code is required" : "";
      case 'email':
        if (String(value).trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return !emailRegex.test(String(value).trim()) ? "Please enter a valid email address" : "";
        }
        return "";
      case 'gst_no':
        if (String(value).trim()) {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          return !gstRegex.test(String(value).trim()) ? "Invalid GST format. Format: 22AAAAA0000A1Z5" : "";
        }
        return "";
      case 'pan_no':
        if (String(value).trim()) {
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          return !panRegex.test(String(value).trim()) ? "Invalid PAN format. Format: AAAAA0000A" : "";
        }
        return "";
      default:
        return "";
    }
  };

  const handleFieldBlur = (field: keyof FormData, value: any) => {
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateBankField = (field: keyof BankDetail, value: any): string => {
    switch (field) {
      case 'ifsc_code':
        if (String(value).trim()) {
          const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
          return !ifscRegex.test(String(value).trim()) ? "Invalid IFSC format. Format: ABCD0123456" : "";
        }
        return "";
      default:
        return "";
    }
  };

  const handleBankFieldBlur = (index: number, field: keyof BankDetail, value: any) => {
    const error = validateBankField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [`bank_${index}_${field}`]: error }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleInputChange("logo", e.target.files[0]);
    }
  };

  const handleBankDetailChange = (index: number, field: keyof BankDetail, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      bank_details: prev.bank_details.map((bank, i) =>
        i === index ? { ...bank, [field]: value } : bank
      ),
    }));
    
    // Clear the error for this bank field when user starts typing
    const errorKey = `bank_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: "" }));
    }
  };

  const handlePrimaryBankChange = (selectedIndex: number) => {
    setFormData(prev => ({
      ...prev,
      bank_details: prev.bank_details.map((bank, i) => ({
        ...bank,
        is_primary: i === selectedIndex,
      })),
    }));
  };

  const addBankDetail = () => {
    setFormData(prev => ({
      ...prev,
      bank_details: [...prev.bank_details, { ...initialBankDetail }],
    }));
  };

  const removeBankDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bank_details: prev.bank_details.filter((_, i) => i !== index),
    }));
  };

  const handleTaxDetailChange = (index: number, field: keyof Tax, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      taxes: prev.taxes.map((tax, i) =>
        i === index ? { ...tax, [field]: value } : tax
      ),
    }));
  };

  const addTaxDetail = () => {
    setFormData(prev => ({
      ...prev,
      taxes: [...prev.taxes, { ...initialTax }],
    }));
  };

  const removeTaxDetail = (index: number) => {
    const taxToRemove = formData.taxes[index];
    setTaxToDelete({ index, tax: taxToRemove });
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteTax = async () => {
    if (!taxToDelete) return;

    const { index, tax } = taxToDelete;
    setIsDeletingTax(true);

    try {
      // If tax has an ID, it exists in the database and needs to be deleted via API
      if (tax.id && outlet) {
        await outletService.deleteTax(outlet.id, tax.id);
      }

      // Remove from form data after successful API deletion (or for new taxes)
      setFormData(prev => ({
        ...prev,
        taxes: prev.taxes.filter((_, i) => i !== index),
      }));

      setDeleteModalOpen(false);
      setTaxToDelete(null);
    } catch (error) {
      console.error('Error deleting tax:', error);
      // You might want to show an error message to the user here
      alert('Failed to delete tax. Please try again.');
    } finally {
      setIsDeletingTax(false);
    }
  };

  const handleCancelDeleteTax = () => {
    setDeleteModalOpen(false);
    setTaxToDelete(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Outlet name is required";
    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.country_code.trim()) newErrors.country_code = "Country code is required";

    // Email validation (optional but if provided, must be valid)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // GST validation (optional but if provided, must match format)
    if (formData.gst_no?.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gst_no.trim())) {
        newErrors.gst_no = "Invalid GST format. Format: 22AAAAA0000A1Z5";
      }
    }

    // PAN validation (optional but if provided, must match format)
    if (formData.pan_no?.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.pan_no.trim())) {
        newErrors.pan_no = "Invalid PAN format. Format: AAAAA0000A";
      }
    }

    // Validate bank details only if they are partially filled
    formData.bank_details.forEach((bank, index) => {
      const hasAnyBankData = bank.account_name.trim() || bank.account_no.trim() || bank.ifsc_code.trim() || bank.bank_name.trim();
      if (hasAnyBankData) {
        if (!bank.account_name.trim()) newErrors[`bank_${index}_account_name`] = "Account name is required";
        if (!bank.account_no.trim()) newErrors[`bank_${index}_account_no`] = "Account number is required";
        if (!bank.ifsc_code.trim()) {
          newErrors[`bank_${index}_ifsc_code`] = "IFSC code is required";
        } else {
          // Validate IFSC format if provided
          const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
          if (!ifscRegex.test(bank.ifsc_code.trim())) {
            newErrors[`bank_${index}_ifsc_code`] = "Invalid IFSC format. Format: ABCD0123456";
          }
        }
        if (!bank.bank_name.trim()) newErrors[`bank_${index}_bank_name`] = "Bank name is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Check if any bank details have data
    const hasBankDetails = formData.bank_details.some(bank => 
      bank.account_name.trim() || 
      bank.account_no.trim() || 
      bank.ifsc_code.trim() || 
      bank.bank_name.trim() || 
      bank.branch_name.trim() || 
      bank.address.trim()
    );

    // Check if any tax details have data
    const hasTaxDetails = formData.taxes.length > 0;

    // Determine how to handle logo updates
    const logoUpdate = (() => {
      if (formData.logo) {
        // User uploaded a new logo
        return { logo: formData.logo };
      } else if (formData.current_logo === null && outlet?.logo) {
        // User removed the existing logo, need to indicate removal
        return { logo: null };
      } else {
        // No logo change
        return {};
      }
    })();

    const updateData: OutletUpdateRequest = {
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email || undefined,
      gst_no: formData.gst_no.trim() ? formData.gst_no.trim() : null,
      pan_no: formData.pan_no.trim() ? formData.pan_no.trim() : null,
      country_code: formData.country_code,
      address: formData.address,
      pos_password: formData.pos_password || undefined,
      terms_condition: formData.terms_condition || undefined,
      is_active: formData.is_active,
      ...(hasBankDetails && { bank_details: formData.bank_details }),
      ...(hasTaxDetails && { taxes: formData.taxes }),
      ...logoUpdate,
    };

    onSave(updateData);
  };

  const closeModal = () => {
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Outlet Information
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update outlet details, contact information, and bank details.
          </p>
        </div>

        <form className="flex flex-col">
          <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
            {/* Logo Upload - Centered at top */}
            <div className="mb-8 flex justify-center">
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-center">Outlet Logo</Label>
                {/* Logo Preview */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {formData.logo ? (
                      <img
                        src={URL.createObjectURL(formData.logo)}
                        alt="Logo preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : formData.current_logo ? (
                      <img
                        src={formData.current_logo}
                        alt="Current logo"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="text-center">
                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8M8 15h8" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {(formData.logo || formData.current_logo) && (
                    <button
                      type="button"
                      onClick={() => handleInputChange("logo", null)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Upload Button */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {formData.logo ? 'Change Logo' : (formData.current_logo ? 'Replace Logo' : 'Upload Logo')}
                  </label>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="mb-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                Basic Information
              </h5>
              
              {/* Display API errors */}
              {apiErrors && (apiErrors.message || apiErrors.fieldErrors.general) && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    {apiErrors.message || apiErrors.fieldErrors.general}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <Label>Outlet Name *</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    onBlur={(e) => handleFieldBlur("name", e.target.value)}
                    placeholder="Enter outlet name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Mobile Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={formData.country_code}
                      onChange={(e) => handleInputChange("country_code", e.target.value)}
                      onBlur={(e) => handleFieldBlur("country_code", e.target.value)}
                      placeholder="+91"
                      className="w-20"
                    />
                    <Input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange("mobile", e.target.value)}
                      onBlur={(e) => handleFieldBlur("mobile", e.target.value)}
                      placeholder="Enter mobile number"
                      className="flex-1"
                    />
                  </div>
                  {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                  {errors.country_code && <p className="text-red-500 text-sm mt-1">{errors.country_code}</p>}
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onBlur={(e) => handleFieldBlur("email", e.target.value)}
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>GST Number</Label>
                  <Input
                    type="text"
                    value={formData.gst_no}
                    onChange={(e) => handleInputChange("gst_no", e.target.value)}
                    onBlur={(e) => handleFieldBlur("gst_no", e.target.value)}
                    placeholder="Enter GST number"
                  />
                  {errors.gst_no && <p className="text-red-500 text-sm mt-1">{errors.gst_no}</p>}
                  {apiErrors?.fieldErrors.gst_no && <p className="text-red-500 text-sm mt-1">{apiErrors.fieldErrors.gst_no}</p>}
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>PAN Number</Label>
                  <Input
                    type="text"
                    value={formData.pan_no}
                    onChange={(e) => handleInputChange("pan_no", e.target.value)}
                    onBlur={(e) => handleFieldBlur("pan_no", e.target.value)}
                    placeholder="Enter PAN number"
                  />
                  {errors.pan_no && <p className="text-red-500 text-sm mt-1">{errors.pan_no}</p>}
                  {apiErrors?.fieldErrors.pan_no && <p className="text-red-500 text-sm mt-1">{apiErrors.fieldErrors.pan_no}</p>}
                </div>

                <div className="col-span-2 lg:col-span-1">
                  <Label>POS Password</Label>
                  <Input
                    type="text"
                    value={formData.pos_password}
                    onChange={(e) => handleInputChange("pos_password", e.target.value)}
                    onBlur={(e) => handleFieldBlur("pos_password", e.target.value)}
                    placeholder="Enter POS password"
                  />
                  {errors.pos_password && <p className="text-red-500 text-sm mt-1">{errors.pos_password}</p>}
                </div>

                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    onBlur={(e) => handleFieldBlur("address", e.target.value)}
                    placeholder="Enter full address"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div className="col-span-2">
                  <Label>Terms & Conditions</Label>
                  <Input
                    type="text"
                    value={formData.terms_condition}
                    onChange={(e) => handleInputChange("terms_condition", e.target.value)}
                    onBlur={(e) => handleFieldBlur("terms_condition", e.target.value)}
                    placeholder="Enter terms and conditions"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h5 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Bank Details
                </h5>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addBankDetail}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Bank
                </Button>
              </div>

              {formData.bank_details.map((bank, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-md font-medium text-gray-800 dark:text-white/90">
                      Bank Account {index + 1}
                    </h6>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="primary_bank"
                          checked={bank.is_primary}
                          onChange={() => handlePrimaryBankChange(index)}
                          className="text-brand-500"
                        />
                        Primary
                      </label>
                      {formData.bank_details.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeBankDetail(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                    <div>
                      <Label>Account Name *</Label>
                      <Input
                        type="text"
                        value={bank.account_name}
                        onChange={(e) => handleBankDetailChange(index, "account_name", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "account_name", e.target.value)}
                        placeholder="Enter account name"
                      />
                      {errors[`bank_${index}_account_name`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`bank_${index}_account_name`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Account Number *</Label>
                      <Input
                        type="text"
                        value={bank.account_no}
                        onChange={(e) => handleBankDetailChange(index, "account_no", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "account_no", e.target.value)}
                        placeholder="Enter account number"
                      />
                      {errors[`bank_${index}_account_no`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`bank_${index}_account_no`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>IFSC Code *</Label>
                      <Input
                        type="text"
                        value={bank.ifsc_code}
                        onChange={(e) => handleBankDetailChange(index, "ifsc_code", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "ifsc_code", e.target.value)}
                        placeholder="Enter IFSC code"
                      />
                      {errors[`bank_${index}_ifsc_code`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`bank_${index}_ifsc_code`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Bank Name *</Label>
                      <Input
                        type="text"
                        value={bank.bank_name}
                        onChange={(e) => handleBankDetailChange(index, "bank_name", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "bank_name", e.target.value)}
                        placeholder="Enter bank name"
                      />
                      {errors[`bank_${index}_bank_name`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`bank_${index}_bank_name`]}</p>
                      )}
                    </div>

                    <div>
                      <Label>Branch Name</Label>
                      <Input
                        type="text"
                        value={bank.branch_name}
                        onChange={(e) => handleBankDetailChange(index, "branch_name", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "branch_name", e.target.value)}
                        placeholder="Enter branch name"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Bank Address</Label>
                      <Input
                        type="text"
                        value={bank.address}
                        onChange={(e) => handleBankDetailChange(index, "address", e.target.value)}
                        onBlur={(e) => handleBankFieldBlur(index, "address", e.target.value)}
                        placeholder="Enter bank address"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax Details */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h5 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Tax Details
                </h5>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addTaxDetail}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Tax
                </Button>
              </div>

              {formData.taxes.map((tax, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-md font-medium text-gray-800 dark:text-white/90">
                      Tax {index + 1}
                    </h6>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeTaxDetail(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                    <div>
                      <Label>Tax Name *</Label>
                      <Input
                        type="text"
                        value={tax.tax_name}
                        onChange={(e) => handleTaxDetailChange(index, "tax_name", e.target.value)}
                        placeholder="Enter tax name (e.g., CGST, SGST, VAT)"
                      />
                    </div>

                    <div>
                      <Label>Tax Value (%) *</Label>
                      <Input
                        type="number"
                        step={0.01}
                        min="0"
                        max="100"
                        value={tax.tax_value}
                        onChange={(e) => handleTaxDetailChange(index, "tax_value", parseFloat(e.target.value) || 0)}
                        placeholder="Enter tax percentage (e.g., 12.00)"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tax.is_active || false}
                        onChange={(e) => handleTaxDetailChange(index, "is_active", e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={closeModal} disabled={isSaving}>
              Close
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Tax"
        message="Are you sure you want to delete this tax? This action cannot be undone."
        itemName={taxToDelete?.tax.tax_name || "this tax"}
        itemDetails={[
          `Tax Value: ${taxToDelete?.tax.tax_value}%`,
          `Status: ${taxToDelete?.tax.is_active ? 'Active' : 'Inactive'}`
        ]}
        onConfirm={handleConfirmDeleteTax}
        onCancel={handleCancelDeleteTax}
        isDeleting={isDeletingTax}
        confirmText="DELETE"
      />
    </Modal>
  );
};

export default EditOutletModal;
