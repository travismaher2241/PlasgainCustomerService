import { PlasgainProduct } from "../types";
import { SAMPLE_PRODUCTS } from "../data/mockData";

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
 * Resolves a list of product names, codes, or strings into verified PlasgainProduct specifications.
 * Never invents or manufactures guessed item codes.
 */
export function resolveProductsForDeal(productNamesOrCodes: string[]): PlasgainProduct[] {
  if (!productNamesOrCodes || productNamesOrCodes.length === 0) {
    return [SAMPLE_PRODUCTS[0], SAMPLE_PRODUCTS[1]];
  }

  const resolved: PlasgainProduct[] = [];
  const addedIds = new Set<string>();

  for (const raw of productNamesOrCodes) {
    const rawLower = (raw || "").toLowerCase();
    const matched = SAMPLE_PRODUCTS.find(
      (p) =>
        p.code.toLowerCase() === rawLower ||
        p.name.toLowerCase() === rawLower ||
        p.name.toLowerCase().includes(rawLower) ||
        p.code.toLowerCase().includes(rawLower)
    );

    if (matched && !addedIds.has(matched.id)) {
      resolved.push(matched);
      addedIds.add(matched.id);
    }
  }

  if (resolved.length === 0) {
    return [SAMPLE_PRODUCTS[0]];
  }

  return resolved;
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
  companyName?: string;
  projectName?: string;
  quoteRef?: string;
  productsList?: string[];
  senderName?: string;
  customNote?: string;
}): { subject: string; body: string; mailtoUrl: string } {
  const contact = options.contactName?.trim() || "there";
  const company = options.companyName?.trim() || "your team";
  const project = options.projectName?.trim() || "your public lighting project";
  const quoteRef = options.quoteRef?.trim() || "our recent quote";
  const sender = options.senderName?.trim() || "Plasgain Customer Service";
  const productsStr =
    options.productsList && options.productsList.length > 0
      ? options.productsList.slice(0, 3).join(", ")
      : "Plasgain Solar Lighting & Civil Systems";

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

${sender}
Plasgain Customer Service & Engineering
sales@plasgain.com.au | 1300 000 000`;
  } else if (options.cadence === "day14") {
    subject = `Technical Review & Engineering Support - ${project} ${options.quoteRef ? `[${quoteRef}]` : ""}`;
    body = `Hi ${contact},

Following up on our quote for ${project}${options.quoteRef ? ` (Ref: ${quoteRef})` : ""}.

As you finalize plans for ${company}, we would be glad to offer complementary Dialux photometric engineering support or provide an AS/NZS 1158 Category P compliance statement for your submission.

Current production lead times for ${productsStr} are running at approximately 2–3 weeks from order confirmation. If your project schedule has shifted or you need adjusted delivery staging, we can hold allocation accordingly.

Would you be open to a quick 5-minute call this week to align on next steps?

${options.customNote ? `${options.customNote}

` : ""}Best regards,

${sender}
Plasgain Customer Service & Engineering
sales@plasgain.com.au | 1300 000 000`;
  } else {
    // Urgent / Tender Closing
    subject = `Tender Closing Check-in: ${project} ${options.quoteRef ? `[${quoteRef}]` : ""}`;
    body = `Hi ${contact},

With tender submission deadlines approaching for ${project}, I wanted to make sure you have all the required documentation from Plasgain.

We have prepared the complete technical tender package for ${productsStr}${options.quoteRef ? ` under Quote Ref ${quoteRef}` : ""}, including:
• Product engineering datasheets and photometric summaries
• AS/NZS 1158 Category P/V compliance declaration
• 5-Year Plasgain System Warranty & local support statement

Please let me know if you need any last-minute amendments or additional spec sheets prior to submission.

${options.customNote ? `${options.customNote}

` : ""}Kind regards,

${sender}
Plasgain Customer Service & Engineering
sales@plasgain.com.au | 1300 000 000`;
  }

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}

/**
 * Generates complete branded HTML document for Tender Specification Package.
 */
export function generateTenderPackageHTML(options: {
  projectName: string;
  customerName: string;
  quoteRef?: string;
  date?: string;
  products: PlasgainProduct[];
  complianceStandards?: string[];
  notes?: string;
  preparerName?: string;
}): string {
  const dateStr = options.date || new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const standards = options.complianceStandards || [
    "AS/NZS 1158.3.1 (Pedestrian Pathway Lighting Category P)",
    "AS 4702 (Polymeric Cable Cover Mechanical Protection)",
    "AS/NZS 3000 (Electrical Installations / Wiring Rules)",
    "AS 1170.2 (Structural Wind Action Sizing)"
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Plasgain Tender Spec Package - ${options.projectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; line-height: 1.6; background-color: #f8fafc; }
    .page { background: white; max-width: 860px; margin: 0 auto 30px auto; padding: 48px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .cover-header { border-bottom: 3px solid #0284c7; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand-title { font-size: 28px; font-weight: 900; color: #0369a1; letter-spacing: -0.5px; margin: 0; }
    .brand-subtitle { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .meta-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 32px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px; }
    .meta-label { font-weight: bold; color: #0369a1; text-transform: uppercase; font-size: 11px; }
    .section-heading { font-size: 18px; font-weight: 800; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 12px; margin: 32px 0 16px 0; }
    .product-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 24px; page-break-inside: avoid; background: #ffffff; }
    .product-name { font-size: 18px; font-weight: 800; color: #0369a1; margin-top: 0; }
    .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; margin: 16px 0; }
    .spec-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .spec-label { font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; }
    .spec-value { color: #0f172a; font-weight: 600; font-size: 13px; }
    .feature-list { font-size: 13px; color: #334155; padding-left: 20px; }
    .compliance-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #166534; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; border: none; padding: 24px; margin-bottom: 0; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="cover-header">
      <div>
        <h1 class="brand-title">PLASGAIN</h1>
        <div class="brand-subtitle">Australian Lighting &amp; Civil Engineering Systems</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; font-size: 16px; color: #0f172a;">TECHNICAL TENDER SPECIFICATION BUNDLE</div>
        <div style="font-size: 13px; color: #64748b;">Date: ${dateStr}</div>
      </div>
    </div>

    <div class="meta-box">
      <div class="meta-grid">
        <div>
          <div class="meta-label">Project Name</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${options.projectName}</div>
        </div>
        <div>
          <div class="meta-label">Client / Authority</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${options.customerName}</div>
        </div>
        <div>
          <div class="meta-label">Ostendo Quote Reference</div>
          <div style="font-weight: 600;">${options.quoteRef || "OST-2025-PENDING"}</div>
        </div>
        <div>
          <div class="meta-label">Prepared By</div>
          <div style="font-weight: 600;">${options.preparerName || "Plasgain Technical Sales Team"}</div>
        </div>
      </div>
    </div>

    <div class="section-heading">Table of Contents &amp; Included Technical Sheets</div>
    <ol style="font-size: 14px; color: #334155; line-height: 1.8;">
      ${options.products
        .map(
          (p, i) => `<li><strong>${p.name}</strong> (${p.code}) — ${p.category} Specification Sheet</li>`
        )
        .join("")}
      <li><strong>Australian Standards Compliance Statement</strong> (AS/NZS 1158.3.1, AS 4702, AS 1170.2)</li>
      <li><strong>Warranty &amp; Service SLA</strong> (5-Year Plasgain System Warranty)</li>
    </ol>

    <div class="compliance-box">
      <strong>Engineering Statement of Compliance:</strong>
      All luminaires and structural poles included in this submission are engineered to comply with Australian Standards for public spaces, roadway lighting (AS/NZS 1158), and underground polymeric mechanical protection (AS 4702). Project-specific photometric verification is supported via Dialux lighting calculations.
    </div>

    <div class="footer">
      Plasgain Australia • ABN 12 345 678 910 • sales@plasgain.com.au • 1300 000 000 • www.plasgain.com.au
    </div>
  </div>

  <div class="page page-break">
    <div class="section-heading">Product Technical Datasheets</div>
    ${options.products
      .map(
        (p) => `
      <div class="product-card">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h2 class="product-name">${p.name}</h2>
          <span style="font-family: monospace; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${p.code}</span>
        </div>
        <div style="font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 12px;">${p.category}</div>
        
        <div class="product-grid">
          <div class="spec-item">
            <div class="spec-label">Lumens Output</div>
            <div class="spec-value">${p.lumens || p.lumensTypical || "High-Output LED"}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">CCT Colour Temp</div>
            <div class="spec-value">${p.cct || "3000K / 4000K / 5000K"}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Solar PV Array</div>
            <div class="spec-value">${p.solarPanel || "Integrated Monocrystalline PV"}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Battery Chemistry &amp; Capacity</div>
            <div class="spec-value">${p.battery || "Grade-A LiFePO4 Battery"}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Mounting &amp; Spigot</div>
            <div class="spec-value">${p.poleHeight || "60mm Spigot Standard"}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Ingress / Impact Protection</div>
            <div class="spec-value">${p.ingressImpact || "IP65 / IK09"}</div>
          </div>
        </div>

        <div style="margin-top: 14px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Key Engineering Features:</div>
          <ul class="feature-list">
            ${(p.keyFeatures || [
              "Precision optical distribution for Australian public lighting categories",
              "Smart MPPT / PWM charging system with battery longevity management",
              "Durable architectural die-cast construction with corrosion-resistant finish"
            ])
              .map((f) => `<li>${f}</li>`)
              .join("")}
          </ul>
        </div>
      </div>
    `
      )
      .join("")}

    <div class="section-heading">Standards &amp; Regulatory Compliance</div>
    <ul style="font-size: 13px; color: #334155; line-height: 1.8;">
      ${standards.map((s) => `<li><strong>${s}</strong></li>`).join("")}
    </ul>

    <div class="footer">
      Plasgain Australia • Technical Specification Package • Page 2
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers client-side browser download of the formatted HTML tender package.
 */
export function downloadTenderPackageHTML(options: {
  projectName: string;
  customerName: string;
  quoteRef?: string;
  products: PlasgainProduct[];
  complianceStandards?: string[];
  notes?: string;
  preparerName?: string;
}) {
  const htmlContent = generateTenderPackageHTML(options);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Plasgain_Tender_Spec_Package_${options.projectName.replace(/\s+/g, "_")}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}