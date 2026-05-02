import { useState } from "react";
import { Helmet } from "react-helmet-async";
import OutletsList from "../components/outlets/OutletsList";
import EditOutletModal from "../components/outlets/EditOutletModal";
import AddOutletModal from "../components/outlets/AddOutletModal";
import DeleteConfirmationModal from "../components/outlets/DeleteConfirmationModal";
import { Outlet, OutletUpdateRequest, OutletCreateRequest } from "../types/outlet";
import outletService, { parseApiError } from "../services/outletService";
import { useSearch } from "../context/SearchContext";

const OutletsPage: React.FC = () => {
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  
  const { searchQuery, isSearchActive } = useSearch();

  const handleAddOutlet = () => {
    setApiErrors(null); // Clear any previous API errors
    setIsAddModalOpen(true);
  };

  const handleSaveNewOutlet = async (data: OutletCreateRequest) => {
    try {
      setIsSaving(true);
      setApiErrors(null); // Clear previous errors
      await outletService.createOutlet(data);
      
      // Close modal and refresh the list
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Outlet created successfully");
    } catch (error) {
      console.error("Error creating outlet:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
      // Don't show generic alert anymore - errors will be displayed in the modal
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddModalOpen(false);
  };

  const handleEditOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setIsEditModalOpen(true);
  };

  const handleDeleteOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setIsDeleteModalOpen(true);
  };

  const handleSaveOutlet = async (data: OutletUpdateRequest) => {
    if (!selectedOutlet) return;

    try {
      setIsSaving(true);
      await outletService.updateOutlet(selectedOutlet.id, data);
      
      // Close modal and refresh the list
      setIsEditModalOpen(false);
      setSelectedOutlet(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Outlet updated successfully");
    } catch (error) {
      console.error("Error updating outlet:", error);
      alert("Failed to update outlet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOutlet) return;

    try {
      setIsDeleting(true);
      await outletService.deleteOutlet(selectedOutlet.id);
      
      // Close modal and refresh the list
      setIsDeleteModalOpen(false);
      setSelectedOutlet(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log("Outlet deleted successfully");
    } catch (error) {
      console.error("Error deleting outlet:", error);
      alert("Failed to delete outlet. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedOutlet(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedOutlet(null);
  };

  return (
    <>
      <Helmet>
        <title>Outlets Management | Jay Bhavani - Admin Dashboard</title>
      </Helmet>

      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Outlets Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage all your outlet locations, contact information, and bank details.
              </p>
              {isSearchActive && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Filtering outlets for: "{searchQuery}"</span>
                </div>
              )}
            </div>
            <button
              onClick={handleAddOutlet}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Outlet
            </button>
          </div>
        </div>

        {/* Outlets List */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <OutletsList
            key={refreshKey} // Force refresh when key changes
            onEditOutlet={handleEditOutlet}
            onDeleteOutlet={handleDeleteOutlet}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
          />
        </div>

        {/* Add Modal */}
        <AddOutletModal
          isOpen={isAddModalOpen}
          onSave={handleSaveNewOutlet}
          onCancel={handleCancelAdd}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Edit Modal */}
        <EditOutletModal
          isOpen={isEditModalOpen}
          outlet={selectedOutlet}
          onSave={handleSaveOutlet}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          outlet={selectedOutlet}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      </div>
    </>
  );
};

export default OutletsPage;
