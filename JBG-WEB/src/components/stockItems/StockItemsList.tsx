import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon } from "../../icons";
import { StockItem } from "../../types/stockItem";
import stockItemService from "../../services/stockItemService";
import StockMovementLog from "./StockMovementLog";

interface StockItemsListProps {
  onEditStockItem: (stockItem: StockItem) => void;
  onDeleteStockItem: (stockItem: StockItem) => void;
  onAllItemsLoaded?: (items: StockItem[]) => void;
  searchQuery?: string;
  refreshKey?: number;
}

type SortField = 'item_name' | 'hsn_code' | 'quantity' | 'selling_cost' | 'production_cost' | 'tax_percentage' | 'created_at';
type SortDirection = 'asc' | 'desc';

const StockItemsList: React.FC<StockItemsListProps> = ({
  onEditStockItem,
  onDeleteStockItem,
  onAllItemsLoaded,
  searchQuery = '',
  refreshKey = 0,
}) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [showStockMovements, setShowStockMovements] = useState(false);

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined, defaultValue: string = ''): string => {
    if (!itemName) {
      return defaultValue;
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || defaultValue;
    }
    
    // If it's a string, try to parse it as JSON
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

  // Helper function to get display value from Record<string, string>
  const getDisplayValue = (record: Record<string, string>, defaultValue: string = ''): string => {
    return record.default || record["1"] || Object.values(record)[0] || defaultValue;
  };

  // Filter and sort stock items
  const filteredAndSortedStockItems = stockItems
    .filter(item => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const itemName = parseItemName(item.item_name, '').toLowerCase();
      const unitName = item.unit ? getDisplayValue(item.unit.name).toLowerCase() : '';

      return (
        itemName.includes(query) ||
        (item.hsn_code || '').toLowerCase().includes(query) ||
        unitName.includes(query) ||
        (item.selling_cost || 0).toString().includes(query) ||
        (item.production_cost || 0).toString().includes(query) ||
        (item.tax_percentage || 0).toString().includes(query) ||
        (item.barcode_number || '').toLowerCase().includes(query) ||
        (item.stock_item_id || '').toString().includes(query) ||
        (item.is_packaging && 'packaging'.includes(query)) ||
        (item.is_flavour && 'flavour'.includes(query)) ||
        (item.is_sugerfree && ('sugar free'.includes(query) || 'sugarfree'.includes(query))) ||
        (item.is_malay && 'malay'.includes(query))
      );
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'item_name':
          aValue = parseItemName(a.item_name, '').toLowerCase();
          bValue = parseItemName(b.item_name, '').toLowerCase();
          break;
        case 'hsn_code':
          aValue = (a.hsn_code || '').toLowerCase();
          bValue = (b.hsn_code || '').toLowerCase();
          break;
        case 'quantity':
          aValue = parseFloat(a.quantity);
          bValue = parseFloat(b.quantity);
          break;
        case 'selling_cost':
          aValue = parseFloat(a.selling_cost);
          bValue = parseFloat(b.selling_cost);
          break;
        case 'production_cost':
          aValue = parseFloat(a.production_cost);
          bValue = parseFloat(b.production_cost);
          break;
        case 'tax_percentage':
          aValue = parseFloat(a.tax_percentage || '0');
          bValue = parseFloat(b.tax_percentage || '0');
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Display all fetched items (no client-side pagination)
  const currentItems = filteredAndSortedStockItems;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const fetchStockItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching stock items...');
      console.log('Auth token in localStorage:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
      
      // Fetch stock items and units in parallel
      const [stockItemsResponse, unitsResponse] = await Promise.all([
        stockItemService.getStockItems(1, 10000), // Fetch up to 10000 items to show all
        stockItemService.getUnits()
      ]);
      
      console.log('Stock items fetched successfully:', stockItemsResponse);
      console.log('Units fetched successfully:', unitsResponse);
      
      // Join stock items with unit information
      const stockItemsWithUnits = stockItemsResponse.data.stock_items.map(item => ({
        ...item,
        unit: unitsResponse.units.find(unit => unit.id === item.unit_id)
      }));
      
      setStockItems(stockItemsWithUnits);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stock items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockItems();
  }, [fetchStockItems, refreshKey]);

  // Call onAllItemsLoaded when stockItems change
  useEffect(() => {
    if (stockItems.length > 0 && onAllItemsLoaded) {
      onAllItemsLoaded(stockItems);
    }
  }, [stockItems, onAllItemsLoaded]);

  const handleRefresh = () => {
    fetchStockItems();
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <div className="flex flex-col ml-1 opacity-30">
          <AngleUpIcon className="w-3 h-3 -mb-1" />
          <AngleDownIcon className="w-3 h-3" />
        </div>
      );
    }
    return (
      <div className="flex flex-col ml-1">
        <AngleUpIcon className={`w-3 h-3 -mb-1 ${sortDirection === 'asc' ? 'text-blue-600' : 'opacity-30'}`} />
        <AngleDownIcon className={`w-3 h-3 ${sortDirection === 'desc' ? 'text-blue-600' : 'opacity-30'}`} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading stock items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (stockItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No stock items found</div>
          <p className="text-gray-500 mb-4">No stock items are currently registered in the inventory.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (filteredAndSortedStockItems.length === 0 && searchQuery) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No matching stock items found</div>
          <p className="text-gray-500 mb-4">No stock items match your search criteria for "{searchQuery}".</p>
          <p className="text-sm text-gray-400">Try different search terms or clear the search to see all stock items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Table Header */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Stock Items Inventory
          </h3>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filteredAndSortedStockItems.length} items
          </div>
        </div>
      </div>

      {/* Table Container with improved scrolling */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                <button
                  onClick={() => handleSort('item_name')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Item Details
                  <SortIcon field="item_name" />
                </button>
              </th>
              <th className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                <button
                  onClick={() => handleSort('hsn_code')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  HSN Code
                  <SortIcon field="hsn_code" />
                </button>
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                Barcode
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Stock
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                <button
                  onClick={() => handleSort('production_cost')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Production Cost
                  <SortIcon field="production_cost" />
                </button>
              </th>
              <th className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                <button
                  onClick={() => handleSort('selling_cost')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Selling Price
                  <SortIcon field="selling_cost" />
                </button>
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[110px]">
                <button
                  onClick={() => handleSort('tax_percentage')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Tax %
                  <SortIcon field="tax_percentage" />
                </button>
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                Unit
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                Status
              </th>
              <th className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Created
                  <SortIcon field="created_at" />
                </button>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentItems.map((item) => {
              const itemName = parseItemName(item.item_name, 'Unnamed Item');
              const unitName = item.unit ? getDisplayValue(item.unit.name) : '';
              const unitShortName = item.unit ? getDisplayValue(item.unit.short_name) : '';

              return (
                <tr key={item.stock_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Item Details */}
                  <td className="px-3 sm:px-4 lg:px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        {item.profile_image_url ? (
                          <img
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                            src={item.profile_image_url}
                            alt={itemName}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const placeholder = img.parentElement?.querySelector('.placeholder');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center placeholder ${
                            item.profile_image_url ? 'hidden' : 'flex'
                          }`}
                        >
                          <span className="text-gray-400 text-xs sm:text-sm font-medium">
                            {(itemName && typeof itemName === 'string' && itemName.length > 0) 
                              ? itemName.charAt(0).toUpperCase() 
                              : 'I'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words" title={itemName}>
                            {itemName}
                          </div>
                          {item.is_active && (
                            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active"></div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.hsn_code && (
                            <span className="sm:hidden font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                              {item.hsn_code}
                            </span>
                          )}
                          {item.shelf_life_days > 0 && (
                            <span className="text-xs">
                              {item.shelf_life_days} days shelf life
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* HSN Code */}
                  <td className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    {item.hsn_code && (
                      <div className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
                        {item.hsn_code}
                      </div>
                    )}
                  </td>

                  {/* Barcode */}
                  <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    {item.barcode_number && (
                      <div className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border break-all">
                        {item.barcode_number}
                      </div>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-3 sm:px-4 lg:px-6 py-4">
                    <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      <div className="font-semibold">
                        {parseFloat(item.quantity).toFixed(2)} {unitShortName}
                      </div>
                    </div>
                  </td>

                  {/* Production Cost */}
                  <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      ₹{parseFloat(item.production_cost).toFixed(2)}
                    </div>
                  </td>

                  {/* Selling Price */}
                  <td className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{parseFloat(item.selling_cost).toFixed(2)}
                    </div>
                    <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
                      Margin: ₹{(parseFloat(item.selling_cost) - parseFloat(item.production_cost)).toFixed(2)}
                    </div>
                  </td>

                  {/* Tax Percentage */}
                  <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {parseFloat(item.tax_percentage || '0').toFixed(2)}%
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="break-words">{unitName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ({item.unit?.unit_type})
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 sm:px-4 lg:px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.is_packaging && (
                        <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Packaging
                        </span>
                      )}
                      {item.is_flavour && (
                        <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Flavour
                        </span>
                      )}
                      {item.is_sugerfree && (
                        <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                          Sugar Free
                        </span>
                      )}
                      {item.is_malay && (
                        <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Malay
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created */}
                  <td className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-3 sm:px-4 lg:px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStockItem(item);
                          setShowStockMovements(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1"
                        title="View stock movements"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditStockItem(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1"
                        title="Edit stock item"
                      >
                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteStockItem(item)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                        title="Delete stock item"
                      >
                        <TrashBinIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stock Movement Log Modal */}
      {selectedStockItem && (
        <StockMovementLog
          stockItem={selectedStockItem}
          isOpen={showStockMovements}
          onClose={() => {
            setShowStockMovements(false);
            setSelectedStockItem(null);
          }}
        />
      )}
    </div>
  );
};

export default StockItemsList;
