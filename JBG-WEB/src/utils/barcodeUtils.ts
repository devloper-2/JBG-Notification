import JsBarcode from 'jsbarcode';

/**
 * Generate a unique barcode number
 */
export const generateBarcodeNumber = (): string => {
  // Generate a unique 13-digit EAN-13 compatible barcode
  // Format: YYYYMMDDHHMSS where:
  // YYYY = year, MM = month, DD = day, HH = hour, MM = minute, SS = second
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  
  // Add a random 1-digit number at the end for uniqueness
  const random = Math.floor(Math.random() * 10);
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
};

/**
 * Generate barcode image as base64 data URL
 */
export const generateBarcodeImage = (barcodeNumber: string, options?: {
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
}): string => {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    
    // Set default options
    const defaultOptions = {
      format: 'CODE128' as const,
      width: 2,
      height: 100,
      displayValue: true,
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    // Generate barcode
    JsBarcode(canvas, barcodeNumber, finalOptions);
    
    // Return base64 data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    return '';
  }
};

/**
 * Validate barcode number format
 */
export const validateBarcodeNumber = (barcodeNumber: string): boolean => {
  // Check if barcode number is valid (at least 8 characters, only digits)
  const barcodeRegex = /^\d{8,}$/;
  return barcodeRegex.test(barcodeNumber);
};

/**
 * Format barcode number for display
 */
export const formatBarcodeNumber = (barcodeNumber: string): string => {
  // Add spaces for better readability
  return barcodeNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
};
