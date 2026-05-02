import React, { useState, useEffect } from 'react';
import { OutletStock, StockMovement } from "../../types/outletStock";
import outletStockService from "../../services/outletStockService";
import Button from "../ui/button/Button";

interface StockMovementsModalProps {
  isOpen: boolean;
  outletStock: OutletStock | null;
  onClose: () => void;
}

const StockMovementsModal: React.FC<StockMovementsModalProps> = ({
  isOpen,
  outletStock,
  onClose,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 10
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchMovements(1);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, outletStock]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const fetchMovements = async (page: number = 1) => {
    if (!outletStock) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await outletStockService.getStockMovements(outletStock.id, { page });
      
      setMovements(response.data.movements || []);
      setPagination(response.data.pagination || {
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 10
      });
    } catch (error: any) {
      setError('Failed to load stock movements');
      console.error('Failed to fetch stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchMovements(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatQuantity = (quantity: string | number) => {
    return parseFloat(quantity.toString()).toLocaleString();
  };

  const getMovementTypeIcon = (type: string) => {
    return type === 'IN' ? (
      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
    ) : (
      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </div>
    );
  };

  const getMovementTypeColor = (type: string) => {
    return type === 'IN' 
      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  // Helper function to parse item names
  const parseItemName = (itemName: string | object | null | undefined): string => {
    if (!itemName) {
      return 'Stock Item';
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || 'Stock Item';
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed.hi || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || 'Stock Item';
        }
        return itemName;
      } catch {
        return itemName || 'Stock Item';
      }
    }
    
    return 'Stock Item';
  };

  if (!isOpen || !outletStock) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
      <div
        className="fixed inset-0 h-full w-full bg-black/50"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl z-10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Stock Movement Log
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {parseItemName(outletStock.item_name)} - Current Stock: {formatQuantity(outletStock.quantity)}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading stock movements...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-2">Failed to load stock movements</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</div>
              <Button onClick={() => fetchMovements(pagination.current_page)}>
                Try Again
              </Button>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-gray-900 dark:text-white font-medium mb-2">No stock movements found</div>
              <div className="text-gray-600 dark:text-gray-400">This outlet stock item has no recorded stock movements yet.</div>
            </div>
          ) : (
            <div>
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600"></div>
                
                {/* Stock movements */}
                <div className="space-y-6">
                  {movements.map((movement) => (
                    <div key={movement.movement_id} className="relative flex items-start">
                      {/* Timeline dot */}
                      <div className="relative z-10">
                        {getMovementTypeIcon(movement.movement_type)}
                      </div>

                      {/* Content */}
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                                {movement.movement_type === 'IN' ? 'Stock Added' : 'Stock Removed'}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(movement.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">Quantity Changed</div>
                              <div className={`font-medium ${movement.movement_type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {movement.movement_type === 'IN' ? '+' : '-'}{formatQuantity(movement.quantity_changed)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">Previous Stock</div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {formatQuantity(movement.previous_quantity)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">New Stock</div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {formatQuantity(movement.new_quantity)}
                              </div>
                            </div>
                          </div>

                          {movement.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Notes</div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {movement.notes}
                              </div>
                            </div>
                          )}

                          {movement.reference_id && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Reference ID</div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {movement.reference_id}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((pagination.current_page - 1) * pagination.items_per_page) + 1} to {Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items)} of {pagination.total_items} movements
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockMovementsModal;