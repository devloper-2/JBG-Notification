import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, AngleDownIcon } from '../../icons';
import { StockItem } from '../../types/menuItem';

interface ItemSelectorDropdownProps {
  items: StockItem[];
  onSelect: (item: StockItem) => void;
  placeholder?: string;
  isFlavour: boolean;
  disabled?: boolean;
}

const ItemSelectorDropdown: React.FC<ItemSelectorDropdownProps> = ({
  items,
  onSelect,
  placeholder = "Select item to add...",
  isFlavour,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to parse item names
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

  // Filter items based on search term
  const filteredItems = items.filter(item => {
    const itemName = parseItemName(item.item_name).toLowerCase();
    return itemName.includes(searchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemSelect = (item: StockItem) => {
    onSelect(item);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <div
        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600'
            : isOpen
              ? 'border-brand-500 ring-1 ring-brand-500 dark:border-brand-400'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
        } bg-white dark:bg-gray-700`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1">
          <PlusIcon className={`w-4 h-4 ${
            disabled 
              ? 'text-gray-400' 
              : isFlavour 
                ? 'text-blue-500' 
                : 'text-green-500'
          }`} />
          <span className={`text-sm ${
            disabled 
              ? 'text-gray-400' 
              : 'text-gray-600 dark:text-gray-300'
          }`}>
            {placeholder}
          </span>
        </div>
        <AngleDownIcon className={`w-4 h-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        } ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Items List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'No items found matching your search' : 'No items available'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.stock_item_id}
                  type="button"
                  onClick={() => handleItemSelect(item)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {parseItemName(item.item_name)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>ID: {item.stock_item_id}</span>
                        <span>•</span>
                        <span>Unit: {item.unit_id}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      isFlavour 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {isFlavour ? 'Flavour' : 'Default'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemSelectorDropdown;