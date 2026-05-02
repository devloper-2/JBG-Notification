import jsPDF from 'jspdf';
import { StockItem } from '../types/stockItem';
import { generateBarcodeImage } from './barcodeUtils';

/**
 * Generate barcode image for a stock item
 */
const generateBarcodeForPDF = (stockItem: StockItem): string => {
  try {
    if (!stockItem.barcode_number) {
      return '';
    }

    // Generate barcode image using our existing utility
    const barcodeDataURL = generateBarcodeImage(stockItem.barcode_number, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true
    });

    return barcodeDataURL;
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
};

/**
 * Parse item name from JSON string or object
 */
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

/**
 * Generate PDF with stock items and barcodes
 */
export const generateStockItemsPDF = async (
  stockItems: StockItem[],
  options: {
    title?: string;
    includeBarcodes?: boolean;
    itemsPerPage?: number;
  } = {}
): Promise<void> => {
  const {
    title = 'Stock Items Report',
    includeBarcodes = true,
    itemsPerPage = 4
  } = options;

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let yPosition = margin;
    let currentPage = 1;
    let itemsOnCurrentPage = 0;

    // Add title and header
    const addHeader = () => {
      pdf.setFontSize(20);
      pdf.setTextColor(51, 51, 51);
      pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const currentDate = new Date().toLocaleDateString();
      pdf.text(`Generated on: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
    };

    // Add footer
    const addFooter = () => {
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });
      pdf.text('Jay Bhavani - Stock Management System', pageWidth / 2, footerY + 5, { align: 'center' });
    };

    addHeader();

    for (let i = 0; i < stockItems.length; i++) {
      const item = stockItems[i];
      const itemName = parseItemName(item.item_name);

      // Check if we need a new page
      if (itemsOnCurrentPage >= itemsPerPage) {
        addFooter();
        pdf.addPage();
        currentPage++;
        yPosition = margin;
        itemsOnCurrentPage = 0;
        addHeader();
      }

      // Calculate item box dimensions
      const itemHeight = includeBarcodes ? 60 : 40;
      const itemWidth = contentWidth;

      // Check if item fits on current page
      if (yPosition + itemHeight > pageHeight - 30) {
        addFooter();
        pdf.addPage();
        currentPage++;
        yPosition = margin;
        itemsOnCurrentPage = 0;
        addHeader();
      }

      // Draw item container
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(margin, yPosition, itemWidth, itemHeight, 3, 3, 'FD');

      let textX = margin + 10;
      let textY = yPosition + 15;

      // Add barcode if enabled
      if (includeBarcodes) {
        try {
          const barcodeDataURL = generateBarcodeForPDF(item);
          if (barcodeDataURL) {
            const barcodeWidth = 80;
            const barcodeHeight = 25;
            pdf.addImage(barcodeDataURL, 'PNG', pageWidth - margin - barcodeWidth - 10, yPosition + 10, barcodeWidth, barcodeHeight);
          }
        } catch (error) {
          console.error('Error adding barcode to PDF:', error);
        }
      }

      // Item details
      pdf.setFontSize(14);
      pdf.setTextColor(51, 51, 51);
      pdf.text(itemName, textX, textY);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      textY += 8;

      // Item details in two columns
      const leftColumnX = textX;
      const rightColumnX = textX + (itemWidth / 2) - 20;

      // Left column
      pdf.text(`ID: ${item.stock_item_id}`, leftColumnX, textY);
      pdf.text(`HSN: ${item.hsn_code || 'N/A'}`, leftColumnX, textY + 6);
      pdf.text(`Barcode: ${item.barcode_number || 'N/A'}`, leftColumnX, textY + 12);
      pdf.text(`Stock: ${parseFloat(item.quantity).toFixed(2)}`, leftColumnX, textY + 18);

      // Right column (only if space allows)
      if (!includeBarcodes || rightColumnX + 80 < pageWidth - margin - 90) {
        pdf.text(`Production: ₹${parseFloat(item.production_cost).toFixed(2)}`, rightColumnX, textY);
        pdf.text(`Selling: ₹${parseFloat(item.selling_cost).toFixed(2)}`, rightColumnX, textY + 6);
        const profit = parseFloat(item.selling_cost) - parseFloat(item.production_cost);
        pdf.text(`Profit: ₹${profit.toFixed(2)}`, rightColumnX, textY + 12);
        
        // Status badges
        if (item.is_active) {
          pdf.setFillColor(34, 197, 94);
          pdf.setTextColor(255, 255, 255);
          pdf.roundedRect(rightColumnX, textY + 15, 20, 5, 1, 1, 'F');
          pdf.setFontSize(8);
          pdf.text('ACTIVE', rightColumnX + 10, textY + 18.5, { align: 'center' });
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(10);
        }
      }

      yPosition += itemHeight + 10;
      itemsOnCurrentPage++;
    }

    // Add final footer
    addFooter();

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Stock_Items_Report_${timestamp}.pdf`;

    // Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

/**
 * Generate PDF for selected stock items with custom title
 */
export const generateSelectedItemsPDF = async (
  selectedItems: StockItem[],
  customTitle?: string
): Promise<void> => {
  const title = customTitle || `Selected Stock Items (${selectedItems.length} items)`;
  await generateStockItemsPDF(selectedItems, { title });
};

/**
 * Generate PDF for all stock items
 */
export const generateAllItemsPDF = async (allItems: StockItem[]): Promise<void> => {
  const title = `All Stock Items (${allItems.length} items)`;
  await generateStockItemsPDF(allItems, { title });
};
