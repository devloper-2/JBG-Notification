import { useState, useEffect, useRef } from "react";
import { OutletStockCreateRequest, StockItem, OutletStock } from "../../types/outletStock";
import outletStockService from "../../services/outletStockService";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface AddOutletStockModalProps {
  isOpen: boolean;
  onSave: (data: Omit<OutletStockCreateRequest, 'customer_id'>) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
  existingOutletStocks?: OutletStock[];
}

interface FormData {
  stock_id: string;
  quantity: string;
  invoice_quantity: string;
  minimum_quantity: string;
  is_extra_item: boolean;
  // Custom item fields
  item_name_default: string;
  item_name_en: string;
  item_name_hi: string;
  amount: string;
  hsn_code: string;
  profile_image: File | null;
}

const AddOutletStockModal: React.FC<AddOutletStockModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
  existingOutletStocks = [],
}) => {
  const [formData, setFormData] = useState<FormData>({
    stock_id: "",
    quantity: "",
    invoice_quantity: "",
    minimum_quantity: "",
    is_extra_item: false,
    item_name_default: "",
    item_name_en: "",
    item_name_hi: "",
    amount: "",
    hsn_code: "",
    profile_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [useExistingStock, setUseExistingStock] = useState(true); // Toggle for existing vs custom

  // Filter out stock items that are already added to this outlet
  // This prevents duplicate items from being added to the same outlet
  const availableStockItems = stockItems.filter(item => 
    !existingOutletStocks.some(outletStock => 
      outletStock.stock_id === item.stock_item_id && outletStock.stock_id !== null
    )
  );

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else {
      // Fetch stock items when modal opens
      fetchStockItems();
    }
  }, [isOpen]);

  const fetchStockItems = async () => {
    try {
      setStockItemsLoading(true);
      console.log('Fetching stock items...');
      const response = await outletStockService.getStockItems();
      console.log('Full stock items response:', response);
      console.log('Stock items data:', response?.data);
      console.log('Stock items array:', response?.data?.stock_items);
      
      // Access the correct path: response.data.stock_items
      const stockItemsArray = response?.data?.stock_items || [];
      console.log('Setting stock items:', stockItemsArray);
      setStockItems(stockItemsArray);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      // Ensure stockItems remains as an empty array on error
      setStockItems([]);
    } finally {
      setStockItemsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      stock_id: "",
      quantity: "",
      invoice_quantity: "",
      minimum_quantity: "",
      is_extra_item: false,
      item_name_default: "",
      item_name_en: "",
      item_name_hi: "",
      amount: "",
      hsn_code: "",
      profile_image: null,
    });
    setErrors({});
    setSelectedStockItem(null);
    setUseExistingStock(true);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle stock item selection
    if (field === 'stock_id') {
      if (value === '' || !useExistingStock) {
        // No stock item selected or custom mode
        setSelectedStockItem(null);
        // Clear auto-filled fields
        setFormData(prev => ({
          ...prev,
          stock_id: '',
          item_name_default: '',
          item_name_en: '',
          item_name_hi: '',
          amount: '',
          hsn_code: '',
        }));
      } else {
        // Existing stock item selected
        const stockItem = Array.isArray(availableStockItems) ? availableStockItems.find(item => item.stock_item_id === parseInt(value as string)) : null;
        if (stockItem) {
          setSelectedStockItem(stockItem);
          // Auto-fill fields from stock item, including multi-language names
          let nameDefault = '';
          let nameEn = '';
          let nameHi = '';
          
          // Parse multi-language names if available
          if (stockItem.item_name) {
            if (typeof stockItem.item_name === 'object') {
              const nameObj = stockItem.item_name as Record<string, any>;
              nameDefault = nameObj.default || nameObj.en || nameObj.hi || '';
              nameEn = nameObj.en || nameObj.default || '';
              nameHi = nameObj.hi || nameObj.default || '';
            } else if (typeof stockItem.item_name === 'string') {
              try {
                const parsed = JSON.parse(stockItem.item_name);
                if (typeof parsed === 'object' && parsed !== null) {
                  nameDefault = parsed.default || parsed.en || parsed.hi || '';
                  nameEn = parsed.en || parsed.default || '';
                  nameHi = parsed.hi || parsed.default || '';
                } else {
                  nameDefault = nameEn = nameHi = stockItem.item_name;
                }
              } catch {
                nameDefault = nameEn = nameHi = stockItem.item_name;
              }
            }
          }
          
          setFormData(prev => ({
            ...prev,
            stock_id: value as string,
            item_name_default: nameDefault,
            item_name_en: nameEn,
            item_name_hi: nameHi,
            amount: stockItem.selling_cost,
            hsn_code: stockItem.hsn_code,
          }));
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('profile_image', file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate quantity
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a valid positive number';
    }

    if (!formData.invoice_quantity.trim()) {
      newErrors.invoice_quantity = 'Invoice quantity is required';
    } else if (isNaN(Number(formData.invoice_quantity)) || Number(formData.invoice_quantity) < 0) {
      newErrors.invoice_quantity = 'Invoice quantity must be a valid positive number';
    }

    // Validate minimum quantity
    if (!formData.minimum_quantity.trim()) {
      newErrors.minimum_quantity = 'Minimum quantity is required';
    } else if (isNaN(Number(formData.minimum_quantity)) || Number(formData.minimum_quantity) < 0) {
      newErrors.minimum_quantity = 'Minimum quantity must be a valid positive number';
    }

    // Validate stock selection for existing stock mode
    if (useExistingStock && !formData.stock_id) {
      if (availableStockItems.length === 0 && stockItems.length > 0) {
        newErrors.stock_id = 'All stock items are already added. Please switch to custom item mode or select a different outlet.';
      } else {
        newErrors.stock_id = 'Please select a stock item or switch to custom item mode';
      }
    }

    // Validate name fields for all items (both existing and custom)
    if (!formData.item_name_default.trim()) {
      newErrors.item_name_default = 'Item name (Default) is required';
    }
    if (!formData.item_name_hi.trim()) {
      newErrors.item_name_hi = 'Item name (Hindi) is required';
    }

    // Validate custom item specific fields when no stock is selected
    if (!useExistingStock) {
      if (!formData.amount.trim()) {
        newErrors.amount = 'Amount is required for custom items';
      } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
        newErrors.amount = 'Amount must be a valid positive number';
      }

      if (!formData.hsn_code.trim()) {
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

    const submitData: Omit<OutletStockCreateRequest, 'customer_id'> = {
      quantity: Number(formData.quantity),
      invoice_quantity: Number(formData.invoice_quantity),
      minimum_quantity: Number(formData.minimum_quantity),
      is_extra_item: formData.is_extra_item,
      // Always send name object for all items
      name: {
        default: formData.item_name_default,
        en: formData.item_name_en || formData.item_name_default,
        hi: formData.item_name_hi || formData.item_name_default,
      },
    };

    if (useExistingStock && formData.stock_id) {
      // Existing stock item - include stock_id
      submitData.stock_id = parseInt(formData.stock_id);
    } else {
      // Custom item - include amount and hsn_code
      submitData.amount = Number(formData.amount);
      submitData.hsn_code = formData.hsn_code;
      
      if (formData.profile_image) {
        submitData.profile_image = formData.profile_image;
      }
    }

    onSave(submitData);
  };

  const closeModal = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[800px] m-4">
      <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Add Outlet Stock Item
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add a new stock item to this outlet. You can either select from existing factory stock or create a custom item.
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
            {/* Stock Item Selection Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">Stock Item Source</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose whether to select from existing stock items or create a custom item
                </p>
              </div>
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExistingStock}
                    onChange={(e) => {
                      setUseExistingStock(e.target.checked);
                      // Clear form when switching modes
                      setFormData(prev => ({
                        ...prev,
                        stock_id: '',
                        item_name_default: '',
                        item_name_en: '',
                        item_name_hi: '',
                        amount: '',
                        hsn_code: '',
                        profile_image: null,
                      }));
                      setSelectedStockItem(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                    {useExistingStock ? 'Use Existing Stock' : 'Create Custom Item'}
                  </span>
                </label>
              </div>
            </div>

            {/* Stock Item Selection Dropdown - Only show when useExistingStock is true */}
            {useExistingStock && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="stock_id">Select Stock Item</Label>
                  {!stockItemsLoading && stockItems.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {availableStockItems.length} available
                      {existingOutletStocks.length > 0 && ` • ${existingOutletStocks.filter(s => s.stock_id !== null).length} already added`}
                    </span>
                  )}
                </div>
                <select
                  id="stock_id"
                  value={formData.stock_id}
                  onChange={(e) => handleInputChange('stock_id', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={stockItemsLoading}
                >
                  <option value="">Select a stock item...</option>
                  {(() => {
                    console.log('Rendering dropdown with availableStockItems:', availableStockItems);
                    console.log('availableStockItems is array:', Array.isArray(availableStockItems));
                    console.log('availableStockItems length:', availableStockItems?.length);
                    return Array.isArray(availableStockItems) && availableStockItems.map((item) => {
                      console.log('Rendering item:', item);
                      const itemName = parseItemName(item.item_name);
                      console.log('Parsed item name:', itemName);
                      return (
                        <option key={item.stock_item_id} value={item.stock_item_id}>
                          {itemName} (HSN: {item.hsn_code})
                        </option>
                      );
                    });
                  })()}
                </select>
                {stockItemsLoading && (
                  <p className="mt-1 text-sm text-gray-500">Loading stock items...</p>
                )}
                {!stockItemsLoading && availableStockItems.length === 0 && stockItems.length > 0 && (
                  <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      ⚠️ All available stock items are already added to this outlet.
                    </p>
                    <p className="text-xs text-orange-500 dark:text-orange-500 mt-1">
                      Switch to "Create Custom Item" mode to add a new item.
                    </p>
                  </div>
                )}
                {!stockItemsLoading && stockItems.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No stock items available.</p>
                )}
                {!stockItemsLoading && availableStockItems.length > 0 && stockItems.length > availableStockItems.length && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Showing {availableStockItems.length} of {stockItems.length} items (filtering out already added items)
                  </p>
                )}
                {errors.stock_id && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stock_id}</p>}
              </div>
            )}

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

            {/* Item Names - Always visible for all items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">Item Names (Multi-Language)</h5>
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
                    disabled={useExistingStock && !formData.stock_id}
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
                    disabled={useExistingStock && !formData.stock_id}
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
                    disabled={useExistingStock && !formData.stock_id}
                  />
                  {errors.item_name_hi && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.item_name_hi}</p>}
                </div>
              </div>
            </div>

            {/* Custom Item Fields */}
            {!useExistingStock && (
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
                      <Label className="text-center">Item Image</Label>
                      {/* Image Preview */}
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                          {formData.profile_image ? (
                            <img
                              src={URL.createObjectURL(formData.profile_image)}
                              alt="Item preview"
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
                        {/* Upload button */}
                        <div className="mt-2 flex justify-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Upload
                          </Button>
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

            {/* Selected Stock Item Preview */}
            {selectedStockItem && useExistingStock && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h5 className="text-lg font-medium text-gray-900 dark:text-white">Selected Stock Item</h5>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    {selectedStockItem.profile_image ? (
                      <img
                        className="h-16 w-16 rounded-lg object-cover"
                        src={selectedStockItem.profile_image}
                        alt={parseItemName(selectedStockItem.item_name)}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 text-2xl">
                          {parseItemName(selectedStockItem.item_name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h6 className="font-medium text-gray-900 dark:text-white">
                        {parseItemName(selectedStockItem.item_name)}
                      </h6>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        HSN: {selectedStockItem.hsn_code} | Price: ₹{selectedStockItem.selling_cost}
                      </p>
                      {selectedStockItem.unit && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Unit: {selectedStockItem.unit.name.default || Object.values(selectedStockItem.unit.name)[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                    Adding...
                  </>
                ) : (
                  'Add Stock Item'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddOutletStockModal;