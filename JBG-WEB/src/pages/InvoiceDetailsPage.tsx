import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import DeleteConfirmationModal from "../components/common/DeleteConfirmationModal";
import ConfirmModal from "../components/common/ConfirmModal";
import invoiceService from "../services/invoiceService";
import { Invoice } from "../types/invoice";
import { previewInvoice, printInvoice } from "../utils/invoicePrintUtils";

const formatCurrency = (amount: string, currency = "INR") => {
  const numericAmount = Number.parseFloat(amount || "0");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(numericAmount) ? 0 : numericAmount);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

const parseLocalizedJsonText = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed.default || parsed.en || Object.values(parsed)[0] || "-";
    }
  } catch {
    return value;
  }

  return value;
};

const statusClass = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === "PAID") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }

  if (normalized === "DRAFT") {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
  }

  if (normalized === "OVERDUE") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }

  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-b-0 dark:border-gray-800">
    <span className="text-gray-600 dark:text-gray-400">{label}</span>
    <span className="font-medium text-gray-900 dark:text-white">{value}</span>
  </div>
);

const InvoiceDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const navigationInvoice = (location.state as { invoice?: Invoice } | null)?.invoice;

  const [invoice, setInvoice] = useState<Invoice | null>(navigationInvoice ?? null);
  const [isLoading, setIsLoading] = useState(!navigationInvoice);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    const invoiceId = Number(id);

    if (navigationInvoice && navigationInvoice.invoice_id === invoiceId) {
      setInvoice(navigationInvoice);
      setIsLoading(false);
      return;
    }

    if (!Number.isFinite(invoiceId)) {
      setError("Invalid invoice id.");
      setIsLoading(false);
      return;
    }

    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const foundInvoice = await invoiceService.getInvoiceByIdFromList(invoiceId);

        if (!foundInvoice) {
          setError("Invoice not found.");
          return;
        }

        setInvoice(foundInvoice);
      } catch (loadError) {
        console.error("Failed to load invoice", loadError);
        setError("Unable to load invoice details right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [id, navigationInvoice]);

  const computed = useMemo(() => {
    if (!invoice) {
      return {
        subtotal: "0.00",
        totalTax: "0.00",
        discount: "0.00",
        shipping: "0.00",
        total: "0.00",
      };
    }

    return {
      subtotal: invoice.subtotal,
      totalTax: invoice.total_tax,
      discount: invoice.discount_amount,
      shipping: invoice.shipping_charges,
      total: invoice.total,
    };
  }, [invoice]);

  const handleSendInvoice = () => {
    if (!invoice || isSending) return;
    setIsSendConfirmOpen(true);
  };

  const performSendInvoice = async () => {
    if (!invoice || isSending) return;
    setIsSendConfirmOpen(false);

    try {
      setIsSending(true);
      setSendError(null);
      const response = await invoiceService.sendInvoice(invoice.invoice_id);
      setInvoice(response.data);
    } catch (sendInvoiceError: any) {
      console.error("Failed to send invoice", sendInvoiceError);
      setSendError(sendInvoiceError?.response?.data?.message || "Failed to send invoice.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || isDeleting) return;

    try {
      setIsDeleting(true);
      setSendError(null);
      await invoiceService.deleteInvoice(invoice.invoice_id);
      setIsDeleteModalOpen(false);
      navigate("/invoices");
    } catch (deleteInvoiceError: any) {
      console.error("Failed to delete invoice", deleteInvoiceError);
      setSendError(deleteInvoiceError?.response?.data?.error || deleteInvoiceError?.response?.data?.message || "Failed to delete invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviewInvoice = async () => {
    if (!invoice) return;

    try {
      await previewInvoice(invoice);
    } catch (previewError: any) {
      console.error("Failed to preview invoice", previewError);
      setSendError(previewError?.message || "Unable to open invoice preview.");
    }
  };

  const handlePrintInvoice = async () => {
    if (!invoice) return;

    try {
      await printInvoice(invoice);
    } catch (printError: any) {
      console.error("Failed to print invoice", printError);
      setSendError(printError?.message || "Unable to print invoice.");
    }
  };

  return (
    <>
      <Helmet>
        <title>{invoice?.invoice_number ? `${invoice.invoice_number} | Invoice` : "Invoice Details | JBG"}</title>
      </Helmet>

      <div className="mx-auto max-w-[1400px] space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice?.invoice_number || "Invoice Details"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Date: {formatDate(invoice?.invoice_date)}
                </span>
                {invoice?.status && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(invoice.status)}`}>
                    {invoice.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice && (
              <>
                <button
                  type="button"
                  onClick={handlePreviewInvoice}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/20"
                >
                  Print
                </button>
              </>
            )}
            {invoice?.status?.toUpperCase() === "DRAFT" && (
              <>
                <button
                  type="button"
                  onClick={handleSendInvoice}
                  disabled={isSending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? "Sending..." : "Send Invoice"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete Invoice"}
                </button>
              </>
            )}
            {invoice && invoice.status?.toUpperCase() !== "SENT" && (
              <Link
                to={`/invoices/${invoice.invoice_id}/edit`}
                state={{ invoice }}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/20"
              >
                Edit Invoice
              </Link>
            )}
            <Link
              to="/invoices"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              All Invoices
            </Link>
          </div>
        </div>

        {sendError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            {sendError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Loading invoice details...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && invoice && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Bill From</h2>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{invoice.senderCustomer?.name || "-"}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{invoice.senderCustomer?.email || "-"}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.senderCustomer?.mobile || "-"}</p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.senderCustomer?.address || "-"}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Bill To</h2>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{invoice.receiverCustomer?.name || "-"}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{invoice.receiverCustomer?.email || "-"}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.receiverCustomer?.mobile || "-"}</p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.receiverCustomer?.address || "-"}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Info</h2>
                <DetailRow label="Invoice Number" value={invoice.invoice_number} />
                <DetailRow label="Invoice Date" value={formatDate(invoice.invoice_date)} />
                <DetailRow label="Due Date" value={formatDate(invoice.due_date)} />
                <DetailRow label="Reference" value={invoice.reference_number || "-"} />
                <DetailRow label="Eway Bill" value={invoice.eway_bill_number || "-"} />
                <DetailRow label="Vehicle" value={invoice.vehicle_number || "-"} />
                <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                <DetailRow label="Currency" value={invoice.currency || "INR"} />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Qty</th>
                      <th className="px-5 py-3">Packaging</th>
                      <th className="px-5 py-3 text-right">Rate</th>
                      <th className="px-5 py-3 text-right">Tax</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.item_id} className="border-t border-gray-100 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                          {parseLocalizedJsonText(item.stockItem?.item_name) || item.description}
                        </td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{item.description || "-"}</td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                          {item.quantity} {item.unit_of_measurement || ""}
                        </td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                          {item.packagingUsage?.packagingStockItem
                            ? `${parseLocalizedJsonText(item.packagingUsage.packagingStockItem.item_name)} (${item.packagingUsage.quantity_used})`
                            : "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">{item.tax_percentage}%</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.total, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notes</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.notes || "-"}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(computed.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Total Tax</span>
                    <span>{formatCurrency(computed.totalTax, invoice.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Discount</span>
                    <span>- {formatCurrency(computed.discount, invoice.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Shipping</span>
                    <span>{formatCurrency(computed.shipping, invoice.currency)}</span>
                  </div>
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-3 text-base font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span>{formatCurrency(computed.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Terms & Conditions</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.terms_and_conditions || "-"}</p>
            </div>

            <DeleteConfirmationModal
              isOpen={isDeleteModalOpen}
              title="Delete Invoice"
              message="Are you sure you want to delete this draft invoice? This action cannot be undone."
              itemName={invoice.invoice_number || "this invoice"}
              itemDetails={[
                `Receiver: ${invoice.receiverCustomer?.name || "-"}`,
                `Total: ${formatCurrency(invoice.total, invoice.currency)}`,
                `Status: ${invoice.status}`,
              ]}
              onConfirm={handleDeleteInvoice}
              onCancel={() => setIsDeleteModalOpen(false)}
              isDeleting={isDeleting}
              confirmText="DELETE"
            />
            <ConfirmModal
              isOpen={isSendConfirmOpen}
              title="Send Invoice"
              message="Are you sure you want to mark this invoice as SENT?"
              confirmLabel="Send Invoice"
              cancelLabel="Cancel"
              onConfirm={performSendInvoice}
              onCancel={() => setIsSendConfirmOpen(false)}
              isProcessing={isSending}
            />
          </>
        )}
      </div>
    </>
  );
};

export default InvoiceDetailsPage;
