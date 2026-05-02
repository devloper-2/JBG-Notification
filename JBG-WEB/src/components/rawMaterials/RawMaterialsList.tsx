import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon } from "../../icons";
import { RawMaterial } from "../../types/rawMaterial";
import rawMaterialService from "../../services/rawMaterialService";
import unitService from "../../services/unitService";
import StockMovementLog from "./StockMovementLog";

interface RawMaterialsListProps {
  onEditRawMaterial: (rawMaterial: RawMaterial) => void;
  onDeleteRawMaterial: (rawMaterial: RawMaterial) => void;
  searchQuery?: string;
  refreshKey?: number;
}

type SortField = 'item_name' | 'hsn_code' | 'quantity' | 'cost_price' | 'created_at';
type SortDirection = 'asc' | 'desc';

const RawMaterialsList: React.FC<RawMaterialsListProps> = ({
  onEditRawMaterial,
  onDeleteRawMaterial,
  searchQuery = '',
  refreshKey = 0,
}) => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterial | null>(null);
  const [showStockMovements, setShowStockMovements] = useState(false);

  // Helper function to parse JSON strings or objects and return display value
  const parseItemName = (itemName: string | object | null | undefined, defaultValue: string = ''): string => {
    if (!itemName) {
      return defaultValue;
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || defaultValue;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || defaultValue;
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

  // Filter and sort raw materials
  const filteredAndSortedRawMaterials = rawMaterials
    .filter(material => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const itemName = parseItemName(material.item_name).toLowerCase();
      const unitName = material.unit ? getDisplayValue(material.unit.name).toLowerCase() : '';

      return (
        itemName.includes(query) ||
        material.hsn_code.toLowerCase().includes(query) ||
        unitName.includes(query) ||
        material.cost_price.toString().includes(query) ||
        material.raw_material_id.toString().includes(query)
      );
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'item_name':
          aValue = parseItemName(a.item_name).toLowerCase();
          bValue = parseItemName(b.item_name).toLowerCase();
          break;
        case 'hsn_code':
          aValue = a.hsn_code.toLowerCase();
          bValue = b.hsn_code.toLowerCase();
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'cost_price':
          aValue = parseFloat(a.cost_price);
          bValue = parseFloat(b.cost_price);
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

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedRawMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAndSortedRawMaterials.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const fetchRawMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching raw materials...');
      console.log('Auth token in localStorage:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
      
      // Fetch raw materials and units in parallel
      const [rawMaterialsResponse, unitsResponse] = await Promise.all([
        rawMaterialService.getRawMaterials(),
        unitService.getUnits()
      ]);
      
      console.log('Raw materials fetched successfully:', rawMaterialsResponse);
      console.log('Units fetched successfully:', unitsResponse);
      
      // Join raw materials with unit information
      const rawMaterialsWithUnits = rawMaterialsResponse.data.raw_materials.map(material => ({
        ...material,
        unit: unitsResponse.units.find(unit => unit.id === material.unit_id)
      }));
      
      setRawMaterials(rawMaterialsWithUnits);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch raw materials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials, refreshKey]);

  const handleRefresh = () => {
    fetchRawMaterials();
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
          <p className="text-gray-500">Loading raw materials...</p>
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

  if (rawMaterials.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No raw materials found</div>
          <p className="text-gray-500 mb-4">No raw materials are currently registered in the inventory.</p>
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

  if (filteredAndSortedRawMaterials.length === 0 && searchQuery) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No matching raw materials found</div>
          <p className="text-gray-500 mb-4">No raw materials match your search criteria for "{searchQuery}".</p>
          <p className="text-sm text-gray-400">Try different search terms or clear the search to see all raw materials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Raw Materials Inventory
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentItems.length} of {filteredAndSortedRawMaterials.length} items
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('item_name')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Item Details
                  <SortIcon field="item_name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('hsn_code')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  HSN Code
                  <SortIcon field="hsn_code" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Stock
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('cost_price')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cost Price
                  <SortIcon field="cost_price" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Created
                  <SortIcon field="created_at" />
                </button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentItems.map((material) => {
              const itemName = parseItemName(material.item_name);
              const unitName = material.unit ? getDisplayValue(material.unit.name) : '';
              const unitShortName = material.unit ? getDisplayValue(material.unit.short_name) : '';

              return (
                <tr key={material.raw_material_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Item Details */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {material.profile_image_url ? (
                          <img
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                            src={material.profile_image_url}
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
                          className={`h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center placeholder ${
                            material.profile_image_url ? 'hidden' : 'flex'
                          }`}
                        >
                          <span className="text-gray-400 text-sm font-medium">
                            {itemName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs" title={itemName}>
                          {itemName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {material.raw_material_id}
                        </div>
                        {material.shelf_life_days > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {material.shelf_life_days} days shelf life
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* HSN Code */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {material.hsn_code && (
                      <div className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {material.hsn_code}
                      </div>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-semibold">
                        {material.quantity} {unitShortName}
                      </div>
                      {parseFloat(material.min_stock_level) > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Min: {material.min_stock_level}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Cost Price */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{parseFloat(material.cost_price).toFixed(2)}
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {unitName}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ({material.unit?.unit_type})
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {material.is_active ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(material.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRawMaterial(material);
                          setShowStockMovements(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        title="View stock movements"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditRawMaterial(material)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Edit raw material"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRawMaterial(material)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete raw material"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedRawMaterials.length)} of {filteredAndSortedRawMaterials.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                Previous
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNumber > totalPages) return null;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      currentPage === pageNumber
                        ? 'text-blue-600 bg-blue-50 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Log Modal */}
      {selectedRawMaterial && (
        <StockMovementLog
          rawMaterial={selectedRawMaterial}
          isOpen={showStockMovements}
          onClose={() => {
            setShowStockMovements(false);
            setSelectedRawMaterial(null);
          }}
        />
      )}
    </div>
  );
};

export default RawMaterialsList;
