import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import * as XLSX from 'xlsx';
import orderService from '../services/orderService';
import outletService from '../services/outletService';
import { Outlet } from '../types/outlet';
import DatePicker from '../components/form/date-picker';

const AdminOrdersPage: React.FC = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Load outlets on mount
  useEffect(() => {
    loadOutlets();
  }, []);

  // Load orders when outlet or dates change
  useEffect(() => {
    if (selectedOutletId) {
      loadOrders();
    }
  }, [selectedOutletId, startDate, endDate]);

  const loadOutlets = async () => {
    try {
      const outletsData = await outletService.getOutlets();
      setOutlets(outletsData);
      // Auto-select first outlet if available
      if (outletsData.length > 0) {
        setSelectedOutletId(outletsData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading outlets:', err);
      setError('Failed to load outlets');
    }
  };

  const loadOrders = async () => {
    if (!selectedOutletId) return;

    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await orderService.getOrdersByOutlet(selectedOutletId, params);
      setOrders(response.data || []);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatOrderType = (orderType: string) => {
    return orderType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calculate item-wise order counts
  const calculateItemCounts = () => {
    const itemCounts: Record<string, number> = {};
    const detailCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          // Count main menu items
          const itemName = item.menu_item_name?.en || item.menu_item_name?.default || 'Unknown Item';
          const quantity = parseInt(item.quantity) || 1;
          
          if (itemCounts[itemName]) {
            itemCounts[itemName] += quantity;
          } else {
            itemCounts[itemName] = quantity;
          }
          
          // Count menu item details (add-ons/customizations)
          if (item.menu_item_details && item.menu_item_details.length > 0) {
            item.menu_item_details.forEach((detail: any) => {
              const detailName = detail.name?.en || detail.name?.default || 'Unknown Detail';
              const detailQuantity = parseInt(detail.quantity) || 1;
              
              if (detailCounts[detailName]) {
                detailCounts[detailName] += detailQuantity;
              } else {
                detailCounts[detailName] = detailQuantity;
              }
            });
          }
        });
      }
    });
    
    return { itemCounts, detailCounts };
  };

  // Reads CGST/SGST rates from the selected outlet's tax settings.
  // Falls back to splitting total evenly if named entries aren't found.
  const getOutletTaxInfo = () => {
    const outlet = outlets.find(o => o.id === selectedOutletId);
    const activeTaxes = (outlet?.taxes || []).filter(t => t.is_active !== false);

    const cgstTax = activeTaxes.find(t => t.tax_name.toLowerCase().includes('cgst'));
    const sgstTax = activeTaxes.find(t => t.tax_name.toLowerCase().includes('sgst'));

    if (cgstTax && sgstTax) {
      const cgstRate = parseFloat(String(cgstTax.tax_value)) || 0;
      const sgstRate = parseFloat(String(sgstTax.tax_value)) || 0;
      return {
        cgstRate,
        sgstRate,
        totalRate: cgstRate + sgstRate,
      };
    }

    // Fallback: sum all active taxes and split 50/50
    const totalRate = activeTaxes.reduce((sum, t) => sum + (parseFloat(String(t.tax_value)) || 0), 0);
    return {
      cgstRate: totalRate / 2,
      sgstRate: totalRate / 2,
      totalRate,
    };
  };

  const exportDetailedReport = () => {
    if (orders.length === 0) return;

    const dateRange = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
        ? `From ${startDate}`
        : endDate
          ? `Until ${endDate}`
          : 'All Dates';

    const outletName = outlets.find(outlet => outlet.id === selectedOutletId)?.name || 'All Outlets';
    const { cgstRate, sgstRate, totalRate } = getOutletTaxInfo();

    const calcGSTDetailed = (finalTotal: string | number) => {
      const total = parseFloat(finalTotal?.toString() || '0');
      const taxableAmount = total / (1 + totalRate / 100);
      return {
        cgst: taxableAmount * (cgstRate / 100),
        sgst: taxableAmount * (sgstRate / 100),
        taxableAmount,
      };
    };

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Detailed Orders ──────────────────────────────────────────
    const ordersAoa: any[][] = [
      ['Detailed Orders Report', outletName],
      ['Date Range', dateRange],
      ['Generated on', new Date().toLocaleString()],
      ['Total Orders', orders.length],
      [],
      [
        'Bill No', 'Order Date', 'Customer Name', 'Phone', 'Order Type',
        'Payment Method', 'Item Name', 'Item Details', 'Quantity', 'Item Total',
        'Item Note', 'Order Amount',
        `Order CGST (${cgstRate}%)`, `Order SGST (${sgstRate}%)`, 'Order Final Total',
      ],
    ];

    orders.forEach(order => {
      const { sgst, cgst, taxableAmount } = calcGSTDetailed(order.final_total);
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any, index: number) => {
          let itemDetails = '';
          if (item.menu_item_details && item.menu_item_details.length > 0) {
            itemDetails = item.menu_item_details.map((detail: any) =>
              `${detail.name?.en || detail.name?.default || 'N/A'} (Qty: ${detail.quantity})`
            ).join('; ');
          }
          ordersAoa.push([
            order.bill_no,
            formatDate(order.order_datetime),
            order.customer_name || 'Guest',
            order.phone || '',
            formatOrderType(order.order_type),
            order.payment_method,
            item.menu_item_name?.en || item.menu_item_name?.default || 'Unknown Item',
            itemDetails,
            Number(item.quantity),
            parseFloat(item.item_total),
            item.item_note || '',
            index === 0 ? parseFloat(taxableAmount.toFixed(2)) : '',
            index === 0 ? parseFloat(cgst.toFixed(2)) : '',
            index === 0 ? parseFloat(sgst.toFixed(2)) : '',
            index === 0 ? parseFloat(order.final_total) : '',
          ]);
        });
      } else {
        ordersAoa.push([
          order.bill_no,
          formatDate(order.order_datetime),
          order.customer_name || 'Guest',
          order.phone || '',
          formatOrderType(order.order_type),
          order.payment_method,
          'No items found', '', '', '', '',
          parseFloat(taxableAmount.toFixed(2)),
          parseFloat(cgst.toFixed(2)),
          parseFloat(sgst.toFixed(2)),
          parseFloat(order.final_total),
        ]);
      }
    });

    // Add TOTAL row after data rows
    {
      const totalQty = orders.reduce((s, o) => s + (o.items || []).reduce((qs: number, i: any) => qs + (Number(i.quantity) || 0), 0), 0);
      const totalItemTotal = orders.reduce((s, o) => s + (o.items || []).reduce((ts: number, i: any) => ts + (parseFloat(i.item_total) || 0), 0), 0);
      const totalAmount = orders.reduce((s, o) => s + calcGSTDetailed(o.final_total).taxableAmount, 0);
      const tCGST = orders.reduce((s, o) => s + calcGSTDetailed(o.final_total).cgst, 0);
      const tSGST = orders.reduce((s, o) => s + calcGSTDetailed(o.final_total).sgst, 0);
      const tFinal = orders.reduce((s, o) => s + parseFloat(o.final_total || '0'), 0);
      ordersAoa.push([
        'TOTAL', '', '', '', '', '', '', '', totalQty, parseFloat(totalItemTotal.toFixed(2)), '',
        parseFloat(totalAmount.toFixed(2)),
        parseFloat(tCGST.toFixed(2)),
        parseFloat(tSGST.toFixed(2)),
        parseFloat(tFinal.toFixed(2)),
      ]);
    }

    const wsOrders = XLSX.utils.aoa_to_sheet(ordersAoa);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Detailed Orders');

    // ── Sheet 2: Item Counts ──────────────────────────────────────────────
    const { itemCounts, detailCounts } = calculateItemCounts();
    const itemAoa: any[][] = [
      ['Item Name', 'Quantity Sold'],
      ...Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => [name, count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemAoa), 'Item Counts');

    // ── Sheet 3: Item Detail Counts ───────────────────────────────────────
    const detailAoa: any[][] = [
      ['Add-on / Detail Name', 'Quantity Sold'],
      ...Object.entries(detailCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => [name, count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailAoa), 'Item Details');

    // ── Sheet 4: Summary ──────────────────────────────────────────────────
    const summary = calculateSummary();
    const totalCGST = orders.reduce((s, o) => s + calcGSTDetailed(o.final_total).cgst, 0);
    const totalSGST = orders.reduce((s, o) => s + calcGSTDetailed(o.final_total).sgst, 0);
    const summaryAoa: any[][] = [
      ['Order Summary', outletName],
      ['Date Range', dateRange],
      [],
      ['Metric', 'Value'],
      ['Total Orders', summary.totalOrders],
      ['Cash Orders', summary.totalCashOrders],
      ['Card Orders', summary.totalCardOrders],
      ['Cash+Card Orders', summary.totalCashCardOrders],
      ['Swiggy Orders', summary.totalSwiggyOrders],
      ['Zomato Orders', summary.totalZomatoOrders],
      ['Total Cash Collected', summary.totalCashCollected],
      ['Total Card Collected', summary.totalCardCollected],
      ['Total Subtotal', summary.totalSubtotal],
      ['Total Tax', summary.totalTax],
      ['Final Total', summary.finalTotal],
      [`Total CGST (${cgstRate}%)`, parseFloat(totalCGST.toFixed(2))],
      [`Total SGST (${sgstRate}%)`, parseFloat(totalSGST.toFixed(2))],
      [`Total GST (${totalRate}%)`, parseFloat((totalCGST + totalSGST).toFixed(2))],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), 'Summary');

    const filename = `detailed_orders_${outletName.replace(/\s+/g, '_').toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportToExcel = () => {
    if (orders.length === 0) return;

    const dateRange = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
        ? `From ${startDate}`
        : endDate
          ? `Until ${endDate}`
          : 'All Dates';

    const outletName = outlets.find(outlet => outlet.id === selectedOutletId)?.name || 'All Outlets';
    const { cgstRate, sgstRate, totalRate } = getOutletTaxInfo();

    const calcGST = (finalTotal: string | number) => {
      const total = parseFloat(finalTotal?.toString() || '0');
      const taxableAmount = total / (1 + totalRate / 100);
      return {
        cgst: taxableAmount * (cgstRate / 100),
        sgst: taxableAmount * (sgstRate / 100),
        taxableAmount,
      };
    };

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Orders ───────────────────────────────────────────────────
    const ordersAoa: any[][] = [
      ['Orders Export', outletName],
      ['Date Range', dateRange],
      ['Generated on', new Date().toLocaleString()],
      ['Total Orders', orders.length],
      [],
      [
        'Bill No', 'Order Date', 'Customer Name', 'Phone', 'Order Type',
        'Payment Method', 'Amount',
        `CGST (${cgstRate}%)`, `SGST (${sgstRate}%)`, 'Final Total',
      ],
    ];

    orders.forEach(order => {
      const { sgst, cgst, taxableAmount } = calcGST(order.final_total);
      ordersAoa.push([
        order.bill_no,
        formatDate(order.order_datetime),
        order.customer_name || 'Guest',
        order.phone || '',
        formatOrderType(order.order_type),
        order.payment_method,
        parseFloat(taxableAmount.toFixed(2)),
        parseFloat(cgst.toFixed(2)),
        parseFloat(sgst.toFixed(2)),
        parseFloat(order.final_total),
      ]);
    });

    // Add TOTAL row after data rows
    {
      const tAmount = orders.reduce((s, o) => s + calcGST(o.final_total).taxableAmount, 0);
      const tCGST = orders.reduce((s, o) => s + calcGST(o.final_total).cgst, 0);
      const tSGST = orders.reduce((s, o) => s + calcGST(o.final_total).sgst, 0);
      const tFinal = orders.reduce((s, o) => s + parseFloat(o.final_total || '0'), 0);
      ordersAoa.push([
        'TOTAL', '', '', '', '', '',
        parseFloat(tAmount.toFixed(2)),
        parseFloat(tCGST.toFixed(2)),
        parseFloat(tSGST.toFixed(2)),
        parseFloat(tFinal.toFixed(2)),
      ]);
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersAoa), 'Orders');

    // ── Sheet 2: Summary ──────────────────────────────────────────────────
    const summary = calculateSummary();
    const totalCGST = orders.reduce((s, o) => s + calcGST(o.final_total).cgst, 0);
    const totalSGST = orders.reduce((s, o) => s + calcGST(o.final_total).sgst, 0);
    const summaryAoa: any[][] = [
      ['Order Summary', outletName],
      ['Date Range', dateRange],
      [],
      ['Metric', 'Value'],
      ['Total Orders', summary.totalOrders],
      ['Cash Orders', summary.totalCashOrders],
      ['Card Orders', summary.totalCardOrders],
      ['Cash+Card Orders', summary.totalCashCardOrders],
      ['Swiggy Orders', summary.totalSwiggyOrders],
      ['Zomato Orders', summary.totalZomatoOrders],
      ['Total Cash Collected', summary.totalCashCollected],
      ['Total Card Collected', summary.totalCardCollected],
      ['Total Subtotal', summary.totalSubtotal],
      ['Total Tax', summary.totalTax],
      ['Final Total', summary.finalTotal],
      [`Total CGST (${cgstRate}%)`, parseFloat(totalCGST.toFixed(2))],
      [`Total SGST (${sgstRate}%)`, parseFloat(totalSGST.toFixed(2))],
      [`Total GST (${totalRate}%)`, parseFloat((totalCGST + totalSGST).toFixed(2))],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), 'Summary');

    const filename = `orders_${outletName.replace(/\s+/g, '_').toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toFixed(2)}`;
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalOrders = orders.length;
    const totalCashOrders = orders.filter(order => order.payment_method === 'cash').length;
    const totalCardOrders = orders.filter(order => order.payment_method === 'card').length;
    const totalCashCardOrders = orders.filter(order => order.payment_method === 'cash_card').length;
    const totalSwiggyOrders = orders.filter(order => order.payment_method === 'swiggy').length;
    const totalZomatoOrders = orders.filter(order => order.payment_method === 'zomato').length;

    // For cash_card orders, sum the split amounts rather than the final total
    const totalCashCollected = orders.reduce((sum, order) => {
      if (order.payment_method === 'cash') return sum + parseFloat(order.final_total || '0');
      if (order.payment_method === 'cash_card') return sum + parseFloat(order.cash_amount || '0');
      return sum;
    }, 0);
    const totalCardCollected = orders.reduce((sum, order) => {
      if (order.payment_method === 'card') return sum + parseFloat(order.final_total || '0');
      if (order.payment_method === 'cash_card') return sum + parseFloat(order.card_amount || '0');
      return sum;
    }, 0);
    
    const totalTax = orders.reduce((sum, order) => sum + parseFloat(order.total_tax || '0'), 0);
    const totalSubtotal = orders.reduce((sum, order) => sum + parseFloat(order.subtotal || '0'), 0);
    const finalTotal = orders.reduce((sum, order) => sum + parseFloat(order.final_total || '0'), 0);

    return {
      totalOrders,
      totalCashOrders,
      totalCardOrders,
      totalCashCardOrders,
      totalSwiggyOrders,
      totalZomatoOrders,
      totalCashCollected,
      totalCardCollected,
      totalTax,
      totalSubtotal,
      finalTotal
    };
  };

  const getPaymentMethodBadge = (paymentMethod: string) => {
    const methodColors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      card: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      cash_card: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      upi: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      online: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      swiggy: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      zomato: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    const label = paymentMethod === 'cash_card' ? 'CASH + CARD' : paymentMethod.toUpperCase();

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${methodColors[paymentMethod] || methodColors.cash}`}>
        {label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      preparing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      delivered: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.placed}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getOrderTypeBadge = (orderType: string) => {
    const typeColors: Record<string, string> = {
      dine_in: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      takeaway: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      delivery: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[orderType] || typeColors.dine_in}`}>
        {orderType.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Admin Orders | JBG</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Orders Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage orders across all outlets
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportDetailedReport}
              disabled={loading || orders.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Detailed Report</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={loading || orders.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Outlet Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Outlet
              </label>
              <select
                value={selectedOutletId || ''}
                onChange={(e) => setSelectedOutletId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select an outlet...</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <DatePicker
                id="start-date"
                label="Start Date"
                placeholder="Select start date"
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const formattedDate = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
                    setStartDate(formattedDate);
                  } else {
                    setStartDate('');
                  }
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <DatePicker
                id="end-date"
                label="End Date"
                placeholder="Select end date"
                onChange={(selectedDates) => {
                  if (selectedDates && selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const formattedDate = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
                    setEndDate(formattedDate);
                  } else {
                    setEndDate('');
                  }
                }}
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Clear Date Filters
            </button>
          </div>
        </div>

        {/* Orders Summary */}
        {selectedOutletId && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(orders.reduce((sum, order) => sum + parseFloat(order.final_total || '0'), 0))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {error && (
            <div className="p-6 text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              Loading orders...
            </div>
          )}

          {!loading && !error && !selectedOutletId && (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              Please select an outlet to view orders
            </div>
          )}

          {!loading && !error && selectedOutletId && orders.length === 0 && (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No orders found for the selected filters
            </div>
          )}

          {!loading && !error && selectedOutletId && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Bill No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          #{order.bill_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.customer_name || 'Guest'}
                          {order.phone && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {order.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getOrderTypeBadge(order.order_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getPaymentMethodBadge(order.payment_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.final_total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(order.order_datetime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleOrderDetails(order.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {expandedOrderId === order.id ? 'Hide' : 'View'} Items
                          </button>
                        </td>
                      </tr>
                      {expandedOrderId === order.id && order.items && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Order Items:</h4>
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {item.menu_item_name?.en || item.menu_item_name?.default || 'Unknown Item'}
                                      </p>
                                      {item.menu_item_details && item.menu_item_details.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {item.menu_item_details.map((detail: any, detailIdx: number) => (
                                            <p key={detailIdx} className="text-sm text-gray-600 dark:text-gray-400">
                                              • {detail.name?.en || detail.name?.default} (Qty: {detail.quantity})
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                      {item.item_note && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                          Note: {item.item_note}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Qty: {item.quantity}
                                      </p>
                                      <p className="font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(item.item_total)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {/* Order Summary */}
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex justify-end space-x-8 text-sm">
                                  <div>
                                    <p className="text-gray-600 dark:text-gray-400">Subtotal:</p>
                                    <p className="text-gray-600 dark:text-gray-400">Discount:</p>
                                    {order.total_tax && (
                                      <p className="text-gray-600 dark:text-gray-400">Tax:</p>
                                    )}
                                    <p className="font-semibold text-gray-900 dark:text-white">Total:</p>
                                    {order.payment_method === 'cash_card' && (
                                      <>
                                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs">Cash paid:</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs">Card paid:</p>
                                      </>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-gray-900 dark:text-white">{formatCurrency(order.subtotal)}</p>
                                    <p className="text-gray-900 dark:text-white">{formatCurrency(order.discount)}</p>
                                    {order.total_tax && (
                                      <p className="text-gray-900 dark:text-white">{formatCurrency(order.total_tax)}</p>
                                    )}
                                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.final_total)}</p>
                                    {order.payment_method === 'cash_card' && (
                                      <>
                                        <p className="text-green-700 dark:text-green-400 mt-2 text-xs font-medium">{formatCurrency(order.cash_amount || 0)}</p>
                                        <p className="text-blue-700 dark:text-blue-400 text-xs font-medium">{formatCurrency(order.card_amount || 0)}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Box */}
        {selectedOutletId && orders.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-blue-200 dark:border-gray-600 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Orders Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Order Counts */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{calculateSummary().totalOrders}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Cash Orders</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{calculateSummary().totalCashOrders}</div>
                <div className="text-xs text-gray-400 mt-1">Collected: {formatCurrency(calculateSummary().totalCashCollected)}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Card Orders</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{calculateSummary().totalCardOrders}</div>
                <div className="text-xs text-gray-400 mt-1">Collected: {formatCurrency(calculateSummary().totalCardCollected)}</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Cash+Card Orders</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{calculateSummary().totalCashCardOrders}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Swiggy Orders</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{calculateSummary().totalSwiggyOrders}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Zomato Orders</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{calculateSummary().totalZomatoOrders}</div>
              </div>
              
              {/* Financial Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Tax</div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(calculateSummary().totalTax)}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Subtotal</div>
                <div className="text-xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(calculateSummary().totalSubtotal)}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm col-span-2 md:col-span-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">Final Total</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateSummary().finalTotal)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminOrdersPage;
