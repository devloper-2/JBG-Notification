import { useState, useEffect } from 'react';
import { OutletMenuCreateRequest } from '../../types/outletMenu';
import { MenuItem } from '../../types/menuItem';
import menuItemService from '../../services/menuItemService';
import { Modal } from '../ui/modal';

interface AddOutletMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OutletMenuCreateRequest) => void;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
  selectedOutletId?: number | null;
  selectedOutletName?: string;
}

const AddOutletMenuModal: React.FC<AddOutletMenuModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
  apiErrors,
  selectedOutletId,
  selectedOutletName,
}) => {
  const [formData, setFormData] = useState<OutletMenuCreateRequest>({
    outlet_id: selectedOutletId || 0,
    menu_item_id: 0,
    custom_price: '',
    swigy_price: '',
    zomato_price: '',
    display_order: 1,
    is_active: true,
  });
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  // Load menu items when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMenuItems();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        outlet_id: selectedOutletId || 0,
        menu_item_id: 0,
        custom_price: '',
        swigy_price: '',
        zomato_price: '',
        display_order: 1,
        is_active: true,
      });
      setSelectedMenuItem(null);
    }
  }, [isOpen, selectedOutletId]);

  const loadMenuItems = async () => {
    try {
      setMenuItemsLoading(true);
      const response = await menuItemService.getMenuItems();
      if (response.success) {
        setMenuItems(response.data.menuItems);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setMenuItemsLoading(false);
    }
  };

  // Helper function to parse menu item name from JSON string
  const parseMenuItemName = (itemName: string): string => {
    try {
      const parsed = JSON.parse(itemName);
      return parsed.default || parsed.en || itemName;
    } catch {
      return itemName;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'menu_item_id') {
      const menuItemId = parseInt(value);
      const menuItem = menuItems.find(item => item.id === menuItemId);
      setSelectedMenuItem(menuItem || null);
      
      // Auto-fill custom price with original price if not already set
      if (menuItem && !formData.custom_price) {
        setFormData(prev => ({
          ...prev,
          [name]: menuItemId,
          custom_price: menuItem.rate,
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: menuItemId }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md mx-4">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Outlet Menu Item
            </h2>
            {selectedOutletName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                For outlet: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedOutletName}</span>
              </p>
            )}
          </div>
        </div>

        {/* API Error Message */}
        {apiErrors?.message && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
            {apiErrors.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Menu Item Selection */}
          <div>
            <label htmlFor="menu_item_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Menu Item *
            </label>
            <select
              id="menu_item_id"
              name="menu_item_id"
              value={formData.menu_item_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                apiErrors?.fieldErrors?.menu_item_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
              disabled={menuItemsLoading || isSaving}
            >
              <option value={0}>
                {menuItemsLoading ? 'Loading menu items...' : 'Select a menu item'}
              </option>
              {menuItems.map((menuItem) => (
                <option key={menuItem.id} value={menuItem.id}>
                  {parseMenuItemName(menuItem.item_name)} - ₹{menuItem.rate}
                </option>
              ))}
            </select>
            {apiErrors?.fieldErrors?.menu_item_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {apiErrors.fieldErrors.menu_item_id}
              </p>
            )}
          </div>

          {/* Original Price Display */}
          {selectedMenuItem && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Original Price
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white">
                ₹{selectedMenuItem.rate}
              </div>
            </div>
          )}

          {/* Custom Price */}
          <div>
            <label htmlFor="custom_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Price *
            </label>
            <input
              type="number"
              id="custom_price"
              name="custom_price"
              value={formData.custom_price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                apiErrors?.fieldErrors?.custom_price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter custom price"
              required
              disabled={isSaving}
            />
            {apiErrors?.fieldErrors?.custom_price && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {apiErrors.fieldErrors.custom_price}
              </p>
            )}
          </div>

          {/* Swiggy Price */}
          <div>
            <label htmlFor="swigy_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Swiggy Price
            </label>
            <input
              type="number"
              id="swigy_price"
              name="swigy_price"
              value={formData.swigy_price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                apiErrors?.fieldErrors?.swigy_price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter Swiggy price (optional)"
              disabled={isSaving}
            />
            {apiErrors?.fieldErrors?.swigy_price && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {apiErrors.fieldErrors.swigy_price}
              </p>
            )}
          </div>

          {/* Zomato Price */}
          <div>
            <label htmlFor="zomato_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zomato Price
            </label>
            <input
              type="number"
              id="zomato_price"
              name="zomato_price"
              value={formData.zomato_price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                apiErrors?.fieldErrors?.zomato_price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter Zomato price (optional)"
              disabled={isSaving}
            />
            {apiErrors?.fieldErrors?.zomato_price && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {apiErrors.fieldErrors.zomato_price}
              </p>
            )}
          </div>

          {/* Display Order */}
          <div>
            <label htmlFor="display_order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Order *
            </label>
            <input
              type="number"
              id="display_order"
              name="display_order"
              value={formData.display_order}
              onChange={handleInputChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                apiErrors?.fieldErrors?.display_order ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter display order"
              required
              disabled={isSaving}
            />
            {apiErrors?.fieldErrors?.display_order && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {apiErrors.fieldErrors.display_order}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isSaving}
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSaving || formData.outlet_id === 0 || formData.menu_item_id === 0 || !formData.custom_price}
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddOutletMenuModal;