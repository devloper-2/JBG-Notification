import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import StockItemsList from "../components/stockItems/StockItemsList";
import EditStockItemModal from "../components/stockItems/EditStockItemModal";
import AddStockItemModal from "../components/stockItems/AddStockItemModal";
import DeleteConfirmationModal from "../components/stockItems/DeleteConfirmationModal";
import DownloadModal from "../components/stockItems/DownloadModal";
import { StockItem, StockItemUpdateRequest, StockItemCreateRequest } from "../types/stockItem";
import stockItemService, { parseApiError } from "../services/stockItemService";
import { useSearch } from "../context/SearchContext";

const StockItemsPage = () => {
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<StockItem[]>([]);
  
  const { searchQuery, isSearchActive } = useSearch();

  const handleAddStockItem = () => {
    setApiErrors(null); // Clear any previous API errors
    setIsAddModalOpen(true);
  };

  const handleSaveNewStockItem = async (data: StockItemCreateRequest) => {
    try {
      setIsSaving(true);
      setApiErrors(null); // Clear previous errors
      await stockItemService.createStockItem(data);
      
      // Close modal and refresh the list
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Stock item created successfully");
    } catch (error) {
      console.error("Error creating stock item:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
      // Don't show generic alert anymore - errors will be displayed in the modal
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddModalOpen(false);
    setApiErrors(null);
  };

  const handleEditStockItem = (stockItem: StockItem) => {
    setSelectedStockItem(stockItem);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteStockItem = (stockItem: StockItem) => {
    setSelectedStockItem(stockItem);
    setIsDeleteModalOpen(true);
  };

  const handleSaveStockItem = async (data: StockItemUpdateRequest) => {
    if (!selectedStockItem) return;

    try {
      setIsSaving(true);
      setApiErrors(null);
      await stockItemService.updateStockItem(selectedStockItem.stock_item_id, data);
      
      // Close modal and refresh the list
      setIsEditModalOpen(false);
      setSelectedStockItem(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Stock item updated successfully");
    } catch (error) {
      console.error("Error updating stock item:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedStockItem) return;

    try {
      setIsDeleting(true);
      await stockItemService.deleteStockItem(selectedStockItem.stock_item_id);
      
      // Close modal and refresh the list
      setIsDeleteModalOpen(false);
      setSelectedStockItem(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log("Stock item deleted successfully");
    } catch (error) {
      console.error("Error deleting stock item:", error);
      alert("Failed to delete stock item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedStockItem(null);
    setApiErrors(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedStockItem(null);
  };

  const handleDownload = () => {
    setIsDownloadModalOpen(true);
  };

  const handleCloseDownloadModal = () => {
    setIsDownloadModalOpen(false);
    setSelectedItems([]);
  };

  // Function to receive all items from StockItemsList
  const handleAllItemsLoaded = (items: StockItem[]) => {
    setAllStockItems(items);
  };

  return (
    <React.Fragment>
      <Helmet>
        <title>Stock Items Management | Jay Bhavani - Admin Dashboard</title>
      </Helmet>

      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Stock Items Inventory
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your stock items inventory, production costs, selling prices, and stock levels.
              </p>
              {isSearchActive && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Filtering stock items for: "{searchQuery}"</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 border border-transparent rounded-lg shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                title="Download PDF with QR codes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={handleAddStockItem}
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

        {/* Stock Items List */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 lg:p-4">
          <StockItemsList
            key={refreshKey} // Force refresh when key changes
            onEditStockItem={handleEditStockItem}
            onDeleteStockItem={handleDeleteStockItem}
            onAllItemsLoaded={handleAllItemsLoaded}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
          />
        </div>

        {/* Add Modal */}
        <AddStockItemModal
          isOpen={isAddModalOpen}
          onSave={handleSaveNewStockItem}
          onCancel={handleCancelAdd}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Edit Modal */}
        <EditStockItemModal
          isOpen={isEditModalOpen}
          stockItem={selectedStockItem}
          onSave={handleSaveStockItem}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          stockItem={selectedStockItem}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />

        {/* Download Modal */}
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={handleCloseDownloadModal}
          allItems={allStockItems}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
        />
      </div>
    </React.Fragment>
  );
};

export default StockItemsPage;
