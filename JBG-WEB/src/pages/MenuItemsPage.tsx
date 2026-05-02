import { useState } from "react";
import { Helmet } from "react-helmet-async";
import MenuItemsList from "../components/menuItems/MenuItemsList";
import EditMenuItemModal from "../components/menuItems/EditMenuItemModal";
import AddMenuItemModal from "../components/menuItems/AddMenuItemModal";
import DeleteConfirmationModal from "../components/menuItems/DeleteConfirmationModal";
import { MenuItem, MenuItemUpdateRequest, MenuItemCreateRequest } from "../types/menuItem";
import menuItemService, { parseApiError } from "../services/menuItemService";
import { useSearch } from "../context/SearchContext";

const MenuItemsPage = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiErrors, setApiErrors] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);
  
  const { searchQuery } = useSearch();

  const handleAddMenuItem = () => {
    setApiErrors(null); // Clear any previous API errors
    setIsAddModalOpen(true);
  };

  const handleSaveNewMenuItem = async (data: MenuItemCreateRequest) => {
    try {
      setIsSaving(true);
      setApiErrors(null); // Clear previous errors
      await menuItemService.createMenuItem(data);
      
      // Close modal and refresh the list
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1);
      
      // Show success message (you can implement a toast notification system)
      console.log("Menu item created successfully");
    } catch (error) {
      console.error("Error creating menu item:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
      // Don't show generic alert anymore - errors will be displayed in the modal
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMenuItem = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setApiErrors(null); // Clear any previous API errors
    setIsEditModalOpen(true);
  };

  const handleSaveEditMenuItem = async (data: MenuItemUpdateRequest) => {
    if (!selectedMenuItem) return;

    try {
      setIsSaving(true);
      setApiErrors(null); // Clear previous errors
      await menuItemService.updateMenuItem(selectedMenuItem.id, data);
      
      // Close modal and refresh the list
      setIsEditModalOpen(false);
      setSelectedMenuItem(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log("Menu item updated successfully");
    } catch (error) {
      console.error("Error updating menu item:", error);
      const parsedError = parseApiError(error);
      setApiErrors(parsedError);
      // Don't show generic alert anymore - errors will be displayed in the modal
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenuItem = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMenuItem) return;

    try {
      setIsDeleting(true);
      await menuItemService.deleteMenuItem(selectedMenuItem.id);
      
      // Close modal and refresh the list
      setIsDeleteModalOpen(false);
      setSelectedMenuItem(null);
      setRefreshKey(prev => prev + 1);
      
      // Show success message
      console.log("Menu item deleted successfully");
    } catch (error) {
      console.error("Error deleting menu item:", error);
      alert("Failed to delete menu item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setApiErrors(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMenuItem(null);
    setApiErrors(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedMenuItem(null);
  };

  return (
    <>
      <Helmet>
        <title>Menu Items Management | Jay Bhavani Dryfruit Dish Gola</title>
        <meta name="description" content="Manage menu items for Jay Bhavani Dryfruit Dish Gola POS system" />
      </Helmet>

      <MenuItemsList
        onEditMenuItem={handleEditMenuItem}
        onDeleteMenuItem={handleDeleteMenuItem}
        onAddMenuItem={handleAddMenuItem}
        searchQuery={searchQuery}
        refreshKey={refreshKey}
      />

      {/* Add Menu Item Modal */}
      <AddMenuItemModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleSaveNewMenuItem}
        isSaving={isSaving}
        apiErrors={apiErrors}
      />

      {/* Edit Menu Item Modal */}
      <EditMenuItemModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditMenuItem}
        menuItem={selectedMenuItem}
        isSaving={isSaving}
        apiErrors={apiErrors}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        menuItem={selectedMenuItem}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default MenuItemsPage;