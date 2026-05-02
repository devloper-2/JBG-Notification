import React from 'react';
import { TrashBinIcon } from '../../icons';
import { StockItem } from '../../types/menuItem';

interface SelectedItemCardProps {
  item: StockItem;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  isFlavour: boolean;
  unitLabel?: string;
}

const SelectedItemCard: React.FC<SelectedItemCardProps> = ({
  item,
  quantity,
  onQuantityChange,
  onRemove,
  isFlavour,
  unitLabel
}) => {
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

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${
      isFlavour 
        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    }`}>
      <div className="flex items-center gap-3 flex-1">
        {/* Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${
          isFlavour 
            ? 'bg-blue-500' 
            : 'bg-green-500'
        }`} />
        
        {/* Item Info */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {parseItemName(item.item_name)}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>ID: {item.stock_item_id}</span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              isFlavour 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>
              {isFlavour ? 'Flavour' : 'Default'}
            </span>
          </div>
        </div>
      </div>

      {/* Quantity Input */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            placeholder="Qty"
            min="0"
            step="0.1"
            value={quantity ?? ''}
            onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            required
          />
          {unitLabel && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
              {unitLabel}
            </span>
          )}
        </div>
        
        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          title="Remove item"
        >
          <TrashBinIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SelectedItemCard;