import { useState, useEffect, useRef } from "react";
import { RawMaterialUpdateRequest, RawMaterialFormData, Unit, RawMaterial } from "../../types/rawMaterial";
import unitService from "../../services/unitService";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface EditRawMaterialModalProps {
  isOpen: boolean;
  rawMaterial: RawMaterial | null;
  onSave: (data: RawMaterialUpdateRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
}

const EditRawMaterialModal: React.FC<EditRawMaterialModalProps> = ({
  isOpen,
  rawMaterial,
  onSave,
  onCancel,
  isSaving,
  apiErrors,
}) => {
  const [formData, setFormData] = useState<RawMaterialFormData>({
    hsn_code: "",
    item_name_default: "",
    item_name_1: "",
    item_name_2: "",
    unit_id: "",
    quantity: "",
    cost_price: "",
    shelf_life_days: "",
    min_stock_level: "",
    max_stock_level: "",
    profile_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [displayErrors, setDisplayErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load units on component mount
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsData = await unitService.getUnits();
        setUnits(unitsData.units);
      } catch (error) {
        console.error("Failed to load units:", error);
      }
    };
    loadUnits();
  }, []);

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined): Record<string, string> => {
    if (!itemName) {
      return {};
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      return itemName as Record<string, string>;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as Record<string, string>;
        }
        return {};
      } catch {
        return {};
      }
    }
    
    return {};
  };

  // Initialize form data when rawMaterial changes
  useEffect(() => {
    if (rawMaterial && isOpen) {
      const itemName = parseItemName(rawMaterial.item_name);
      setFormData({
        hsn_code: rawMaterial.hsn_code || "",
        item_name_default: itemName.default || itemName["1"] || "",
        item_name_1: itemName["1"] || "",
        item_name_2: itemName["2"] || "",
        unit_id: rawMaterial.unit_id?.toString() || "",
        quantity: rawMaterial.quantity?.toString() || "",
        cost_price: rawMaterial.cost_price || "",
        shelf_life_days: rawMaterial.shelf_life_days?.toString() || "",
        min_stock_level: rawMaterial.min_stock_level || "",
        max_stock_level: rawMaterial.max_stock_level || "",
        profile_image: null,
        current_profile_image: rawMaterial.profile_image_url,
      });
      setErrors({});
      setDisplayErrors({});
    }
  }, [rawMaterial, isOpen]);

  const handleInputChange = (field: keyof RawMaterialFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    if (displayErrors[field]) {
      setDisplayErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleFieldBlur = (field: keyof RawMaterialFormData, value: string) => {
    validateField(field, value);
  };

  const validateField = (field: keyof RawMaterialFormData, value: string) => {
    const newErrors = { ...displayErrors };

    switch (field) {
      case 'item_name_default':
        if (!value.trim()) {
          newErrors.item_name_default = "Name is required";
        } else if (value.trim().length < 2) {
          newErrors.item_name_default = "Name must be at least 2 characters";
        } else {
          delete newErrors.item_name_default;
        }
        break;
      case 'unit_id':
        if (!value) {
          newErrors.unit_id = "Unit is required";
        } else {
          delete newErrors.unit_id;
        }
        break;
      case 'quantity':
        if (!value.trim()) {
          newErrors.quantity = "Quantity is required";
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            newErrors.quantity = "Quantity must be a valid positive number";
          } else {
            delete newErrors.quantity;
          }
        }
        break;
      case 'cost_price':
        if (!value.trim()) {
          newErrors.cost_price = "Cost price is required";
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            newErrors.cost_price = "Cost price must be a valid positive number";
          } else {
            delete newErrors.cost_price;
          }
        }
        break;
      case 'shelf_life_days':
        if (value.trim()) {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 1) {
            newErrors.shelf_life_days = "Shelf life must be a valid positive number";
          } else {
            delete newErrors.shelf_life_days;
          }
        } else {
          delete newErrors.shelf_life_days;
        }
        break;
      case 'min_stock_level':
        if (value.trim()) {
          const minLevel = parseFloat(value);
          if (isNaN(minLevel) || minLevel < 0) {
            newErrors.min_stock_level = "Minimum stock level must be 0 or greater";
          } else {
            delete newErrors.min_stock_level;
          }
        } else {
          delete newErrors.min_stock_level;
        }
        break;
      case 'max_stock_level':
        if (value.trim()) {
          const maxLevel = parseFloat(value);
          if (isNaN(maxLevel) || maxLevel < 0) {
            newErrors.max_stock_level = "Maximum stock level must be 0 or greater";
          } else {
            delete newErrors.max_stock_level;
          }
        } else {
          delete newErrors.max_stock_level;
        }
        break;
    }

    setDisplayErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_name_default.trim()) newErrors.item_name_default = "Name is required";
    if (!formData.unit_id) newErrors.unit_id = "Unit is required";
    if (!formData.quantity.trim()) newErrors.quantity = "Quantity is required";
    if (!formData.cost_price.trim()) newErrors.cost_price = "Cost price is required";

    // Validate numeric fields
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity < 0) newErrors.quantity = "Invalid quantity";

    const costPrice = parseFloat(formData.cost_price);
    if (isNaN(costPrice) || costPrice < 0) newErrors.cost_price = "Invalid cost price";

    if (formData.shelf_life_days.trim()) {
      const shelfLife = parseInt(formData.shelf_life_days);
      if (isNaN(shelfLife) || shelfLife < 1) newErrors.shelf_life_days = "Invalid shelf life";
    }

    // Validate stock levels
    if (formData.min_stock_level.trim()) {
      const minLevel = parseFloat(formData.min_stock_level);
      if (isNaN(minLevel) || minLevel < 0) {
        newErrors.min_stock_level = "Invalid minimum stock level";
      }
    }

    if (formData.max_stock_level.trim()) {
      const maxLevel = parseFloat(formData.max_stock_level);
      if (isNaN(maxLevel) || maxLevel < 0) {
        newErrors.max_stock_level = "Invalid maximum stock level";
      }
    }

    // Cross-validation: max must be greater than min
    if (formData.min_stock_level.trim() && formData.max_stock_level.trim()) {
      const minLevel = parseFloat(formData.min_stock_level);
      const maxLevel = parseFloat(formData.max_stock_level);
      if (!isNaN(minLevel) && !isNaN(maxLevel) && maxLevel <= minLevel) {
        newErrors.max_stock_level = "Maximum stock level must be greater than minimum stock level";
      }
    }

    setErrors(newErrors);
    setDisplayErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setDisplayErrors(prev => ({ ...prev, profile_image: "Please select a valid image file" }));
        return;
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setDisplayErrors(prev => ({ ...prev, profile_image: "Image size must be less than 5MB" }));
        return;
      }
      setFormData(prev => ({ ...prev, profile_image: file }));
      setDisplayErrors(prev => ({ ...prev, profile_image: "" }));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const itemName: Record<string, string> = {
      default: formData.item_name_default,
    };
    if (formData.item_name_1.trim()) itemName["1"] = formData.item_name_1;
    if (formData.item_name_2.trim()) itemName["2"] = formData.item_name_2;

    const updateData: RawMaterialUpdateRequest = {
      hsn_code: formData.hsn_code,
      item_name: itemName,
      unit_id: parseInt(formData.unit_id),
      quantity: parseFloat(formData.quantity),
      cost_price: parseFloat(formData.cost_price),
      shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : undefined,
      profile_image: formData.profile_image || undefined,
      min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : undefined,
      max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : undefined,
    };

    onSave(updateData);
  };

  const getDisplayValue = (record: Record<string, string>, defaultValue: string = ''): string => {
    return Object.values(record)[0] || defaultValue;
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Raw Material
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update raw material details, pricing, and inventory information.
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
                    ) : formData.current_profile_image ? (
                      <img
                        src={formData.current_profile_image}
                        alt="Current raw material image"
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

              {/* Name */}
              <div>
                <Label htmlFor="item_name_default">Name *</Label>
                <Input
                  id="item_name_default"
                  type="text"
                  value={formData.item_name_default}
                  onChange={(e) => handleInputChange('item_name_default', e.target.value)}
                  onBlur={(e) => handleFieldBlur('item_name_default', e.target.value)}
                  placeholder="Enter raw material name"
                  error={!!displayErrors.item_name_default}
                  disabled={isSaving}
                />
                {displayErrors.item_name_default && (
                  <p className="text-red-500 text-xs mt-1">{displayErrors.item_name_default}</p>
                )}
              </div>

              {/* Item Name (Language 1) */}
              <div>
                <Label htmlFor="item_name_1">Name (Language 1)</Label>
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
                <Label htmlFor="item_name_2">Name (Language 2)</Label>
                <Input
                  id="item_name_2"
                  type="text"
                  value={formData.item_name_2}
                  onChange={(e) => handleInputChange('item_name_2', e.target.value)}
                  placeholder="Optional: Enter alternate name"
                  disabled={isSaving}
                />
              </div>

              {/* Unit */}
              <div>
                <Label htmlFor="unit_id">Unit *</Label>
                <select
                  id="unit_id"
                  value={formData.unit_id}
                  onChange={(e) => handleInputChange('unit_id', e.target.value)}
                  onBlur={(e) => handleFieldBlur('unit_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 dark:bg-gray-800 dark:text-white ${
                    displayErrors.unit_id
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isSaving}
                >
                  <option value="">Select Unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id.toString()}>
                      {getDisplayValue(unit.name)}
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
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isSaving}>
              {isSaving ? "Updating..." : "Update Raw Material"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditRawMaterialModal;
