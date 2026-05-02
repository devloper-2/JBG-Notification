import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router";
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

const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await invoiceService.getInvoices({ page: 1, per_page: 100 });
        setInvoices(response.data.invoices || []);
      } catch (loadError) {
        console.error("Failed to load invoices", loadError);
        setError("Unable to load invoices right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const summary = useMemo(() => {
    const totalAmount = invoices.reduce(
      (sum, invoice) => sum + Number.parseFloat(invoice.total || "0"),
      0
    );

    return {
      totalCount: invoices.length,
      totalAmount,
    };
  }, [invoices]);

  const withResolvedInvoice = async (invoice: Invoice) => {
    const resolvedInvoice = await invoiceService.getInvoiceByIdFromList(invoice.invoice_id);
    return resolvedInvoice || invoice;
  };

  const handlePreviewInvoice = async (event: React.MouseEvent, invoice: Invoice) => {
    event.stopPropagation();

    try {
      setIsActionLoading(invoice.invoice_id);
      const resolvedInvoice = await withResolvedInvoice(invoice);
      await previewInvoice(resolvedInvoice);
    } catch (previewError: any) {
      console.error("Failed to preview invoice", previewError);
      setError(previewError?.message || "Unable to open invoice preview.");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handlePrintInvoice = async (event: React.MouseEvent, invoice: Invoice) => {
    event.stopPropagation();

    try {
      setIsActionLoading(invoice.invoice_id);
      const resolvedInvoice = await withResolvedInvoice(invoice);
      await printInvoice(resolvedInvoice);
    } catch (printError: any) {
      console.error("Failed to print invoice", printError);
      setError(printError?.message || "Unable to print invoice.");
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Invoices | JBG</title>
      </Helmet>

      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View sender, receiver, amount and status for outlet invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-600 dark:text-gray-400">Total Invoices: {summary.totalCount}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                Grand Total: {formatCurrency(String(summary.totalAmount))}
              </p>
            </div>
            <Link
              to="/invoices/create"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Create Invoice
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {isLoading && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading invoices...</div>
          )}

          {!isLoading && error && (
            <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {!isLoading && !error && invoices.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No invoices found.</div>
          )}

          {!isLoading && !error && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Receiver</th>
                    <th className="px-4 py-3">Sender</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.invoice_id}
                      onClick={() =>
                        navigate(`/invoices/${invoice.invoice_id}`, { state: { invoice } })
                      }
                      className="cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                    >
                      <td className="px-4 py-3 font-medium text-brand-600 dark:text-brand-400">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {invoice.receiverCustomer?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {invoice.senderCustomer?.name || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.total, invoice.currency || "INR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => handlePreviewInvoice(event, invoice)}
                            disabled={isActionLoading === invoice.invoice_id}
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(event) => handlePrintInvoice(event, invoice)}
                            disabled={isActionLoading === invoice.invoice_id}
                            className="rounded-md border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/20"
                          >
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InvoicesPage;
