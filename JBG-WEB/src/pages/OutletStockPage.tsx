import { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import OutletStockList from "../components/outletStock/OutletStockList";
import AddOutletStockModal from "../components/outletStock/AddOutletStockModal";
import EditOutletStockModal from "../components/outletStock/EditOutletStockModal";
import DeleteOutletStockModal from "../components/outletStock/DeleteOutletStockModal";
import StockMovementsModal from "../components/outletStock/StockMovementsModal";
import { OutletStock, OutletStockCreateRequest, OutletStockUpdateRequest } from "../types/outletStock";
import outletStockService, { parseApiError } from "../services/outletStockService";
import outletService from "../services/outletService";
import { Outlet } from "../types/outlet";
import { useSearch } from "../context/SearchContext";
import { useAuth } from "../context/AuthContext";

const OutletStockPage: React.FC = () => {
  const [selectedOutletStock, setSelectedOutletStock] = useState<OutletStock | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [existingOutletStocks, setExistingOutletStocks] = useState<OutletStock[]>([]);

  // Outlet filter state for admin users
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [outletsLoading, setOutletsLoading] = useState(false);

  const { searchQuery, isSearchActive } = useSearch();
  const { user } = useAuth();

  // Load outlets on component mount for admin users
  useEffect(() => {
    if (user?.is_admin) {
      loadOutlets();
    } else if (user?.customer_id) {
      // For outlet users, set their own customer_id
      setSelectedCustomerId(user.customer_id);
    }
  }, [user]);

  const loadOutlets = async () => {
    try {
      setOutletsLoading(true);
      const outletsData = await outletService.getOutlets();
      setOutlets(outletsData);
      // Set first outlet as default for admin
      if (outletsData.length > 0) {
        setSelectedCustomerId(outletsData[0].id);
      }
    } catch (error) {
      console.error('Error loading outlets:', error);
    } finally {
      setOutletsLoading(false);
    }
  };

  const handleCustomerChange = (customerId: number | null) => {
    setSelectedCustomerId(customerId);
    setRefreshKey(prev => prev + 1); // Refresh the stock list
  };

  const handleOutletStocksLoaded = useCallback((stocks: OutletStock[]) => {
    setExistingOutletStocks(stocks);
  }, []);

  const handleAddOutletStock = () => {
    // Check if a customer is selected
    if (!selectedCustomerId) {
      alert('Please select an outlet from the filter dropdown first.');
      return;
    }
    
    setApiErrors(null);
    setIsAddModalOpen(true);
  };

  const handleEditOutletStock = (outletStock: OutletStock) => {
    setSelectedOutletStock(outletStock);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteOutletStock = (outletStock: OutletStock) => {
    setSelectedOutletStock(outletStock);
    setIsDeleteModalOpen(true);
  };

  const handleViewMovements = (outletStock: OutletStock) => {
    setSelectedOutletStock(outletStock);
    setIsMovementsModalOpen(true);
  };

  const handleSaveNewOutletStock = async (data: Omit<OutletStockCreateRequest, 'customer_id'>) => {
    if (!selectedCustomerId) return;

    try {
      setIsSaving(true);
      setApiErrors(null);
      
      // Add selected customer ID to the request
      const requestData = {
        ...data,
        customer_id: selectedCustomerId
      };
      
      await outletStockService.createOutletStock(requestData);
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error creating outlet stock:', error);
      setApiErrors(parseApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOutletStock = async (data: OutletStockUpdateRequest) => {
    if (!selectedOutletStock) return;

    try {
      setIsSaving(true);
      setApiErrors(null);
      await outletStockService.updateOutletStock(selectedOutletStock.id, data);
      setIsEditModalOpen(false);
      setSelectedOutletStock(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error updating outlet stock:', error);
      setApiErrors(parseApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOutletStock) return;

    try {
      setIsDeleting(true);
      await outletStockService.deleteOutletStock(selectedOutletStock.id);
      setIsDeleteModalOpen(false);
      setSelectedOutletStock(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting outlet stock:', error);
      // You might want to show an error message here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddModalOpen(false);
    setApiErrors(null);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedOutletStock(null);
    setApiErrors(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedOutletStock(null);
  };

  const handleCloseMovements = () => {
    setIsMovementsModalOpen(false);
    setSelectedOutletStock(null);
  };

  // For outlet users, ensure they have a customer_id
  if (!user?.is_admin && !user?.customer_id) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No customer assigned</div>
          <p className="text-gray-500 mb-4">Your account is not associated with a customer.</p>
          <p className="text-sm text-gray-400">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  // Don't render until we have a selected customer ID
  if (!selectedCustomerId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading outlet information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Outlet Stock Management | Jay Bhavani - Admin Dashboard</title>
      </Helmet>

      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Outlet Stock Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage stock inventory for all outlet locations.
                {user?.is_admin && selectedCustomerId && (
                  <span className="block mt-1 text-sm text-blue-600 dark:text-blue-400">
                    Showing stock for: {outlets.find(o => o.id === selectedCustomerId)?.name || 'Selected Outlet'}
                  </span>
                )}
              </p>
              {isSearchActive && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Filtering outlet stock for: "{searchQuery}"</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Outlet Filter Dropdown - Only for Admin */}
              {user?.is_admin && (
                <div className="flex items-center gap-2">
                  <label htmlFor="outlet-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter by Outlet:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="outlet-filter"
                      value={selectedCustomerId || ''}
                      onChange={(e) => handleCustomerChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={outletsLoading}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                    >
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                    {outletsLoading && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={handleAddOutletStock}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Stock Item
              </button>
            </div>
            
          </div>
        </div>

        {/* Stock List */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <OutletStockList
            key={refreshKey}
            customerId={selectedCustomerId}
            onEditOutletStock={handleEditOutletStock}
            onDeleteOutletStock={handleDeleteOutletStock}
            onViewMovements={handleViewMovements}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
            onStocksLoaded={handleOutletStocksLoaded}
          />
        </div>

        {/* Add Modal */}
        <AddOutletStockModal
          isOpen={isAddModalOpen}
          onSave={handleSaveNewOutletStock}
          onCancel={handleCancelAdd}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
          existingOutletStocks={existingOutletStocks}
        />

        {/* Edit Modal */}
        <EditOutletStockModal
          isOpen={isEditModalOpen}
          outletStock={selectedOutletStock}
          onSave={handleSaveOutletStock}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
          onRefresh={() => setRefreshKey(prev => prev + 1)}
        />

        {/* Delete Modal */}
        <DeleteOutletStockModal
          isOpen={isDeleteModalOpen}
          outletStock={selectedOutletStock}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />

        {/* Stock Movements Modal */}
        <StockMovementsModal
          isOpen={isMovementsModalOpen}
          outletStock={selectedOutletStock}
          onClose={handleCloseMovements}
        />
      </div>
    </>
  );
};

export default OutletStockPage;