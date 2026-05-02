import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon } from "../../icons";
import { OutletStock } from "../../types/outletStock";
import outletStockService from "../../services/outletStockService";

interface OutletStockListProps {
  customerId: number;
  onEditOutletStock: (outletStock: OutletStock) => void;
  onDeleteOutletStock: (outletStock: OutletStock) => void;
  onViewMovements: (outletStock: OutletStock) => void;
  searchQuery?: string;
  refreshKey?: number;
  onStocksLoaded?: (stocks: OutletStock[]) => void;
}

type SortField = 'item_name' | 'hsn_code' | 'quantity' | 'minimum_quantity' | 'amount' | 'is_extra_item';
type SortDirection = 'asc' | 'desc';

const OutletStockList: React.FC<OutletStockListProps> = ({
  customerId,
  onEditOutletStock,
  onDeleteOutletStock,
  onViewMovements,
  searchQuery = '',
  refreshKey = 0,
  onStocksLoaded,
}) => {
  const [outletStocks, setOutletStocks] = useState<OutletStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('item_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      } catch {
        return itemName || defaultValue;
      }
    }
    
    return defaultValue;
  };

  // Filter and sort outlet stocks
  const filteredAndSortedOutletStocks = outletStocks
    .filter(item => {
      if (!searchQuery) return true;
      
      const itemName = parseItemName(item.item_name, '').toLowerCase();
      const hsn = item.hsn_code?.toLowerCase() || '';
      const quantity = item.quantity?.toString().toLowerCase() || '';
      const minQuantity = item.minimum_quantity?.toString().toLowerCase() || '';
      const amount = item.amount?.toString().toLowerCase() || '';
      
      return itemName.includes(searchQuery.toLowerCase()) ||
             hsn.includes(searchQuery.toLowerCase()) ||
             quantity.includes(searchQuery.toLowerCase()) ||
             minQuantity.includes(searchQuery.toLowerCase()) ||
             amount.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'item_name':
          aValue = parseItemName(a.item_name, '');
          bValue = parseItemName(b.item_name, '');
          break;
        case 'hsn_code':
          aValue = a.hsn_code || '';
          bValue = b.hsn_code || '';
          break;
        case 'quantity':
          aValue = parseFloat(a.quantity || '0');
          bValue = parseFloat(b.quantity || '0');
          break;
        case 'minimum_quantity':
          aValue = parseFloat(a.minimum_quantity || '0');
          bValue = parseFloat(b.minimum_quantity || '0');
          break;
        case 'amount':
          aValue = parseFloat(a.amount || '0');
          bValue = parseFloat(b.amount || '0');
          break;
        case 'is_extra_item':
          aValue = a.is_extra_item ? 1 : 0;
          bValue = b.is_extra_item ? 1 : 0;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const fetchOutletStocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await outletStockService.getOutletStockList({ customer_id: customerId });
      setOutletStocks(response.data.stocks);
      onStocksLoaded?.(response.data.stocks);
    } catch (err) {
      console.error('Error fetching outlet stocks:', err);
      setError('Failed to load outlet stocks');
    } finally {
      setLoading(false);
    }
  }, [customerId, onStocksLoaded]);

  useEffect(() => {
    if (customerId) {
      fetchOutletStocks();
    }
  }, [customerId, fetchOutletStocks, refreshKey]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStockStatus = (quantity: string, minimumQuantity: string) => {
    const qty = parseFloat(quantity || '0');
    const minQty = parseFloat(minimumQuantity || '0');
    
    if (qty === 0) return { status: 'out-of-stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (qty <= minQty) return { status: 'low-stock', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return { status: 'in-stock', label: 'In Stock', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading outlet stocks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (outletStocks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No outlet stocks found</div>
          <p className="text-gray-500 mb-4">This outlet doesn't have any stock items yet.</p>
          <p className="text-sm text-gray-400">Add your first stock item to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Outlet Stock
          </h3>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filteredAndSortedOutletStocks.length} items
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('item_name')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Item Details
                  <SortIcon field="item_name" />
                </button>
              </th>
              <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('hsn_code')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  HSN Code
                  <SortIcon field="hsn_code" />
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Quantity
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('minimum_quantity')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Min. Qty
                  <SortIcon field="minimum_quantity" />
                </button>
              </th>
              <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Amount
                  <SortIcon field="amount" />
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('is_extra_item')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Extra Item
                  {sortField === 'is_extra_item' && (
                    <span className="ml-1 text-blue-500">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedOutletStocks.map((outletStock) => {
              const stockStatus = getStockStatus(outletStock.quantity, outletStock.minimum_quantity);
              const itemName = parseItemName(outletStock.item_name, 'Unnamed Item');

              return (
                <tr key={outletStock.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Item Details */}
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                        {outletStock.profile_image ? (
                          <img
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                            src={outletStock.profile_image}
                            alt={itemName}
                          />
                        ) : (
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-400 text-xs sm:text-sm font-medium">
                              {itemName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <div className="flex items-center gap-2">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-xs" title={itemName}>
                            {itemName}
                          </div>
                          {outletStock.is_active && (
                            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active"></div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {outletStock.hsn_code && (
                            <span className="sm:hidden font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                              {outletStock.hsn_code}
                            </span>
                          )}
                          {!outletStock.stock_id && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* HSN Code */}
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    {outletStock.hsn_code && (
                      <div className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {outletStock.hsn_code}
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                      <div className="font-semibold">
                        {outletStock.quantity || '0'}
                      </div>
                    </div>
                  </td>

                  {/* Minimum Quantity */}
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {outletStock.minimum_quantity || '0'}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{parseFloat(outletStock.amount || '0').toFixed(2)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                      {stockStatus.label}
                    </span>
                  </td>

                  {/* Extra Item */}
                  <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                    {outletStock.is_extra_item && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Extra Item
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewMovements(outletStock)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="View stock movements"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditOutletStock(outletStock)}
                        className="p-1.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Edit outlet stock"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteOutletStock(outletStock)}
                        className="p-1.5 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete outlet stock"
                      >
                        <TrashBinIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


    </div>
  );
};

export default OutletStockList;