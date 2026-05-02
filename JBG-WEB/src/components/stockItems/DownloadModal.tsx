import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { StockItem } from "../../types/stockItem";
import { generateAllItemsPDF, generateSelectedItemsPDF } from "../../utils/pdfUtils";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allItems: StockItem[];
  selectedItems: StockItem[];
  onSelectionChange: (items: StockItem[]) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  allItems,
  selectedItems,
  onSelectionChange,
}) => {
  const [downloadType, setDownloadType] = useState<'all' | 'selected'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to parse item names (handles both object and string formats)
  const parseItemName = (itemName: string | object | null | undefined): string => {
    if (!itemName) {
      return 'Unknown Item';
    }
    
    // If it's already an object, use it directly
    if (typeof itemName === 'object') {
      const obj = itemName as Record<string, any>;
      return obj.default || obj.en || obj.hi || obj["1"] || obj["2"] || obj["3"] || Object.values(obj)[0] || 'Unknown Item';
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof itemName === 'string') {
      try {
        const parsed = JSON.parse(itemName);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.default || parsed.en || parsed.hi || parsed["1"] || parsed["2"] || parsed["3"] || Object.values(parsed)[0] || 'Unknown Item';
        }
        return itemName;
      } catch {
        return itemName || 'Unknown Item';
      }
    }
    
    return 'Unknown Item';
  };

  // Filter items based on search query
  const filteredItems = allItems.filter(item => {
    const itemName = parseItemName(item.item_name);
    return itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (item.hsn_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (item.barcode_number || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      
      if (downloadType === 'all') {
        await generateAllItemsPDF(allItems);
      } else {
        if (selectedItems.length === 0) {
          alert('Please select at least one item to download.');
          return;
        }
        await generateSelectedItemsPDF(selectedItems);
      }
      
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleItemToggle = (item: StockItem) => {
    const isSelected = selectedItems.some(selected => selected.stock_item_id === item.stock_item_id);
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => selected.stock_item_id !== item.stock_item_id));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredItems);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Download Stock Items PDF
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate a PDF report with barcodes for your stock items
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isGenerating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Download Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Choose download option:
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={downloadType === 'all'}
                onChange={(e) => setDownloadType(e.target.value as 'all' | 'selected')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                disabled={isGenerating}
              />
              <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                Download All Items ({allItems.length} items)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="selected"
                checked={downloadType === 'selected'}
                onChange={(e) => setDownloadType(e.target.value as 'all' | 'selected')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                disabled={isGenerating}
              />
              <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                Download Selected Items ({selectedItems.length} items selected)
              </span>
            </label>
          </div>
        </div>

        {/* Item Selection (shown only when "selected" is chosen) */}
        {downloadType === 'selected' && (
          <div className="flex-1 min-h-0">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Items to Download:
                </label>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll}
                    disabled={isGenerating}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeselectAll}
                    disabled={isGenerating}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No items found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <label
                      key={item.stock_item_id}
                      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.some(selected => selected.stock_item_id === item.stock_item_id)}
                        onChange={() => handleItemToggle(item)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        disabled={isGenerating}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {parseItemName(item.item_name)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {item.stock_item_id} | HSN: {item.hsn_code} | Barcode: {item.barcode_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ₹{parseFloat(item.selling_cost).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Stock: {parseFloat(item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating || (downloadType === 'selected' && selectedItems.length === 0)}
            className="flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;
