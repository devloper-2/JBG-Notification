import { useState } from "react";
import UnitSelect from "../form/UnitSelect";
import { Unit } from "../../types/rawMaterial";

const UnitSelectExample: React.FC = () => {
  const [selectedUnitId, setSelectedUnitId] = useState<number | undefined>();
  const [loadedUnits, setLoadedUnits] = useState<Unit[]>([]);

  const handleUnitChange = (unitId: number) => {
    setSelectedUnitId(unitId);
    console.log('Selected unit ID:', unitId);
    const selectedUnit = loadedUnits.find(unit => unit.id === unitId);
    if (selectedUnit) {
      console.log('Selected unit details:', selectedUnit);
    }
  };

  const handleUnitsLoaded = (units: Unit[]) => {
    setLoadedUnits(units);
    console.log('Units loaded in parent component:', units);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Unit Selection Example
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Unit
          </label>
          <UnitSelect
            value={selectedUnitId}
            onChange={handleUnitChange}
            onUnitsLoaded={handleUnitsLoaded}
            placeholder="Choose a unit"
            required
          />
        </div>

        {selectedUnitId && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Selected Unit ID: <span className="font-semibold">{selectedUnitId}</span>
            </p>
            {loadedUnits.find(u => u.id === selectedUnitId) && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Type: {loadedUnits.find(u => u.id === selectedUnitId)?.unit_type}
              </p>
            )}
          </div>
        )}

        {loadedUnits.length > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              📡 API Data Loaded: <span className="font-semibold">{loadedUnits.length} units</span>
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              Types: {[...new Set(loadedUnits.map(u => u.unit_type))].join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitSelectExample;
