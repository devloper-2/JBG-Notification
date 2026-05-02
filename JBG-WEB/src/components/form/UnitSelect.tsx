import { useEffect, useState } from "react";
import { Unit } from "../../types/rawMaterial";
import unitService from "../../services/unitService";

interface UnitSelectProps {
  value?: number;
  onChange: (unitId: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  onUnitsLoaded?: (units: Unit[]) => void; // Callback when units are loaded
}

const UnitSelect: React.FC<UnitSelectProps> = ({
  value,
  onChange,
  placeholder = "Select a unit",
  className = "",
  disabled = false,
  required = false,
  onUnitsLoaded,
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching units from API...');
      const response = await unitService.getUnits();
      console.log('✅ Units loaded successfully:', response.units);
      console.log('📊 Total units:', response.count);
      console.log('🏷️ Unit types available:', [...new Set(response.units.map(u => u.unit_type))]);
      setUnits(response.units);
      onUnitsLoaded?.(response.units);
    } catch (err) {
      console.error('❌ Error fetching units:', err);
      setError('Failed to load units. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [onUnitsLoaded]);

  // Helper function to parse multilingual strings
  const parseMultilingualString = (multilingualObj: Record<string, string>, defaultKey: string = 'default'): string => {
    // Try to get the default value first, then fall back to the first available value
    return multilingualObj[defaultKey] || multilingualObj['1'] || Object.values(multilingualObj)[0] || '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitId = parseInt(e.target.value);
    onChange(unitId);
  };

  if (loading) {
    return (
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`}
        disabled
      >
        <option>Loading units...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <select
          className={`h-11 w-full appearance-none rounded-lg border border-red-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-red-300 focus:outline-hidden focus:ring-3 focus:ring-red-500/10 dark:border-red-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-red-800 ${className}`}
          disabled
        >
          <option>{error}</option>
        </select>
        <button
          type="button"
          onClick={fetchUnits}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Click to retry
        </button>
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={handleChange}
      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
        value
          ? "text-gray-800 dark:text-white/90"
          : "text-gray-400 dark:text-gray-400"
      } ${className}`}
      disabled={disabled}
      required={required}
    >
      {/* Placeholder option */}
      <option
        value=""
        disabled
        className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
      >
        {placeholder}
      </option>

      {/* Group units by type - dynamically get unit types from API data */}
      {Array.from(new Set(units.filter(unit => unit.is_active).map(unit => unit.unit_type)))
        .sort()
        .map((unitType) => {
          const unitsOfType = units.filter(unit => unit.unit_type === unitType && unit.is_active);
          
          return (
            <optgroup
              key={unitType}
              label={unitType.charAt(0).toUpperCase() + unitType.slice(1)}
              className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              {unitsOfType.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.id}
                  className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
                >
                  {parseMultilingualString(unit.name)} ({parseMultilingualString(unit.short_name)})
                </option>
              ))}
            </optgroup>
          );
        })}
    </select>
  );
};

export default UnitSelect;
