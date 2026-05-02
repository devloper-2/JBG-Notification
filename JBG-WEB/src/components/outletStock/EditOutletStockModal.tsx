import { useState, useEffect, useRef } from "react";
import { OutletStock, OutletStockUpdateRequest } from "../../types/outletStock";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import ManageExtraItemsModal from "./ManageExtraItemsModal";

interface EditOutletStockModalProps {
  isOpen: boolean;
  outletStock: OutletStock | null;
  onSave: (data: OutletStockUpdateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
  onRefresh?: () => void;
}

interface FormData {
  quantity: string;
  invoice_quantity: string;
  minimum_quantity: string;
  is_extra_item: boolean;
  movement_notes: string;
  // Custom item fields (only when stock_id is null)
  item_name_default: string;
  item_name_en: string;
  item_name_hi: string;
  amount: string;
  hsn_code: string;
  profile_image: File | null;
}

const EditOutletStockModal: React.FC<EditOutletStockModalProps> = ({
  isOpen,
  outletStock,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
  onRefresh,
}) => {
  const [formData, setFormData] = useState<FormData>({
    quantity: "",
    invoice_quantity: "",
    minimum_quantity: "",
    is_extra_item: false,
    movement_notes: "",
    item_name_default: "",
    item_name_en: "",
    item_name_hi: "",
    amount: "",
    hsn_code: "",
    profile_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [isManageExtraItemsOpen, setIsManageExtraItemsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to parse item names
  const parseItemName = (itemName: string | object | null | undefined, defaultValue: string = ''): string => {
    if (!itemName) {
      return defaultValue;
    }
    
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || defaultValue;
    }
    
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed.hi || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || defaultValue;
        } else if (typeof parsed === 'string') {
          return parsed;
        }
        return defaultValue;
      } catch {
        return itemName || defaultValue;
      }
    }
    
    return defaultValue;
  };

  // Initialize form when modal opens or outletStock changes
  useEffect(() => {
    if (isOpen && outletStock) {
      const isCustom = !outletStock.stock_id;
      setIsCustomItem(isCustom);
      
      // Parse multi-language names
      let nameDefault = '';
      let nameEn = '';
      let nameHi = '';
      
      if (outletStock.item_name) {
        if (typeof outletStock.item_name === 'object') {
          const nameObj = outletStock.item_name as Record<string, any>;
          nameDefault = nameObj.default || nameObj.en || nameObj.hi || '';
          nameEn = nameObj.en || nameObj.default || '';
          nameHi = nameObj.hi || nameObj.default || '';
        } else if (typeof outletStock.item_name === 'string') {
          try {
            const parsed = JSON.parse(outletStock.item_name);
            if (typeof parsed === 'object' && parsed !== null) {
              nameDefault = parsed.default || parsed.en || parsed.hi || '';
              nameEn = parsed.en || parsed.default || '';
              nameHi = parsed.hi || parsed.default || '';
            } else {
              nameDefault = nameEn = nameHi = outletStock.item_name;
            }
          } catch {
            nameDefault = nameEn = nameHi = outletStock.item_name;
          }
        }
      }
      
      setFormData({
        quantity: String(outletStock.quantity || ""),
        invoice_quantity: String(outletStock.invoice_quantity || ""),
        minimum_quantity: String(outletStock.minimum_quantity || ""),
        is_extra_item: outletStock.is_extra_item,
        movement_notes: "",
        // Load names for ALL items, not just custom
        item_name_default: nameDefault,
        item_name_en: nameEn,
        item_name_hi: nameHi,
        amount: isCustom ? String(outletStock.amount || "") : "",
        hsn_code: isCustom ? String(outletStock.hsn_code || "") : "",
        profile_image: null,
      });
      setErrors({});
    }
  }, [isOpen, outletStock]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    // Ensure string fields are properly converted to strings
    if (typeof value === 'string' && (field === 'quantity' || field === 'invoice_quantity' || field === 'minimum_quantity' || field === 'amount')) {
      setFormData(prev => ({ ...prev, [field]: String(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('profile_image', file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate quantity
    const quantityStr = String(formData.quantity || "");
    if (!quantityStr.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(Number(quantityStr)) || Number(quantityStr) < 0) {
      newErrors.quantity = 'Quantity must be a valid positive number';
    }

    const invoiceQuantityStr = String(formData.invoice_quantity || "");
    if (!invoiceQuantityStr.trim()) {
      newErrors.invoice_quantity = 'Invoice quantity is required';
    } else if (isNaN(Number(invoiceQuantityStr)) || Number(invoiceQuantityStr) < 0) {
      newErrors.invoice_quantity = 'Invoice quantity must be a valid positive number';
    }

    // Validate minimum quantity
    const minQuantityStr = String(formData.minimum_quantity || "");
    if (!minQuantityStr.trim()) {
      newErrors.minimum_quantity = 'Minimum quantity is required';
    } else if (isNaN(Number(minQuantityStr)) || Number(minQuantityStr) < 0) {
      newErrors.minimum_quantity = 'Minimum quantity must be a valid positive number';
    }

    // Validate name fields for ALL items
    const itemNameStr = String(formData.item_name_default || "");
    if (!itemNameStr.trim()) {
      newErrors.item_name_default = 'Item name (Default) is required';
    }

    const itemNameHiStr = String(formData.item_name_hi || "");
    if (!itemNameHiStr.trim()) {
      newErrors.item_name_hi = 'Item name (Hindi) is required';
    }

    // Validate custom item specific fields when stock_id is null
    if (isCustomItem) {
      const amountStr = String(formData.amount || "");
      if (!amountStr.trim()) {
        newErrors.amount = 'Amount is required for custom items';
      } else if (isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
        newErrors.amount = 'Amount must be a valid positive number';
      }

      const hsnCodeStr = String(formData.hsn_code || "");
      if (!hsnCodeStr.trim()) {
        newErrors.hsn_code = 'HSN code is required for custom items';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: OutletStockUpdateRequest = {
      quantity: Number(String(formData.quantity || 0)),
      invoice_quantity: Number(String(formData.invoice_quantity || 0)),
      minimum_quantity: Number(String(formData.minimum_quantity || 0)),
      is_extra_item: formData.is_extra_item,
      // Always send name object for ALL items
      name: {
        default: String(formData.item_name_default || ""),
        en: String(formData.item_name_en || formData.item_name_default || ""),
        hi: String(formData.item_name_hi || formData.item_name_default || ""),
      },
    };

    if (String(formData.movement_notes || "").trim()) {
      submitData.movement_notes = String(formData.movement_notes);
    }

    if (isCustomItem) {
      // Custom item specific updates
      submitData.amount = Number(String(formData.amount || 0));
      submitData.hsn_code = String(formData.hsn_code || "");
      
      if (formData.profile_image) {
        submitData.profile_image = formData.profile_image;
      }
    }

    onSave(submitData);
  };

  const closeModal = () => {
    setErrors({});
    onCancel();
  };

  if (!outletStock) return null;

  return (
    <>
    <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[800px] m-4">
      <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Outlet Stock Item
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Update stock details for "{parseItemName(outletStock.item_name)}"
          </p>

          {/* Show API errors */}
          {apiErrors && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">{apiErrors.message}</p>
              {Object.keys(apiErrors.fieldErrors).length > 0 && (
                <ul className="mt-2 text-red-600 dark:text-red-400 text-sm list-disc list-inside">
                  {Object.entries(apiErrors.fieldErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Item Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Current Item</h5>
              <div className="flex items-center gap-4">
                {outletStock.profile_image ? (
                  <img
                    className="h-16 w-16 rounded-lg object-cover"
                    src={outletStock.profile_image}
                    alt={parseItemName(outletStock.item_name)}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">
                      {parseItemName(outletStock.item_name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h6 className="font-medium text-gray-900 dark:text-white">
                    {parseItemName(outletStock.item_name)}
                  </h6>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    HSN: {outletStock.hsn_code} | Price: ₹{outletStock.amount}
                  </p>
                  {outletStock.unit && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Unit: {outletStock.unit.name.default || Object.values(outletStock.unit.name)[0]}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Type: {isCustomItem ? 'Custom Item' : 'Factory Stock'}
                  </p>
                </div>
                
                {/* Manage Extra Items Button - Only show for factory stock items */}
                {!isCustomItem && outletStock.stock_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManageExtraItemsOpen(true)}
                    className="ml-auto"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Manage Extra Items
                    {outletStock.extra_items && outletStock.extra_items.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium">
                        {outletStock.extra_items.length}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Stock Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quantity */}
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step={0.01}
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="Enter quantity"
                  error={!!errors.quantity}
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>}
              </div>

              {/* Invoice Quantity */}
              <div>
                <Label htmlFor="invoice_quantity">Invoice Quantity *</Label>
                <Input
                  id="invoice_quantity"
                  type="number"
                  min="0"
                  step={0.01}
                  value={formData.invoice_quantity}
                  onChange={(e) => handleInputChange('invoice_quantity', e.target.value)}
                  placeholder="Enter invoice quantity"
                  error={!!errors.invoice_quantity}
                />
                {errors.invoice_quantity && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.invoice_quantity}</p>}
              </div>

              {/* Minimum Quantity */}
              <div>
                <Label htmlFor="minimum_quantity">Minimum Quantity *</Label>
                <Input
                  id="minimum_quantity"
                  type="number"
                  min="0"
                  step={0.01}
                  value={formData.minimum_quantity}
                  onChange={(e) => handleInputChange('minimum_quantity', e.target.value)}
                  placeholder="Enter minimum quantity"
                  error={!!errors.minimum_quantity}
                />
                {errors.minimum_quantity && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minimum_quantity}</p>}
              </div>
            </div>

            {/* Extra Item Checkbox */}
            <div className="flex items-center">
              <input
                id="is_extra_item"
                type="checkbox"
                checked={formData.is_extra_item}
                onChange={(e) => handleInputChange('is_extra_item', e.target.checked)}
                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <Label htmlFor="is_extra_item" className="ml-2 mb-0">
                Is Extra Item
              </Label>
            </div>

            {/* Movement Notes */}
            <div>
              <Label htmlFor="movement_notes">Movement Notes</Label>
              <Input
                id="movement_notes"
                type="text"
                value={formData.movement_notes}
                onChange={(e) => handleInputChange('movement_notes', e.target.value)}
                placeholder="Add notes for this stock movement (optional)"
              />
            </div>

            {/* Item Names - Always visible for all items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">Update Item Names (Multi-Language)</h5>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="item_name_default">Item Name (Default) *</Label>
                  <Input
                    id="item_name_default"
                    type="text"
                    value={formData.item_name_default}
                    onChange={(e) => handleInputChange('item_name_default', e.target.value)}
                    placeholder="Enter item name"
                    error={!!errors.item_name_default}
                  />
                  {errors.item_name_default && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.item_name_default}</p>}
                </div>

                <div>
                  <Label htmlFor="item_name_en">Item Name (English)</Label>
                  <Input
                    id="item_name_en"
                    type="text"
                    value={formData.item_name_en}
                    onChange={(e) => handleInputChange('item_name_en', e.target.value)}
                    placeholder="Enter English name"
                  />
                </div>

                <div>
                  <Label htmlFor="item_name_hi">Item Name (Hindi) *</Label>
                  <Input
                    id="item_name_hi"
                    type="text"
                    value={formData.item_name_hi}
                    onChange={(e) => handleInputChange('item_name_hi', e.target.value)}
                    placeholder="हिंदी में नाम दर्ज करें"
                    error={!!errors.item_name_hi}
                  />
                  {errors.item_name_hi && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.item_name_hi}</p>}
                </div>
              </div>
            </div>

            {/* Custom Item Fields (only when stock_id is null) */}
            {isCustomItem && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <h5 className="text-lg font-medium text-gray-900 dark:text-white">Additional Custom Item Details</h5>
                  </div>

                  {/* Amount and HSN Code */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="amount">Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step={0.01}
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="Enter amount"
                        error={!!errors.amount}
                      />
                      {errors.amount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>}
                    </div>

                    <div>
                      <Label htmlFor="hsn_code">HSN Code *</Label>
                      <Input
                        id="hsn_code"
                        type="text"
                        value={formData.hsn_code}
                        onChange={(e) => handleInputChange('hsn_code', e.target.value)}
                        placeholder="Enter HSN code"
                        error={!!errors.hsn_code}
                      />
                      {errors.hsn_code && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hsn_code}</p>}
                    </div>
                  </div>

                  {/* Profile Image - Stock Item Style */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col items-center space-y-3">
                      <Label className="text-center">Update Item Image</Label>
                      {/* Image Preview */}
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                          {formData.profile_image ? (
                            <img
                              src={URL.createObjectURL(formData.profile_image)}
                              alt="Item preview"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : outletStock?.profile_image ? (
                            <img
                              src={outletStock.profile_image}
                              alt="Current item"
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="w-8 h-8 mx-auto mb-1 bg-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {formData.item_name_default.charAt(0).toUpperCase() || 'I'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">No image</p>
                            </div>
                          )}
                        </div>
                        {/* Upload/Remove buttons */}
                        <div className="mt-2 flex justify-center space-x-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            {outletStock?.profile_image || formData.profile_image ? 'Change' : 'Upload'}
                          </Button>
                          {(outletStock?.profile_image || formData.profile_image) && (
                            <Button size="sm" variant="outline" onClick={() => setFormData(prev => ({ ...prev, profile_image: null }))}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      {errors.profile_image && (
                        <p className="text-red-500 text-xs text-center">{errors.profile_image}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Stock Item'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
    
    {/* Manage Extra Items Modal */}
    <ManageExtraItemsModal
      isOpen={isManageExtraItemsOpen}
      outletStock={outletStock}
      onClose={() => setIsManageExtraItemsOpen(false)}
      onSuccess={() => {
        // Refresh the data to show new extra items
        if (onRefresh) {
          onRefresh();
        }
      }}
    />
    </>
  );
};

export default EditOutletStockModal;