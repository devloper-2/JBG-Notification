import { useState, useEffect } from 'react';
import { OutletMenuItem } from '../../types/outletMenu';
import outletMenuService from '../../services/outletMenuService';
import { PencilIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon, ListIcon } from '../../icons';
import { useAuth } from '../../context/AuthContext';

type SortField = 'menu_item_name' | 'outlet_name' | 'custom_price' | 'display_order' | 'is_active';
type SortDirection = 'asc' | 'desc';

interface OutletMenuListProps {
  onEditOutletMenu: (outletMenu: OutletMenuItem) => void;
  onDeleteOutletMenu: (outletMenu: OutletMenuItem) => void;
  onManageFlavourOrder: (outletMenu: OutletMenuItem) => void;
  onAddOutletMenu: () => void;
  searchQuery: string;
  refreshKey: number;
  selectedOutletId?: number | null;
}

const OutletMenuList: React.FC<OutletMenuListProps> = ({
  onEditOutletMenu,
  onDeleteOutletMenu,
  onManageFlavourOrder,
  onAddOutletMenu,
  searchQuery,
  refreshKey,
  selectedOutletId,
}) => {
  const [outletMenus, setOutletMenus] = useState<OutletMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState<SortField>('menu_item_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { isAuthenticated, token } = useAuth();

  const itemsPerPage = 10;

  // Helper function to parse menu item name from JSON string
  const parseMenuItemName = (itemName: string): string => {
    try {
      const parsed = JSON.parse(itemName);
      return parsed.default || parsed.en || itemName;
    } catch {
      return itemName;
    }
  };

  const loadOutletMenus = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication before making API call
      if (!isAuthenticated || !token) {
        setError('Authentication required. Please log in to view outlet menu items.');
        setLoading(false);
        return;
      }
      
      console.log('Loading outlet menus - Token available:', !!token);
      console.log('Authentication status:', isAuthenticated);
      console.log('Selected outlet ID:', selectedOutletId);
      
      const response = await outletMenuService.getOutletMenuItems(page, itemsPerPage, selectedOutletId);
      
      if (response.success) {
        setOutletMenus(response.data.items);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);
      } else {
        setError('Failed to load outlet menu items');
      }
    } catch (err: any) {
      console.error('Error loading outlet menu items:', err);
      if (err.message?.includes('authentication') || err.message?.includes('token')) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load outlet menu items');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when outlet filter changes
    setCurrentPage(1);
  }, [selectedOutletId]);

  useEffect(() => {
    // Only load data if authenticated
    if (isAuthenticated && token) {
      loadOutletMenus(currentPage);
    }
  }, [refreshKey, currentPage, isAuthenticated, token, selectedOutletId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filter outlet menus based on search query
  const filteredOutletMenus = outletMenus.filter(outletMenu => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const menuItemName = parseMenuItemName(outletMenu.menu_item.item_name).toLowerCase();
    const outletName = outletMenu.outlet.name.toLowerCase();
    const customPrice = outletMenu.custom_price.toLowerCase();
    
    return (
      menuItemName.includes(searchLower) ||
      outletName.includes(searchLower) ||
      customPrice.includes(searchLower)
    );
  });

  // Sort outlet menus
  const sortedOutletMenus = [...filteredOutletMenus].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'menu_item_name':
        aValue = parseMenuItemName(a.menu_item.item_name);
        bValue = parseMenuItemName(b.menu_item.item_name);
        break;
      case 'outlet_name':
        aValue = a.outlet.name;
        bValue = b.outlet.name;
        break;
      case 'custom_price':
        aValue = parseFloat(a.custom_price) || 0;
        bValue = parseFloat(b.custom_price) || 0;
        break;
      case 'display_order':
        aValue = a.display_order;
        bValue = b.display_order;
        break;
      case 'is_active':
        aValue = a.is_active ? 1 : 0;
        bValue = b.is_active ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => loadOutletMenus(currentPage)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {sortedOutletMenus.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No outlet menu items found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery 
                ? 'No outlet menu items match your search criteria.' 
                : selectedOutletId 
                  ? 'No menu items found for the selected outlet.' 
                  : 'Get started by creating your first outlet menu item.'}
            </p>
            {!searchQuery && !selectedOutletId && (
              <button
                onClick={onAddOutletMenu}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add First Outlet Menu Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('menu_item_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Menu Item</span>
                      <SortIcon field="menu_item_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('outlet_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Outlet</span>
                      <SortIcon field="outlet_name" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Original Price
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('custom_price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Custom Price</span>
                      <SortIcon field="custom_price" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Swiggy Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Zomato Price
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('display_order')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Display Order</span>
                      <SortIcon field="display_order" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('is_active')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon field="is_active" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedOutletMenus.map((outletMenu) => (
                  <tr key={outletMenu.outlet_menu_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {parseMenuItemName(outletMenu.menu_item.item_name)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {outletMenu.outlet.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {outletMenu.outlet.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(outletMenu.menu_item.rate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(outletMenu.custom_price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        {outletMenu.swigy_price ? formatCurrency(outletMenu.swigy_price) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-red-600 dark:text-red-400">
                        {outletMenu.zomato_price ? formatCurrency(outletMenu.zomato_price) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {outletMenu.display_order}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        outletMenu.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {outletMenu.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onManageFlavourOrder(outletMenu)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded"
                          title="Set flavour display order"
                        >
                          <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditOutletMenu(outletMenu)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
                          title="Edit outlet menu item"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteOutletMenu(outletMenu)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                          title="Delete outlet menu item"
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
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing{' '}
                    <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalItems)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{totalItems}</span>
                    {' '}results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === currentPage
                              ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-200'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
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

export default OutletMenuList;