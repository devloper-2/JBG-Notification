import { useState, useEffect } from "react";
import { OutletStock, CustomExtraItemCreateRequest } from "../../types/outletStock";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import outletStockService, { parseApiError } from "../../services/outletStockService";

interface ManageExtraItemsModalProps {
  isOpen: boolean;
  outletStock: OutletStock | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExtraItemFormData {
  name_default: string;
  name_en: string;
  name_hi: string;
  quantity: string;
  price: string;
}

const ManageExtraItemsModal: React.FC<ManageExtraItemsModalProps> = ({
  isOpen,
  outletStock,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<ExtraItemFormData>({
    name_default: "",
    name_en: "",
    name_hi: "",
    quantity: "",
    price: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
  const [localExtraItems, setLocalExtraItems] = useState(outletStock?.extra_items || []);

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

  // Helper to parse multilingual name object
  const parseNameObject = (name: Record<string, string> | string | undefined): { default: string; en: string; hi: string } => {
    if (!name) {
      return { default: '', en: '', hi: '' };
    }

    if (typeof name === 'string') {
      return { default: name, en: name, hi: name };
    }

    return {
      default: name.default || name.en || name.hi || '',
      en: name.en || name.default || '',
      hi: name.hi || name.default || '',
    };
  };

  // Get unit type label based on unit_type
  const getUnitLabel = (unitType?: 'gram' | 'ml' | 'piece'): string => {
    switch (unitType) {
      case 'gram':
        return 'g';
      case 'ml':
        return 'ml';
      case 'piece':
        return 'pcs';
      default:
        return 'units';
    }
  };

  // Determine unit type based on stock item properties
  const getStockUnitType = (stock: OutletStock): 'gram' | 'ml' | 'piece' => {
    // Check if it's a flavour item first
    if (stock.is_flavour) {
      return 'ml';
    }
    
    // Check if it's a malay item
    if (stock.is_malay) {
      return 'gram';
    }
    
    // Default to piece for other items
    return 'piece';
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name_default: "",
      name_en: "",
      name_hi: "",
      quantity: "",
      price: "",
    });
    setErrors({});
    setApiError("");
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (outletStock?.extra_items) {
      setLocalExtraItems(outletStock.extra_items);
    }
  }, [outletStock]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name_default.trim()) {
      newErrors.name_default = "Default name is required";
    }

    const quantity = parseFloat(formData.quantity);
    if (!formData.quantity.trim() || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    const price = parseFloat(formData.price);
    if (!formData.price.trim() || isNaN(price) || price < 0) {
      newErrors.price = "Price must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !outletStock || !outletStock.stock_id) {
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const requestData: CustomExtraItemCreateRequest = {
        customer_id: outletStock.customer_id,
        stock_id: outletStock.stock_id,
        outlet_stock_id: outletStock.id,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        name: {
          default: formData.name_default,
          en: formData.name_en || formData.name_default,
          hi: formData.name_hi || formData.name_default,
        },
      };

      const response = await outletStockService.createCustomExtraItem(requestData);
      
      // Update local state with the complete extra_items list from response for real-time effect
      if (response.data.extra_items) {
        setLocalExtraItems(response.data.extra_items);
      }
      
      // Success
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating custom extra item:', error);
      const parsedError = parseApiError(error);
      setApiError(parsedError.message);
      
      // Set field errors if available
      if (Object.keys(parsedError.fieldErrors).length > 0) {
        setErrors(parsedError.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (itemId: number, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setDeletingItemId(itemToDelete.id);
    setApiError("");

    try {
      await outletStockService.deleteCustomExtraItem(itemToDelete.id);
      
      // Remove item from local state for real-time update
      setLocalExtraItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      
      // Close delete modal
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      
      // Refresh parent data
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting custom extra item:', error);
      const parsedError = parseApiError(error);
      setApiError(parsedError.message);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  if (!outletStock) return null;

  // Use local state for real-time updates, fallback to outletStock data
  const existingExtraItems = localExtraItems;
  // Determine unit type from stock properties (is_flavour, or malay keyword)
  const stockUnitType = getStockUnitType(outletStock);
  const unitLabel = getUnitLabel(stockUnitType);

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[900px] m-4">
      <div className="no-scrollbar relative w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Manage Extra Items
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create custom extra items for "{parseItemName(outletStock.item_name)}"
          </p>

          {/* Current Stock Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              {outletStock.profile_image ? (
                <img
                  className="h-16 w-16 rounded-lg object-cover"
                  src={outletStock.profile_image}
                  alt={parseItemName(outletStock.item_name)}
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
                  <span className="text-blue-700 dark:text-blue-200 text-2xl font-semibold">
                    {parseItemName(outletStock.item_name).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h6 className="font-medium text-gray-900 dark:text-white">
                  {parseItemName(outletStock.item_name)}
                </h6>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stock ID: {outletStock.id} | Price: ₹{outletStock.amount}
                </p>
              </div>
            </div>
          </div>

          {/* Existing Extra Items */}
          {existingExtraItems.length > 0 && (
            <div className="mb-6">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Existing Extra Items ({existingExtraItems.length})
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {existingExtraItems.map((item) => {
                  const names = parseNameObject(item.name);
                  const isDeleting = deletingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {names.default}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.quantity}{getUnitLabel(item.unit_type)} • ₹{item.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium">
                          Active
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item.id, names.default)}
                          disabled={isDeleting}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete extra item"
                        >
                          {isDeleting ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">{apiError}</p>
            </div>
          )}

          {/* Add New Extra Item Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Add New Extra Item
              </h5>

              {/* Item Name (Multilingual) */}
              <div className="mb-4">
                <Label>Item Name *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default</label>
                    <Input
                      type="text"
                      value={formData.name_default}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_default: e.target.value }))}
                      placeholder="e.g., Extra Malay 50g"
                      error={!!errors.name_default}
                    />
                    {errors.name_default && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name_default}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">English</label>
                    <Input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                      placeholder="English name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hindi</label>
                    <Input
                      type="text"
                      value={formData.name_hi}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_hi: e.target.value }))}
                      placeholder="हिंदी नाम"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Quantity * 
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (in {unitLabel})
                    </span>
                  </Label>
                  <Input
                    type="number"
                    step={0.01}
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder={`e.g., 50 ${unitLabel}`}
                    error={!!errors.quantity}
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>}
                </div>

                <div>
                  <Label>Price * (₹)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g., 100"
                    error={!!errors.price}
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
                </div>
              </div>

              {/* Helper Text */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                💡 Tip: If you don't provide a name, it will be auto-generated as "Extra {parseItemName(outletStock.item_name)} {'{quantity}'}{unitLabel}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Add Extra Item'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>

    {/* Delete Confirmation Modal */}
    <Modal isOpen={isDeleteModalOpen} onClose={handleCancelDelete} className="max-w-md m-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 dark:bg-gray-900">
        <div className="mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Delete Extra Item
          </h3>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelDelete}
            disabled={deletingItemId !== null}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deletingItemId !== null}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {deletingItemId !== null ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default ManageExtraItemsModal;
