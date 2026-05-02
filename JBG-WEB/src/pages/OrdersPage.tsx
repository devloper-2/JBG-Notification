import React from 'react';
import { Helmet } from 'react-helmet-async';
import OrderList from '../components/orders/OrderList';

const OrdersPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Orders | JBG</title>
      </Helmet>
      
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Orders
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View all your orders
            </p>
          </div>
        </div>

        {/* Orders List */}
        <OrderList />
      </div>
    </>
  );
};

export default OrdersPage;
