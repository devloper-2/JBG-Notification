import { useState, useEffect, useRef } from "react";
import { StockItemUpdateRequest, StockItemFormData, Unit, StockItem } from "../../types/stockItem";
import stockItemService from "../../services/stockItemService";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { generateBarcodeNumber, generateBarcodeImage, validateBarcodeNumber } from "../../utils/barcodeUtils";

interface EditStockItemModalProps {
  isOpen: boolean;
  stockItem: StockItem | null;
  onSave: (data: StockItemUpdateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
}

const EditStockItemModal: React.FC<EditStockItemModalProps> = ({
  isOpen,
  stockItem,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
}) => {
  const [formData, setFormData] = useState<StockItemFormData>({
    hsn_code: "",
    unit_id: "",
    item_name_default: "",
    item_name_en: "",
    item_name_hi: "",
    selling_cost: "",
    production_cost: "",
    tax_percentage: "",
    is_active: true,
    quantity: "",
    barcode_number: "",
    is_packaging: false,
    is_flavour: false,
    is_sugerfree: false,
    is_malay: false,
    profile_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [displayErrors, setDisplayErrors] = useState<Record<string, string>>({});
  const [barcodePreview, setBarcodePreview] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load units on component mount
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsData = await stockItemService.getUnits();
        setUnits(unitsData.units);
      } catch (error) {
        console.error('Failed to load units:', error);
      }
    };

    if (isOpen) {
      loadUnits();
    }
  }, [isOpen]);

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined): Record<string, string> => {
    if (!itemName) {
      return { default: '', en: '', hi: '' };
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, string>;
      return {
        default: obj.default || obj.en || obj.hi || obj["1"] || '',
        en: obj.en || obj.default || obj["1"] || '',
        hi: obj.hi || obj.default || obj["2"] || ''
      };
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            default: parsed.default || parsed.en || parsed.hi || parsed["1"] || '',
            en: parsed.en || parsed.default || parsed["1"] || '',
            hi: parsed.hi || parsed.default || parsed["2"] || ''
          };
        }
        return { default: itemName, en: '', hi: '' };
      } catch {
        return { default: itemName, en: '', hi: '' };
      }
    }
    
    return { default: '', en: '', hi: '' };
  };

  // Initialize form data when modal opens or stock item changes
  useEffect(() => {
    if (isOpen && stockItem) {
      // Parse item name JSON
      const itemNameData = parseItemName(stockItem.item_name);

      setFormData({
        hsn_code: stockItem.hsn_code || '',
        unit_id: stockItem.unit_id.toString(),
        item_name_default: itemNameData.default || '',
        item_name_en: itemNameData.en || '',
        item_name_hi: itemNameData.hi || '',
        selling_cost: stockItem.selling_cost || '',
        production_cost: stockItem.production_cost || '',
        tax_percentage: stockItem.tax_percentage || '0',
        is_active: stockItem.is_active,
        quantity: stockItem.quantity || '',
        barcode_number: stockItem.barcode_number || '',
        is_packaging: stockItem.is_packaging || false,
        is_flavour: stockItem.is_flavour || false,
        is_sugerfree: stockItem.is_sugerfree || false,
        is_malay: stockItem.is_malay || false,
        profile_image: null,
        current_profile_image: stockItem.profile_image_url,
      });
      setErrors({});
      
      // Generate barcode preview if barcode number exists
      if (stockItem.barcode_number) {
        updateBarcodePreview(stockItem.barcode_number);
      }
    }
  }, [isOpen, stockItem]);

  // Combine client-side errors with API errors
  useEffect(() => {
    const combined = { ...errors, ...(apiErrors?.fieldErrors || {}) };
    setDisplayErrors(combined);
  }, [errors, apiErrors]);

  // Generate a new barcode number
  const handleGenerateBarcode = () => {
    const newBarcodeNumber = generateBarcodeNumber();
    handleInputChange('barcode_number', newBarcodeNumber);
    updateBarcodePreview(newBarcodeNumber);
  };

  // Update barcode preview when barcode number changes
  const updateBarcodePreview = (barcodeNumber: string) => {
    if (barcodeNumber && validateBarcodeNumber(barcodeNumber)) {
      const preview = generateBarcodeImage(barcodeNumber);
      setBarcodePreview(preview);
    } else {
      setBarcodePreview("");
    }
  };

  const handleInputChange = (field: keyof StockItemFormData, value: string | File | null | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update barcode preview when barcode number changes
    if (field === 'barcode_number' && typeof value === 'string') {
      updateBarcodePreview(value);
    }
    
    // Auto-select Liter unit when flavour checkbox is checked
    if (field === 'is_flavour' && value === true) {
      const literUnitId = findLiterUnitId();
      if (literUnitId) {
        setFormData(prev => ({ ...prev, [field]: value, unit_id: literUnitId }));
        // Clear any existing unit validation errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.unit_id;
          return newErrors;
        });
      } else {
        // If no Liter unit found, show warning but still allow the change
        console.warn('Liter unit not found in available units');
      }
    }
    // Auto-select Kilogram unit when malay checkbox is checked
    else if (field === 'is_malay' && value === true) {
      const kilogramUnitId = findKilogramUnitId();
      if (kilogramUnitId) {
        setFormData(prev => ({ ...prev, [field]: value, unit_id: kilogramUnitId }));
        // Clear any existing unit validation errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.unit_id;
          return newErrors;
        });
      } else {
        // If no Kilogram unit found, show warning but still allow the change
        console.warn('Kilogram unit not found in available units');
      }
    }
    // Re-validate unit when flavour checkbox is unchecked or unit changes
    else if (field === 'is_flavour' || (field === 'unit_id' && formData.is_flavour)) {
      setTimeout(() => {
        const updatedFormData = { ...formData, [field]: value };
        if (updatedFormData.unit_id) {
          const unitError = validateField('unit_id', updatedFormData.unit_id);
          if (unitError) {
            setErrors(prev => ({ ...prev, unit_id: unitError }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.unit_id;
              return newErrors;
            });
          }
        }
      }, 0);
    }
    // Re-validate unit when malay checkbox is unchecked or unit changes
    else if (field === 'is_malay' || (field === 'unit_id' && formData.is_malay)) {
      setTimeout(() => {
        const updatedFormData = { ...formData, [field]: value };
        if (updatedFormData.unit_id) {
          const unitError = validateField('unit_id', updatedFormData.unit_id);
          if (unitError) {
            setErrors(prev => ({ ...prev, unit_id: unitError }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.unit_id;
              return newErrors;
            });
          }
        }
      }, 0);
    }
    
    // Clear the error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field: keyof StockItemFormData, value: any) => {
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Helper function to check if a unit is a liter unit
  const isLiterUnit = (unitId: string): boolean => {
    const unit = units.find(u => u.id === parseInt(unitId));
    if (!unit) return false;
    
    // Check unit type for liquid/volume types
    const unitType = unit.unit_type?.toLowerCase();
    if (unitType === 'liquid' || unitType === 'volume') {
      return true;
    }
    
    // Check unit name for liter/litre variants
    const unitName = (unit.name?.default || unit.name?.en || Object.values(unit.name || {})[0] || '').toLowerCase();
    const shortName = (unit.short_name?.default || unit.short_name?.en || Object.values(unit.short_name || {})[0] || '').toLowerCase();
    
    return unitName.includes('liter') || unitName.includes('litre') || 
           shortName.includes('liter') || shortName.includes('litre') ||
           shortName === 'l' || shortName === 'lt';
  };

  // Helper function to find the Liter unit ID
  const findLiterUnitId = (): string => {
    const literUnit = units.find(unit => {
      const unitName = (unit.name?.default || unit.name?.en || Object.values(unit.name || {})[0] || '').toLowerCase();
      return unitName === 'liter' || unitName === 'litre';
    });
    return literUnit ? literUnit.id.toString() : '';
  };

  // Helper function to check if a unit is Kilogram
  const isKilogramUnit = (unitId: string): boolean => {
    const unit = units.find(u => u.id === parseInt(unitId));
    if (!unit) return false;
    
    // Check unit name for kilogram variants
    const unitName = (unit.name?.default || unit.name?.en || Object.values(unit.name || {})[0] || '').toLowerCase();
    return unitName === 'kilogram' || unitName === 'kg';
  };

  // Helper function to find the Kilogram unit ID
  const findKilogramUnitId = (): string => {
    const kilogramUnit = units.find(unit => {
      const unitName = (unit.name?.default || unit.name?.en || Object.values(unit.name || {})[0] || '').toLowerCase();
      return unitName === 'kilogram' || unitName === 'kg';
    });
    return kilogramUnit ? kilogramUnit.id.toString() : '';
  };

  const validateField = (field: keyof StockItemFormData, value: any): string => {
    switch (field) {
      case 'item_name_default':
        return !String(value).trim() ? "Item name is required" : "";
      case 'hsn_code':
        return !String(value).trim() ? "HSN code is required" : "";
      case 'unit_id':
        if (!String(value).trim() || String(value) === "0") {
          return "Unit is required";
        }
        // Check flavour-liter validation
        if (formData.is_flavour && !isLiterUnit(String(value))) {
          return "When flavour is selected, unit must be in liters";
        }
        // Check malay-kilogram validation
        if (formData.is_malay && !isKilogramUnit(String(value))) {
          return "When Malay is selected, unit must be Kilogram";
        }
        return "";
      case 'quantity':
        const qty = parseFloat(String(value));
        return isNaN(qty) || qty < 0 ? "Quantity must be 0 or greater" : "";
      case 'selling_cost':
        const sellingCost = parseFloat(String(value));
        return isNaN(sellingCost) || sellingCost <= 0 ? "Selling cost must be greater than 0" : "";
      case 'production_cost':
        const productionCost = parseFloat(String(value));
        return isNaN(productionCost) || productionCost <= 0 ? "Production cost must be greater than 0" : "";
      case 'tax_percentage':
        const taxPercentage = parseFloat(String(value));
        if (isNaN(taxPercentage) || taxPercentage < 0) {
          return "Tax percentage must be 0 or greater";
        }
        if (taxPercentage > 100) {
          return "Tax percentage cannot exceed 100";
        }
        return "";
      case 'barcode_number':
        const barcode = String(value).trim();
        if (!barcode) return "Barcode number is required";
        if (!validateBarcodeNumber(barcode)) return "Invalid barcode format (minimum 8 digits)";
        return "";
      default:
        return "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.item_name_default.trim()) {
      newErrors.item_name_default = "Item name is required";
    }
    
    if (!formData.hsn_code.trim()) {
      newErrors.hsn_code = "HSN code is required";
    }
    
    if (!formData.unit_id || formData.unit_id === "0") {
      newErrors.unit_id = "Unit is required";
    } else if (formData.is_flavour && !isLiterUnit(formData.unit_id)) {
      newErrors.unit_id = "When flavour is selected, unit must be in liters";
    } else if (formData.is_malay && !isKilogramUnit(formData.unit_id)) {
      newErrors.unit_id = "When Malay is selected, unit must be Kilogram";
    }
    
    if (!formData.quantity.trim()) {
      newErrors.quantity = "Quantity is required";
    } else {
      const qty = parseFloat(formData.quantity);
      if (isNaN(qty) || qty < 0) {
        newErrors.quantity = "Quantity must be 0 or greater";
      }
    }
    
    if (!formData.selling_cost.trim()) {
      newErrors.selling_cost = "Selling cost is required";
    } else {
      const sellingCost = parseFloat(formData.selling_cost);
      if (isNaN(sellingCost) || sellingCost <= 0) {
        newErrors.selling_cost = "Selling cost must be greater than 0";
      }
    }

    if (!formData.production_cost.trim()) {
      newErrors.production_cost = "Production cost is required";
    } else {
      const productionCost = parseFloat(formData.production_cost);
      if (isNaN(productionCost) || productionCost <= 0) {
        newErrors.production_cost = "Production cost must be greater than 0";
      }
    }

    if (!formData.tax_percentage.trim()) {
      newErrors.tax_percentage = "Tax percentage is required";
    } else {
      const taxPercentage = parseFloat(formData.tax_percentage);
      if (isNaN(taxPercentage) || taxPercentage < 0) {
        newErrors.tax_percentage = "Tax percentage must be 0 or greater";
      } else if (taxPercentage > 100) {
        newErrors.tax_percentage = "Tax percentage cannot exceed 100";
      }
    }

    if (!formData.barcode_number.trim()) {
      newErrors.barcode_number = "Barcode number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for API
    const apiData: StockItemUpdateRequest = {
      hsn_code: formData.hsn_code.trim(),
      unit_id: parseInt(formData.unit_id),
      item_name: {
        default: formData.item_name_default.trim(),
        en: formData.item_name_en.trim() || formData.item_name_default.trim(),
        hi: formData.item_name_hi.trim() || formData.item_name_default.trim(),
      },
      selling_cost: parseFloat(formData.selling_cost),
      production_cost: parseFloat(formData.production_cost),
      tax_percentage: parseFloat(formData.tax_percentage),
      is_active: formData.is_active,
      quantity: parseFloat(formData.quantity),
      barcode_number: formData.barcode_number.trim(),
      is_packaging: formData.is_packaging,
      is_flavour: formData.is_flavour,
      is_sugerfree: formData.is_sugerfree,
      is_malay: formData.is_malay,
      profile_image: formData.profile_image,
    };

    onSave(apiData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('profile_image', file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    handleInputChange('profile_image', null);
    handleInputChange('current_profile_image', null);
  };

  const hasCurrentImage = formData.current_profile_image && !formData.profile_image;
  const hasNewImage = formData.profile_image;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Stock Item
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update stock item details, pricing, and inventory information.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
            {/* API Error Message */}
            {apiErrors?.message && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{apiErrors.message}</p>
              </div>
            )}

            {/* Stock Item Image - Centered at top */}
            <div className="mb-8 flex justify-center">
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-center">Stock Item Image</Label>
                {/* Image Preview */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {hasNewImage ? (
                      <img
                        src={URL.createObjectURL(formData.profile_image!)}
                        alt="Stock item preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : hasCurrentImage ? (
                      <img
                        src={formData.current_profile_image!}
                        alt="Current stock item"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-1 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {formData.item_name_default.charAt(0).toUpperCase() || 'S'}
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
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                    <Button size="sm" variant="outline" onClick={handleUploadClick} disabled={isSaving}>
                      {hasCurrentImage || hasNewImage ? 'Change' : 'Upload'}
                    </Button>
                    {(hasCurrentImage || hasNewImage) && (
                      <Button size="sm" variant="outline" onClick={handleRemoveImage} disabled={isSaving}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                {displayErrors.profile_image && (
                  <p className="text-red-500 text-xs text-center">{displayErrors.profile_image}</p>
                )}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {/* Item Name (Default) */}
              <div className="md:col-span-2">
                <Label htmlFor="item_name_default">Item Name *</Label>
                <Input
                  id="item_name_default"
                  type="text"
                  value={formData.item_name_default}
                  onChange={(e) => handleInputChange('item_name_default', e.target.value)}
                  onBlur={(e) => handleFieldBlur('item_name_default', e.target.value)}
                  placeholder="Enter item name"
                  error={!!displayErrors.item_name_default}
                  disabled={isSaving}
                />
                {displayErrors.item_name_default && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.item_name_default}</p>
                )}
              </div>

              {/* Item Name (English) */}
              <div>
                <Label htmlFor="item_name_en">Item Name (English)</Label>
                <Input
                  id="item_name_en"
                  type="text"
                  value={formData.item_name_en}
                  onChange={(e) => handleInputChange('item_name_en', e.target.value)}
                  placeholder="Enter English name"
                  disabled={isSaving}
                />
              </div>

              {/* Item Name (Hindi) */}
              <div>
                <Label htmlFor="item_name_hi">Item Name (Hindi)</Label>
                <Input
                  id="item_name_hi"
                  type="text"
                  value={formData.item_name_hi}
                  onChange={(e) => handleInputChange('item_name_hi', e.target.value)}
                  placeholder="Enter Hindi name"
                  disabled={isSaving}
                />
              </div>

              {/* HSN Code */}
              <div>
                <Label htmlFor="hsn_code">HSN Code *</Label>
                <Input
                  id="hsn_code"
                  type="text"
                  value={formData.hsn_code}
                  onChange={(e) => handleInputChange('hsn_code', e.target.value)}
                  onBlur={(e) => handleFieldBlur('hsn_code', e.target.value)}
                  placeholder="Enter HSN code"
                  error={!!displayErrors.hsn_code}
                  disabled={isSaving}
                />
                {displayErrors.hsn_code && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.hsn_code}</p>
                )}
              </div>

              {/* Barcode Number - Moved to single column without preview for now */}
              <div>
                <Label htmlFor="barcode_number">Barcode Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode_number"
                    type="text"
                    value={formData.barcode_number}
                    onChange={(e) => handleInputChange('barcode_number', e.target.value)}
                    onBlur={(e) => handleFieldBlur('barcode_number', e.target.value)}
                    placeholder="Enter barcode number"
                    error={!!displayErrors.barcode_number}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateBarcode}
                    disabled={isSaving}
                    className="whitespace-nowrap"
                  >
                    Generate
                  </Button>
                </div>
                {displayErrors.barcode_number && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.barcode_number}</p>
                )}
              </div>

              {/* Barcode Preview - Full width */}
              {barcodePreview && (
                <div className="md:col-span-2">
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <img 
                        src={barcodePreview} 
                        alt="Barcode preview" 
                        className="max-w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Unit */}
              <div>
                <Label htmlFor="unit_id">Unit *</Label>
                <select
                  id="unit_id"
                  value={formData.unit_id}
                  onChange={(e) => handleInputChange('unit_id', e.target.value)}
                  onBlur={(e) => handleFieldBlur('unit_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    displayErrors.unit_id ? 'border-red-500' : 'border-gray-300'
                  } ${isSaving || formData.is_malay ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSaving || formData.is_malay}
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name.default} ({unit.short_name.default})
                    </option>
                  ))}
                </select>
                {displayErrors.unit_id && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.unit_id}</p>
                )}
                {formData.is_malay && (
                  <p className="text-blue-500 text-xs mt-1">Unit is automatically set to Kilogram for Malay items</p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step={0.01}
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  onBlur={(e) => handleFieldBlur('quantity', e.target.value)}
                  placeholder="Enter quantity"
                  error={!!displayErrors.quantity}
                  disabled={isSaving}
                />
                {displayErrors.quantity && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.quantity}</p>
                )}
              </div>

              {/* Production Cost */}
              <div>
                <Label htmlFor="production_cost">Production Cost *</Label>
                <Input
                  id="production_cost"
                  type="number"
                  step={0.01}
                  min="0"
                  value={formData.production_cost}
                  onChange={(e) => handleInputChange('production_cost', e.target.value)}
                  onBlur={(e) => handleFieldBlur('production_cost', e.target.value)}
                  placeholder="Enter production cost"
                  error={!!displayErrors.production_cost}
                  disabled={isSaving}
                />
                {displayErrors.production_cost && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.production_cost}</p>
                )}
              </div>

              {/* Selling Cost */}
              <div>
                <Label htmlFor="selling_cost">Selling Price *</Label>
                <Input
                  id="selling_cost"
                  type="number"
                  step={0.01}
                  min="0"
                  value={formData.selling_cost}
                  onChange={(e) => handleInputChange('selling_cost', e.target.value)}
                  onBlur={(e) => handleFieldBlur('selling_cost', e.target.value)}
                  placeholder="Enter selling price"
                  error={!!displayErrors.selling_cost}
                  disabled={isSaving}
                />
                {displayErrors.selling_cost && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.selling_cost}</p>
                )}
              </div>

              {/* Tax Percentage */}
              <div>
                <Label htmlFor="tax_percentage">Tax Percentage *</Label>
                <Input
                  id="tax_percentage"
                  type="number"
                  step={0.01}
                  min="0"
                  max="100"
                  value={formData.tax_percentage}
                  onChange={(e) => handleInputChange('tax_percentage', e.target.value)}
                  onBlur={(e) => handleFieldBlur('tax_percentage', e.target.value)}
                  placeholder="Enter tax percentage"
                  error={!!displayErrors.tax_percentage}
                  disabled={isSaving}
                />
                {displayErrors.tax_percentage && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.tax_percentage}</p>
                )}
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === true}
                      onChange={() => handleInputChange('is_active', true)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === false}
                      onChange={() => handleInputChange('is_active', false)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Inactive</span>
                  </label>
                </div>
              </div>

              {/* Item Options */}
              <div className="md:col-span-2">
                <Label>Item Options</Label>
                <div className="grid grid-cols-1 gap-3 mt-2 md:grid-cols-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_packaging}
                      onChange={(e) => handleInputChange('is_packaging', e.target.checked)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Packaging Item</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_flavour}
                      onChange={(e) => handleInputChange('is_flavour', e.target.checked)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Flavour Item</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_sugerfree}
                      onChange={(e) => handleInputChange('is_sugerfree', e.target.checked)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Sugarfree Item</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_malay}
                      onChange={(e) => handleInputChange('is_malay', e.target.checked)}
                      disabled={isSaving}
                      className="mr-2"
                    />
                    <span className="text-sm">Malay Item</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditStockItemModal;
