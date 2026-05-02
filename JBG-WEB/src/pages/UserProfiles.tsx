import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import { api } from "../utils/apiClient";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface BankDetail {
  id: number;
  account_name: string;
  account_no: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
  address: string;
  is_primary: boolean;
}

interface AdminDetails {
  name: string;
  logo: string | null;
  signature?: string | null;
  signature_url?: string | null;
  mobile: string;
  email: string;
  gst_no: string;
  pan_no: string;
  address: string;
  terms_and_condition: string;
  bank_details: BankDetail[];
}

interface AdminUpdatePayload {
  name: string;
  mobile: string;
  email: string;
  gst_no: string;
  pan_no: string;
  address: string;
  terms_and_condition: string;
  bank_details: BankDetail[];
}

interface CustomerUpdatePayload {
  name: string;
  mobile: string;
  email: string;
  gst_no: string;
  pan_no: string;
  address: string;
  terms_condition: string;
  bank_details: BankDetail[];
}

interface AdminUpdateResponse {
  message: string;
  admin: AdminDetails;
}

interface CustomerUpdateResponse {
  message: string;
  customer: AdminDetails;
}

interface SignatureUploadResponse {
  message: string;
  signature: string;
  customer_id: number;
}

export default function UserProfiles() {
  const { user } = useAuth();
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [formData, setFormData] = useState<AdminDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<File | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const normalizeAdminDetails = (data: Partial<AdminDetails>): AdminDetails => {
    const signatureUrl = data.signature_url || data.signature || null;

    return {
      name: data.name || "",
      logo: data.logo || null,
      signature: signatureUrl,
      signature_url: signatureUrl,
      mobile: data.mobile || "",
      email: data.email || "",
      gst_no: data.gst_no || "",
      pan_no: data.pan_no || "",
      address: data.address || "",
      terms_and_condition: data.terms_and_condition || "",
      bank_details: Array.isArray(data.bank_details)
        ? data.bank_details.map((bank) => ({
            id: bank.id,
            account_name: bank.account_name || "",
            account_no: bank.account_no || "",
            ifsc_code: bank.ifsc_code || "",
            bank_name: bank.bank_name || "",
            branch_name: bank.branch_name || "",
            address: bank.address || "",
            is_primary: Boolean(bank.is_primary),
          }))
        : [],
    };
  };

  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<AdminDetails>("/admin-details");
        const normalizedData = normalizeAdminDetails(response.data);
        setAdminDetails(normalizedData);
        setFormData(normalizedData);
      } catch (err) {
        console.error("Error fetching admin details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminDetails();
  }, []);

  const displayValue = (value: string | null | undefined) => {
    if (!value || value.trim() === "") return "-";
    return value;
  };

  const handleFieldChange = (field: keyof AdminDetails, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBankFieldChange = (
    bankIndex: number,
    field: keyof Omit<BankDetail, "id" | "is_primary">,
    value: string,
  ) => {
    if (!formData) return;

    const updatedBankDetails = formData.bank_details.map((bank, index) => {
      if (index !== bankIndex) return bank;
      return {
        ...bank,
        [field]: value,
      };
    });

    setFormData({
      ...formData,
      bank_details: updatedBankDetails,
    });

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePrimaryChange = (bankIndex: number, checked: boolean) => {
    if (!formData) return;

    const updatedBankDetails = formData.bank_details.map((bank, index) => {
      if (index !== bankIndex) {
        return checked ? { ...bank, is_primary: false } : bank;
      }

      return {
        ...bank,
        is_primary: checked,
      };
    });

    setFormData({
      ...formData,
      bank_details: updatedBankDetails,
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedLogo(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleClearLogo = () => {
    setSelectedLogo(null);
    setLogoPreview(null);
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleLogoUpload = async () => {
    if (!selectedLogo) return;

    try {
      setIsUploadingLogo(true);
      setSuccessMessage(null);
      setUploadError(null);

      const formDataUpload = new FormData();
      formDataUpload.append('logo', selectedLogo);

      const response = await api.post('/admin-logo', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update the formData and adminDetails with the new logo URL
      if (formData) {
        setFormData({
          ...formData,
          logo: response.data.logo,
        });
      }
      if (adminDetails) {
        setAdminDetails({
          ...adminDetails,
          logo: response.data.logo,
        });
      }

      setSuccessMessage('Logo uploaded successfully.');
      handleClearLogo();
    } catch (err) {
      console.error("Error uploading logo:", err);
      setUploadError("Failed to upload logo. Please try again.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadError(null);

    if (!file) {
      setSelectedSignature(null);
      setSignaturePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Signature file must be an image.");
      setSelectedSignature(null);
      setSignaturePreview(null);
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setUploadError("Signature file size must be 5 MB or smaller.");
      setSelectedSignature(null);
      setSignaturePreview(null);
      return;
    }

    setSelectedSignature(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignaturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = () => {
    setSelectedSignature(null);
    setSignaturePreview(null);
    setUploadError(null);
    const fileInput = document.getElementById("signature") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSignatureUpload = async () => {
    if (!selectedSignature) return;

    if (!user?.customer_id || user.customer_id <= 0) {
      setUploadError("Valid customer ID not found for signature upload.");
      return;
    }

    try {
      setIsUploadingSignature(true);
      setSuccessMessage(null);
      setUploadError(null);

      const formDataUpload = new FormData();
      formDataUpload.append("signature", selectedSignature);

      const response = await api.post<SignatureUploadResponse>(
        `/customers/${user.customer_id}/signature`,
        formDataUpload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (formData) {
        setFormData({
          ...formData,
          signature: response.data.signature,
        });
      }
      if (adminDetails) {
        setAdminDetails({
          ...adminDetails,
          signature: response.data.signature,
        });
      }

      setSuccessMessage(response.data.message || "Signature uploaded successfully.");
      handleClearSignature();
    } catch (err) {
      console.error("Error uploading signature:", err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setUploadError(err.response.data.error);
      } else {
        setUploadError("Failed to upload signature. Please try again.");
      }
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleUpdateDetails = async () => {
    if (!formData) return;

    try {
      setIsSaving(true);
      setSuccessMessage(null);
      setValidationErrors({});

      const isOutletUser = Boolean(user && !user.is_admin);

      if (isOutletUser && (!user?.customer_id || user.customer_id <= 0)) {
        setValidationErrors({
          customer_id: "Unable to update profile. Missing customer ID.",
        });
        return;
      }

      const basePayload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        gst_no: formData.gst_no,
        pan_no: formData.pan_no,
        address: formData.address,
        bank_details: formData.bank_details,
      };

      const payload: AdminUpdatePayload | CustomerUpdatePayload = isOutletUser
        ? {
            ...basePayload,
            terms_condition: formData.terms_and_condition,
          }
        : {
            ...basePayload,
            terms_and_condition: formData.terms_and_condition,
          };

      const endpoint = isOutletUser
        ? `/customer-update/${user?.customer_id}`
        : "/admin-details";

      const response = await api.put<AdminUpdateResponse | CustomerUpdateResponse>(endpoint, payload);
      const updatedEntity = "admin" in response.data ? response.data.admin : response.data.customer;
      const updatedData = normalizeAdminDetails(updatedEntity);

      setAdminDetails(updatedData);
      setFormData(updatedData);
      setSuccessMessage(response.data.message || "Profile details updated successfully.");
    } catch (err) {
      console.error("Error updating admin details:", err);
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (data.errors && Array.isArray(data.errors)) {
          const errors: {[key: string]: string} = {};
          data.errors.forEach((e: {field: string, message: string}) => {
            errors[e.field] = e.message;
          });
          setValidationErrors(errors);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title="React.js Profile Dashboard | Jay Bhavani - Next.js Admin Dashboard Template"
        description="This is React.js Profile Dashboard page for Jay Bhavani - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
          {isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile details...</p>
          )}

          {!isLoading && adminDetails && formData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="logo">Logo</Label>
                  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-start gap-4">
                      {/* Current Logo Preview */}
                      <div className="flex-shrink-0">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Selected logo preview"
                            className="h-24 w-24 rounded-lg border-2 border-brand-500 object-cover"
                          />
                        ) : adminDetails.logo ? (
                          <img
                            src={adminDetails.logo}
                            alt={adminDetails.name}
                            className="h-24 w-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Upload Controls */}
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedLogo ? (
                            <p className="font-medium text-gray-800 dark:text-white/90">
                              Selected: {selectedLogo.name}
                            </p>
                          ) : (
                            <p>Upload a logo image (PNG, JPG, or GIF)</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="logo"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Choose File
                          </label>

                          {selectedLogo && (
                            <>
                              <Button
                                onClick={handleLogoUpload}
                                disabled={isUploadingLogo}
                                size="sm"
                              >
                                {isUploadingLogo ? (
                                  <>
                                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload
                                  </>
                                )}
                              </Button>
                              <button
                                onClick={handleClearLogo}
                                disabled={isUploadingLogo}
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="signature">Signature</Label>
                  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {signaturePreview ? (
                          <img
                            src={signaturePreview}
                            alt="Selected signature preview"
                            className="h-24 w-24 rounded-lg border-2 border-brand-500 object-contain bg-white"
                          />
                        ) : adminDetails.signature ? (
                          <img
                            src={adminDetails.signature}
                            alt="Current signature"
                            className="h-24 w-24 rounded-lg border border-gray-200 object-contain bg-white dark:border-gray-700"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedSignature ? (
                            <p className="font-medium text-gray-800 dark:text-white/90">
                              Selected: {selectedSignature.name}
                            </p>
                          ) : (
                            <p>Upload signature image (max 5 MB)</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id="signature"
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="signature"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Choose File
                          </label>

                          {selectedSignature && (
                            <>
                              <Button
                                onClick={handleSignatureUpload}
                                disabled={isUploadingSignature}
                                size="sm"
                              >
                                {isUploadingSignature ? (
                                  <>
                                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload
                                  </>
                                )}
                              </Button>
                              <button
                                onClick={handleClearSignature}
                                disabled={isUploadingSignature}
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => handleFieldChange("mobile", e.target.value)}
                  />
                  {validationErrors.mobile && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.mobile}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gst_no">GST No</Label>
                  <Input
                    id="gst_no"
                    type="text"
                    value={formData.gst_no}
                    onChange={(e) => handleFieldChange("gst_no", e.target.value)}
                  />
                  {validationErrors.gst_no && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.gst_no}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pan_no">PAN No</Label>
                  <Input
                    id="pan_no"
                    type="text"
                    value={formData.pan_no}
                    onChange={(e) => handleFieldChange("pan_no", e.target.value)}
                  />
                  {validationErrors.pan_no && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.pan_no}</p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                  />
                  {validationErrors.address && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="terms_and_condition">Terms and Condition</Label>
                  <textarea
                    id="terms_and_condition"
                    value={formData.terms_and_condition}
                    onChange={(e) => handleFieldChange("terms_and_condition", e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  {validationErrors.terms_and_condition && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.terms_and_condition}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Bank Details</p>
                {formData.bank_details && formData.bank_details.length > 0 ? (
                  <div className="space-y-4">
                    {formData.bank_details.map((bank, bankIndex) => (
                      <div
                        key={bank.id}
                        className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <Label htmlFor={`account_name_${bank.id}`}>Account Name</Label>
                            <Input
                              id={`account_name_${bank.id}`}
                              type="text"
                              value={bank.account_name}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "account_name", e.target.value)
                              }
                            />
                            {validationErrors.account_name && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.account_name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`account_no_${bank.id}`}>Account No</Label>
                            <Input
                              id={`account_no_${bank.id}`}
                              type="text"
                              value={bank.account_no}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "account_no", e.target.value)
                              }
                            />
                            {validationErrors.account_no && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.account_no}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`ifsc_code_${bank.id}`}>IFSC Code</Label>
                            <Input
                              id={`ifsc_code_${bank.id}`}
                              type="text"
                              value={bank.ifsc_code}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "ifsc_code", e.target.value)
                              }
                            />
                            {validationErrors.ifsc_code && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.ifsc_code}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`bank_name_${bank.id}`}>Bank Name</Label>
                            <Input
                              id={`bank_name_${bank.id}`}
                              type="text"
                              value={bank.bank_name}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "bank_name", e.target.value)
                              }
                            />
                            {validationErrors.bank_name && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.bank_name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`branch_name_${bank.id}`}>Branch Name</Label>
                            <Input
                              id={`branch_name_${bank.id}`}
                              type="text"
                              value={bank.branch_name}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "branch_name", e.target.value)
                              }
                            />
                            {validationErrors.branch_name && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.branch_name}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`is_primary_${bank.id}`}>Primary</Label>
                            <div className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:text-white/90">
                              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-white/90">
                                <input
                                  id={`is_primary_${bank.id}`}
                                  type="checkbox"
                                  checked={bank.is_primary}
                                  onChange={(e) => handlePrimaryChange(bankIndex, e.target.checked)}
                                />
                                Is Primary
                              </label>
                            </div>
                          </div>
                          <div className="lg:col-span-2">
                            <Label htmlFor={`bank_address_${bank.id}`}>Bank Address</Label>
                            <Input
                              id={`bank_address_${bank.id}`}
                              type="text"
                              value={bank.address}
                              onChange={(e) =>
                                handleBankFieldChange(bankIndex, "address", e.target.value)
                              }
                            />
                            {validationErrors.address && (
                              <p className="mt-1 text-sm text-red-500">{validationErrors.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{displayValue("-")}</p>
                )}
              </div>

              {successMessage && (
                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
              )}

              {uploadError && (
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              )}

              <div className="flex justify-end">
                <Button onClick={handleUpdateDetails} disabled={isSaving}>
                  {isSaving ? "Updating..." : "Update Details"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
