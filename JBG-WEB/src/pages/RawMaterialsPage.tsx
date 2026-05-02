import { useState } from "react";
import { Helmet } from "react-helmet-async";
import RawMaterialsList from "../components/rawMaterials/RawMaterialsList";
import EditRawMaterialModal from "../components/rawMaterials/EditRawMaterialModal";
import AddRawMaterialModal from "../components/rawMaterials/AddRawMaterialModal";
import DeleteConfirmationModal from "../components/rawMaterials/DeleteConfirmationModal";
import { RawMaterial, RawMaterialUpdateRequest, RawMaterialCreateRequest } from "../types/rawMaterial";
import rawMaterialService, { parseApiError } from "../services/rawMaterialService";
import { useSearch } from "../context/SearchContext";

const RawMaterialsPage: React.FC = () => {
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterial | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  
  const { searchQuery, isSearchActive } = useSearch();

  const handleAddRawMaterial = () => {
    setApiErrors(null); // Clear any previous API errors
    setIsAddModalOpen(true);
  };

  const handleSaveNewRawMaterial = async (data: RawMaterialCreateRequest) => {
    try {
      setIsSaving(true);
      setApiErrors(null); // Clear previous errors
      await rawMaterialService.createRawMaterial(data);
      
      // Close modal and refresh the list
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Raw material created successfully");
    } catch (error) {
      console.error("Error creating raw material:", error);
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

  const handleEditRawMaterial = (rawMaterial: RawMaterial) => {
    setSelectedRawMaterial(rawMaterial);
    setApiErrors(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteRawMaterial = (rawMaterial: RawMaterial) => {
    setSelectedRawMaterial(rawMaterial);
    setIsDeleteModalOpen(true);
  };

  const handleSaveRawMaterial = async (data: RawMaterialUpdateRequest) => {
    if (!selectedRawMaterial) return;

    try {
      setIsSaving(true);
      setApiErrors(null);
      await rawMaterialService.updateRawMaterial(selectedRawMaterial.raw_material_id, data);
      
      // Close modal and refresh the list
      setIsEditModalOpen(false);
      setSelectedRawMaterial(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Raw material updated successfully");
    } catch (error) {
      console.error("Error updating raw material:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRawMaterial) return;

    try {
      setIsDeleting(true);
      await rawMaterialService.deleteRawMaterial(selectedRawMaterial.raw_material_id);
      
      // Close modal and refresh the list
      setIsDeleteModalOpen(false);
      setSelectedRawMaterial(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log("Raw material deleted successfully");
    } catch (error) {
      console.error("Error deleting raw material:", error);
      alert("Failed to delete raw material. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setSelectedRawMaterial(null);
    setApiErrors(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedRawMaterial(null);
  };

  return (
    <>
      <Helmet>
        <title>Raw Materials Management | Jay Bhavani - Admin Dashboard</title>
      </Helmet>

      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Raw Materials Inventory
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your raw materials inventory, stock levels, and pricing information.
              </p>
              {isSearchActive && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Filtering raw materials for: "{searchQuery}"</span>
                </div>
              )}
            </div>
            <button
              onClick={handleAddRawMaterial}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Raw Material
            </button>
          </div>
        </div>

        {/* Raw Materials List */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <RawMaterialsList
            key={refreshKey} // Force refresh when key changes
            onEditRawMaterial={handleEditRawMaterial}
            onDeleteRawMaterial={handleDeleteRawMaterial}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
          />
        </div>

        {/* Add Modal */}
        <AddRawMaterialModal
          isOpen={isAddModalOpen}
          onSave={handleSaveNewRawMaterial}
          onCancel={handleCancelAdd}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Edit Modal */}
        <EditRawMaterialModal
          isOpen={isEditModalOpen}
          rawMaterial={selectedRawMaterial}
          onSave={handleSaveRawMaterial}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          apiErrors={apiErrors || undefined}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          rawMaterial={selectedRawMaterial}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      </div>
    </>
  );
};

export default RawMaterialsPage;
