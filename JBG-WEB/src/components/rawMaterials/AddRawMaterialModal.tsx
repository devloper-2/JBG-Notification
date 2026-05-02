import { useState, useEffect, useRef } from "react";
import { RawMaterialCreateRequest, RawMaterialFormData, Unit } from "../../types/rawMaterial";
import unitService from "../../services/unitService";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onSave: (data: RawMaterialCreateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
}

const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
}) => {
  const [formData, setFormData] = useState<RawMaterialFormData>({
    hsn_code: "",
    unit_id: "",
    item_name_default: "",
    item_name_1: "",
    item_name_2: "",
    quantity: "",
    cost_price: "",
    shelf_life_days: "",
    min_stock_level: "",
    max_stock_level: "",
    profile_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else {
      // Fetch units when modal opens
      fetchUnits();
    }
  }, [isOpen]);

  const fetchUnits = async () => {
    try {
      setUnitsLoading(true);
      const response = await unitService.getUnits();
      setUnits(response.units);
    } catch (error) {
      console.error('Error fetching units:', error);
      // Optionally show error message to user
    } finally {
      setUnitsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      hsn_code: "",
      unit_id: "",
      item_name_default: "",
      item_name_1: "",
      item_name_2: "",
      quantity: "",
      cost_price: "",
      shelf_life_days: "",
      min_stock_level: "",
      max_stock_level: "",
      profile_image: null,
    });
    setErrors({});
  };

  // Reset API errors when form data changes
  useEffect(() => {
    if (apiErrors?.fieldErrors) {
      // Clear API errors when user starts typing
    }
  }, [formData, apiErrors]);

  const handleInputChange = (field: keyof RawMaterialFormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear the error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field: keyof RawMaterialFormData, value: any) => {
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

  const validateField = (field: keyof RawMaterialFormData, value: any): string => {
    switch (field) {
      case 'item_name_default':
        return !String(value).trim() ? "Item name is required" : "";
      case 'hsn_code':
        return "";
      case 'unit_id':
        return !String(value).trim() || String(value) === "0" ? "Unit is required" : "";
      case 'quantity':
        const qty = parseFloat(String(value));
        return isNaN(qty) || qty <= 0 ? "Quantity must be greater than 0" : "";
      case 'cost_price':
        const price = parseFloat(String(value));
        return isNaN(price) || price <= 0 ? "Cost price must be greater than 0" : "";
      case 'shelf_life_days':
        if (String(value).trim()) {
          const days = parseInt(String(value));
          return isNaN(days) || days <= 0 ? "Shelf life must be greater than 0" : "";
        }
        return "";
      case 'min_stock_level':
        if (String(value).trim()) {
          const minLevel = parseFloat(String(value));
          if (isNaN(minLevel) || minLevel < 0) {
            return "Minimum stock level must be 0 or greater";
          }
        }
        return "";
      case 'max_stock_level':
        if (String(value).trim()) {
          const maxLevel = parseFloat(String(value));
          if (isNaN(maxLevel) || maxLevel < 0) {
            return "Maximum stock level must be 0 or greater";
          }
        }
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
    
    if (!formData.unit_id || formData.unit_id === "0") {
      newErrors.unit_id = "Unit is required";
    }
    
    if (!formData.quantity.trim()) {
      newErrors.quantity = "Quantity is required";
    } else {
      const qty = parseFloat(formData.quantity);
      if (isNaN(qty) || qty <= 0) {
        newErrors.quantity = "Quantity must be greater than 0";
      }
    }
    
    if (!formData.cost_price.trim()) {
      newErrors.cost_price = "Cost price is required";
    } else {
      const price = parseFloat(formData.cost_price);
      if (isNaN(price) || price <= 0) {
        newErrors.cost_price = "Cost price must be greater than 0";
      }
    }

    // Validate optional fields
    if (formData.shelf_life_days.trim()) {
      const days = parseInt(formData.shelf_life_days);
      if (isNaN(days) || days <= 0) {
        newErrors.shelf_life_days = "Shelf life must be greater than 0";
      }
    }

    if (formData.min_stock_level.trim()) {
      const minLevel = parseFloat(formData.min_stock_level);
      if (isNaN(minLevel) || minLevel < 0) {
        newErrors.min_stock_level = "Minimum stock level must be 0 or greater";
      }
    }

    if (formData.max_stock_level.trim()) {
      const maxLevel = parseFloat(formData.max_stock_level);
      if (isNaN(maxLevel) || maxLevel < 0) {
        newErrors.max_stock_level = "Maximum stock level must be 0 or greater";
      }
    }

    // Cross-validation: max stock level must be greater than min stock level
    if (formData.min_stock_level.trim() && formData.max_stock_level.trim()) {
      const minLevel = parseFloat(formData.min_stock_level);
      const maxLevel = parseFloat(formData.max_stock_level);
      if (!isNaN(minLevel) && !isNaN(maxLevel) && maxLevel <= minLevel) {
        newErrors.max_stock_level = "Maximum stock level must be greater than minimum stock level";
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

    // Prepare data for API
    const apiData: RawMaterialCreateRequest = {
      ...(formData.hsn_code.trim() && { hsn_code: formData.hsn_code.trim() }),
      unit_id: parseInt(formData.unit_id),
      item_name: {
        default: formData.item_name_default.trim(),
        "1": formData.item_name_1.trim() || formData.item_name_default.trim(),
        "2": formData.item_name_2.trim() || formData.item_name_default.trim(),
      },
      quantity: parseFloat(formData.quantity),
      cost_price: parseFloat(formData.cost_price),
      shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : undefined,
      min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : undefined,
      max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : undefined,
      profile_image: formData.profile_image || undefined,
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

  // Combine client-side errors with API errors
  const displayErrors = { ...errors, ...(apiErrors?.fieldErrors || {}) };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Add New Raw Material
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Create a new raw material with details, pricing, and inventory information.
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

            {/* Raw Material Image - Centered at top */}
            <div className="mb-8 flex justify-center">
              <div className="flex flex-col items-center space-y-3">
                <Label className="text-center">Raw Material Image</Label>
                {/* Image Preview */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {formData.profile_image ? (
                      <img
                        src={URL.createObjectURL(formData.profile_image)}
                        alt="Raw material preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-1 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {formData.item_name_default.charAt(0).toUpperCase() || 'R'}
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
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                    <Button size="sm" variant="outline" onClick={handleUploadClick} disabled={isSaving}>
                      Upload
                    </Button>
                  </div>
                </div>
                {displayErrors.profile_image && (
                  <p className="text-red-500 text-xs text-center">{displayErrors.profile_image}</p>
                )}
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
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

          {/* Item Name (Language 1) */}
          <div>
            <Label htmlFor="item_name_1">Item Name (Language 1)</Label>
            <Input
              id="item_name_1"
              type="text"
              value={formData.item_name_1}
              onChange={(e) => handleInputChange('item_name_1', e.target.value)}
              placeholder="Optional: Enter alternate name"
              disabled={isSaving}
            />
          </div>

          {/* Item Name (Language 2) */}
          <div>
            <Label htmlFor="item_name_2">Item Name (Language 2)</Label>
            <Input
              id="item_name_2"
              type="text"
              value={formData.item_name_2}
              onChange={(e) => handleInputChange('item_name_2', e.target.value)}
              placeholder="Optional: Enter alternate name"
              disabled={isSaving}
            />
          </div>

          {/* HSN Code */}
          <div>
            <Label htmlFor="hsn_code">HSN Code</Label>
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

          {/* Unit ID */}
          <div>
            <Label htmlFor="unit_id">Unit *</Label>
            <select
              id="unit_id"
              value={formData.unit_id}
              onChange={(e) => handleInputChange('unit_id', e.target.value)}
              onBlur={(e) => handleFieldBlur('unit_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 ${
                displayErrors.unit_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } dark:bg-gray-800 dark:text-white`}
              disabled={isSaving || unitsLoading}
            >
              <option value="">
                {unitsLoading ? 'Loading units...' : 'Select a unit'}
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id.toString()}>
                  {unit.name.default} ({unit.short_name.default})
                </option>
              ))}
            </select>
            {displayErrors.unit_id && (
              <p className="text-red-500 text-xs mt-1">{displayErrors.unit_id}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step={0.001}
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

          {/* Cost Price */}
          <div>
            <Label htmlFor="cost_price">Cost Price (₹) *</Label>
            <Input
              id="cost_price"
              type="number"
              step={0.01}
              min="0"
              value={formData.cost_price}
              onChange={(e) => handleInputChange('cost_price', e.target.value)}
              onBlur={(e) => handleFieldBlur('cost_price', e.target.value)}
              placeholder="Enter cost price"
              error={!!displayErrors.cost_price}
              disabled={isSaving}
            />
            {displayErrors.cost_price && (
              <p className="text-red-500 text-xs mt-1">{displayErrors.cost_price}</p>
            )}
          </div>

          {/* Shelf Life Days */}
          <div>
            <Label htmlFor="shelf_life_days">Shelf Life (Days)</Label>
            <Input
              id="shelf_life_days"
              type="number"
              min="1"
              value={formData.shelf_life_days}
              onChange={(e) => handleInputChange('shelf_life_days', e.target.value)}
              onBlur={(e) => handleFieldBlur('shelf_life_days', e.target.value)}
              placeholder="Enter shelf life in days"
              error={!!displayErrors.shelf_life_days}
              disabled={isSaving}
            />
            {displayErrors.shelf_life_days && (
              <p className="text-red-500 text-xs mt-1">{displayErrors.shelf_life_days}</p>
            )}
          </div>

          {/* Min Stock Level */}
          <div>
            <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
            <Input
              id="min_stock_level"
              type="number"
              step={0.001}
              min="0"
              value={formData.min_stock_level}
              onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
              placeholder="Enter minimum stock level"
              disabled={isSaving}
            />
            {displayErrors.min_stock_level && (
              <p className="text-red-500 text-xs mt-1">{displayErrors.min_stock_level}</p>
            )}
          </div>

          {/* Max Stock Level */}
          <div>
            <Label htmlFor="max_stock_level">Maximum Stock Level</Label>
            <Input
              id="max_stock_level"
              type="number"
              step={0.001}
              min="0"
              value={formData.max_stock_level}
              onChange={(e) => handleInputChange('max_stock_level', e.target.value)}
              placeholder="Enter maximum stock level"
              disabled={isSaving}
            />
            {displayErrors.max_stock_level && (
              <p className="text-red-500 text-xs mt-1">{displayErrors.max_stock_level}</p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding...
                  </>
                ) : (
                  "Add Raw Material"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddRawMaterialModal;
