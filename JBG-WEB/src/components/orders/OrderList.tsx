import React, { useState, useEffect } from 'react';
import { Order } from '../../types/order';
import orderService from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import DatePicker from '../form/date-picker';

const PAYMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'swigy', label: 'Swigy' },
  { value: 'zomato', label: 'Zomato' },
  { value: 'cash+card', label: 'Cash+Card' },
];

const getPaymentMethodLabel = (method: string) => {
  const normalized = method.trim().toLowerCase();
  const option = PAYMENT_FILTER_OPTIONS.find((item) => item.value === normalized);
  return option?.label || method;
};

const getVisiblePageItems = (currentPage: number, totalPages: number): Array<number | string> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | string> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) {
    pages.push('...');
  }

  for (let page = left; page <= right; page += 1) {
    pages.push(page);
  }

  if (right < totalPages - 1) {
    pages.push('...');
  }

  pages.push(totalPages);
  return pages;
};

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [aggregates, setAggregates] = useState<{
    total_amount: number;
    total_orders: number;
  } | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  
  // Filters - temporary state
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [tempOrderType, setTempOrderType] = useState<string>('all');
  const [tempStatus, setTempStatus] = useState<string>('all');
  const [tempPaymentMethod, setTempPaymentMethod] = useState<string>('all');
  
  // Applied filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
  }, [currentPage, user, startDate, endDate, orderType, status, paymentMethod]);

  const loadOrders = async () => {
    if (!user?.customer_id) return;

    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: currentPage,
        per_page: 20,
        sort_by: 'order_datetime',
        sort_order: 'DESC',
      };

      // Add filters if they are set (API expects camelCase)
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderType && orderType !== 'all') params.orderType = orderType;
      if (status && status !== 'all') params.status = status;
      if (paymentMethod && paymentMethod !== 'all') params.paymentMethod = paymentMethod;

      const response = await orderService.getOrders(user.customer_id, params);

      setOrders(response.data);
      setTotalPages(response.pagination.total_pages);
      setTotalRecords(response.pagination.total_records);
      setAggregates({
        total_amount: response.aggregates.total_amount,
        total_orders: response.aggregates.total_orders,
      });
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setOrderType(tempOrderType);
    setStatus(tempStatus);
    setPaymentMethod(tempPaymentMethod);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setTempStartDate('');
    setTempEndDate('');
    setTempOrderType('all');
    setTempStatus('all');
    setTempPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setOrderType('all');
    setStatus('all');
    setPaymentMethod('all');
    setCurrentPage(1);
  };

  const handleQuickPaymentFilter = (method: string) => {
    setTempPaymentMethod(method);
    setPaymentMethod(method);
    setCurrentPage(1);
  };

  const hasActiveFilters = startDate || endDate || orderType !== 'all' || status !== 'all' || paymentMethod !== 'all';

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ready':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'dine_in':
        return 'Dine In';
      case 'takeaway':
        return 'Takeaway';
      case 'delivery':
        return 'Delivery';
      case 'online':
        return 'Online';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={loadOrders}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Payment Filter</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_FILTER_OPTIONS.map((option) => {
              const isActive = paymentMethod === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleQuickPaymentFilter(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {showFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <DatePicker
                  id="filter-start-date"
                  label="Start Date"
                  placeholder="Select start date"
                  defaultDate={tempStartDate || undefined}
                  onChange={(_selectedDates, dateStr) => {
                    setTempStartDate(dateStr);
                  }}
                />
              </div>
              
              <div>
                <DatePicker
                  id="filter-end-date"
                  label="End Date"
                  placeholder="Select end date"
                  defaultDate={tempEndDate || undefined}
                  onChange={(_selectedDates, dateStr) => {
                    setTempEndDate(dateStr);
                  }}
                />
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Type
                </label>
                <select
                  value={tempOrderType}
                  onChange={(e) => setTempOrderType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="dine_in">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={tempPaymentMethod}
                  onChange={(e) => setTempPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="swigy">Swigy</option>
                  <option value="zomato">Zomato</option>
                  <option value="cash+card">Cash+Card</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {aggregates && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {aggregates.total_orders}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ₹{aggregates.total_amount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleOrderDetails(order.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        Bill #{order.bill_no}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Token #{order.token_no}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>{formatDate(order.order_datetime)}</span>
                      <span>•</span>
                      <span>{getOrderTypeLabel(order.order_type)}</span>
                      {order.table_no && (
                        <>
                          <span>•</span>
                          <span>Table: {order.table_no}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{order.summary.items_count} items</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      ₹{parseFloat(order.final_total).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {getPaymentMethodLabel(order.payment_method)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Details (Expanded) */}
              {expandedOrderId === order.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  {/* Customer Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{order.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{order.phone}</span>
                      </div>
                      {order.vehicle_no && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{order.vehicle_no}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start bg-white dark:bg-gray-800 p-3 rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.menu_item_name.default}
                            </div>
                            {item.menu_item_name.hindi && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.menu_item_name.hindi}
                              </div>
                            )}
                            {item.item_note && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Note: {item.item_note}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              ₹{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              ₹{parseFloat(item.item_total).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="text-gray-900 dark:text-white">₹{parseFloat(order.subtotal).toFixed(2)}</span>
                      </div>
                      {parseFloat(order.discount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-₹{parseFloat(order.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax (CGST + SGST):</span>
                        <span className="text-gray-900 dark:text-white">₹{parseFloat(order.total_tax).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-900 dark:text-white">Total:</span>
                        <span className="text-gray-900 dark:text-white">₹{parseFloat(order.final_total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {order.note && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Order Note:</div>
                      <div className="text-sm text-gray-900 dark:text-white mt-1">{order.note}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages} ({totalRecords} total orders)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Previous
            </button>

            {getVisiblePageItems(currentPage, totalPages).map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                );
              }

              const pageNumber = page as number;
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`min-w-9 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
