import { useEffect, useState } from "react";
import { MenuItem, MenuItemUpdateRequest, StockItem } from "../../types/menuItem";
import menuItemService from "../../services/menuItemService";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import SelectedItemCard from "./SelectedItemCard";
import ItemSelectorDropdown from "./ItemSelectorDropdown";

interface EditMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MenuItemUpdateRequest) => void;
  menuItem: MenuItem | null;
  isSaving: boolean;
  apiErrors: { message: string; fieldErrors: Record<string, string> } | null;
}

interface RecipeItem {
  id?: number;
  stock_id: number;
  is_default: boolean;
  is_flavour: boolean;
  is_malay: boolean;
  quantity?: number;
  stockItemName?: string;
}

const EditMenuItemModal: React.FC<EditMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  menuItem,
  isSaving,
  apiErrors,
}) => {
  const [formData, setFormData] = useState({
    item_name: { default: '', en: '', hi: '' },
    description: { default: '', en: '', hi: '' },
    rate: '',
    hsn_code: '',
    flavour_quantity: ''
  });

  const [flavourRecipes, setFlavourRecipes] = useState<RecipeItem[]>([]);
  const [defaultRecipes, setDefaultRecipes] = useState<RecipeItem[]>([]);
  const [malayRecipes, setMalayRecipes] = useState<RecipeItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingStockItems, setLoadingStockItems] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined): string => {
    if (!itemName) return '';
    
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || '';
    }
    
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed.hi || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || '';
        }
        return itemName;
      } catch (e) {
        return itemName;
      }
    }
    
    return '';
  };

  const fetchStockItems = async () => {
    try {
      setLoadingStockItems(true);
      const response = await menuItemService.getStockItems();
      console.log('=== EDIT MODAL - STOCK ITEMS DEBUG ===');
      console.log('Full API response:', response);
      console.log('Stock items array:', response.stock_items);
      console.log('Number of stock items:', response.stock_items?.length || 0);
      
      // Log each item's flavour status
      response.stock_items?.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          id: item.stock_item_id,
          name: parseItemName(item.item_name),
          is_flavour: item.is_flavour,
          raw_name: item.item_name
        });
      });
      
      setStockItems(response.stock_items || []);
    } catch (error) {
      console.error('Error fetching stock items:', error);
    } finally {
      setLoadingStockItems(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStockItems();
    }
  }, [isOpen]);

  // Populate form when menuItem prop changes
  useEffect(() => {
    if (menuItem && isOpen) {
      // Handle item_name - ensure it's always an object
      let itemName = { default: '', en: '', hi: '' };
      if (typeof menuItem.item_name === 'object' && menuItem.item_name !== null) {
        itemName = menuItem.item_name;
      } else if (typeof menuItem.item_name === 'string') {
        try {
          const parsed = JSON.parse(menuItem.item_name);
          if (typeof parsed === 'object' && parsed !== null) {
            itemName = { default: parsed.default || '', en: parsed.en || '', hi: parsed.hi || '' };
          } else {
            itemName = { default: menuItem.item_name, en: '', hi: '' };
          }
        } catch {
          itemName = { default: menuItem.item_name, en: '', hi: '' };
        }
      }

      // Handle description - ensure it's always an object
      let description = { default: '', en: '', hi: '' };
      if (typeof menuItem.description === 'object' && menuItem.description !== null) {
        description = menuItem.description;
      } else if (typeof menuItem.description === 'string') {
        try {
          const parsed = JSON.parse(menuItem.description);
          if (typeof parsed === 'object' && parsed !== null) {
            description = { default: parsed.default || '', en: parsed.en || '', hi: parsed.hi || '' };
          } else {
            description = { default: menuItem.description, en: '', hi: '' };
          }
        } catch {
          description = { default: menuItem.description, en: '', hi: '' };
        }
      }

      setFormData({
        item_name: itemName,
        description: description,
        rate: menuItem.rate?.toString() || '',
        hsn_code: menuItem.hsn_code || '',
        flavour_quantity: menuItem.flavour_quantity?.toString() || ''
      });

      // Populate recipes
      if (menuItem.recipes) {
        const flavourItems = menuItem.recipes
          .filter(recipe => recipe.is_flavour && !recipe.is_default && !recipe.is_malay)
          .map(recipe => {
            // Handle quantity that could be number, string, or null
            let quantity = 0;
            if (recipe.quantity !== null && recipe.quantity !== undefined) {
              if (typeof recipe.quantity === 'string') {
                quantity = parseFloat(recipe.quantity) || 0;
              } else if (typeof recipe.quantity === 'number') {
                quantity = recipe.quantity;
              }
            }
            return {
              id: recipe.id,
              stock_id: recipe.stock_id,
              is_default: recipe.is_default,
              is_flavour: recipe.is_flavour,
              is_malay: recipe.is_malay,
              quantity: quantity
            };
          });

        const defaultItems = menuItem.recipes
          .filter(recipe => recipe.is_default && !recipe.is_flavour && !recipe.is_malay)
          .map(recipe => {
            // Handle quantity that could be number, string, or null
            let quantity = 0;
            if (recipe.quantity !== null && recipe.quantity !== undefined) {
              if (typeof recipe.quantity === 'string') {
                quantity = parseFloat(recipe.quantity) || 0;
              } else if (typeof recipe.quantity === 'number') {
                quantity = recipe.quantity;
              }
            }
            return {
              id: recipe.id,
              stock_id: recipe.stock_id,
              is_default: recipe.is_default,
              is_flavour: recipe.is_flavour,
              is_malay: recipe.is_malay,
              quantity: quantity
            };
          });

        const malayItems = menuItem.recipes
          .filter(recipe => !recipe.is_default && !recipe.is_flavour && recipe.is_malay)
          .map(recipe => {
            // Handle quantity that could be number, string, or null
            let quantity = 0;
            if (recipe.quantity !== null && recipe.quantity !== undefined) {
              if (typeof recipe.quantity === 'string') {
                quantity = parseFloat(recipe.quantity) || 0;
              } else if (typeof recipe.quantity === 'number') {
                quantity = recipe.quantity;
              }
            }
            return {
              id: recipe.id,
              stock_id: recipe.stock_id,
              is_default: recipe.is_default,
              is_flavour: recipe.is_flavour,
              is_malay: recipe.is_malay,
              quantity: quantity
            };
          });
        
        setFlavourRecipes(flavourItems);
        setDefaultRecipes(defaultItems);
        setMalayRecipes(malayItems);
      }
    }
  }, [menuItem, isOpen]);

  const resetForm = () => {
    setFormData({
      item_name: { default: '', en: '', hi: '' },
      description: { default: '', en: '', hi: '' },
      rate: '',
      hsn_code: '',
      flavour_quantity: ''
    });
    setFlavourRecipes([]);
    setDefaultRecipes([]);
    setMalayRecipes([]);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string, lang?: string) => {
    if (lang && (field === 'item_name' || field === 'description')) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev] as Record<string, string>,
          [lang]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addFlavourItem = (item: StockItem) => {
    setFlavourRecipes(prev => [...prev, {
      stock_id: item.stock_item_id,
      is_default: false,
      is_flavour: true,
      is_malay: false,
      quantity: 0,
      stockItemName: parseItemName(item.item_name)
    }]);
  };

  const addDefaultItem = (item: StockItem) => {
    setDefaultRecipes(prev => [...prev, {
      stock_id: item.stock_item_id,
      is_default: true,
      is_flavour: false,
      is_malay: false,
      quantity: 0,
      stockItemName: parseItemName(item.item_name)
    }]);
  };

  const addMalayItem = (item: StockItem) => {
    setMalayRecipes(prev => [...prev, {
      stock_id: item.stock_item_id,
      is_default: false,
      is_flavour: false,
      is_malay: true,
      quantity: 0,
      stockItemName: parseItemName(item.item_name)
    }]);
  };

  const updateRecipe = (index: number, field: string, value: any, isFlavour: boolean, isMalay: boolean = false) => {
    const setter = isMalay ? setMalayRecipes : (isFlavour ? setFlavourRecipes : setDefaultRecipes);
    
    setter(prev => prev.map((recipe, i) => {
      if (i === index) {
        const updatedRecipe = { ...recipe, [field]: value };
        
        // If stock_id is changed, update the stockItemName
        if (field === 'stock_id') {
          const stockItem = stockItems.find(item => item.stock_item_id === value);
          updatedRecipe.stockItemName = stockItem ? parseItemName(stockItem.item_name) : '';
        }
        
        return updatedRecipe;
      }
      return recipe;
    }));
  };

  const removeRecipe = (index: number, isFlavour: boolean, isMalay: boolean = false) => {
    const setter = isMalay ? setMalayRecipes : (isFlavour ? setFlavourRecipes : setDefaultRecipes);
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const getAvailableStockItems = (isFlavour: boolean, isMalay: boolean = false) => {
    console.log(`=== EDIT MODAL - FILTERING STOCK ITEMS (isFlavour: ${isFlavour}, isMalay: ${isMalay}) ===`);
    console.log('Total stock items:', stockItems.length);
    
    // Get the list of already selected stock IDs from the appropriate recipe list
    const selectedIds = isMalay
      ? malayRecipes.map(r => r.stock_id).filter(id => id > 0)
      : isFlavour 
        ? flavourRecipes.map(r => r.stock_id).filter(id => id > 0)
        : defaultRecipes.map(r => r.stock_id).filter(id => id > 0);
    
    console.log('Already selected IDs:', selectedIds);
    
    const filtered = stockItems.filter(item => {
      let matchesType = false;
      
      if (isMalay) {
        matchesType = item.is_malay === true;
      } else {
        // For default and flavour items, exclude is_malay items
        matchesType = item.is_flavour === isFlavour && item.is_malay !== true;
      }
      
      const notSelected = !selectedIds.includes(item.stock_item_id);
      const shouldShow = matchesType && notSelected;
      
      console.log(`Item "${parseItemName(item.item_name)}" (id: ${item.stock_item_id}) - is_flavour: ${item.is_flavour}, is_malay: ${item.is_malay}, already selected: ${!notSelected}, show: ${shouldShow}`);
      return shouldShow;
    });
    
    console.log(`Filtered ${isMalay ? 'malay' : (isFlavour ? 'flavour' : 'default')} items:`, filtered.length);
    filtered.forEach(item => {
      console.log(`- ${parseItemName(item.item_name)} (id: ${item.stock_item_id})`);
    });
    
    return filtered;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!menuItem) return;
    
    // Validate HSN code (must be exactly 4 digits)
    if (!/^\d{4}$/.test(formData.hsn_code)) {
      // You can add a toast notification here or set an error state
      alert('HSN code must be exactly 4 digits');
      return;
    }
    
    // Validate Malay items have quantity
    const errors: Record<number, string> = {};
    malayRecipes.forEach((recipe, index) => {
      if (recipe.stock_id > 0 && (!recipe.quantity || recipe.quantity <= 0)) {
        errors[index] = 'Quantity is required';
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    // Combine all recipes
    const allRecipes = [
      ...flavourRecipes.filter(recipe => recipe.stock_id > 0),
      ...defaultRecipes.filter(recipe => recipe.stock_id > 0),
      ...malayRecipes.filter(recipe => recipe.stock_id > 0)
    ].map(recipe => ({
      ...(recipe.id && { id: recipe.id }),
      stock_id: recipe.stock_id,
      is_default: recipe.is_default,
      is_flavour: recipe.is_flavour,
      is_malay: recipe.is_malay,
      ...(recipe.quantity !== undefined && { quantity: recipe.quantity })
    }));

    const submitData: MenuItemUpdateRequest = {
      item_name: formData.item_name,
      description: formData.description,
      rate: parseFloat(formData.rate),
      hsn_code: formData.hsn_code,
      ...(formData.flavour_quantity && { flavour_quantity: parseInt(formData.flavour_quantity) }),
      recipes: allRecipes
    };

    onSave(submitData);
  };

  const getFieldError = (fieldName: string) => {
    return apiErrors?.fieldErrors[fieldName];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[1200px] m-4">
      <div className="no-scrollbar relative w-full max-w-[1200px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Menu Item
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Update menu item details, pricing, and recipe information.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="custom-scrollbar h-[600px] overflow-y-auto px-2 pb-3">
            {/* API Error Message */}
            {apiErrors?.message && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{apiErrors.message}</p>
              </div>
            )}

            {/* Basic Details */}
            <div className="mb-6 space-y-4">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white">Basic Details</h5>
              
              {/* Item Name */}
              <div>
                <Label>Item Name *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default</label>
                    <input
                      type="text"
                      placeholder="Default name"
                      value={formData.item_name.default}
                      onChange={(e) => handleInputChange('item_name', e.target.value, 'default')}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white ${
                        getFieldError('item_name') ? 'border-red-500' : ''
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">English</label>
                    <input
                      type="text"
                      placeholder="English name"
                      value={formData.item_name.en}
                      onChange={(e) => handleInputChange('item_name', e.target.value, 'en')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hindi</label>
                    <input
                      type="text"
                      placeholder="Hindi name"
                      value={formData.item_name.hi}
                      onChange={(e) => handleInputChange('item_name', e.target.value, 'hi')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                </div>
                {getFieldError('item_name') && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getFieldError('item_name')}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default</label>
                    <textarea
                      placeholder="Default description"
                      value={formData.description.default}
                      onChange={(e) => handleInputChange('description', e.target.value, 'default')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">English</label>
                    <textarea
                      placeholder="English description"
                      value={formData.description.en}
                      onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hindi</label>
                    <textarea
                      placeholder="Hindi description"
                      value={formData.description.hi}
                      onChange={(e) => handleInputChange('description', e.target.value, 'hi')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Rate and HSN Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rate (₹) *</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white ${
                      getFieldError('rate') ? 'border-red-500' : ''
                    }`}
                    required
                  />
                  {getFieldError('rate') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getFieldError('rate')}</p>
                  )}
                </div>

                <div>
                  <Label>HSN Code *</Label>
                  <input
                    type="text"
                    pattern="\d{4}"
                    maxLength={4}
                    value={formData.hsn_code}
                    onChange={(e) => {
                      // Only allow digits and limit to 4 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      handleInputChange('hsn_code', value);
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white ${
                      getFieldError('hsn_code') ? 'border-red-500' : ''
                    }`}
                    placeholder="e.g. 1234"
                    required
                  />
                  {getFieldError('hsn_code') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getFieldError('hsn_code')}</p>
                  )}
                  {formData.hsn_code && formData.hsn_code.length < 4 && (
                    <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">HSN code must be exactly 4 digits</p>
                  )}
                </div>
              </div>

              {/* Flavour Quantity */}
              <div className="mb-4">
                <Label>Flavour Quantity</Label>
                <input
                  type="number"
                  min="0"
                  value={formData.flavour_quantity}
                  onChange={(e) => handleInputChange('flavour_quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>

            {/* Flavour Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">Flavour Items</h5>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {flavourRecipes.length} selected
                </div>
              </div>
              
              {loadingStockItems ? (
                <p className="text-gray-500 dark:text-gray-400">Loading stock items...</p>
              ) : (
                <div className="space-y-3">
                  {/* Item Selector */}
                  <ItemSelectorDropdown
                    items={getAvailableStockItems(true, false)}
                    onSelect={addFlavourItem}
                    placeholder="Add flavour item..."
                    isFlavour={true}
                    disabled={getAvailableStockItems(true, false).length === 0}
                  />

                  {/* Selected Items */}
                  {flavourRecipes.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {flavourRecipes.map((recipe, index) => {
                        const stockItem = stockItems.find(item => item.stock_item_id === recipe.stock_id);
                        if (!stockItem) return null;
                        
                        return (
                          <SelectedItemCard
                            key={index}
                            item={stockItem}
                            quantity={recipe.quantity ?? 0}
                            onQuantityChange={(quantity) => updateRecipe(index, 'quantity', quantity, true, false)}
                            onRemove={() => removeRecipe(index, true, false)}
                            isFlavour={true}
                          />
                        );
                      })}
                    </div>
                  )}

                  {flavourRecipes.length === 0 && getAvailableStockItems(true, false).length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                      No flavour items available or all items already selected.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Default Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">Default Items</h5>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {defaultRecipes.length} selected
                </div>
              </div>
              
              {loadingStockItems ? (
                <p className="text-gray-500 dark:text-gray-400">Loading stock items...</p>
              ) : (
                <div className="space-y-3">
                  {/* Item Selector */}
                  <ItemSelectorDropdown
                    items={getAvailableStockItems(false, false)}
                    onSelect={addDefaultItem}
                    placeholder="Add default item..."
                    isFlavour={false}
                    disabled={getAvailableStockItems(false, false).length === 0}
                  />

                  {/* Selected Items */}
                  {defaultRecipes.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {defaultRecipes.map((recipe, index) => {
                        const stockItem = stockItems.find(item => item.stock_item_id === recipe.stock_id);
                        if (!stockItem) return null;
                        
                        return (
                          <SelectedItemCard
                            key={index}
                            item={stockItem}
                            quantity={recipe.quantity ?? 0}
                            onQuantityChange={(quantity) => updateRecipe(index, 'quantity', quantity, false, false)}
                            onRemove={() => removeRecipe(index, false, false)}
                            isFlavour={false}
                          />
                        );
                      })}
                    </div>
                  )}

                  {defaultRecipes.length === 0 && getAvailableStockItems(false, false).length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                      No default items available or all items already selected.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Malay Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">Malay Items</h5>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {malayRecipes.length} selected • Quantity in grams
                </div>
              </div>
              
              {loadingStockItems ? (
                <p className="text-gray-500 dark:text-gray-400">Loading stock items...</p>
              ) : (
                <div className="space-y-3">
                  {/* Item Selector */}
                  <ItemSelectorDropdown
                    items={getAvailableStockItems(false, true)}
                    onSelect={addMalayItem}
                    placeholder="Add malay item..."
                    isFlavour={false}
                    disabled={getAvailableStockItems(false, true).length === 0}
                  />

                  {/* Selected Items */}
                  {malayRecipes.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {malayRecipes.map((recipe, index) => {
                        const stockItem = stockItems.find(item => item.stock_item_id === recipe.stock_id);
                        if (!stockItem) return null;
                        
                        return (
                          <div key={index}>
                            <SelectedItemCard
                              item={stockItem}
                              quantity={recipe.quantity ?? 0}
                              onQuantityChange={(quantity) => {
                                updateRecipe(index, 'quantity', quantity, false, true);
                                if (quantity > 0 && validationErrors[index]) {
                                  const newErrors = { ...validationErrors };
                                  delete newErrors[index];
                                  setValidationErrors(newErrors);
                                }
                              }}
                              onRemove={() => removeRecipe(index, false, true)}
                              isFlavour={false}
                              unitLabel="g"
                            />
                            {validationErrors[index] && (
                              <p className="text-red-500 text-xs mt-1 ml-1">{validationErrors[index]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {malayRecipes.length === 0 && getAvailableStockItems(false, true).length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                      No malay items available or all items already selected.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Menu Item'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditMenuItemModal;