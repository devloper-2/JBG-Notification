import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { OutletMenuItem } from '../../types/outletMenu';
import menuItemService from '../../services/menuItemService';
import { Modal } from '../ui/modal';

const DRAG_TYPE = 'FLAVOUR_RECIPE';

interface FlavourRecipeOption {
  menu_recipe_id: number;
  name: string;
}

interface FlavourDisplayOrderModalProps {
  isOpen: boolean;
  outletMenu: OutletMenuItem | null;
  isSaving: boolean;
  apiErrors?: { message: string; fieldErrors: Record<string, string> };
  onClose: () => void;
  onSave: (outletMenuItemId: number, recipeIds: number[]) => void;
}

const parseLocalizedText = (value?: string | Record<string, string> | null): string => {
  if (!value) return '';

  // Live API may return item_name as an already-parsed object
  if (typeof value === 'object') {
    return value.default || value.en || (Object.values(value)[0] as string) || '';
  }

  try {
    const parsed = JSON.parse(value);
    return parsed.default || parsed.en || Object.values(parsed)[0] || value;
  } catch {
    return value;
  }
};

interface DraggableRecipeRowProps {
  recipe: FlavourRecipeOption;
  index: number;
  isSaving: boolean;
  moveRecipe: (from: number, to: number) => void;
}

const DraggableRecipeRow: React.FC<DraggableRecipeRowProps> = ({ recipe, index, isSaving, moveRecipe }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: !isSaving,
  });

  const [{ isOver }, drop] = useDrop<{ index: number }, void, { isOver: boolean }>({
    accept: DRAG_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover(item) {
      if (item.index === index) return;
      moveRecipe(item.index, index);
      item.index = index;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between gap-3 px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 transition-opacity select-none
        ${isDragging ? 'opacity-40 border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'}
        ${isOver && !isDragging ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${isSaving ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Drag handle */}
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="4" r="1.2" />
          <circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" />
          <circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="11" cy="12" r="1.2" />
        </svg>

        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{recipe.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recipe ID: {recipe.menu_recipe_id}</p>
        </div>
      </div>
    </div>
  );
};

const FlavourDisplayOrderModal: React.FC<FlavourDisplayOrderModalProps> = ({
  isOpen,
  outletMenu,
  isSaving,
  apiErrors,
  onClose,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [flavourRecipes, setFlavourRecipes] = useState<FlavourRecipeOption[]>([]);
  const [initialRecipeIds, setInitialRecipeIds] = useState<number[]>([]);

  useEffect(() => {
    const loadFlavours = async () => {
      if (!isOpen || !outletMenu) {
        setFlavourRecipes([]);
        setInitialRecipeIds([]);
        return;
      }

      try {
        setLoading(true);

        const response = await menuItemService.getMenuItemById(outletMenu.menu_item_id, outletMenu.outlet_id);
        const menuItem = response.data;

        const flavourOnly = (menuItem.recipes || [])
          .filter((recipe) => recipe.is_flavour)
          .sort((a, b) => {
            const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
            const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;

            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }

            return (a.id || 0) - (b.id || 0);
          })
          .map((recipe) => {
            const recipeId = recipe.id || 0;
            return {
              menu_recipe_id: recipeId,
              name: parseLocalizedText(recipe.stockItem?.item_name) || `Recipe #${recipeId}`,
            };
          })
          .filter((recipe) => recipe.menu_recipe_id > 0);

        setFlavourRecipes(flavourOnly);
        setInitialRecipeIds(flavourOnly.map((item) => item.menu_recipe_id));
      } catch (error) {
        console.error('Failed to load menu item flavours:', error);
        setFlavourRecipes([]);
        setInitialRecipeIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadFlavours();
  }, [isOpen, outletMenu]);

  const itemLabel = useMemo(() => {
    if (!outletMenu) return '';
    return parseLocalizedText(outletMenu.menu_item.item_name) || `Menu Item #${outletMenu.menu_item.id}`;
  }, [outletMenu]);

  const moveRecipe = useCallback((from: number, to: number) => {
    setFlavourRecipes((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  const handleResetOrder = () => {
    if (initialRecipeIds.length === 0) {
      setFlavourRecipes([]);
      return;
    }

    const byId = new Map(flavourRecipes.map((item) => [item.menu_recipe_id, item]));
    const resetList = initialRecipeIds
      .map((id) => byId.get(id))
      .filter((item): item is FlavourRecipeOption => Boolean(item));

    setFlavourRecipes(resetList);
  };

  const handleSave = () => {
    if (!outletMenu) return;
    const recipeIds = flavourRecipes.map((item) => item.menu_recipe_id);
    onSave(outletMenu.outlet_menu_item_id, recipeIds);
  };

  const handleClearOverrides = () => {
    if (!outletMenu) return;
    onSave(outletMenu.outlet_menu_item_id, []);
  };

  if (!isOpen || !outletMenu) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-4xl mx-4">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set Flavour Display Order</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Outlet: <span className="font-medium text-blue-600 dark:text-blue-400">{outletMenu.outlet.name}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Menu Item: {itemLabel}</p>
        </div>

        {apiErrors?.message && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
            {apiErrors.message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : flavourRecipes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5 text-sm text-gray-600 dark:text-gray-300">
            No flavour recipes found for this menu item.
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Drag to reorder flavours. This order is saved outlet-wise for this menu item.
            </p>

            <DndProvider backend={HTML5Backend}>
              <div className="grid grid-cols-3 gap-3">
                {flavourRecipes.map((recipe, index) => (
                  <DraggableRecipeRow
                    key={recipe.menu_recipe_id}
                    recipe={recipe}
                    index={index}
                    isSaving={isSaving}
                    moveRecipe={moveRecipe}
                  />
                ))}
              </div>
            </DndProvider>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 pt-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetOrder}
              disabled={isSaving || flavourRecipes.length === 0}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleClearOverrides}
              disabled={isSaving}
              className="px-4 py-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Overrides
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || loading || flavourRecipes.length === 0}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {isSaving ? 'Saving...' : 'Save Flavour Order'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FlavourDisplayOrderModal;
