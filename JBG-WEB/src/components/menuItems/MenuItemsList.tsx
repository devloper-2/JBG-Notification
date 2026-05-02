import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon, PlusIcon, AngleLeftIcon, AngleRightIcon } from "../../icons";
import { MenuItem } from "../../types/menuItem";
import menuItemService from "../../services/menuItemService";

interface MenuItemsListProps {
  onEditMenuItem: (menuItem: MenuItem) => void;
  onDeleteMenuItem: (menuItem: MenuItem) => void;
  onAddMenuItem: () => void;
  searchQuery?: string;
  refreshKey?: number;
}

type SortField = 'item_name' | 'rate' | 'hsn_code' | 'flavour_quantity' | 'recipes';
type SortDirection = 'asc' | 'desc';

const MenuItemsList: React.FC<MenuItemsListProps> = ({
  onEditMenuItem,
  onDeleteMenuItem,
  onAddMenuItem,
  searchQuery = '',
  refreshKey = 0,
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('item_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        }
        return itemName; // Return as is if not a valid object
      } catch (e) {
        return itemName; // Return as is if not valid JSON
      }
    }
    
    return defaultValue;
  };

  // Helper function to parse description
  const parseDescription = (description: string | object | null | undefined): string => {
    if (!description) return '';
    return parseItemName(description, '');
  };

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await menuItemService.getMenuItems();
      
      if (response.success && response.data) {
        setMenuItems(response.data.menuItems || []);
      } else {
        setError('Failed to fetch menu items');
      }
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setError('Failed to fetch menu items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems, refreshKey]);

  // Filter menu items based on search query
  const filteredMenuItems = menuItems.filter(item => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const itemName = parseItemName(item.item_name).toLowerCase();
    const description = parseDescription(item.description).toLowerCase();
    const category = (item.category || '').toLowerCase();
    const hsnCode = item.hsn_code.toLowerCase();
    
    return itemName.includes(searchLower) || 
           description.includes(searchLower) ||
           category.includes(searchLower) ||
           hsnCode.includes(searchLower);
  });

  // Sort menu items
  const sortedMenuItems = [...filteredMenuItems].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'item_name':
        aValue = parseItemName(a.item_name).toLowerCase();
        bValue = parseItemName(b.item_name).toLowerCase();
        break;
      case 'rate':
        aValue = parseFloat(a.rate);
        bValue = parseFloat(b.rate);
        break;
      case 'hsn_code':
        aValue = a.hsn_code.toLowerCase();
        bValue = b.hsn_code.toLowerCase();
        break;
      case 'flavour_quantity':
        aValue = parseFloat(String(a.flavour_quantity || '0'));
        bValue = parseFloat(String(b.flavour_quantity || '0'));
        break;
      case 'recipes':
        aValue = a.recipes.length;
        bValue = b.recipes.length;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedMenuItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMenuItems = sortedMenuItems.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const formatCurrency = (amount: string) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading menu items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Menu Items</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your menu items and recipes</p>
        </div>
        <button
          onClick={onAddMenuItem}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-lg shadow-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
        >
          <PlusIcon className="w-4 h-4" />
          Add Menu Item
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {paginatedMenuItems.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No menu items found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery 
                ? `No menu items match your search criteria for "${searchQuery}".` 
                : 'Get started by creating your first menu item to build your restaurant menu.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onAddMenuItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add First Menu Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('item_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Item Name</span>
                      <SortIcon field="item_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('rate')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rate</span>
                      <SortIcon field="rate" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('hsn_code')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>HSN Code</span>
                      <SortIcon field="hsn_code" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('flavour_quantity')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Flavour Qty
                      <SortIcon field="flavour_quantity" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('recipes')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Recipes
                      <SortIcon field="recipes" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedMenuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {parseItemName(item.item_name)}
                        </div>
                        {parseDescription(item.description) && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {parseDescription(item.description)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.hsn_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.flavour_quantity || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {item.recipes.length} recipe{item.recipes.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEditMenuItem(item)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          title="Edit menu item"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMenuItem(item)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete menu item"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {paginatedMenuItems.length > 0 && totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex justify-between flex-1 sm:hidden">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(startIndex + itemsPerPage, sortedMenuItems.length)}
                    </span>{' '}
                    of <span className="font-medium">{sortedMenuItems.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                    >
                      <span className="sr-only">Previous</span>
                      <AngleLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === pageNumber
                              ? 'z-10 bg-brand-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-gray-600 dark:hover:bg-gray-700"
                    >
                      <span className="sr-only">Next</span>
                      <AngleRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItemsList;