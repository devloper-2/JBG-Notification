import { Invoice, InvoiceItem } from "../types/invoice";
import { api } from "./apiClient";

type AdminBankDetail = {
  account_name?: string;
  account_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  is_primary?: boolean;
};

type AdminDetailsForPrint = {
  name?: string;
  logo?: string | null;
  signature?: string | null;
  signature_url?: string | null;
  mobile?: string;
  email?: string;
  gst_no?: string;
  pan_no?: string;
  address?: string;
  terms_and_condition?: string;
  terms_condition?: string;
  bank_details?: AdminBankDetail[];
};

let adminDetailsCache: AdminDetailsForPrint | null = null;

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractAdminDetailsPayload = (payload: unknown): AdminDetailsForPrint | null => {
  if (!isNonNullObject(payload)) {
    return null;
  }

  if (isNonNullObject(payload.data)) {
    return payload.data as AdminDetailsForPrint;
  }

  if (isNonNullObject(payload.admin)) {
    return payload.admin as AdminDetailsForPrint;
  }

  return payload as AdminDetailsForPrint;
};

const parseLocalizedJsonText = (value?: string | null) => {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return String(parsed.default || parsed.en || Object.values(parsed)[0] || "");
    }
  } catch {
    return value;
  }

  return value;
};

const toNumber = (value?: string | number | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

const escapeHtml = (value?: string | null) => {
  const input = String(value ?? "");
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const toWordsBelowThousand = (value: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (value < 20) return ones[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;

  return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${toWordsBelowThousand(value % 100)}` : ""}`;
};

const numberToIndianWords = (value: number) => {
  if (value === 0) return "Zero";

  const parts: string[] = [];
  let remaining = Math.floor(value);

  const crore = Math.floor(remaining / 10000000);
  if (crore) {
    parts.push(`${toWordsBelowThousand(crore)} Crore`);
    remaining %= 10000000;
  }

  const lakh = Math.floor(remaining / 100000);
  if (lakh) {
    parts.push(`${toWordsBelowThousand(lakh)} Lakh`);
    remaining %= 100000;
  }

  const thousand = Math.floor(remaining / 1000);
  if (thousand) {
    parts.push(`${toWordsBelowThousand(thousand)} Thousand`);
    remaining %= 1000;
  }

  if (remaining) {
    parts.push(toWordsBelowThousand(remaining));
  }

  return parts.join(" ").trim();
};

const getItemName = (item: InvoiceItem) => {
  const stockName = parseLocalizedJsonText(item.stockItem?.item_name);
  return stockName || item.description || "-";
};

const getPackText = (item: InvoiceItem) => {
  const packagingName = parseLocalizedJsonText(item.packagingUsage?.packagingStockItem?.item_name);
  const qty = toNumber(item.packagingUsage?.quantity_used);

  if (!packagingName && !qty) return "-";
  if (!packagingName) return `${formatAmount(qty)}`;
  if (!qty) return packagingName;

  return `${packagingName} (${formatAmount(qty)})`;
};

type TaxGroup = {
  hsn: string;
  taxableValue: number;
  taxRate: number;
  totalTax: number;
};

const getTaxGroups = (invoice: Invoice): TaxGroup[] => {
  const groups = new Map<string, TaxGroup>();

  invoice.items.forEach((item) => {
    const hsn = item.hsn_code || item.stockItem?.hsn_code || "-";
    const taxRate = toNumber(item.tax_percentage);
    const taxableValue = toNumber(item.subtotal) || toNumber(item.quantity) * toNumber(item.unit_price);
    const apiTaxValue = toNumber(item.total_tax);
    const totalTax = apiTaxValue > 0 ? apiTaxValue : (taxableValue * taxRate) / 100;
    const key = `${hsn}|${taxRate}`;

    const existing = groups.get(key);
    if (existing) {
      existing.taxableValue += taxableValue;
      existing.totalTax += totalTax;
      return;
    }

    groups.set(key, {
      hsn,
      taxableValue,
      taxRate,
      totalTax,
    });
  });

  return Array.from(groups.values());
};

const buildTermsHtml = (terms?: string | null) => {
  if (!terms || !terms.trim()) {
    return "<li>-</li>";
  }

  const lines = terms
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return `<li>${escapeHtml(terms)}</li>`;
  }

  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
};

const getAdminDetailsForPrint = async (): Promise<AdminDetailsForPrint | null> => {
  try {
    const response = await api.get<unknown>("/admin-details");
    const normalized = extractAdminDetailsPayload(response.data);

    if (normalized) {
      adminDetailsCache = normalized;
    }

    return normalized;
  } catch (error) {
    console.warn("Unable to fetch admin-details for invoice print", error);
    return adminDetailsCache;
  }
};

export const buildInvoicePrintHtml = (invoice: Invoice, adminDetails?: AdminDetailsForPrint | null) => {
  const currency = invoice.currency || "INR";
  const sender = invoice.senderCustomer;
  const receiver = invoice.receiverCustomer;
  const primaryBank = adminDetails?.bank_details?.find((bank) => bank.is_primary) || adminDetails?.bank_details?.[0];

  const companyName = adminDetails?.name || sender?.name || "Jay Bhavani Enterprise";
  const companyAddress = adminDetails?.address || sender?.address || "-";
  const companyMobile = adminDetails?.mobile || sender?.mobile || "-";
  const companyGst = adminDetails?.gst_no || sender?.gst_no || "-";
  const companyPan = adminDetails?.pan_no || "-";
  const logoUrl = adminDetails?.logo || "/images/logo/logo.png";
  const signatureUrl = adminDetails?.signature_url || adminDetails?.signature || "";
  const termsText = invoice.terms_and_conditions || adminDetails?.terms_and_condition || adminDetails?.terms_condition;

  const subtotal = toNumber(invoice.subtotal);
  const total = toNumber(invoice.total);
  const taxGroups = getTaxGroups(invoice);
  const computedTotalTax = taxGroups.reduce((sum, group) => sum + group.totalTax, 0);
  const totalTax = computedTotalTax > 0 ? computedTotalTax : toNumber(invoice.total_tax);

  const amountWords = `${numberToIndianWords(Math.round(total))} Rupees Only`;

  const renderLineItemsRows = (items: InvoiceItem[], startIndex: number) =>
    items
      .map((item, index) => {
        const quantity = toNumber(item.quantity);
        const unit = item.unit_of_measurement || "";
        const rate = toNumber(item.unit_price);
        const itemTaxRate = toNumber(item.tax_percentage);
        const itemTaxAmount = toNumber(item.total_tax);
        const itemTotal = toNumber(item.total);

        return `
          <tr>
            <td class="text-center">${startIndex + index + 1}</td>
            <td>${escapeHtml(getItemName(item))}</td>
            <td class="text-center">${escapeHtml(item.hsn_code || item.stockItem?.hsn_code || "-")}</td>
            <td>${escapeHtml(getPackText(item))}</td>
            <td class="text-center">${formatAmount(quantity)} ${escapeHtml(unit)}</td>
            <td class="text-right">${formatAmount(rate)}</td>
            <td class="text-right text-xs">
              <div>${formatAmount(itemTaxAmount)}</div>
              <div class="text-gray">${formatAmount(itemTaxRate)}%</div>
            </td>
            <td class="text-right font-semibold">${formatAmount(itemTotal)}</td>
          </tr>
        `;
      })
      .join("");

  const renderMainTable = (items: InvoiceItem[]) => `
      <div class="main-table-container">
        <table class="main-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 30px;">S.No.</th>
              <th style="width: 30%;">Items</th>
              <th class="text-center" style="width: 50px;">HSN</th>
              <th style="width: 80px;">Pack</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Tax Details</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${renderLineItemsRows(items, 0)}
          </tbody>
        </table>
      </div>
    `;

  // No JS pagination — browser print engine handles page breaks naturally.

  const taxRowsHtml = taxGroups
    .map((group) => {
      const halfRate = group.taxRate / 2;
      const halfTax = group.totalTax / 2;

      return `
        <tr>
          <td>${escapeHtml(group.hsn)}</td>
          <td>${formatAmount(group.taxableValue)}</td>
          <td>${formatAmount(halfRate)}%</td>
          <td>${formatAmount(halfTax)}</td>
          <td>${formatAmount(halfRate)}%</td>
          <td>${formatAmount(halfTax)}</td>
          <td>${formatAmount(group.totalTax)}</td>
        </tr>
      `;  
    })
    .join("");

  const footerHtml = `
      <div class="invoice-footer">
        <div class="tax-table-container">
          <table class="tax-table">
            <thead>
              <tr>
                <th rowspan="2">HSN/SAC</th>
                <th rowspan="2" class="text-right">Taxable Value</th>
                <th colspan="2" class="text-center">CGST</th>
                <th colspan="2" class="text-center">SGST</th>
                <th rowspan="2" class="text-right">Total Tax</th>
              </tr>
              <tr>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${taxRowsHtml}
              <tr style="background-color: #f3f4f6; font-weight: 700;">
                <td>Total</td>
                <td>${formatAmount(subtotal)}</td>
                <td></td>
                <td>${formatAmount(totalTax / 2)}</td>
                <td></td>
                <td>${formatAmount(totalTax / 2)}</td>
                <td>${formatAmount(totalTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer-grid">
          <div class="left-col">
            <div class="bank-details">
              <div style="font-weight: 700; color: #1e40af; margin-bottom: 8px; text-transform: uppercase;">Bank Details</div>
              <div class="bank-row"><span>Bank Name:</span> <strong>${escapeHtml(primaryBank?.bank_name || "-")}</strong></div>
              <div class="bank-row"><span>A/C No:</span> <strong>${escapeHtml(primaryBank?.account_no || "-")}</strong></div>
              <div class="bank-row"><span>IFSC Code:</span> <strong>${escapeHtml(primaryBank?.ifsc_code || "-")}</strong></div>
              <div class="bank-row"><span>A/C Name:</span> <strong>${escapeHtml(primaryBank?.account_name || companyName)}</strong></div>
            </div>

            <div class="terms-box" style="margin-top: 15px;">
              <h4>Terms and Conditions</h4>
              <ul class="terms-list">${buildTermsHtml(termsText)}</ul>
            </div>
          </div>

          <div class="right-col">
            <div class="totals-box">
              <div class="total-row">
                <span>Total Taxable Amount</span>
                <span>${formatAmount(subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Total Tax</span>
                <span>${formatAmount(totalTax)}</span>
              </div>
              <div class="total-row">
                <span>Discount</span>
                <span>- ${formatAmount(toNumber(invoice.discount_amount))}</span>
              </div>
              <div class="total-row">
                <span>Shipping</span>
                <span>${formatAmount(toNumber(invoice.shipping_charges))}</span>
              </div>
              <div class="total-row grand-total">
                <span>Grand Total</span>
                <span>${formatCurrency(total, currency)}</span>
              </div>
              <div class="amount-words">
                ${escapeHtml(amountWords)}
              </div>
            </div>

            <div class="signatory">
              <div class="sign-box">
                ${
                  signatureUrl
                    ? `<img src="${escapeHtml(signatureUrl)}" alt="Authorised Signature" class="signature-image">`
                    : `<div class="signature-placeholder"></div>`
                }
              </div>
              <div><strong>Authorised Signatory</strong><br>For, ${escapeHtml(companyName)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

  const invoiceMetaHtml = `
      <div class="header-meta-bar">
        <div><strong>Invoice No:</strong> ${escapeHtml(invoice.invoice_number)}</div>
        ${invoice.eway_bill_number ? `<div><strong>E-way bill No:</strong> ${escapeHtml(invoice.eway_bill_number)}</div>` : ""}
        ${invoice.vehicle_number ? `<div><strong>Vehicle No:</strong> ${escapeHtml(invoice.vehicle_number)}</div>` : ""}
        <div><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</div>
        <div><strong>Due:</strong> ${formatDate(invoice.due_date)}</div>
      </div>
    `;

  const headerHtml = `
      <div class="header">
        <div class="branding-row">
          <div class="branding-logo">
            <div class="company-logo">
              <img src="${escapeHtml(logoUrl)}" alt="Company Logo">
            </div>
          </div>

          <div class="branding-content">
            <h1>${escapeHtml(companyName)}</h1>
            <p class="company-address">${escapeHtml(companyAddress).replace(/\n/g, "<br>")}</p>
            <p style="display:block; margin-top:4px;"><strong>MO:</strong> ${escapeHtml(companyMobile)}<br><strong>GSTIN:</strong> ${escapeHtml(companyGst)}<br><strong>PAN:</strong> ${escapeHtml(companyPan)}</p>
          </div>
        </div>
      </div>
    `;

  const addressHtml = `
      <div class="address-row">
        <div class="address-section">
          <div class="bill-to-title">Bill To</div>
          <div style="font-size: 12px; color: #4b5563;">
            <div class="client-name" style="margin-bottom: 4px;">${escapeHtml(receiver?.name || "-")}</div>
            <div style="margin-bottom: 6px;">
              ${escapeHtml(receiver?.address || "-").replace(/\n/g, "<br>")}
            </div>
            <div>
              <strong>Contact:</strong> ${escapeHtml(receiver?.mobile || "-")} &nbsp;&nbsp;
              <strong>GST:</strong> ${escapeHtml(receiver?.gst_no || "-")}
            </div>
          </div>
        </div>

        <div class="address-meta">
          ${invoiceMetaHtml}
        </div>
      </div>
    `;

  const pageHtml = `
    <div class="invoice-page">
      ${headerHtml}
      ${addressHtml}
      ${renderMainTable(invoice.items)}
      ${footerHtml}
    </div>
  `;

    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=210mm, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Zalando+Sans+SemiExpanded:wght@500&display=swap" rel="stylesheet">
    <title>Tax Invoice - ${escapeHtml(sender?.name || "Jay Bhavani Enterprise")}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        background: #fff;
        font-family: Inter, Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }

      .page-wrapper {
        width: 210mm;
        margin: 0 auto;
        background: #fff;
        position: relative;
      }

      .invoice-page {
        background: #fff;
        width: 210mm;
        padding: 10mm;
        box-sizing: border-box;
        margin: 0 auto;
        border: 2px solid #374151;
      }
      .invoice-footer {
        margin: 0 -10mm;
        padding: 0 10mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .text-xs { font-size: 10px; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-semibold { font-weight: 600; }
      .text-gray { color: #6b7280; }

      .header {
        display: block;
        border-bottom: 2px solid #bb4048;
        padding-left: 6px;
        padding-right: 6px;
        padding-bottom: 12px;
        margin: 0 -10mm 12px;
        page-break-inside: avoid;
      }

      .branding-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        column-gap: 12px;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 0;
      }

      .branding-logo { flex: 0 0 auto; }
      .branding-content { 
        width: 100%;
        text-align: right; 
        padding-left: 0;
        max-width: none;
        justify-self: end;
      }

      .branding-content h1 {
        color: #bb4048;
        font-family: 'Zalando Sans SemiExpanded', Arial, sans-serif;
        font-size: 26px;
        font-weight: 500;
        margin: 0 0 4px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .branding-content p {
        color: #4b5563;
        font-size: 12px;
        line-height: 1.5;
        margin: 0;
        word-wrap: break-word;
      }

      .company-address {
        max-width: 100%;
        margin-left: auto;
      }

      .company-logo {
        width: 200px;
        height: 100px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }

      .company-logo img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .header-meta-bar {
        background: transparent;
        padding: 8px 0;
        border-radius: 6px;
        display: flex;
        justify-content: flex-end;
        font-size: 12px;
        color: #374151;
        border: 0;
        gap: 10px;
        flex-wrap: wrap;
        width: 100%;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .header-meta-bar > div {
        text-align: right;
        white-space: nowrap;
      }

      .address-row {
        display: grid;
        grid-template-columns: minmax(0, 420px) 1fr;
        gap: 12px;
        align-items: start;
        margin: 0 -10mm 10px;
        padding: 0 6px;
        page-break-inside: avoid;
      }

      .address-section {
        background: transparent;
        border-radius: 8px;
        padding: 0;
        margin-bottom: 0;
        border: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid;
        max-width: 420px;
        margin-left: 0;
        margin-right: auto;
      }

      .address-meta {
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
      }

      .bill-to-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 700;
      }

      .client-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #111827; }

      .main-table-container {
        margin: 0 -10mm 12px;
      }
      .main-table {
        border-top: 1px solid #111111;
        border-right: 1px solid #111111;
        border-bottom: 1px solid #111111;
        border-left: 0 !important;
      }
      table { width: 100%; border-collapse: collapse; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }

      .main-table th {
        background: #FFB6C1;
        color: #000000;
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        text-transform: uppercase;
        padding: 6px 4px;
        text-align: left;
        border-right: 1px solid #111111;
        border-bottom: 1px solid #111111;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .main-table th:last-child {
        border-right: 0;
      }

      .main-table th:first-child,
      .main-table td:first-child {
        border-left: 0 !important;
      }

      .main-table td {
        padding: 6px 4px;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        border-bottom: 0;
        border-right: 1px solid #111111;
        vertical-align: top;
        height: 22px;
      }

      .main-table td:last-child {
        border-right: 0;
      }

      .main-table tr:nth-child(even) { 
        background-color: transparent;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .tax-table-container {
        margin-top: 12px;
        margin-bottom: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
        page-break-inside: avoid;
      }

      .tax-table {
        border-collapse: collapse;
      }

      .tax-table th {
        background: #f3f4f6;
        color: #374151;
        font-weight: 600;
        border: 1px solid #d1d5db;
        font-size: 10px;
        text-align: right;
        padding: 6px 8px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .tax-table th:first-child { text-align: left; }

      .tax-table td {
        font-size: 10px;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        text-align: right;
      }
      .tax-table td:first-child { text-align: left; }

      .footer-grid {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 20px;
        margin-top: 0;
        border-top: 2px solid #f3f4f6;
        padding-top: 12px;
        page-break-inside: avoid;
      }

      .terms-box { font-size: 10px; color: #4b5563; }
      .terms-box h4 { margin: 0 0 5px 0; font-size: 11px; color: #111827; }
      .terms-list { margin: 0; padding-left: 12px; }
      .terms-list li { margin-bottom: 2px; }

      .bank-details {
        background: #eff6ff;
        padding: 12px;
        border-radius: 6px;
        font-size: 11px;
        border: 1px solid #dbeafe;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .bank-row { display: flex; justify-content: space-between; margin-bottom: 4px; }

      .totals-box {
        background: #f9fafb;
        padding: 12px;
        border-radius: 8px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid;
      }
      .total-row {
        display: flex; justify-content: space-between;
        margin-bottom: 6px;
        font-size: 12px;
      }
      .grand-total {
        border-top: 2px solid #e5e7eb;
        padding-top: 10px;
        font-weight: 800;
        font-size: 16px;
        color: #bb4048;
      }

      .amount-words {
        margin-top: 10px;
        font-size: 11px;
        font-style: italic;
        color: #4b5563;
        border-top: 1px dashed #e5e7eb;
        padding-top: 8px;
      }

      .signatory {
        text-align: center;
        margin-top: 12px;
        font-size: 10px;
        page-break-inside: avoid;
      }
      .sign-box {
        height: 45px;
        margin-bottom: 5px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .signature-image {
        max-width: 170px;
        max-height: 40px;
        object-fit: contain;
      }
      .signature-placeholder {
        width: 170px;
        height: 40px;
      }

      @media print {
        @page {
          size: A4;
          margin: 5mm;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { background: #fff; margin: 0; padding: 0; }
        .page-wrapper { width: 100%; }
        .invoice-page { width: 100%; margin: 0; padding: 10mm; }
      }
    </style>
  </head>
  <body>
    <div class="page-wrapper">
      ${pageHtml}
    </div>
    </div>
  </body>
  </html>
    `;
};

const PREVIEW_OVERLAY_ID = "invoice-preview-overlay";

const removeExistingPreviewOverlay = () => {
  const existing = document.getElementById(PREVIEW_OVERLAY_ID);
  if (existing) {
    existing.remove();
  }
};

const openPreviewOverlay = (html: string) => {
  removeExistingPreviewOverlay();

  const overlay = document.createElement("div");
  overlay.id = PREVIEW_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const container = document.createElement("div");
  container.style.background = "#fff";
  container.style.borderRadius = "10px";
  container.style.overflow = "hidden";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
  container.style.maxWidth = "calc(100vw - 40px)";
  container.style.maxHeight = "calc(100vh - 40px)";

  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "flex-end";
  toolbar.style.gap = "10px";
  toolbar.style.padding = "10px 12px";
  toolbar.style.borderBottom = "1px solid #e5e7eb";
  toolbar.style.background = "#f9fafb";

  const iframe = document.createElement("iframe");
  iframe.style.width = "210mm";
  iframe.style.minWidth = "210mm";
  iframe.style.height = "297mm";
  iframe.style.minHeight = "297mm";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.margin = "0";
  iframe.style.flexShrink = "0";
  iframe.srcdoc = html;

  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.textContent = "Print";
  printButton.style.padding = "8px 14px";
  printButton.style.border = "1px solid #6366f1";
  printButton.style.borderRadius = "8px";
  printButton.style.background = "#fff";
  printButton.style.color = "#4338ca";
  printButton.style.cursor = "pointer";
  printButton.onclick = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.style.padding = "8px 14px";
  closeButton.style.border = "1px solid #d1d5db";
  closeButton.style.borderRadius = "8px";
  closeButton.style.background = "#fff";
  closeButton.style.color = "#374151";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => removeExistingPreviewOverlay();

  overlay.onclick = (event) => {
    if (event.target === overlay) {
      removeExistingPreviewOverlay();
    }
  };

  toolbar.appendChild(printButton);
  toolbar.appendChild(closeButton);
  
  const iframeWrapper = document.createElement("div");
  iframeWrapper.style.flex = "1";
  iframeWrapper.style.overflow = "auto";
  iframeWrapper.style.background = "#e5e7eb";
  iframeWrapper.style.display = "flex";
  iframeWrapper.style.justifyContent = "flex-start";
  iframeWrapper.style.alignItems = "flex-start";
  iframeWrapper.appendChild(iframe);
  
  container.appendChild(toolbar);
  container.appendChild(iframeWrapper);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
};

export const previewInvoice = async (invoice: Invoice) => {
  const adminDetails = await getAdminDetailsForPrint();
  const html = buildInvoicePrintHtml(invoice, adminDetails);
  openPreviewOverlay(html);
};

export const printInvoice = async (invoice: Invoice) => {
  const adminDetails = await getAdminDetailsForPrint();
  const html = buildInvoicePrintHtml(invoice, adminDetails);
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";

  const cleanup = () => {
    if (printFrame.parentNode) {
      printFrame.parentNode.removeChild(printFrame);
    }
  };

  printFrame.onload = () => {
    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(cleanup, 1000);
  };

  printFrame.srcdoc = html;
  document.body.appendChild(printFrame);
};
