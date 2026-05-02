import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router";
import invoiceService from "../services/invoiceService";
import outletService from "../services/outletService";
import stockItemService from "../services/stockItemService";
import DatePicker from "../components/form/date-picker";
import { Outlet } from "../types/outlet";
import { StockItem } from "../types/stockItem";
import { api } from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";

type ItemRow = {
  stock_item_id: number | "";
  description: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  unit_of_measurement: string;
  packaging_stock_item_id: number | "";
  packaging_quantity_used: number;
};

type AdminDetailsResponse = {
  id?: number;
  customer_id?: number;
  name?: string;
  terms_and_condition?: string;
};

const DEFAULT_INVOICE_TERMS = "Payment within 7 days";

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const parseLocalizedJsonText = (value?: string | null) => {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed.default || parsed.en || Object.values(parsed)[0] || "";
    }
  } catch {
    return value;
  }

  return value;
};

const parseUnitShortName = (stockItem?: StockItem) => {
  if (!stockItem?.unit?.short_name) return "Pcs";

  const shortName = stockItem.unit.short_name;
  if (typeof shortName === "string") {
    return parseLocalizedJsonText(shortName) || "Pcs";
  }

  return shortName.default || shortName["1"] || "Pcs";
};

const parseStockItemTaxPercentage = (stockItem?: StockItem) =>
  Number(stockItem?.tax_percentage || 0);

const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();
  const isOutletUser = Boolean(user && !user.is_admin);

  const [customers, setCustomers] = useState<Outlet[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOutletToOutletInvoice, setIsOutletToOutletInvoice] = useState(false);
  const [adminSenderId, setAdminSenderId] = useState<number | "">("");
  const [adminSenderName, setAdminSenderName] = useState("");

  const [senderCustomerId, setSenderCustomerId] = useState<number | "">("");
  const [receiverCustomerId, setReceiverCustomerId] = useState<number | "">("");
  const [invoiceDate, setInvoiceDate] = useState(toInputDate(today));
  const [dueDate, setDueDate] = useState(toInputDate(addDays(today, 7)));
  const currency = "INR";
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_INVOICE_TERMS);
  const [notes, setNotes] = useState("Thank you");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const referenceNumber = "";
  const [items, setItems] = useState<ItemRow[]>([
    {
      stock_item_id: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      tax_percentage: 0,
      unit_of_measurement: "Pcs",
      packaging_stock_item_id: "",
      packaging_quantity_used: 0,
    },
  ]);

  const packagingStockItems = useMemo(
    () =>
      stockItems.filter((stockItem) => {
        const packagingFlag = (stockItem as unknown as { is_packaging?: unknown }).is_packaging;
        return packagingFlag === true || packagingFlag === 1 || packagingFlag === "1";
      }),
    [stockItems]
  );

  const stockItemByBarcode = useMemo(() => {
    const barcodeMap = new Map<string, StockItem>();

    stockItems.forEach((stockItem) => {
      const normalizedBarcode = String(stockItem.barcode_number || "").trim().toLowerCase();
      if (normalizedBarcode) {
        barcodeMap.set(normalizedBarcode, stockItem);
      }
    });

    return barcodeMap;
  }, [stockItems]);

  const scannerBufferRef = useRef("");
  const scannerLastKeyTimeRef = useRef(0);

  const buildItemRowFromStockItem = useCallback((stockItem: StockItem): ItemRow => {
    return {
      stock_item_id: stockItem.stock_item_id,
      description: parseLocalizedJsonText(stockItem.item_name),
      hsn_code: stockItem.hsn_code || "",
      quantity: 1,
      unit_price: Number(stockItem.selling_cost || 0),
      tax_percentage: parseStockItemTaxPercentage(stockItem),
      unit_of_measurement: parseUnitShortName(stockItem),
      packaging_stock_item_id: "",
      packaging_quantity_used: 0,
    };
  }, []);

  const applyScannedStockItem = useCallback(
    (scannedStockItem: StockItem) => {
      setItems((prev) => {
        const existingItemIndex = prev.findIndex(
          (item) => Number(item.stock_item_id) === scannedStockItem.stock_item_id
        );

        if (existingItemIndex >= 0) {
          const next = [...prev];
          const existingItem = next[existingItemIndex];
          next[existingItemIndex] = {
            ...existingItem,
            quantity: Number(existingItem.quantity || 0) + 1,
          };
          return next;
        }

        const emptyItemIndex = prev.findIndex((item) => item.stock_item_id === "");
        if (emptyItemIndex >= 0) {
          const next = [...prev];
          next[emptyItemIndex] = buildItemRowFromStockItem(scannedStockItem);
          return next;
        }

        return [...prev, buildItemRowFromStockItem(scannedStockItem)];
      });

      setError(null);
    },
    [buildItemRowFromStockItem]
  );

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        setError(null);

        const [customerList, stockItemResponse] = await Promise.all([
          outletService.getOutlets(),
          stockItemService.getStockItems(1, 500),
        ]);

        setCustomers(customerList || []);
        setStockItems(stockItemResponse.data.stock_items || []);

        if (isOutletUser && user?.customer_id) {
          setSenderCustomerId(user.customer_id);
          setIsOutletToOutletInvoice(true);
          const outletCustomer = customerList.find((customer) => customer.id === user.customer_id);
          setAdminSenderName(outletCustomer?.name || "");
        } else {
          let adminDetails: AdminDetailsResponse | null = null;

          try {
            const adminResponse = await api.get<AdminDetailsResponse>("/admin-details");
            adminDetails = adminResponse.data;
          } catch (adminError) {
            console.warn("Unable to fetch admin-details for default sender", adminError);
          }

          let detectedAdminId: number | undefined;

          if (typeof adminDetails?.customer_id === "number") {
            detectedAdminId = adminDetails.customer_id;
          } else if (typeof adminDetails?.id === "number") {
            detectedAdminId = adminDetails.id;
          }

          if (
            detectedAdminId !== undefined &&
            customerList.some((customer) => customer.id === detectedAdminId)
          ) {
            setAdminSenderId(detectedAdminId);
            const adminCustomer = customerList.find((customer) => customer.id === detectedAdminId);
            setAdminSenderName(adminCustomer?.name || adminDetails?.name || "Admin");
            setSenderCustomerId(detectedAdminId);
          } else if (adminDetails?.name) {
            const adminByName = customerList.find(
              (customer) =>
                customer.name.trim().toLowerCase() === adminDetails.name?.trim().toLowerCase()
            );

            if (adminByName) {
              setAdminSenderId(adminByName.id);
              setAdminSenderName(adminByName.name);
              setSenderCustomerId(adminByName.id);
            } else {
              setAdminSenderId(adminDetails.id || 0);
              setAdminSenderName(adminDetails.name);
            }
          }

          const adminTerms = adminDetails?.terms_and_condition?.trim();
          if (adminTerms) {
            setTermsAndConditions(adminTerms);
          }
        }
      } catch (loadError) {
        console.error("Failed to load create invoice options", loadError);
        setError("Unable to load customers or stock items.");
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [isOutletUser, user?.customer_id]);

  useEffect(() => {
    if (!isOutletUser && !isOutletToOutletInvoice && adminSenderId !== "") {
      setSenderCustomerId(adminSenderId);
    }
  }, [isOutletToOutletInvoice, adminSenderId, isOutletUser]);

  useEffect(() => {
    const handleScannerKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName;
      const isTypingInField =
        targetTag === "INPUT" ||
        targetTag === "TEXTAREA" ||
        targetTag === "SELECT" ||
        target?.isContentEditable;

      if (isTypingInField) {
        return;
      }

      if (event.key === "Enter") {
        const scannedCode = scannerBufferRef.current.trim().toLowerCase();
        scannerBufferRef.current = "";
        scannerLastKeyTimeRef.current = 0;

        if (!scannedCode || scannedCode.length < 3) {
          return;
        }

        const matchedStockItem = stockItemByBarcode.get(scannedCode);
        if (matchedStockItem) {
          applyScannedStockItem(matchedStockItem);
        }

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const now = Date.now();
      const gapFromPreviousKey = now - scannerLastKeyTimeRef.current;

      if (gapFromPreviousKey > 120) {
        scannerBufferRef.current = event.key;
      } else {
        scannerBufferRef.current += event.key;
      }

      scannerLastKeyTimeRef.current = now;
    };

    window.addEventListener("keydown", handleScannerKeyDown);
    return () => {
      window.removeEventListener("keydown", handleScannerKeyDown);
    };
  }, [stockItemByBarcode, applyScannedStockItem]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
      0
    );

    const totalTax = items.reduce((sum, item) => {
      const lineSubtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
      return sum + (lineSubtotal * Number(item.tax_percentage || 0)) / 100;
    }, 0);

    const total = subtotal + totalTax - Number(discountAmount || 0) + Number(shippingCharges || 0);

    return {
      subtotal,
      totalTax,
      total,
    };
  }, [items, discountAmount, shippingCharges]);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        stock_item_id: "",
        description: "",
        hsn_code: "",
        quantity: 1,
        unit_price: 0,
        tax_percentage: 0,
        unit_of_measurement: "Pcs",
        packaging_stock_item_id: "",
        packaging_quantity_used: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const handleItemChange = <K extends keyof ItemRow>(
    index: number,
    field: K,
    value: ItemRow[K]
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      if (field === "stock_item_id") {
        const selectedStockItem = stockItems.find(
          (stockItem) => stockItem.stock_item_id === Number(value)
        );

        if (selectedStockItem) {
          current.description = parseLocalizedJsonText(selectedStockItem.item_name);
          current.hsn_code = selectedStockItem.hsn_code || "";
          current.unit_of_measurement = parseUnitShortName(selectedStockItem);
          current.unit_price = Number(selectedStockItem.selling_cost || 0);
          current.tax_percentage = parseStockItemTaxPercentage(selectedStockItem);
        } else {
          current.hsn_code = "";
          current.tax_percentage = 0;
        }
      }

      next[index] = current;
      return next;
    });
  };

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

  const validate = () => {
    if (!senderCustomerId || !receiverCustomerId) {
      return "Please select both sender and receiver.";
    }

    if (senderCustomerId === receiverCustomerId) {
      return "Sender and receiver cannot be same.";
    }

    if (!invoiceDate || !dueDate) {
      return "Please select invoice and due date.";
    }

    const validItems = items.filter((item) => item.stock_item_id !== "");
    if (validItems.length === 0) {
      return "Please add at least one invoice item.";
    }

    const invalidItem = validItems.find(
      (item) => Number(item.quantity) <= 0 || Number(item.unit_price) < 0 || Number(item.tax_percentage) < 0
    );

    if (invalidItem) {
      return "Please enter valid quantity, price, and tax values for all selected items.";
    }

    const invalidPackagingItem = validItems.find(
      (item) =>
        (item.packaging_stock_item_id !== "" && Number(item.packaging_quantity_used) <= 0) ||
        (item.packaging_stock_item_id === "" && Number(item.packaging_quantity_used) > 0)
    );

    if (invalidPackagingItem) {
      return "Packaging item and packaging quantity must both be provided together.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const finalSenderCustomerId = isOutletUser && user?.customer_id
        ? user.customer_id
        : Number(senderCustomerId);

      const payload = {
        invoice: {
          sender_customer_id: finalSenderCustomerId,
          receiver_customer_id: Number(receiverCustomerId),
          invoice_date: invoiceDate,
          due_date: dueDate,
          currency,
          discount_amount: Number(discountAmount || 0),
          shipping_charges: Number(shippingCharges || 0),
          terms_and_conditions: termsAndConditions,
          notes,
          reference_number: referenceNumber,
          eway_bill_number: ewayBillNumber,
          vehicle_number: vehicleNumber,
        },
        items: items
          .filter((item) => item.stock_item_id !== "")
          .map((item) => ({
            stock_item_id: Number(item.stock_item_id),
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            tax_percentage: Number(item.tax_percentage),
            unit_of_measurement: item.unit_of_measurement,
            ...(item.packaging_stock_item_id !== ""
              ? {
                  packaging_stock_item_id: Number(item.packaging_stock_item_id),
                  packaging_quantity_used: Number(item.packaging_quantity_used),
                }
              : {}),
          })),
      };

      const response = await invoiceService.createInvoice(payload);
      navigate(`/invoices/${response.data.invoice_id}`, {
        state: { invoice: response.data },
      });
    } catch (submitError: any) {
      console.error("Failed to create invoice", submitError);
      setError(submitError?.response?.data?.message || "Failed to create invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Invoice | JBG</title>
      </Helmet>

      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Invoice</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create a new invoice with customer and stock item details.
            </p>
          </div>
          <Link
            to="/invoices"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Back to Invoices
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Details</h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            {!isOutletUser && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Outlet to Outlet Invoice</span>
                  <input
                    type="checkbox"
                    checked={isOutletToOutletInvoice}
                    onChange={(event) => setIsOutletToOutletInvoice(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {isOutletUser ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sender Customer (You)</label>
                  <input
                    type="text"
                    value={customers.find((customer) => customer.id === Number(senderCustomerId))?.name || adminSenderName || "-"}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              ) : isOutletToOutletInvoice ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sender Customer</label>
                  <select
                    value={senderCustomerId}
                    onChange={(event) => setSenderCustomerId(event.target.value ? Number(event.target.value) : "")}
                    disabled={isLoadingOptions}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select sender</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sender Customer (Auto: Admin)</label>
                  <input
                    type="text"
                    value={
                      customers.find((customer) => customer.id === senderCustomerId)?.name ||
                      adminSenderName ||
                      "Admin"
                    }
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Receiver Customer</label>
                <select
                  value={receiverCustomerId}
                  onChange={(event) => setReceiverCustomerId(event.target.value ? Number(event.target.value) : "")}
                  disabled={isLoadingOptions}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select receiver</option>
                  {customers
                    .filter((customer) => Number(customer.id) !== Number(senderCustomerId))
                    .map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <DatePicker
                  id="invoice-date-picker"
                  label="Invoice Date"
                  defaultDate={invoiceDate}
                  placeholder="Select invoice date"
                  onChange={(selectedDates) => {
                    if (selectedDates && selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const formattedDate =
                        date.getFullYear() +
                        "-" +
                        String(date.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(date.getDate()).padStart(2, "0");
                      setInvoiceDate(formattedDate);
                    }
                  }}
                />
              </div>

              <div>
                <DatePicker
                  id="invoice-due-date-picker"
                  label="Due Date"
                  defaultDate={dueDate}
                  placeholder="Select due date"
                  onChange={(selectedDates) => {
                    if (selectedDates && selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const formattedDate =
                        date.getFullYear() +
                        "-" +
                        String(date.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(date.getDate()).padStart(2, "0");
                      setDueDate(formattedDate);
                    }
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Eway Bill Number</label>
                <input
                  type="text"
                  value={ewayBillNumber}
                  onChange={(event) => setEwayBillNumber(event.target.value)}
                  placeholder="EWB-PO-1001"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(event) => setVehicleNumber(event.target.value)}
                  placeholder="GJ01AB1234"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Items</h2>
              <button
                type="button"
                onClick={addItemRow}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineSubtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                const lineTaxAmount = (lineSubtotal * Number(item.tax_percentage || 0)) / 100;
                const lineTotalAmount = lineSubtotal + lineTaxAmount;

                return (
                  <div key={index} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
                      <div className="lg:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Stock Item</label>
                        <select
                          value={item.stock_item_id}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "stock_item_id",
                              event.target.value ? Number(event.target.value) : ""
                            )
                          }
                          disabled={isLoadingOptions}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Select item</option>
                          {stockItems.map((stockItem) => (
                            <option key={stockItem.stock_item_id} value={stockItem.stock_item_id}>
                              {parseLocalizedJsonText(stockItem.item_name)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">HSN</label>
                        <input
                          type="text"
                          value={item.hsn_code}
                          disabled
                          className="h-10 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Qty</label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, "quantity", Number(event.target.value))}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Rate</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(event) => handleItemChange(index, "unit_price", Number(event.target.value))}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Tax %</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax_percentage}
                          onChange={(event) => handleItemChange(index, "tax_percentage", Number(event.target.value))}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="lg:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="h-10 w-full rounded-lg border border-red-300 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                          disabled={items.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
                      <div className="lg:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Packaging Item</label>
                        <select
                          value={item.packaging_stock_item_id}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "packaging_stock_item_id",
                              event.target.value ? Number(event.target.value) : ""
                            )
                          }
                          disabled={isLoadingOptions}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Select packaging item (optional)</option>
                          {packagingStockItems.map((stockItem) => (
                            <option key={stockItem.stock_item_id} value={stockItem.stock_item_id}>
                              {parseLocalizedJsonText(stockItem.item_name)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Pack Qty</label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.packaging_quantity_used}
                          onChange={(event) =>
                            handleItemChange(index, "packaging_quantity_used", Number(event.target.value))
                          }
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Tax Amount</label>
                        <input
                          type="text"
                          value={lineTaxAmount.toFixed(2)}
                          disabled
                          className="h-10 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="mb-1 block text-xs font-medium text-gray-600 whitespace-nowrap dark:text-gray-400">Total Amount</label>
                        <input
                          type="text"
                          value={lineTotalAmount.toFixed(2)}
                          disabled
                          className="h-10 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Extra Details</h2>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(Number(event.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Charges</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCharges}
                    onChange={(event) => setShippingCharges(Number(event.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Terms & Conditions</label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(event) => setTermsAndConditions(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Totals</h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>{formatAmount(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Total Tax</span>
                  <span>{formatAmount(totals.totalTax)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Discount</span>
                  <span>- {formatAmount(Number(discountAmount || 0))}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Shipping</span>
                  <span>{formatAmount(Number(shippingCharges || 0))}</span>
                </div>
                <div className="mt-2 border-t border-gray-100 pt-2 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>{formatAmount(totals.total)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || isLoadingOptions}
                className="mt-6 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Creating Invoice..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateInvoicePage;
