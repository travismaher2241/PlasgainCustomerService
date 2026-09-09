/**
 * Pure quote parsing logic.
 * Runs identically in the browser and Node.js with zero dependencies.
 */

/** One text run from the PDF, with the position it was drawn at. */
export interface PositionedText {
  x: number;
  y: number;
  text: string;
}

export interface QuoteLineItem {
  productCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  /** Drawing reference this item was grouped under, when the quote lists one. */
  drawingNumber?: string;
}

export interface ParsedQuote {
  quoteNumber?: string;
  /** ISO yyyy-mm-dd. Source is Australian d/m/y. */
  quoteDate?: string;
  quoteExpiryDate?: string;
  quoteTerms?: string;
  customerName?: string;
  contactName?: string;
  customerAddress?: string;
  /** The same address split for storage. Absent when the last line is not a
   *  recognisable Australian "Suburb STATE 1234" line - a half-parsed address
   *  in the wrong fields is worse than none. */
  customerAddressParts?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  projectName?: string;
  lineItems: QuoteLineItem[];
  /** Ex GST. This is what drives pipeline value. */
  nettTotal?: number;
  taxTotal?: number;
  /** Inc GST, as printed on the document the customer receives. */
  grossTotal?: number;
  /** Anything the parser could not read, in words a salesperson can act on. */
  warnings: string[];
}

/** Text runs whose y differs by less than this belong to the same visual row. */
const ROW_TOLERANCE = 4;

/** Left edge of the label column; values sit to the right of it. */
const LABEL_COLUMN_MAX_X = 80;

/**
 * Ostendo writes dates as d/m/y. Parsing them as m/d/y would silently shift a
 * quote by months and take the follow-up date with it, so the day-first order
 * is enforced rather than left to Date's discretion.
 */
export function parseAustralianDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/);
  if (!match) return undefined;
  let [, dd, mm, yyyy] = match;
  if (yyyy.length === 2) {
    yyyy = `20${yyyy}`;
  }
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  // Reject a date the calendar does not have, such as 31/02.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return undefined;

  return `${yyyy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Splits an Australian address block into parts.
 *
 * Only the final "Suburb STATE 3156" line is pattern-matched; everything above
 * it is the street. If that line does not match, nothing is returned, because
 * guessing which fragment is the suburb puts wrong data in named fields.
 */
export function splitAustralianAddress(
  lines: string[]
): ParsedQuote["customerAddressParts"] {
  if (lines.length === 0) return undefined;
  const last = lines[lines.length - 1].trim();
  const match = last.match(/^(.*?)[,\s]+([A-Za-z]{2,3})\s+(\d{4})$/);
  if (!match) return undefined;

  const [, city, state, postcode] = match;
  if (!city.trim()) return undefined;

  return {
    street: lines.slice(0, -1).join(", ").trim(),
    city: city.trim(),
    state: state.toUpperCase(),
    postcode,
    country: "Australia"
  };
}

/** "$17,625.33" -> 17625.33. Returns undefined for anything that is not money. */
export function parseMoney(value: string): number | undefined {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

/** Groups text runs into visual rows, each ordered left to right. */
export function groupIntoRows(items: PositionedText[]): PositionedText[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedText[][] = [];

  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= ROW_TOLERANCE) {
      current.push(item);
    } else {
      rows.push([item]);
    }
  }

  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

const rowText = (row: PositionedText[]): string =>
  row.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();

/**
 * Reads the value that follows a label on the same visual row.
 *
 * The labels and their values sit in separate columns, so "QUOTE DATE:" and
 * "10/02/2026" arrive as two runs a few points apart vertically. Matching on
 * the row rather than the string is what keeps this stable when Ostendo nudges
 * the layout.
 */
function valueAfterLabel(rows: PositionedText[][], label: string): string | undefined {
  for (const row of rows) {
    const idx = row.findIndex((i) => i.text && i.text.trim().toUpperCase().startsWith(label.toUpperCase()));
    if (idx === -1) continue;
    const item = row[idx];
    const trimmed = (item.text || "").trim();
    if (trimmed.toUpperCase().startsWith(label.toUpperCase())) {
      const rest = trimmed.slice(label.length).replace(/^[:\s]+/, "").trim();
      if (rest) {
        const remaining = row.slice(idx + 1).map((i) => (i.text || "").trim()).filter(Boolean);
        return [rest, ...remaining].join(" ").trim();
      }
    }
    const after = row
      .slice(idx + 1)
      .map((i) => (i.text || "").trim())
      .filter(Boolean);
    if (after.length > 0) return after.join(" ");
  }
  return undefined;
}

/**
 * The quote number and expiry sit in the left value column, on the same row as
 * a label that is printed slightly lower. Reading them by column position
 * avoids depending on which of the two the row happens to start with.
 */
function leftColumnValueOnLabelRow(
  rows: PositionedText[][],
  label: string
): string | undefined {
  for (const row of rows) {
    const labelIdx = row.findIndex((i) => i.text && i.text.trim().toUpperCase().startsWith(label.toUpperCase()));
    if (labelIdx === -1) continue;
    const labelItem = row[labelIdx];
    const value = row.find(
      (i, idx) =>
        idx !== labelIdx &&
        i.x > labelItem.x + 15 &&
        !/:$/.test((i.text || "").trim()) &&
        Boolean((i.text || "").trim())
    );
    if (value) return value.text.trim();
  }
  return undefined;
}

export function parseQuoteFromPositionedText(items: PositionedText[]): ParsedQuote {
  const rows = groupIntoRows(items);
  const warnings: string[] = [];

  let quoteNumber =
    leftColumnValueOnLabelRow(rows, "QUOTATION #") ||
    leftColumnValueOnLabelRow(rows, "QUOTATION NO") ||
    leftColumnValueOnLabelRow(rows, "QUOTE #") ||
    leftColumnValueOnLabelRow(rows, "QUOTE NO") ||
    leftColumnValueOnLabelRow(rows, "QUOTATION NUMBER") ||
    leftColumnValueOnLabelRow(rows, "QUOTE NUMBER") ||
    valueAfterLabel(rows, "QUOTATION #:") ||
    valueAfterLabel(rows, "QUOTE #:") ||
    valueAfterLabel(rows, "QUOTATION NO:") ||
    valueAfterLabel(rows, "QUOTE NO:") ||
    valueAfterLabel(rows, "Quote:") ||
    // The footer repeats it on every page as "Quote: PL5597".
    (rowText(rows.find((r) => /^Quote:\s/i.test(rowText(r))) || []).match(/^Quote:\s*(\S+)/i) || [])[1];

  if (!quoteNumber) {
    for (const r of rows) {
      const match = rowText(r).match(/\b(PL\d{3,6})\b/i);
      if (match) {
        quoteNumber = match[1].toUpperCase();
        break;
      }
    }
  }
  if (!quoteNumber) warnings.push("Could not find the quote number on this PDF.");

  const rawQuoteDate =
    valueAfterLabel(rows, "QUOTE DATE:") ||
    valueAfterLabel(rows, "QUOTATION DATE:") ||
    valueAfterLabel(rows, "DATE:") ||
    leftColumnValueOnLabelRow(rows, "QUOTE DATE") ||
    leftColumnValueOnLabelRow(rows, "DATE");
  const quoteDate = rawQuoteDate ? parseAustralianDate(rawQuoteDate) : undefined;
  if (!quoteDate) {
    warnings.push(
      rawQuoteDate
        ? `Could not read the quote date "${rawQuoteDate}" as a date.`
        : "Could not find the quote date, so no follow-up date could be worked out."
    );
  }

  const rawExpiry =
    leftColumnValueOnLabelRow(rows, "QUOTE EXPIRY") ||
    leftColumnValueOnLabelRow(rows, "EXPIRY DATE") ||
    leftColumnValueOnLabelRow(rows, "EXPIRY") ||
    valueAfterLabel(rows, "QUOTE EXPIRY:") ||
    valueAfterLabel(rows, "EXPIRY DATE:") ||
    valueAfterLabel(rows, "EXPIRY:");
  const quoteExpiryDate = rawExpiry ? parseAustralianDate(rawExpiry) : undefined;
  if (rawExpiry && !quoteExpiryDate) {
    warnings.push(`Could not read the expiry date "${rawExpiry}" as a date.`);
  }

  const quoteTerms =
    valueAfterLabel(rows, "QUOTE TERMS:") ||
    valueAfterLabel(rows, "TERMS:") ||
    leftColumnValueOnLabelRow(rows, "QUOTE TERMS");

  // "To:" block - first line is the person, the lines beneath are the company
  // and its address.
  let contactName: string | undefined;
  let customerName: string | undefined;
  let customerAddress: string | undefined;
  let customerAddressParts: ParsedQuote["customerAddressParts"];

  const toRowIndex = rows.findIndex((r) => r.some((i) => /^(To|Attention|Attn):?$/i.test((i.text || "").trim())));
  if (toRowIndex >= 0) {
    const toRow = rows[toRowIndex];
    const toIdx = toRow.findIndex((i) => /^(To|Attention|Attn):?$/i.test((i.text || "").trim()));
    const labelItem = toRow[toIdx];
    const nameItem = toRow[toIdx + 1];
    contactName = nameItem?.text?.trim();
    const nameX = nameItem?.x ?? labelItem.x;

    const block: string[] = [];
    for (let i = toRowIndex + 1; i < Math.min(toRowIndex + 8, rows.length); i++) {
      const line = rows[i].filter((t) => nameX !== undefined && Math.abs(t.x - nameX) < 40 && t.x < 350);
      if (line.length === 0) break;
      const text = line.map((t) => t.text.trim()).join(" ");
      if (/^(Quote For|Project|Deliver To|Terms|Item|Product|Drawing):/i.test(text)) break;
      block.push(text);
    }
    if (block.length > 0) customerName = block[0];
    if (block.length > 1) {
      const addressLines = block.slice(1);
      customerAddress = addressLines.join(", ");
      customerAddressParts = splitAustralianAddress(addressLines);
    }
  }
  if (!customerName) {
    warnings.push("Could not read the customer from the To: block - choose the account by hand.");
  }

  // "Quote For:" - the project description.
  let projectName: string | undefined;
  const quoteForIndex = rows.findIndex((r) => /^(quote for|project|re):/i.test(rowText(r)));
  if (quoteForIndex >= 0) {
    const sameRow =
      valueAfterLabel(rows, "Quote For:") ||
      valueAfterLabel(rows, "Project:") ||
      valueAfterLabel(rows, "RE:");
    projectName = sameRow || rowText(rows[quoteForIndex + 1] || []);
  }
  if (!projectName) warnings.push("Could not find the project description (Quote For).");

  // Line items. A priced row is: code, qty, unit, unit price, ext price - and
  // the description is typically the row directly beneath it.
  const lineItems: QuoteLineItem[] = [];
  let currentDrawing: string | undefined;

  const NON_CODE_WORDS = new Set([
    "CODE", "ITEM", "PRODUCT", "QTY", "QUANTITY", "UNIT", "PRICE", "AMOUNT", "TOTAL", "EXTENDED", "DESCRIPTION", "DRAWING"
  ]);

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => c.text.trim());
    const text = rowText(rows[i]);

    const drawing = text.match(/^Drawing Number:\s*(.+)$/i);
    if (drawing) {
      // Applies to the items above it, which have already been pushed.
      const ref = drawing[1].trim();
      for (let k = lineItems.length - 1; k >= 0; k--) {
        if (lineItems[k].drawingNumber) break;
        lineItems[k].drawingNumber = ref;
      }
      currentDrawing = undefined;
      continue;
    }

    if (cells.length < 5) continue;
    const [code, qty, unit, unitPrice, extPrice] = cells;
    if (NON_CODE_WORDS.has(code.toUpperCase())) continue;
    if (!/^[A-Z0-9][A-Z0-9\-_/.]{2,25}$/i.test(code)) continue;

    const quantity = Number(qty);
    const unitPriceNum = parseMoney(unitPrice);
    const extendedPrice = parseMoney(extPrice);
    if (!Number.isFinite(quantity) || unitPriceNum === undefined || extendedPrice === undefined) continue;

    lineItems.push({
      productCode: code,
      description: rowText(rows[i + 1] || []),
      quantity,
      unit,
      unitPrice: unitPriceNum,
      extendedPrice,
      drawingNumber: currentDrawing
    });
  }

  if (lineItems.length === 0) warnings.push("No priced line items were found on this PDF.");

  const readTotal = (label: string): number | undefined => {
    const raw = valueAfterLabel(rows, label);
    return raw ? parseMoney(raw) : undefined;
  };

  const nettTotal =
    readTotal("Nett Total:") ??
    readTotal("Net Total:") ??
    readTotal("Total Ex GST:") ??
    readTotal("Subtotal:");

  const taxTotal =
    readTotal("Tax Total:") ??
    readTotal("Tax:") ??
    readTotal("GST:") ??
    readTotal("GST Total:");

  const grossTotal =
    readTotal("Total:") ??
    readTotal("Gross Total:") ??
    readTotal("Total Inc GST:");

  if (nettTotal === undefined) {
    warnings.push("Could not find the nett total, which is the figure used for quote value.");
  }

  // A quote whose lines do not add up to its own total usually means a row was
  // missed, and that is worth saying rather than importing a wrong figure.
  if (nettTotal !== undefined && lineItems.length > 0) {
    const summed = lineItems.reduce((acc, li) => acc + li.extendedPrice, 0);
    if (Math.abs(summed - nettTotal) > 0.02) {
      warnings.push(
        `Line items add up to $${summed.toFixed(2)} but the quote's nett total is ` +
          `$${nettTotal.toFixed(2)}. Check the line items before saving.`
      );
    }
  }

  return {
    quoteNumber,
    quoteDate,
    quoteExpiryDate,
    quoteTerms,
    customerName,
    contactName,
    customerAddress,
    customerAddressParts,
    projectName,
    lineItems,
    nettTotal,
    taxTotal,
    grossTotal,
    warnings
  };
}

/**
 * The follow-up date the import sets: two days after the quote went out, moved
 * off a weekend. A reminder nobody is at work for is a reminder that gets
 * missed, which defeats the point of setting one automatically.
 */
export function followUpDateFor(quoteDate: string, daysAfter = 2): string {
  const date = new Date(`${quoteDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysAfter);
  const day = date.getUTCDay();
  if (day === 6) date.setUTCDate(date.getUTCDate() + 2); // Saturday -> Monday
  if (day === 0) date.setUTCDate(date.getUTCDate() + 1); // Sunday -> Monday
  return date.toISOString().split("T")[0];
}
