import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import OutletMenuList from "../components/outletMenu/OutletMenuList";
import AddOutletMenuModal from "../components/outletMenu/AddOutletMenuModal";
import EditOutletMenuModal from "../components/outletMenu/EditOutletMenuModal";
import DeleteOutletMenuModal from "../components/outletMenu/DeleteOutletMenuModal";
import FlavourDisplayOrderModal from "../components/outletMenu/FlavourDisplayOrderModal";
import { OutletMenuItem, OutletMenuCreateRequest, OutletMenuUpdateRequest } from "../types/outletMenu";
import { Outlet } from "../types/outlet";
import outletMenuService, { parseApiError } from "../services/outletMenuService";
import outletService from "../services/outletService";
import { useSearch } from "../context/SearchContext";

const OutletMenuPage: React.FC = () => {
  const [selectedOutletMenu, setSelectedOutletMenu] = useState<OutletMenuItem | null>(null);
  const [selectedFlavourOutletMenu, setSelectedFlavourOutletMenu] = useState<OutletMenuItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFlavourModalOpen, setIsFlavourModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFlavourSaving, setIsFlavourSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  const [flavourApiErrors, setFlavourApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Outlet filter state
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [outletsLoading, setOutletsLoading] = useState(false);

  const { searchQuery, isSearchActive } = useSearch();

  // Load outlets on component mount
  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    try {
      setOutletsLoading(true);
      const outletsData = await outletService.getOutlets();
      setOutlets(outletsData);
    } catch (error) {
      console.error('Error loading outlets:', error);
    } finally {
      setOutletsLoading(false);
    }
  };

  const handleOutletChange = (outletId: number | null) => {
    setSelectedOutletId(outletId);
    setRefreshKey(prev => prev + 1); // Refresh the outlet menu list
  };

  const handleAddOutletMenu = () => {
    // Check if an outlet is selected
    if (!selectedOutletId) {
      alert('Please select an outlet from the filter dropdown first.');
      return;
    }
    
    setApiErrors(null);
    setIsAddModalOpen(true);
  };

  const handleEditOutletMenu = (outletMenu: OutletMenuItem) => {
    setSelectedOutletMenu(outletMenu);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteOutletMenu = (outletMenu: OutletMenuItem) => {
    setSelectedOutletMenu(outletMenu);
    setIsDeleteModalOpen(true);
  };

  const handleManageFlavourOrder = (outletMenu: OutletMenuItem) => {
    setSelectedFlavourOutletMenu(outletMenu);
    setFlavourApiErrors(null);
    setIsFlavourModalOpen(true);
  };

  const handleSaveNewOutletMenu = async (data: OutletMenuCreateRequest) => {
    try {
      setIsSaving(true);
      setApiErrors(null);
      
      await outletMenuService.createOutletMenuItem(data);
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
      
      console.log("Outlet menu item created successfully");
    } catch (error) {
      console.error('Error creating outlet menu item:', error);
      setApiErrors(parseApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOutletMenu = async (data: OutletMenuUpdateRequest) => {
    if (!selectedOutletMenu) return;

    try {
      setIsSaving(true);
      setApiErrors(null);
      
      await outletMenuService.updateOutletMenuItem(selectedOutletMenu.outlet_menu_item_id, data);
      setIsEditModalOpen(false);
      setSelectedOutletMenu(null);
      setRefreshKey(prev => prev + 1);
      
      console.log("Outlet menu item updated successfully");
    } catch (error) {
      console.error('Error updating outlet menu item:', error);
      setApiErrors(parseApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOutletMenu) return;

    try {
      setIsDeleting(true);
      
      await outletMenuService.deleteOutletMenuItem(selectedOutletMenu.outlet_menu_item_id);
      setIsDeleteModalOpen(false);
      setSelectedOutletMenu(null);
      setRefreshKey(prev => prev + 1);
      
      console.log("Outlet menu item deleted successfully");
    } catch (error) {
      console.error('Error deleting outlet menu item:', error);
      alert("Failed to delete outlet menu item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveFlavourOrder = async (outletMenuItemId: number, recipeIds: number[]) => {
    try {
      setIsFlavourSaving(true);
      setFlavourApiErrors(null);

      await outletMenuService.updateFlavourDisplayOrder(outletMenuItemId, {
        recipe_ids: recipeIds,
      });

      setIsFlavourModalOpen(false);
      setSelectedFlavourOutletMenu(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving flavour display order:', error);
      setFlavourApiErrors(parseApiError(error));
    } finally {
      setIsFlavourSaving(false);
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setApiErrors(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedOutletMenu(null);
    setApiErrors(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedOutletMenu(null);
  };

  const handleCloseFlavourModal = () => {
    setIsFlavourModalOpen(false);
    setSelectedFlavourOutletMenu(null);
    setFlavourApiErrors(null);
  };

  return (
    <>
      <Helmet>
        <title>Outlet Menu Management | Jay Bhavani - Admin Dashboard</title>
        <meta name="description" content="Manage custom pricing and display order for menu items across different outlets" />
      </Helmet>

      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Outlet Menu Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Set custom pricing and display order for menu items across different outlets.
                {selectedOutletId && (
                  <span className="block mt-1 text-sm text-blue-600 dark:text-blue-400">
                    Showing items for: {outlets.find(o => o.id === selectedOutletId)?.name || 'Selected Outlet'}
                  </span>
                )}
              </p>
              {isSearchActive && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Filtering outlet menu items for: "{searchQuery}"</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Outlet Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="outlet-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Outlet:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="outlet-filter"
                    value={selectedOutletId || ''}
                    onChange={(e) => handleOutletChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={outletsLoading}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                  >
                    <option value="">All Outlets</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                  {selectedOutletId && (
                    <button
                      onClick={() => handleOutletChange(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Clear outlet filter"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {outletsLoading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  )}
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddOutletMenu}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Outlet Menu Item
              </button>
            </div>
          </div>
        </div>

        {/* Outlet Menu List */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <OutletMenuList
            key={refreshKey}
            onEditOutletMenu={handleEditOutletMenu}
            onDeleteOutletMenu={handleDeleteOutletMenu}
            onManageFlavourOrder={handleManageFlavourOrder}
            onAddOutletMenu={handleAddOutletMenu}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
            selectedOutletId={selectedOutletId}
          />
        </div>

        {/* Add Modal */}
        <AddOutletMenuModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onSave={handleSaveNewOutletMenu}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
          selectedOutletId={selectedOutletId}
          selectedOutletName={outlets.find(o => o.id === selectedOutletId)?.name}
        />

        {/* Edit Modal */}
        <EditOutletMenuModal
          isOpen={isEditModalOpen}
          outletMenu={selectedOutletMenu}
          onClose={handleCloseEditModal}
          onSave={handleSaveOutletMenu}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Delete Confirmation Modal */}
        <DeleteOutletMenuModal
          isOpen={isDeleteModalOpen}
          outletMenu={selectedOutletMenu}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />

        <FlavourDisplayOrderModal
          isOpen={isFlavourModalOpen}
          outletMenu={selectedFlavourOutletMenu}
          isSaving={isFlavourSaving}
          apiErrors={flavourApiErrors || undefined}
          onClose={handleCloseFlavourModal}
          onSave={handleSaveFlavourOrder}
        />
      </div>
    </>
  );
};

export default OutletMenuPage;