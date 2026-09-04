export interface OstendoProductExportLine {
  itemCode?: string;
  description?: string;
  quantity: number;
  unit?: string;
  lineNotes?: string;
  quoteRef?: string;
  // Backwards compatibility mappings
  code?: string;
  name?: string;
  notes?: string;
}

export type OstendoExportItem = OstendoProductExportLine;

export interface OstendoValidationResult {
  valid: boolean;
  errors: string[];
}

/** Helper to cleanly extract canonical item code and description */
export function normalizeExportLine(item: OstendoProductExportLine): {
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  lineNotes: string;
  quoteRef: string;
} {
  const itemCode = (item.itemCode || item.code || "").trim();
  const description = (item.description || item.name || "").trim();
  const quantity = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity || 0));
  const unit = (item.unit || "ea").trim();
  const lineNotes = (item.lineNotes || item.notes || "").trim();
  const quoteRef = (item.quoteRef || "").trim();
  return { itemCode, description, quantity, unit, lineNotes, quoteRef };
}

/**
 * Validates product line items prior to Ostendo export.
 * Every row must have an explicit Item Code and quantity > 0.
 * Reports all errors at once.
 */
export function validateOstendoItems(items: OstendoProductExportLine[]): OstendoValidationResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push("At least one product line item is required for Ostendo export.");
    return { valid: false, errors };
  }

  items.forEach((rawItem, idx) => {
    const rowNum = idx + 1;
    const item = normalizeExportLine(rawItem);

    if (!item.itemCode) {
      errors.push(`Row ${rowNum} ("${item.description || "Unnamed Item"}"): Missing explicit Item Code. Select a verified catalogue product.`);
    }
    if (isNaN(item.quantity) || item.quantity <= 0) {
      errors.push(`Row ${rowNum} ("${item.description || item.itemCode || "Item"}"): Quantity must be greater than zero (found: ${rawItem.quantity}).`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Formats validated product line items into Ostendo ERP CSV import format.
 * Canonical columns: Item Code, Description, Quantity, Unit, Line Notes, Job / Quote Ref.
 * Strictly excludes pricing, GST, taxes, discounts, and margins (handled in Ostendo).
 * Uses UTF-8 BOM (\uFEFF) and Windows CRLF (\r\n) line endings.
 */
export function formatOstendoCSV(items: OstendoProductExportLine[], quoteRef?: string): string {
  const headers = ["Item Code", "Description", "Quantity", "Unit", "Line Notes", "Job / Quote Ref"];
  const headerLine = headers.map(escapeCsvField).join(",");

  const rows = items.map((rawItem) => {
    const item = normalizeExportLine(rawItem);
    const ref = quoteRef || item.quoteRef || "";

    return [
      escapeCsvField(item.itemCode),
      escapeCsvField(item.description),
      item.quantity,
      escapeCsvField(item.unit),
      escapeCsvField(item.lineNotes),
      escapeCsvField(ref)
    ].join(",");
  });

  return "\uFEFF" + [headerLine, ...rows].join("\r\n");
}

/**
 * Formats validated product line items into Tab-Delimited text.
 * Canonical columns: Item Code \t Description \t Quantity \t Unit \t Line Notes \t Job / Quote Ref.
 */
export function formatOstendoTabDelimited(items: OstendoProductExportLine[], quoteRef?: string): string {
  const rows = items.map((rawItem) => {
    const item = normalizeExportLine(rawItem);
    const ref = quoteRef || item.quoteRef || "";
    return `${item.itemCode}\t${item.description}\t${item.quantity}\t${item.unit}\t${item.lineNotes}\t${ref}`;
  });

  return rows.join("\r\n");
}

/**
 * Copies product list tab-delimited text to clipboard without initiating download.
 */
export async function copyOstendoProductList(items: OstendoProductExportLine[], quoteRef?: string): Promise<boolean> {
  const text = formatOstendoTabDelimited(items, quoteRef);
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/**
 * Helper to download Ostendo CSV file and cleanly revoke Object URL.
 */
export function downloadOstendoCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates email content for follow-up cadences.
 */
export function generateCustomerFollowUpEmail(options: {
  cadence: "day7" | "day14" | "urgent";
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  projectName?: string;
  quoteRef?: string;
  productsList?: string[];
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  companyAbn?: string;
  leadTime?: string;
  warranty?: string;
  customNote?: string;
}): { subject: string; body: string; mailtoUrl: string } {
  const contact = options.contactName?.trim() || "there";
  const company = options.companyName?.trim() || "your team";
  const project = options.projectName?.trim() || "your public lighting project";
  const quoteRef = options.quoteRef?.trim() || "our recent quote";
  const sender = options.senderName?.trim() || "";
  const senderEmail = options.senderEmail?.trim() || "";
  const senderPhone = options.senderPhone?.trim();
  const contactLine = senderPhone ? `${senderEmail} | ${senderPhone}` : senderEmail;
  const leadTimeStr = options.leadTime?.trim() || "approximately 2–3 weeks from order confirmation";
  const warrantyStr = options.warranty?.trim() || "Plasgain Manufacturer Warranty";
  const productsStr =
    options.productsList && options.productsList.length > 0
      ? options.productsList.slice(0, 3).join(", ")
      : "Plasgain Solar Lighting & Civil Systems";

  const signoffLines = [sender, "Plasgain Customer Service & Engineering", contactLine].filter(Boolean).join("\n");

  let subject = "";
  let body = "";

  if (options.cadence === "day7") {
    subject = `Following up: Plasgain Quotation ${options.quoteRef ? `[${quoteRef}] ` : ""}- ${project}`;
    body = `Hi ${contact},

I hope your week is going well.

I wanted to quickly check in regarding the quotation we sent through for ${project}${options.quoteRef ? ` (Ref: ${quoteRef})` : ""}, featuring ${productsStr}.

Did you have a chance to review the specifications and product schedule? We want to ensure all luminaire outputs, pole heights, and battery autonomy meet your council and engineering requirements.

If you have any technical questions or would like us to review any alternative configurations, please don't hesitate to reach out.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  } else if (options.cadence === "day14") {
    subject = `Technical Review & Engineering Support - ${project} ${options.quoteRef ? `[${quoteRef}]` : ""}`;
    body = `Hi ${contact},

Following up on our quote for ${project}${options.quoteRef ? ` (Ref: ${quoteRef})` : ""}.

As you finalize plans for ${company}, we would be glad to offer complementary Dialux photometric engineering support or provide an AS/NZS 1158 Category P compliance statement for your submission.

Current production lead times for ${productsStr} are running at ${leadTimeStr}. If your project schedule has shifted or you need adjusted delivery staging, we can hold allocation accordingly.

Would you be open to a quick 5-minute call this week to align on next steps?

${options.customNote ? `${options.customNote}

` : ""}Best regards,

${signoffLines}`;
  } else {
    // Urgent / Tender Closing
    subject = `Tender Closing Check-in: ${project} ${options.quoteRef ? `[${quoteRef}] ` : ""}`;
    body = `Hi ${contact},

With tender submission deadlines approaching for ${project}, I wanted to make sure you have all the required documentation from Plasgain.

We have prepared the complete technical tender package for ${productsStr}${options.quoteRef ? ` under Quote Ref ${quoteRef}` : ""}, including:
• Product engineering datasheets and photometric summaries
• AS/NZS 1158 Category P/V compliance declaration
• 5-Year Plasgain System Warranty & local support statement

Please let me know if you need any last-minute amendments or additional spec sheets prior to submission.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${signoffLines}`;
  }

  const recipient = options.contactEmail?.trim() || "";
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}